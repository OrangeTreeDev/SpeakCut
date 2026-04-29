from __future__ import annotations

import asyncio
import json
import logging
from pathlib import Path
from time import perf_counter
from typing import Optional

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models import ExportJob, Project, Scene
from app.schemas import DEFAULT_SUBTITLE_STYLE
from app.services.files import ensure_storage_dirs, relative_url, text_key, write_json
from app.services.llm import LLMService
from app.services.pexels import PexelsService
from app.services.timeline import build_global_timeline, build_scene_timeline
from app.services.tts import TTSService

logger = logging.getLogger("app.services.projects")


class ProjectService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.settings = get_settings()
        self.llm = LLMService()
        self.pexels = PexelsService()
        self.tts = TTSService()
        ensure_storage_dirs()

    async def create_project(self, text: str, aspect_ratio: str, voice_id: str) -> Project:
        logger.info(
            "project_create_started aspect_ratio=%s voice_id=%s text_length=%s",
            aspect_ratio,
            voice_id,
            len(text),
        )
        project = Project(
            text=text,
            status="generating",
            aspect_ratio=aspect_ratio,
            voice_id=voice_id,
            subtitle_style=DEFAULT_SUBTITLE_STYLE.copy(),
        )
        self.db.add(project)
        self.db.commit()
        self.db.refresh(project)
        logger.info("project_create_completed project_id=%s", project.id)
        return project

    async def _generate_project(self, project: Project) -> None:
        started_at = perf_counter()
        logger.info("project_generation_started project_id=%s", project.id)
        # analysis = self.llm.analyze_narration(project.text)
        analysis_path = self.settings.storage_path / "llm" / "1.json"
        logger.info("project_generation_loading_analysis_from_file project_id=%s file=%s", project.id, analysis_path)
        analysis = json.loads(analysis_path.read_text(encoding="utf-8"))
        scenes_payload = analysis.get("scenes", [])
        logger.info("project_generation_scenes_parsed project_id=%s scene_count=%s", project.id, len(scenes_payload))
        orientation = "portrait" if project.aspect_ratio == "9:16" else "landscape"
        for existing_scene in list(project.scenes):
            self.db.delete(existing_scene)
        self.db.commit()
        project.status = "generating"
        project.total_duration_ms = 0
        project.timeline = []
        project.bgm = None
        project.error_message = None
        self.db.commit()
        scene_records = []
        for item in scenes_payload:
            scene_started_at = perf_counter()
            logger.info(
                "scene_generation_started project_id=%s scene_index=%s keywords=%s",
                project.id,
                item["index"],
                ",".join(item.get("keywords_en", [])),
            )
            candidates = await self.pexels.search_videos(
                query=" ".join(item.get("keywords_en", [])) or item.get("scene_description_en", ""),
                orientation=orientation,
            )
            audio_path = self.settings.storage_path / "generated" / "audio" / f"{project.id}_{item['index']}.mp3"
            audio = await self.tts.synthesize_scene(item["text"], project.voice_id, audio_path)
            scene_dict = {
                "index": item["index"],
                "text": item["text"],
                "keywords_zh": item.get("keywords_zh", []),
                "keywords_en": item.get("keywords_en", []),
                "sentiment": item.get("sentiment", "neutral"),
                "scene_description_en": item.get("scene_description_en", ""),
                "selected_video": candidates[0] if candidates else None,
                "candidate_videos": candidates,
                "audio": audio,
            }
            timeline = build_scene_timeline(scene_dict)
            scene_record = Scene(
                project_id=project.id,
                idx=item["index"],
                text=item["text"],
                keywords_zh=scene_dict["keywords_zh"],
                keywords_en=scene_dict["keywords_en"],
                sentiment=scene_dict["sentiment"],
                scene_description_en=scene_dict["scene_description_en"],
                duration_ms=audio["duration_ms"],
                selected_video=scene_dict["selected_video"],
                candidate_videos=candidates,
                audio_url=str(audio_path),
                word_boundaries=audio["word_boundaries"],
                timeline=timeline,
            )
            scene_records.append(scene_record)
            self.db.add(scene_record)
            self.db.flush()
            project.total_duration_ms = sum(scene.duration_ms for scene in scene_records)
            project.timeline = build_global_timeline(
                [{"index": scene.idx, "timeline": scene.timeline} for scene in sorted(scene_records, key=lambda row: row.idx)]
            )
            self.db.commit()
            self.db.refresh(project)
            logger.info(
                "scene_generation_completed project_id=%s scene_index=%s candidates=%s audio_duration_ms=%s elapsed_ms=%s",
                project.id,
                item["index"],
                len(candidates),
                audio["duration_ms"],
                int((perf_counter() - scene_started_at) * 1000),
            )

        project.status = "ready"
        project.bgm = None
        project.error_message = None
        project.timeline = build_global_timeline(
            [
                {
                    "index": scene.idx,
                    "timeline": scene.timeline,
                }
                for scene in sorted(scene_records, key=lambda row: row.idx)
            ]
        )
        project.total_duration_ms = sum(scene.duration_ms for scene in scene_records)
        self.db.commit()
        self.db.refresh(project)
        logger.info(
            "project_generation_completed project_id=%s scene_count=%s total_duration_ms=%s elapsed_ms=%s",
            project.id,
            len(scene_records),
            project.total_duration_ms,
            int((perf_counter() - started_at) * 1000),
        )

    async def generate_project_by_id(self, project_id: str) -> Optional[Project]:
        project = self.get_project(project_id)
        if project is None:
            logger.warning("project_generation_project_not_found project_id=%s", project_id)
            return None
        try:
            await self._generate_project(project)
        except Exception as exc:
            project.status = "failed"
            project.error_message = str(exc)
            self.db.commit()
            logger.exception("project_generation_failed project_id=%s", project_id)
            raise exc
        return project

    def get_project(self, project_id: str) -> Project | None:
        stmt = select(Project).where(Project.id == project_id)
        return self.db.scalar(stmt)

    def list_projects(self) -> list[Project]:
        stmt = select(Project).order_by(Project.updated_at.desc())
        return list(self.db.execute(stmt).scalars().all())

    def delete_project(self, project_id: str) -> bool:
        project = self.get_project(project_id)
        if project is None:
            return False
        self.db.delete(project)
        self.db.commit()
        logger.info("project_deleted project_id=%s", project_id)
        return True

    async def update_scene_text(self, project: Project, scene_index: int, text: str) -> Project:
        started_at = perf_counter()
        logger.info("scene_update_started project_id=%s scene_index=%s", project.id, scene_index)
        scene = self._require_scene(project.id, scene_index)
        analysis = self.llm.analyze_single_scene(text, project.text)
        self._save_llm_result(text, f"scene_{scene_index}_analysis", analysis)
        scene.text = analysis.get("text", text)
        scene.keywords_zh = analysis.get("keywords_zh", [])
        scene.keywords_en = analysis.get("keywords_en", [])
        scene.sentiment = analysis.get("sentiment", "neutral")
        scene.scene_description_en = analysis.get("scene_description_en", "")
        orientation = "portrait" if project.aspect_ratio == "9:16" else "landscape"
        scene.candidate_videos = await self.pexels.search_videos(
            " ".join(scene.keywords_en) or scene.scene_description_en, orientation
        )
        scene.selected_video = scene.candidate_videos[0] if scene.candidate_videos else None
        audio_path = self.settings.storage_path / "generated" / "audio" / f"{project.id}_{scene_index}.mp3"
        audio = await self.tts.synthesize_scene(scene.text, project.voice_id, audio_path)
        scene.audio_url = str(audio_path)
        scene.word_boundaries = audio["word_boundaries"]
        scene.duration_ms = audio["duration_ms"]
        scene.timeline = build_scene_timeline(
            {
                "selected_video": scene.selected_video,
                "audio": audio,
            }
        )
        project.text = "\n".join(row.text for row in sorted(project.scenes, key=lambda item: item.idx))
        self._rebuild_project(project)
        self.db.commit()
        self.db.refresh(project)
        logger.info(
            "scene_update_completed project_id=%s scene_index=%s duration_ms=%s elapsed_ms=%s",
            project.id,
            scene_index,
            scene.duration_ms,
            int((perf_counter() - started_at) * 1000),
        )
        return project

    async def switch_voice(self, project: Project, voice_id: str) -> Project:
        started_at = perf_counter()
        logger.info("voice_switch_started project_id=%s voice_id=%s", project.id, voice_id)
        project.voice_id = voice_id
        tasks = []
        for scene in sorted(project.scenes, key=lambda item: item.idx):
            audio_path = self.settings.storage_path / "generated" / "audio" / f"{project.id}_{scene.idx}.mp3"
            tasks.append(self.tts.synthesize_scene(scene.text, voice_id, audio_path))
        audio_results = await asyncio.gather(*tasks)
        for scene, audio in zip(sorted(project.scenes, key=lambda item: item.idx), audio_results):
            scene.audio_url = audio["audio_path"]
            scene.word_boundaries = audio["word_boundaries"]
            scene.duration_ms = audio["duration_ms"]
            scene.timeline = build_scene_timeline({"selected_video": scene.selected_video, "audio": audio})
        self._rebuild_project(project)
        self.db.commit()
        self.db.refresh(project)
        logger.info(
            "voice_switch_completed project_id=%s voice_id=%s scene_count=%s elapsed_ms=%s",
            project.id,
            voice_id,
            len(project.scenes),
            int((perf_counter() - started_at) * 1000),
        )
        return project

    def update_subtitle_style(self, project: Project, style: dict) -> Project:
        logger.info("subtitle_style_update_started project_id=%s", project.id)
        project.subtitle_style = style
        self.db.commit()
        self.db.refresh(project)
        logger.info("subtitle_style_update_completed project_id=%s", project.id)
        return project

    def update_scene_video(self, project: Project, scene_index: int, video_id: int) -> Project:
        logger.info("scene_video_update_started project_id=%s scene_index=%s video_id=%s", project.id, scene_index, video_id)
        scene = self._require_scene(project.id, scene_index)
        match = next((item for item in scene.candidate_videos if item["id"] == video_id), None)
        if match is None:
            raise ValueError("Video not found in candidates")
        scene.selected_video = match
        scene.timeline = build_scene_timeline(
            {
                "selected_video": scene.selected_video,
                "audio": {
                    "audio_path": scene.audio_url,
                    "duration_ms": scene.duration_ms,
                    "word_boundaries": scene.word_boundaries,
                },
            }
        )
        self._rebuild_project(project)
        self.db.commit()
        self.db.refresh(project)
        logger.info("scene_video_update_completed project_id=%s scene_index=%s video_id=%s", project.id, scene_index, video_id)
        return project

    async def export_project(self, project: Project) -> ExportJob:
        from app.services.renderer import render_project

        started_at = perf_counter()
        logger.info("export_started project_id=%s", project.id)
        export_job = ExportJob(project_id=project.id, status="rendering", progress=0.1)
        self.db.add(export_job)
        self.db.commit()
        self.db.refresh(export_job)

        export_path = self.settings.storage_path / "exports" / f"{project.id}.mp4"
        prepared_scenes = []
        for scene in sorted(project.scenes, key=lambda item: item.idx):
            if scene.selected_video is None or scene.audio_url is None:
                logger.warning("export_scene_skipped project_id=%s scene_index=%s reason=missing_asset", project.id, scene.idx)
                continue
            local_video_path = self.settings.storage_path / "downloads" / "videos" / f"{project.id}_{scene.idx}.mp4"
            await self.cache_remote_asset(scene.selected_video["video_url"], local_video_path)
            prepared_scenes.append(
                {
                    "selected_video": scene.selected_video,
                    "local_video_path": str(local_video_path),
                    "audio_url": scene.audio_url,
                    "duration_ms": scene.duration_ms,
                    "timeline": scene.timeline,
                }
            )
            logger.info("export_scene_prepared project_id=%s scene_index=%s", project.id, scene.idx)

        render_project(
            project.id,
            project.aspect_ratio,
            prepared_scenes,
            project.subtitle_style,
            export_path,
        )
        export_job.status = "completed"
        export_job.progress = 1.0
        export_job.download_url = relative_url(export_path)
        self.db.commit()
        self.db.refresh(export_job)
        logger.info(
            "export_completed project_id=%s export_id=%s output=%s elapsed_ms=%s",
            project.id,
            export_job.id,
            export_path.name,
            int((perf_counter() - started_at) * 1000),
        )
        return export_job

    async def search_materials(self, query: str, orientation: str, per_page: int) -> list[dict]:
        return await self.pexels.search_videos(query, orientation, per_page)

    async def cache_remote_asset(self, url: str, destination: Path) -> Path:
        started_at = perf_counter()
        logger.info("asset_download_started destination=%s url=%s", destination.name, url)
        async with httpx.AsyncClient(timeout=self.settings.request_timeout_sec) as client:
            response = await client.get(url)
            response.raise_for_status()
            destination.write_bytes(response.content)
        logger.info(
            "asset_download_completed destination=%s bytes=%s elapsed_ms=%s",
            destination.name,
            destination.stat().st_size,
            int((perf_counter() - started_at) * 1000),
        )
        return destination

    def _require_scene(self, project_id: str, scene_index: int) -> Scene:
        stmt = select(Scene).where(Scene.project_id == project_id, Scene.idx == scene_index)
        scene = self.db.scalar(stmt)
        if scene is None:
            logger.warning("scene_not_found project_id=%s scene_index=%s", project_id, scene_index)
            raise ValueError("Scene not found")
        return scene

    def _rebuild_project(self, project: Project) -> None:
        ordered_scenes = sorted(project.scenes, key=lambda row: row.idx)
        project.total_duration_ms = sum(scene.duration_ms for scene in ordered_scenes)
        project.timeline = build_global_timeline(
            [{"index": scene.idx, "timeline": scene.timeline} for scene in ordered_scenes]
        )
        logger.info(
            "project_timeline_rebuilt project_id=%s scene_count=%s total_duration_ms=%s",
            project.id,
            len(ordered_scenes),
            project.total_duration_ms,
        )

    def _save_llm_result(self, narration_text: str, name: str, payload: dict) -> None:
        narration_key = text_key(narration_text)
        output_path = self.settings.storage_path / "llm" / f"{narration_key}_{name}.json"
        write_json(output_path, payload)
        logger.info("llm_result_saved narration_key=%s file=%s", narration_key, output_path.name)
