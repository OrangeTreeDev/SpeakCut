from app.api.routes import serialize_project
from app.models import Project


def test_serialize_project_includes_null_bgm() -> None:
    project = Project(
        id="proj_test",
        text="demo",
        status="draft",
        aspect_ratio="9:16",
        voice_id="voice_test",
        total_duration_ms=0,
        subtitle_style={},
        bgm=None,
        preview_url=None,
    )
    project.scenes = []

    response = serialize_project(project)

    assert response.bgm is None
