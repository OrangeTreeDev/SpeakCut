from pathlib import Path

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.api.routes import serialize_project
from app.core.database import Base
from app.models import Project
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
