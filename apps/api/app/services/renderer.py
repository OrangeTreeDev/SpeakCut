from __future__ import annotations

import subprocess
from pathlib import Path
from typing import Any

from app.core.config import get_settings


def _target_resolution(aspect_ratio: str) -> tuple[int, int]:
    return (1080, 1920) if aspect_ratio == "9:16" else (1920, 1080)


def _ass_time(ms: int) -> str:
    total_cs = max(ms, 0) // 10
    cs = total_cs % 100
    total_seconds = total_cs // 100
    seconds = total_seconds % 60
    total_minutes = total_seconds // 60
    minutes = total_minutes % 60
    hours = total_minutes // 60
    return f"{hours}:{minutes:02d}:{seconds:02d}.{cs:02d}"


def _ass_color(hex_color: str) -> str:
    value = hex_color.lstrip("#")
    if len(value) != 6:
        value = "FFFFFF"
    red, green, blue = value[0:2], value[2:4], value[4:6]
    return f"&H00{blue}{green}{red}"


def _ass_text(text: str) -> str:
    return text.replace("\\", "\\\\").replace("{", "\\{").replace("}", "\\}").replace("\n", "\\N")


def _ffmpeg_filter_path(path: Path) -> str:
    return str(path.resolve()).replace("\\", "\\\\").replace(":", "\\:").replace("'", "\\'")


def _ffmpeg_concat_line(path: Path) -> str:
    escaped = str(path.resolve()).replace("'", "'\\''")
    return f"file '{escaped}'\n"


def _write_ass_file(path: Path, size: tuple[int, int], subtitles: list[dict[str, Any]], style: dict[str, Any]) -> None:
    font_name = str(style.get("font_family") or Path(get_settings().subtitle_font_path).stem).split(",")[0].strip("\"' ")
    font_size = int(style["font_size"])
    outline = int(style["stroke_width"])
    primary = _ass_color(style["color"])
    outline_color = _ass_color(style["stroke_color"])
    margin_v = int(size[1] * 0.12)
    lines = [
        "[Script Info]",
        "ScriptType: v4.00+",
        f"PlayResX: {size[0]}",
        f"PlayResY: {size[1]}",
        "WrapStyle: 2",
        "",
        "[V4+ Styles]",
        "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, "
        "Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, "
        "Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
        f"Style: Default,{font_name},{font_size},{primary},{primary},{outline_color},&H80000000,"
        f"1,0,0,0,100,100,0,0,1,{outline},0,2,80,80,{margin_v},1",
        "",
        "[Events]",
        "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
    ]
    for subtitle in subtitles:
        lines.append(
            "Dialogue: 0,"
            f"{_ass_time(int(subtitle['start_ms']))},"
            f"{_ass_time(int(subtitle['end_ms']))},"
            f"Default,,0,0,0,,{_ass_text(str(subtitle['text']))}"
        )
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def _render_scene_part(
    video_path: str,
    audio_path: str,
    subtitles_path: Path,
    output_path: Path,
    duration_sec: float,
    size: tuple[int, int],
) -> None:
    settings = get_settings()
    video_filter = (
        f"scale={size[0]}:{size[1]}:force_original_aspect_ratio=increase,"
        f"crop={size[0]}:{size[1]},setsar=1,"
        f"trim=duration={duration_sec:.3f},setpts=PTS-STARTPTS,"
        f"subtitles='{_ffmpeg_filter_path(subtitles_path)}'"
    )
    subprocess.run(
        [
            settings.ffmpeg_binary,
            "-y",
            "-stream_loop",
            "-1",
            "-i",
            video_path,
            "-i",
            audio_path,
            "-filter_complex",
            f"[0:v]{video_filter}[v];[1:a]atrim=duration={duration_sec:.3f},asetpts=PTS-STARTPTS[a]",
            "-map",
            "[v]",
            "-map",
            "[a]",
            "-r",
            "30",
            "-c:v",
            "libx264",
            "-preset",
            "veryfast",
            "-crf",
            "23",
            "-pix_fmt",
            "yuv420p",
            "-c:a",
            "aac",
            "-b:a",
            "128k",
            "-movflags",
            "+faststart",
            str(output_path),
        ],
        check=True,
        capture_output=True,
    )


def render_project(
    project_id: str,
    aspect_ratio: str,
    scenes: list[dict[str, Any]],
    subtitle_style: dict[str, Any],
    output_path: Path,
) -> str:
    size = _target_resolution(aspect_ratio)
    settings = get_settings()
    parts_dir = output_path.parent / f"{project_id}_parts"
    parts_dir.mkdir(parents=True, exist_ok=True)
    part_paths: list[Path] = []

    for scene_number, scene in enumerate(scenes):
        if not scene.get("selected_video") or not scene.get("local_video_path") or not scene.get("audio_url"):
            continue
        duration_sec = max(float(scene["duration_ms"]) / 1000, 1.0)
        subtitles_path = parts_dir / f"scene_{scene_number:04d}.ass"
        part_path = parts_dir / f"scene_{scene_number:04d}.mp4"
        _write_ass_file(subtitles_path, size, scene["timeline"]["subtitles"], subtitle_style)
        _render_scene_part(
            scene["local_video_path"],
            scene["audio_url"],
            subtitles_path,
            part_path,
            duration_sec,
            size,
        )
        part_paths.append(part_path)

    if not part_paths:
        raise ValueError(f"No renderable scenes for project {project_id}")

    concat_file = parts_dir / "concat.txt"
    concat_file.write_text("".join(_ffmpeg_concat_line(path) for path in part_paths), encoding="utf-8")
    subprocess.run(
        [
            settings.ffmpeg_binary,
            "-y",
            "-f",
            "concat",
            "-safe",
            "0",
            "-i",
            str(concat_file),
            "-c",
            "copy",
            "-movflags",
            "+faststart",
            str(output_path),
        ],
        check=True,
        capture_output=True,
    )
    return str(output_path)
