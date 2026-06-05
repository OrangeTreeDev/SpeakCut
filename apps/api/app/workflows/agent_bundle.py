from __future__ import annotations

import json
import os
import shutil
import subprocess
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

import httpx
from sqlalchemy.orm import Session

from app.core.config import REPO_ROOT, get_settings
from app.models import ExportJob, Project
from app.schemas import DEFAULT_SUBTITLE_STYLE
from app.services.files import ensure_storage_dirs
from app.services.renderer import render_project
from app.services.timeline import build_subtitle_segments


def emit(event: dict[str, Any]) -> None:
    print(json.dumps(event, ensure_ascii=False), flush=True)


def project_bundle_dir(project_id: str) -> Path:
    return get_settings().storage_path / "projects" / project_id


def write_project_bundle(project: Project) -> Path:
    bundle_dir = project_bundle_dir(project.id)
    bundle_dir.mkdir(parents=True, exist_ok=True)
    payload = _project_bundle_payload(project, bundle_dir)
    project_file = bundle_dir / "project.speakcut.json"
    project_file.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    return project_file


def package_preview(project_file: Path) -> Path:
    payload = json.loads(project_file.read_text(encoding="utf-8"))
    bundle_dir = project_file.parent
    preview_dir = bundle_dir / "preview"
    dist_dir = _preview_web_dist_dir()

    if not dist_dir.exists() and (REPO_ROOT / "apps" / "web").exists():
        subprocess.run(["npm", "run", "build:web"], cwd=REPO_ROOT, check=True)
    if not dist_dir.exists():
        raise FileNotFoundError(f"Preview web dist not found: {dist_dir}")

    if preview_dir.exists():
        shutil.rmtree(preview_dir)
    shutil.copytree(dist_dir, preview_dir)
    data_path = preview_dir / "project-data.js"
    data_path.write_text(
        "window.__SPEAKCUT_PROJECT__ = "
        + json.dumps(_preview_project_payload(payload), ensure_ascii=False)
        + ";\n",
        encoding="utf-8",
    )
    index_path = preview_dir / "index.html"
    html = index_path.read_text(encoding="utf-8")
    if "project-data.js" not in html:
        html = html.replace('<script type="module"', '<script src="./project-data.js"></script>\n    <script type="module"', 1)
        index_path.write_text(html, encoding="utf-8")
    return index_path


def inspect_project(project_file: Path) -> dict[str, Any]:
    payload = json.loads(project_file.read_text(encoding="utf-8"))
    export_file = payload.get("export_file")
    return {
        "type": "result",
        "status": "completed",
        "project_id": payload["project_id"],
        "scene_count": len(payload.get("scenes", [])),
        "duration_ms": payload.get("total_duration_ms", 0),
        "has_export": bool(export_file and Path(export_file).exists()),
    }


def export_bundle(project_file: Path) -> Path:
    payload = json.loads(project_file.read_text(encoding="utf-8"))
    bundle_dir = project_file.parent
    export_dir = bundle_dir / "exports"
    export_dir.mkdir(parents=True, exist_ok=True)
    output_path = export_dir / "final.mp4"
    prepared_scenes = []
    for scene in payload.get("scenes", []):
        selected_video = scene.get("selected_video")
        audio_url = scene.get("audio_url")
        if not selected_video or not audio_url:
            continue
        local_video_path = _ensure_bundle_video_path(bundle_dir, scene)
        local_audio_path = _resolve_bundle_path(bundle_dir, audio_url)
        prepared_scenes.append(
            {
                "selected_video": selected_video,
                "local_video_path": str(local_video_path),
                "audio_url": str(local_audio_path),
                "duration_ms": scene["duration_ms"],
                "timeline": scene["timeline"],
            }
        )

    render_project(
        payload["project_id"],
        payload["aspect_ratio"],
        prepared_scenes,
        payload.get("subtitle_style") or DEFAULT_SUBTITLE_STYLE,
        output_path,
    )
    payload["export_file"] = str(output_path)
    project_file.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    return output_path


async def generate_project(
    db: Session,
    text: str,
    aspect_ratio: str,
    voice_id: str,
    *,
    export: bool = False,
    preview: bool = True,
) -> dict[str, Any]:
    ensure_storage_dirs()
    from app.services.projects import ProjectService

    service = ProjectService(db)
    project = await service.create_project(text, aspect_ratio, voice_id)
    emit({"type": "progress", "stage": "llm", "project_id": project.id})
    await service.generate_project_by_id(project.id)
    db.refresh(project)

    project_file = write_project_bundle(project)
    preview_file = package_preview(project_file) if preview else None
    export_file = None
    if export:
        emit({"type": "progress", "stage": "render", "project_id": project.id})
        job = ExportJob(project_id=project.id, status="rendering", progress=0.0)
        db.add(job)
        db.commit()
        db.refresh(job)
        completed = await service.export_project(project, job)
        export_file = Path(get_settings().storage_path / completed.download_url.removeprefix("/static/"))
        bundle_payload = json.loads(project_file.read_text(encoding="utf-8"))
        bundle_payload["export_file"] = str(export_file)
        project_file.write_text(json.dumps(bundle_payload, ensure_ascii=False, indent=2), encoding="utf-8")
    if export and preview:
        preview_file = package_preview(project_file)
    return {
        "type": "result",
        "status": "completed",
        "project_id": project.id,
        "project_file": str(project_file),
        "preview_file": str(preview_file) if preview_file else None,
        "export_file": str(export_file) if export_file else None,
    }


def apply_patch_ops(project_file: Path, changes: list[dict[str, Any]], regenerate: dict[str, Any] | None = None) -> dict[str, Any]:
    payload = json.loads(project_file.read_text(encoding="utf-8"))
    changed: list[str] = []
    for change in changes:
        op = change.get("op")
        if op == "update_subtitle_style":
            payload.setdefault("subtitle_style", {}).update({key: value for key, value in change.items() if key != "op"})
            changed.append("subtitle_style")
        elif op == "update_scene_text":
            scene = _find_scene(payload, int(change["scene_index"]))
            scene["text"] = str(change["text"])
            scene["timeline"]["subtitles"] = _subtitles_for_text(scene["text"], scene["duration_ms"])
            changed.extend(["scene_text", "timeline"])
        elif op == "replace_scene_material":
            scene = _find_scene(payload, int(change["scene_index"]))
            scene["material_query"] = str(change.get("query", ""))
            changed.append("material_query")
        else:
            raise ValueError(f"Unsupported patch op: {op}")
    project_file.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    preview_file = None
    if (regenerate or {}).get("preview", True):
        preview_file = package_preview(project_file)
        changed.append("preview")
    return {
        "type": "result",
        "status": "completed",
        "project_file": str(project_file),
        "preview_file": str(preview_file) if preview_file else None,
        "changed": changed,
    }


def _project_bundle_payload(project: Project, bundle_dir: Path) -> dict[str, Any]:
    response = {
        "project_id": project.id,
        "status": project.status,
        "aspect_ratio": project.aspect_ratio,
        "voice_id": project.voice_id,
        "total_duration_ms": project.total_duration_ms,
        "subtitle_style": {**DEFAULT_SUBTITLE_STYLE, **(project.subtitle_style or {})},
        "bgm": project.bgm,
        "preview_url": project.preview_url,
        "error_message": project.error_message,
        "scenes": [
            {
                "index": scene.idx,
                "text": scene.text,
                "keywords_zh": scene.keywords_zh,
                "keywords_en": scene.keywords_en,
                "sentiment": scene.sentiment,
                "scene_description_en": scene.scene_description_en,
                "duration_ms": scene.duration_ms,
                "selected_video": scene.selected_video,
                "candidate_videos": scene.candidate_videos,
                "audio_url": scene.audio_url,
                "word_boundaries": scene.word_boundaries,
                "timeline": scene.timeline,
            }
            for scene in sorted(project.scenes, key=lambda row: row.idx)
        ],
    }
    scenes = []
    for scene in response["scenes"]:
        next_scene = dict(scene)
        if next_scene.get("audio_url"):
            next_scene["audio_url"] = _copy_into_bundle(bundle_dir, Path(next_scene["audio_url"]), "media/audio")
        selected_video = next_scene.get("selected_video")
        if selected_video and selected_video.get("video_url"):
            selected_video = dict(selected_video)
            source_video_url = str(selected_video["video_url"])
            selected_video.setdefault("source_url", source_video_url)
            local_video_path = selected_video.get("local_video_path")
            if local_video_path and Path(str(local_video_path)).exists():
                selected_video["local_video_path"] = _copy_into_bundle(bundle_dir, Path(str(local_video_path)), "media/videos")
            elif not _is_remote_url(source_video_url) and Path(source_video_url).exists():
                bundled_path = _copy_into_bundle(bundle_dir, Path(source_video_url), "media/videos")
                selected_video["video_url"] = bundled_path
                selected_video["local_video_path"] = bundled_path
            else:
                cached_video_path = get_settings().storage_path / "downloads" / "videos" / f"{project.id}_{scene['index']}.mp4"
                if cached_video_path.exists():
                    selected_video["local_video_path"] = _copy_into_bundle(bundle_dir, cached_video_path, "media/videos")
            if selected_video.get("thumbnail") and Path(str(selected_video["thumbnail"])).exists():
                selected_video["thumbnail"] = _copy_into_bundle(bundle_dir, Path(selected_video["thumbnail"]), "media/thumbnails")
            next_scene["selected_video"] = selected_video
        next_scene["candidate_videos"] = [next_scene["selected_video"]] if next_scene.get("selected_video") else []
        scenes.append(next_scene)
    response["scenes"] = scenes
    response["text"] = project.text
    response["timeline"] = project.timeline
    response["total_duration_ms"] = project.total_duration_ms
    response["project_file"] = str(bundle_dir / "project.speakcut.json")
    response["export_file"] = None
    return response


def _copy_into_bundle(bundle_dir: Path, source: Path, subdir: str) -> str:
    if not source.exists():
        return str(source)
    target_dir = bundle_dir / subdir
    target_dir.mkdir(parents=True, exist_ok=True)
    target = target_dir / source.name
    if source.resolve() != target.resolve():
        shutil.copy2(source, target)
    return str(target.relative_to(bundle_dir))


def _preview_project_payload(payload: dict[str, Any]) -> dict[str, Any]:
    scenes = []
    for scene in payload.get("scenes", []):
        next_scene = dict(scene)
        if next_scene.get("audio_url"):
            next_scene["audio_url"] = _preview_relative_path(next_scene["audio_url"])
        selected_video = next_scene.get("selected_video")
        if selected_video:
            selected_video = dict(selected_video)
            if selected_video.get("video_url"):
                selected_video["video_url"] = _preview_relative_path(selected_video["video_url"])
            if selected_video.get("thumbnail"):
                selected_video["thumbnail"] = _preview_relative_path(selected_video["thumbnail"])
            next_scene["selected_video"] = selected_video
        candidate_videos = []
        for video in next_scene.get("candidate_videos", []):
            next_video = dict(video)
            if next_video.get("video_url"):
                next_video["video_url"] = _preview_relative_path(next_video["video_url"])
            if next_video.get("thumbnail"):
                next_video["thumbnail"] = _preview_relative_path(next_video["thumbnail"])
            candidate_videos.append(next_video)
        next_scene["candidate_videos"] = candidate_videos
        scenes.append(next_scene)
    project = {
        "project_id": payload["project_id"],
        "status": payload.get("status", "ready"),
        "aspect_ratio": payload["aspect_ratio"],
        "voice_id": payload["voice_id"],
        "total_duration_ms": payload.get("total_duration_ms", 0),
        "subtitle_style": payload.get("subtitle_style") or DEFAULT_SUBTITLE_STYLE,
        "preview_url": None,
        "error_message": None,
        "export_file": payload.get("export_file"),
        "project_file": payload.get("project_file"),
        "scenes": scenes,
    }
    return project


def _preview_relative_path(path: str) -> str:
    if _is_remote_url(path):
        return path
    candidate = Path(path)
    if candidate.is_absolute():
        return path
    if path.startswith("../"):
        return path
    return f"../{path}"


def _preview_web_dist_dir() -> Path:
    configured = os.environ.get("SPEAKCUT_PREVIEW_WEB_DIR")
    if configured:
        return Path(configured).expanduser().resolve()
    packaged = REPO_ROOT / "assets" / "preview-web"
    if packaged.exists():
        return packaged
    return REPO_ROOT / "apps" / "web" / "dist"


def _resolve_bundle_path(bundle_dir: Path, path: str) -> Path:
    candidate = Path(path)
    return candidate if candidate.is_absolute() else bundle_dir / candidate


def _ensure_bundle_video_path(bundle_dir: Path, scene: dict[str, Any]) -> Path:
    selected_video = scene["selected_video"]
    for key in ("local_video_path", "video_url"):
        value = selected_video.get(key)
        if value and not _is_remote_url(str(value)):
            path = _resolve_bundle_path(bundle_dir, str(value))
            if path.exists():
                selected_video["local_video_path"] = str(path.relative_to(bundle_dir)) if path.is_relative_to(bundle_dir) else str(path)
                return path

    video_url = selected_video.get("video_url") or selected_video.get("source_url")
    if not video_url or not _is_remote_url(str(video_url)):
        raise FileNotFoundError(f"Scene {scene.get('index')} has no local video file and no remote video URL")

    selected_video.setdefault("source_url", str(video_url))
    target = bundle_dir / "media" / "videos" / f"scene_{int(scene.get('index', 0)):04d}.mp4"
    target.parent.mkdir(parents=True, exist_ok=True)
    if not target.exists():
        with httpx.stream("GET", str(video_url), timeout=60.0, follow_redirects=True) as response:
            response.raise_for_status()
            with target.open("wb") as file:
                for chunk in response.iter_bytes():
                    file.write(chunk)
    selected_video["local_video_path"] = str(target.relative_to(bundle_dir))
    return target


def _is_remote_url(value: str) -> bool:
    parsed = urlparse(value)
    return parsed.scheme in {"http", "https"} and bool(parsed.netloc)


def _word_boundaries(text: str, duration_ms: int) -> list[dict[str, Any]]:
    chars = [char for char in text if not char.isspace()]
    if not chars:
        return []
    step = max(80, duration_ms // len(chars))
    return [{"text": char, "offset_ms": idx * step, "duration_ms": step} for idx, char in enumerate(chars)]


def _subtitles_for_text(text: str, duration_ms: int) -> list[dict[str, Any]]:
    return build_subtitle_segments(_word_boundaries(text, duration_ms))


def _find_scene(payload: dict[str, Any], scene_index: int) -> dict[str, Any]:
    for scene in payload.get("scenes", []):
        if int(scene["index"]) == scene_index:
            return scene
    raise ValueError(f"Scene not found: {scene_index}")
