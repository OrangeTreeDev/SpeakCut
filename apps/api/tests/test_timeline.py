from app.services.timeline import (
    build_global_timeline,
    build_scene_timeline,
    build_subtitle_segments,
    select_best_video_for_duration,
    select_video_strategy,
)


def test_build_subtitle_segments_groups_words() -> None:
    boundaries = [
        {"text": "在", "offset_ms": 0, "duration_ms": 100},
        {"text": "繁忙", "offset_ms": 100, "duration_ms": 200},
        {"text": "的", "offset_ms": 300, "duration_ms": 100},
        {"text": "城市", "offset_ms": 400, "duration_ms": 200},
        {"text": "街头", "offset_ms": 600, "duration_ms": 200},
    ]
    subtitles = build_subtitle_segments(boundaries)
    assert subtitles
    assert subtitles[0]["start_ms"] == 0
    assert subtitles[0]["end_ms"] > subtitles[0]["start_ms"]


def test_select_video_strategy() -> None:
    assert select_video_strategy(10, 5000)[0] == "trim"
    assert select_video_strategy(4, 5000)[0] in {"slowdown", "direct"}
    assert select_video_strategy(2, 5000)[0] == "loop"


def test_select_best_video_for_duration_picks_closest_candidate() -> None:
    videos = [
        {"id": 1, "duration": 12},
        {"id": 2, "duration": 4},
        {"id": 3, "duration": 7},
    ]

    assert select_best_video_for_duration(videos, 6500) == {"id": 3, "duration": 7}


def test_build_global_timeline() -> None:
    scene = {
        "selected_video": {"duration": 8, "video_url": "x"},
        "audio": {
            "audio_path": "a.mp3",
            "duration_ms": 5000,
            "word_boundaries": [{"text": "你好世界", "offset_ms": 0, "duration_ms": 1000}],
        },
    }
    scene_timeline = build_scene_timeline(scene)
    timeline = build_global_timeline([{"index": 0, "timeline": scene_timeline}])
    assert timeline[0]["global_start_ms"] == 0
    assert timeline[0]["global_end_ms"] == 5000
