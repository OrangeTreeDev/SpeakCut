from __future__ import annotations

from typing import Any


def build_subtitle_segments(word_boundaries: list[dict[str, Any]]) -> list[dict[str, Any]]:
    if not word_boundaries:
        return []
    segments: list[dict[str, Any]] = []
    chunk: list[dict[str, Any]] = []
    for item in word_boundaries:
        chunk.append(item)
        combined_length = sum(len(entry["text"]) for entry in chunk)
        if combined_length >= 8:
            start_ms = chunk[0]["offset_ms"]
            end_ms = chunk[-1]["offset_ms"] + chunk[-1]["duration_ms"]
            segments.append(
                {
                    "text": "".join(entry["text"] for entry in chunk),
                    "start_ms": start_ms,
                    "end_ms": end_ms,
                }
            )
            chunk = []
    if chunk:
        segments.append(
            {
                "text": "".join(entry["text"] for entry in chunk),
                "start_ms": chunk[0]["offset_ms"],
                "end_ms": chunk[-1]["offset_ms"] + chunk[-1]["duration_ms"],
            }
        )
    return segments


def select_video_strategy(video_duration_sec: int, audio_duration_ms: int) -> tuple[str, int]:
    target_sec = max(audio_duration_ms / 1000, 1)
    if video_duration_sec == 0:
        return "placeholder", 0
    gap_ratio = abs(video_duration_sec - target_sec) / target_sec
    if gap_ratio < 0.05:
        return "direct", int(target_sec * 1000)
    if video_duration_sec > target_sec:
        return "trim", int(target_sec * 1000)
    if gap_ratio < 0.3:
        return "slowdown", int(target_sec * 1000)
    return "loop", int(target_sec * 1000)


def build_scene_timeline(scene: dict[str, Any]) -> dict[str, Any]:
    video = scene.get("selected_video") or {}
    strategy, end_ms = select_video_strategy(video.get("duration", 0), scene["audio"]["duration_ms"])
    return {
        "start_ms": 0,
        "end_ms": end_ms,
        "audio": {
            "file": scene["audio"]["audio_path"],
            "duration_ms": scene["audio"]["duration_ms"],
            "volume_db": 0,
        },
        "video": {
            "file": video.get("video_url", ""),
            "source_start_ms": 0,
            "source_end_ms": end_ms,
            "strategy": strategy,
        },
        "subtitles": build_subtitle_segments(scene["audio"]["word_boundaries"]),
    }


def build_global_timeline(scenes: list[dict[str, Any]]) -> list[dict[str, Any]]:
    global_offset_ms = 0
    timeline: list[dict[str, Any]] = []
    for scene in scenes:
        duration = scene["timeline"]["audio"]["duration_ms"]
        timeline.append(
            {
                "scene_index": scene["index"],
                "global_start_ms": global_offset_ms,
                "global_end_ms": global_offset_ms + duration,
                "audio": scene["timeline"]["audio"],
                "video": scene["timeline"]["video"],
                "subtitles": [
                    {
                        **subtitle,
                        "global_start_ms": global_offset_ms + subtitle["start_ms"],
                        "global_end_ms": global_offset_ms + subtitle["end_ms"],
                    }
                    for subtitle in scene["timeline"]["subtitles"]
                ],
            }
        )
        global_offset_ms += duration
    return timeline

