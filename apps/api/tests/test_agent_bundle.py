from __future__ import annotations

import json
from pathlib import Path

from app.workflows import agent_bundle


def test_preview_payload_preserves_remote_thumbnail_url() -> None:
    payload = {
        "project_id": "proj_test",
        "status": "ready",
        "aspect_ratio": "9:16",
        "voice_id": "zh-CN-YunxiNeural",
        "total_duration_ms": 1000,
        "subtitle_style": {},
        "export_file": None,
        "project_file": "project.speakcut.json",
        "scenes": [
            {
                "index": 0,
                "audio_url": "media/audio/scene.mp3",
                "selected_video": {
                    "id": 1,
                    "video_url": "media/videos/scene.mp4",
                    "thumbnail": "https://images.pexels.com/photos/example.jpeg",
                    "duration": 1,
                    "width": 1080,
                    "height": 1920,
                },
                "candidate_videos": [
                    {
                        "id": 2,
                        "video_url": "https://videos.pexels.com/video-files/example.mp4",
                        "thumbnail": "https://images.pexels.com/photos/candidate.jpeg",
                        "duration": 1,
                        "width": 1080,
                        "height": 1920,
                    }
                ],
            }
        ],
    }

    project = agent_bundle._preview_project_payload(payload)
    selected_video = project["scenes"][0]["selected_video"]
    candidate_video = project["scenes"][0]["candidate_videos"][0]

    assert selected_video["video_url"] == "../media/videos/scene.mp4"
    assert selected_video["thumbnail"] == "https://images.pexels.com/photos/example.jpeg"
    assert candidate_video["video_url"] == "https://videos.pexels.com/video-files/example.mp4"
    assert candidate_video["thumbnail"] == "https://images.pexels.com/photos/candidate.jpeg"


def test_export_bundle_uses_local_video_path_for_remote_source(tmp_path: Path, monkeypatch) -> None:
    bundle_dir = tmp_path / "project"
    video_path = bundle_dir / "media" / "videos" / "scene.mp4"
    audio_path = bundle_dir / "media" / "audio" / "scene.mp3"
    video_path.parent.mkdir(parents=True)
    audio_path.parent.mkdir(parents=True)
    video_path.write_bytes(b"video")
    audio_path.write_bytes(b"audio")
    project_file = bundle_dir / "project.speakcut.json"
    project_file.write_text(
        json.dumps(
            {
                "project_id": "proj_test",
                "aspect_ratio": "9:16",
                "subtitle_style": {},
                "scenes": [
                    {
                        "index": 0,
                        "duration_ms": 1000,
                        "audio_url": "media/audio/scene.mp3",
                        "timeline": {"subtitles": []},
                        "selected_video": {
                            "id": 1,
                            "video_url": "https://videos.pexels.com/video-files/example.mp4",
                            "local_video_path": "media/videos/scene.mp4",
                        },
                    }
                ],
            }
        ),
        encoding="utf-8",
    )

    captured = {}

    def fake_render_project(project_id, aspect_ratio, scenes, subtitle_style, output_path):
        captured["local_video_path"] = scenes[0]["local_video_path"]
        Path(output_path).write_bytes(b"mp4")
        return str(output_path)

    monkeypatch.setattr(agent_bundle, "render_project", fake_render_project)

    output = agent_bundle.export_bundle(project_file)

    assert output.exists()
    assert captured["local_video_path"] == str(video_path)
