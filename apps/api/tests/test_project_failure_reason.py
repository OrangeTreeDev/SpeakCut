from pathlib import Path

import pytest
import httpx
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.api.routes import serialize_project
from app.core.database import Base
from app.models import Project
from app.models import Scene
from app.services.projects import ProjectService


def _make_session(tmp_path: Path):
    db_path = tmp_path / "test.db"
    engine = create_engine(f"sqlite:///{db_path}", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    return sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)()


def test_serialize_project_includes_error_message(tmp_path: Path) -> None:
    project = Project(
        id="proj_test",
        text="demo",
        status="failed",
        aspect_ratio="9:16",
        voice_id="voice_test",
        total_duration_ms=0,
        subtitle_style={},
        bgm=None,
        preview_url=None,
        error_message="boom",
    )
    project.scenes = []

    response = serialize_project(project)

    assert response.error_message == "boom"


@pytest.mark.asyncio
async def test_generate_project_by_id_persists_failure_reason(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    db = _make_session(tmp_path)
    service = ProjectService(db)
    project = await service.create_project("demo", "9:16", "voice_test")

    async def explode(_project: Project) -> None:
        raise RuntimeError("Pexels timeout")

    monkeypatch.setattr(service, "_generate_project", explode)

    with pytest.raises(RuntimeError, match="Pexels timeout"):
        await service.generate_project_by_id(project.id)

    stored = service.get_project(project.id)
    assert stored is not None
    assert stored.status == "failed"
    assert stored.error_message == "Pexels timeout"


@pytest.mark.asyncio
async def test_generate_project_continues_when_scene_video_search_fails(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    db = _make_session(tmp_path)
    service = ProjectService(db)
    project = await service.create_project("一段测试旁白", "9:16", "voice_test")

    monkeypatch.setattr(
        service.llm,
        "analyze_narration",
        lambda _text: {
            "scenes": [
                {
                    "index": 0,
                    "text": "一段测试旁白",
                    "keywords_zh": ["测试"],
                    "keywords_en": ["timeout query"],
                    "sentiment": "neutral",
                    "scene_description_en": "A timeout test scene",
                }
            ]
        },
    )

    async def fail_search(*args, **kwargs):
        request = httpx.Request("GET", "https://api.pexels.com/videos/search")
        response = httpx.Response(504, request=request)
        raise httpx.HTTPStatusError("Gateway Timeout", request=request, response=response)

    async def synthesize(*args, **kwargs):
        return {
            "audio_path": str(tmp_path / "scene.mp3"),
            "duration_ms": 1000,
            "word_boundaries": [{"text": "测试", "offset_ms": 0, "duration_ms": 1000}],
        }

    monkeypatch.setattr(service.pexels, "search_videos", fail_search)
    monkeypatch.setattr(service.tts, "synthesize_scene", synthesize)

    await service.generate_project_by_id(project.id)

    stored = service.get_project(project.id)
    assert stored is not None
    assert stored.status == "ready"
    assert stored.error_message is None
    assert len(stored.scenes) == 1
    assert stored.scenes[0].selected_video is None
    assert stored.scenes[0].candidate_videos == []


@pytest.mark.asyncio
async def test_update_scene_text_raises_and_preserves_scene_when_llm_fails(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    db = _make_session(tmp_path)
    service = ProjectService(db)
    project = await service.create_project("旧文案", "9:16", "voice_test")
    scene = Scene(
        project_id=project.id,
        idx=0,
        text="旧文案",
        keywords_zh=["旧"],
        keywords_en=["old"],
        sentiment="neutral",
        scene_description_en="Old scene",
        duration_ms=1000,
        selected_video=None,
        candidate_videos=[],
        audio_url=str(tmp_path / "old.mp3"),
        word_boundaries=[],
        timeline={"subtitles": []},
    )
    db.add(scene)
    db.commit()
    db.refresh(project)

    monkeypatch.setattr(service.llm, "analyze_single_scene", lambda *_args: (_ for _ in ()).throw(RuntimeError("LLM 401")))

    with pytest.raises(RuntimeError, match="LLM 401"):
        await service.update_scene_text(project, 0, "新文案")

    db.rollback()
    stored = service.get_project(project.id)
    assert stored is not None
    assert stored.scenes[0].text == "旧文案"
    assert stored.scenes[0].selected_video is None
    assert stored.scenes[0].candidate_videos == []


@pytest.mark.asyncio
async def test_prepare_project_regeneration_sets_regenerating_all(tmp_path: Path) -> None:
    db = _make_session(tmp_path)
    service = ProjectService(db)
    project = await service.create_project("demo", "9:16", "voice_test")
    project.status = "failed"
    project.error_message = "boom"
    db.commit()
    db.refresh(project)

    updated = service.prepare_project_regeneration(project)

    assert updated.status == "regenerating_all"
    assert updated.error_message is None
