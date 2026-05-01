# FFmpeg Export Patterns

Use this reference when implementing the actual renderer or debugging command failures.

## Scene Part Command

Render one scene part from source video + narration audio + ASS subtitles:

```bash
ffmpeg -y \
  -stream_loop -1 \
  -i input-video.mp4 \
  -i narration.mp3 \
  -filter_complex "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,trim=duration=8.587,setpts=PTS-STARTPTS,subtitles='scene_0000.ass'[v];[1:a]atrim=duration=8.587,asetpts=PTS-STARTPTS[a]" \
  -map "[v]" \
  -map "[a]" \
  -r 30 \
  -c:v libx264 \
  -preset veryfast \
  -crf 23 \
  -pix_fmt yuv420p \
  -c:a aac \
  -b:a 128k \
  -movflags +faststart \
  scene_0000.mp4
```

Notes:

- `-stream_loop -1` makes short source clips usable for longer voiceover scenes.
- `force_original_aspect_ratio=increase,crop=...` gives cover-style fill without letterboxing.
- Keep every part on the same fps, codec, pixel format, audio codec, and resolution.
- Escape subtitle paths when embedding them in filter strings.

## ASS Subtitle Skeleton

Generate UTF-8 `.ass` files for styled subtitles:

```text
[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 2

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,NotoSansCJK-Bold,48,&H00FFFFFF,&H00FFFFFF,&H00000000,&H80000000,1,0,0,0,100,100,0,0,1,2,0,2,80,80,230,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:00.10,0:00:01.45,Default,,0,0,0,,字幕文本
```

ASS color format is `&HAABBGGRR`, not CSS `#RRGGBB`.

## Python Helpers

Time formatting:

```python
def ass_time(ms: int) -> str:
    total_cs = max(ms, 0) // 10
    cs = total_cs % 100
    total_seconds = total_cs // 100
    seconds = total_seconds % 60
    total_minutes = total_seconds // 60
    minutes = total_minutes % 60
    hours = total_minutes // 60
    return f"{hours}:{minutes:02d}:{seconds:02d}.{cs:02d}"
```

ASS color conversion:

```python
def ass_color(hex_color: str) -> str:
    value = hex_color.lstrip("#")
    if len(value) != 6:
        value = "FFFFFF"
    red, green, blue = value[0:2], value[2:4], value[4:6]
    return f"&H00{blue}{green}{red}"
```

Concat file line:

```python
def ffmpeg_concat_line(path: Path) -> str:
    escaped = str(path.resolve()).replace("'", "'\\''")
    return f"file '{escaped}'\n"
```

Subtitles filter path:

```python
def ffmpeg_filter_path(path: Path) -> str:
    return str(path.resolve()).replace("\\", "\\\\").replace(":", "\\:").replace("'", "\\'")
```

## Concat Command

After all scene parts are rendered:

```bash
ffmpeg -y \
  -f concat \
  -safe 0 \
  -i concat.txt \
  -c copy \
  -movflags +faststart \
  output.mp4
```

`concat.txt`:

```text
file '/absolute/path/scene_0000.mp4'
file '/absolute/path/scene_0001.mp4'
```

If concat fails or output has broken audio/video, re-encode the final concat as a fallback:

```bash
ffmpeg -y -f concat -safe 0 -i concat.txt \
  -c:v libx264 -preset veryfast -crf 23 -pix_fmt yuv420p \
  -c:a aac -b:a 128k -movflags +faststart output.mp4
```

## Job Lifecycle Pattern

Recommended backend flow:

1. `POST /exports`: create job row with `queued`, return `{ export_id, status }`.
2. Background task sets `rendering`, prepares assets, renders parts, concats final file.
3. On success, set `completed`, `progress=1`, `download_url`.
4. On failure, set `failed`, `error_message` from stderr or exception.
5. `GET /exports/{id}` always returns current status quickly.

In async Python, wrap blocking render work:

```python
await asyncio.to_thread(render_project, project_id, scenes, output_path)
```

For production, prefer a real worker queue when exports can outlive web process restarts.
