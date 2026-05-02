from __future__ import annotations

import logging

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session

from app.core.database import SessionLocal, get_db
from app.models import ExportJob, Project
from app.schemas import (
    DEFAULT_SUBTITLE_STYLE,
    ExportResponse,
    ProjectCreate,
    ProjectCreateResponse,
    ProjectListResponse,
    ProjectResponse,
    ProjectSummaryResponse,
    SceneResponse,
    SceneUpdate,
    SceneVideoAssetUpdate,
    SceneVideoUpdate,
    SubtitleStyleUpdate,
    VoiceUpdate,
)
from app.services.files import local_path_to_static_url
from app.services.projects import ProjectService

router = APIRouter(prefix="/api/v1")
logger = logging.getLogger("app.api.routes")


async def generate_project_in_background(project_id: str) -> None:
    db = SessionLocal()
    try:
        logger.info("background_generation_started project_id=%s", project_id)
        service = ProjectService(db)
        await service.generate_project_by_id(project_id)
        logger.info("background_generation_completed project_id=%s", project_id)
    except Exception:
        logger.exception("background_generation_failed project_id=%s", project_id)
        raise
    finally:
        db.close()


async def export_project_in_background(export_id: str) -> None:
    db = SessionLocal()
    try:
        logger.info("background_export_started export_id=%s", export_id)
        service = ProjectService(db)
        await service.render_export_job(export_id)
        logger.info("background_export_completed export_id=%s", export_id)
    except Exception:
        logger.exception("background_export_failed export_id=%s", export_id)
    finally:
        db.close()


def serialize_project(project: Project) -> ProjectResponse:
    scenes = sorted(project.scenes, key=lambda row: row.idx)
    return ProjectResponse(
        project_id=project.id,
        status=project.status,
        aspect_ratio=project.aspect_ratio,
        voice_id=project.voice_id,
        total_duration_ms=project.total_duration_ms,
        subtitle_style={**DEFAULT_SUBTITLE_STYLE, **(project.subtitle_style or {})},
        bgm=project.bgm,
        preview_url=project.preview_url,
        error_message=project.error_message,
        scenes=[
            SceneResponse(
                index=scene.idx,
                text=scene.text,
                keywords_zh=scene.keywords_zh,
                keywords_en=scene.keywords_en,
                sentiment=scene.sentiment,
                scene_description_en=scene.scene_description_en,
                duration_ms=scene.duration_ms,
                selected_video=scene.selected_video,
                candidate_videos=scene.candidate_videos,
                audio_url=local_path_to_static_url(scene.audio_url),
                word_boundaries=scene.word_boundaries,
                timeline=scene.timeline,
            )
            for scene in scenes
        ],
    )


def serialize_project_summary(project: Project) -> ProjectSummaryResponse:
    scenes = sorted(project.scenes, key=lambda row: row.idx)
    cover_image = next((scene.selected_video.get("thumbnail") for scene in scenes if scene.selected_video), None)
    first_scene_text = next((scene.text.strip() for scene in scenes if scene.text.strip()), "")
    fallback_title = project.text.strip().splitlines()[0] if project.text.strip() else project.id
    title = (first_scene_text or fallback_title)[:40]
    return ProjectSummaryResponse(
        project_id=project.id,
        title=title,
        status=project.status,
        aspect_ratio=project.aspect_ratio,
        voice_id=project.voice_id,
        total_duration_ms=project.total_duration_ms,
        scene_count=len(scenes),
        cover_image=cover_image,
        updated_at=project.updated_at.isoformat(),
        created_at=project.created_at.isoformat(),
    )


@router.post("/projects", response_model=ProjectCreateResponse)
async def create_project(
    payload: ProjectCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
) -> ProjectCreateResponse:
    logger.info(
        "create_project_requested aspect_ratio=%s voice_id=%s text_length=%s",
        payload.aspect_ratio,
        payload.voice_id,
        len(payload.text),
    )
    service = ProjectService(db)
    project = await service.create_project(payload.text, payload.aspect_ratio, payload.voice_id)
    background_tasks.add_task(generate_project_in_background, project.id)
    logger.info("create_project_accepted project_id=%s", project.id)
    return ProjectCreateResponse(project_id=project.id, status="generating", estimated_time_sec=15)


@router.get("/projects/{project_id}", response_model=ProjectResponse)
def get_project(project_id: str, db: Session = Depends(get_db)) -> ProjectResponse:
    logger.info("get_project_requested project_id=%s", project_id)
    service = ProjectService(db)
    project = service.get_project(project_id)
    if project is None:
        logger.warning("get_project_not_found project_id=%s", project_id)
        raise HTTPException(status_code=404, detail="Project not found")
    logger.info("get_project_completed project_id=%s status=%s", project_id, project.status)
    return serialize_project(project)


@router.get("/projects", response_model=ProjectListResponse)
def list_projects(db: Session = Depends(get_db)) -> ProjectListResponse:
    logger.info("list_projects_requested")
    service = ProjectService(db)
    projects = service.list_projects()
    items = [serialize_project_summary(project) for project in projects]
    logger.info("list_projects_completed total=%s", len(items))
    return ProjectListResponse(items=items, total=len(items))


@router.delete("/projects/{project_id}", status_code=204, response_class=Response)
def delete_project(project_id: str, db: Session = Depends(get_db)) -> Response:
    logger.info("delete_project_requested project_id=%s", project_id)
    service = ProjectService(db)
    deleted = service.delete_project(project_id)
    if not deleted:
        logger.warning("delete_project_not_found project_id=%s", project_id)
        raise HTTPException(status_code=404, detail="Project not found")
    logger.info("delete_project_completed project_id=%s", project_id)
    return Response(status_code=204)


@router.post("/projects/{project_id}/regenerate", response_model=ProjectResponse)
async def regenerate_project(
    project_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
) -> ProjectResponse:
    logger.info("regenerate_project_requested project_id=%s", project_id)
    service = ProjectService(db)
    project = service.get_project(project_id)
    if project is None:
        logger.warning("regenerate_project_not_found project_id=%s", project_id)
        raise HTTPException(status_code=404, detail="Project not found")
    updated = service.prepare_project_regeneration(project)
    background_tasks.add_task(generate_project_in_background, project.id)
    logger.info("regenerate_project_queued project_id=%s", project_id)
    return serialize_project(updated)


@router.patch("/projects/{project_id}/scenes/{scene_index}", response_model=ProjectResponse)
async def update_scene(project_id: str, scene_index: int, payload: SceneUpdate, db: Session = Depends(get_db)) -> ProjectResponse:
    logger.info("update_scene_requested project_id=%s scene_index=%s", project_id, scene_index)
    service = ProjectService(db)
    project = service.get_project(project_id)
    if project is None:
        logger.warning("update_scene_project_not_found project_id=%s", project_id)
        raise HTTPException(status_code=404, detail="Project not found")
    try:
        updated = await service.update_scene_text(project, scene_index, payload.text)
    except ValueError as exc:
        db.rollback()
        logger.warning("update_scene_failed project_id=%s scene_index=%s reason=%s", project_id, scene_index, exc)
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        db.rollback()
        logger.exception("update_scene_failed project_id=%s scene_index=%s", project_id, scene_index)
        raise HTTPException(status_code=502, detail=f"更新分镜失败：{exc}") from exc
    logger.info("update_scene_completed project_id=%s scene_index=%s", project_id, scene_index)
    return serialize_project(updated)


@router.put("/projects/{project_id}/scenes/{scene_index}/video", response_model=ProjectResponse)
def update_scene_video(project_id: str, scene_index: int, payload: SceneVideoUpdate, db: Session = Depends(get_db)) -> ProjectResponse:
    logger.info("update_scene_video_requested project_id=%s scene_index=%s video_id=%s", project_id, scene_index, payload.video_id)
    service = ProjectService(db)
    project = service.get_project(project_id)
    if project is None:
        logger.warning("update_scene_video_project_not_found project_id=%s", project_id)
        raise HTTPException(status_code=404, detail="Project not found")
    try:
        updated = service.update_scene_video(project, scene_index, payload.video_id)
    except ValueError as exc:
        logger.warning("update_scene_video_failed project_id=%s scene_index=%s reason=%s", project_id, scene_index, exc)
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    logger.info("update_scene_video_completed project_id=%s scene_index=%s", project_id, scene_index)
    return serialize_project(updated)


@router.put("/projects/{project_id}/scenes/{scene_index}/video-asset", response_model=ProjectResponse)
def update_scene_video_asset(project_id: str, scene_index: int, payload: SceneVideoAssetUpdate, db: Session = Depends(get_db)) -> ProjectResponse:
    logger.info("update_scene_video_asset_requested project_id=%s scene_index=%s", project_id, scene_index)
    service = ProjectService(db)
    project = service.get_project(project_id)
    if project is None:
        logger.warning("update_scene_video_asset_project_not_found project_id=%s", project_id)
        raise HTTPException(status_code=404, detail="Project not found")
    try:
        updated = service.update_scene_video_asset(project, scene_index, payload.video.model_dump())
    except ValueError as exc:
        logger.warning("update_scene_video_asset_failed project_id=%s scene_index=%s reason=%s", project_id, scene_index, exc)
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    logger.info("update_scene_video_asset_completed project_id=%s scene_index=%s", project_id, scene_index)
    return serialize_project(updated)


@router.patch("/projects/{project_id}/subtitle-style", response_model=ProjectResponse)
def update_subtitle_style(project_id: str, payload: SubtitleStyleUpdate, db: Session = Depends(get_db)) -> ProjectResponse:
    logger.info("update_subtitle_style_requested project_id=%s", project_id)
    service = ProjectService(db)
    project = service.get_project(project_id)
    if project is None:
        logger.warning("update_subtitle_style_project_not_found project_id=%s", project_id)
        raise HTTPException(status_code=404, detail="Project not found")
    updated = service.update_subtitle_style(project, payload.model_dump())
    logger.info("update_subtitle_style_completed project_id=%s", project_id)
    return serialize_project(updated)


@router.put("/projects/{project_id}/voice", response_model=ProjectResponse)
async def update_voice(project_id: str, payload: VoiceUpdate, db: Session = Depends(get_db)) -> ProjectResponse:
    logger.info("update_voice_requested project_id=%s voice_id=%s", project_id, payload.voice_id)
    service = ProjectService(db)
    project = service.get_project(project_id)
    if project is None:
        logger.warning("update_voice_project_not_found project_id=%s", project_id)
        raise HTTPException(status_code=404, detail="Project not found")
    updated = await service.switch_voice(project, payload.voice_id)
    logger.info("update_voice_completed project_id=%s voice_id=%s", project_id, payload.voice_id)
    return serialize_project(updated)


@router.get("/materials/search")
async def search_materials(
    q: str = Query(min_length=1),
    orientation: str = Query(default="landscape", pattern="^(landscape|portrait)$"),
    per_page: int = Query(default=8, ge=1, le=20),
    db: Session = Depends(get_db),
) -> dict:
    logger.info("search_materials_requested query=%s orientation=%s per_page=%s", q, orientation, per_page)
    service = ProjectService(db)
    videos = await service.search_materials(q, orientation, per_page)
    logger.info("search_materials_completed query=%s result_count=%s", q, len(videos))
    return {"videos": videos}


@router.post("/projects/{project_id}/export", response_model=ExportResponse)
async def export_project(
    project_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
) -> ExportResponse:
    logger.info("export_project_requested project_id=%s", project_id)
    service = ProjectService(db)
    project = service.get_project(project_id)
    if project is None:
        logger.warning("export_project_not_found project_id=%s", project_id)
        raise HTTPException(status_code=404, detail="Project not found")
    export_job = service.queue_export(project)
    background_tasks.add_task(export_project_in_background, export_job.id)
    logger.info("export_project_queued project_id=%s export_id=%s", project_id, export_job.id)
    return ExportResponse(export_id=export_job.id, status=export_job.status, estimated_time_sec=120)


@router.get("/exports/{export_id}", response_model=ExportResponse)
def get_export(export_id: str, db: Session = Depends(get_db)) -> ExportResponse:
    logger.info("get_export_requested export_id=%s", export_id)
    export_job = db.get(ExportJob, export_id)
    if export_job is None:
        logger.warning("get_export_not_found export_id=%s", export_id)
        raise HTTPException(status_code=404, detail="Export not found")
    logger.info("get_export_completed export_id=%s status=%s", export_id, export_job.status)
    return ExportResponse(
        export_id=export_job.id,
        status=export_job.status,
        download_url=export_job.download_url,
        error_message=export_job.error_message,
    )
