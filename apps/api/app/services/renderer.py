from __future__ import annotations

from pathlib import Path
from typing import Any

from moviepy import AudioFileClip, CompositeVideoClip, TextClip, VideoFileClip, concatenate_videoclips

from app.core.config import get_settings


def _target_resolution(aspect_ratio: str) -> tuple[int, int]:
    return (1080, 1920) if aspect_ratio == "9:16" else (1920, 1080)


def render_project(
    project_id: str,
    aspect_ratio: str,
    scenes: list[dict[str, Any]],
    subtitle_style: dict[str, Any],
    output_path: Path,
) -> str:
    size = _target_resolution(aspect_ratio)
    video_clips = []
    audio_clips = []
    for scene in scenes:
        if not scene.get("selected_video") or not scene.get("local_video_path") or not scene.get("audio_url"):
            continue
        video_url = scene["local_video_path"]
        audio_path = scene["audio_url"]
        clip = VideoFileClip(video_url)
        duration_sec = max(scene["duration_ms"] / 1000, 1)
        clip = clip.with_duration(duration_sec).resized(new_size=size)
        subtitles = []
        for subtitle in scene["timeline"]["subtitles"]:
            subtitle_clip = (
                TextClip(
                    text=subtitle["text"],
                    font_size=subtitle_style["font_size"],
                    color=subtitle_style["color"],
                    stroke_color=subtitle_style["stroke_color"],
                    stroke_width=subtitle_style["stroke_width"],
                    size=(int(size[0] * 0.84), None),
                    method="caption",
                )
                .with_start(subtitle["start_ms"] / 1000)
                .with_end(subtitle["end_ms"] / 1000)
                .with_position(("center", int(size[1] * 0.83)))
            )
            subtitles.append(subtitle_clip)
        scene_video = CompositeVideoClip([clip, *subtitles], size=size)
        scene_audio = AudioFileClip(audio_path)
        scene_video = scene_video.with_audio(scene_audio)
        video_clips.append(scene_video)
        audio_clips.append(scene_audio)

    if not video_clips:
        raise ValueError(f"No renderable scenes for project {project_id}")

    final_video = concatenate_videoclips(video_clips, method="compose")

    settings = get_settings()
    final_video.write_videofile(
        str(output_path),
        fps=30,
        codec="libx264",
        audio_codec="aac",
        ffmpeg_params=["-crf", "18"],
        ffmpeg_binary=settings.ffmpeg_binary,
        logger=None,
    )
    final_video.close()
    for clip in audio_clips + video_clips:
        clip.close()
    return str(output_path)
