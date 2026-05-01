---
name: ffmpeg-video-export
description: Design, implement, or debug ffmpeg-based video export pipelines. Use when Codex needs to render videos from scenes, images, clips, audio, subtitles, timelines, or background jobs; replace slow MoviePy/frame-by-frame rendering; fix export 500s/timeouts/OOMs; burn ASS/SRT subtitles; concatenate rendered segments; or make long-running media exports reliable in web apps.
---

# FFmpeg Video Export

## Core Approach

Prefer ffmpeg-native pipelines for production video export. Avoid designs that keep all video clips, frames, subtitles, and audio objects in Python/Node memory at once.

Default architecture for long exports:

1. Validate scene inputs and resolve local asset paths.
2. Render each scene to a normalized temporary part file.
3. Close/release resources after each part.
4. Concatenate part files with ffmpeg concat demuxer.
5. Run export work outside the request event loop.
6. Expose a job id and status endpoint for polling.

For detailed command patterns, read `references/ffmpeg-export-patterns.md`.

## Workflow

When implementing or fixing an export feature:

1. Inspect the current export path: request handler, job model, renderer, storage paths, and frontend download flow.
2. Identify whether failures are API lifecycle problems or media command problems.
3. If the export can exceed normal HTTP timeout windows, convert it to a queued/background job.
4. If the renderer uses MoviePy or canvas frame loops for long videos, replace the hot path with ffmpeg subprocess commands.
5. Normalize every scene part to the same codec, resolution, fps, pixel format, audio codec, and container before concat.
6. Capture ffmpeg stderr on failure and persist a concise error message for the user.
7. Verify with a single-scene render before testing a full multi-scene export.

## Async And Server Rules

- Do not run long `subprocess.run(...)` calls directly inside an async request path.
- In Python async services, use `asyncio.to_thread(...)`, a task queue, or a worker process for blocking ffmpeg work.
- Return quickly from `POST /export` with a job id and a status such as `queued`.
- Provide `GET /exports/{id}` or equivalent for `queued`, `rendering`, `completed`, and `failed`.
- Store `download_url` only after the final file exists.

## Rendering Rules

- Use `-stream_loop -1` when source video may be shorter than target audio.
- Use `scale=...:force_original_aspect_ratio=increase,crop=...,setsar=1` for cover-style framing.
- Use `trim=duration=...` and `setpts=PTS-STARTPTS` for deterministic scene duration.
- Use `atrim=duration=...` and `asetpts=PTS-STARTPTS` for audio alignment.
- Use ASS subtitles for styled text, strokes, alignment, and CJK-safe rendering.
- Use `-pix_fmt yuv420p` for broad browser/player compatibility.
- Use `-movflags +faststart` for web playback.
- Use concat demuxer after all parts have identical encoding settings.

## Validation

Minimum validation sequence:

1. Run a single-scene render with real assets.
2. Confirm the output file exists and is larger than a tiny placeholder.
3. Probe it with `ffprobe` or play it through the app.
4. Start a full export and confirm the status endpoint still responds while ffmpeg runs.
5. Confirm final status becomes `completed` and download URL resolves.

Useful shell checks:

```bash
ffprobe -hide_banner output.mp4
find storage/exports/project_parts -name 'scene_*.mp4' -size +1k | wc -l
```

## Common Failures

- `TextClip missing font`: avoid MoviePy TextClip for export hot paths, or provide a real font. Prefer ASS + ffmpeg subtitles.
- Browser request 500 or empty reply after 30 seconds: export is synchronous; move it to background job + polling.
- API status endpoint hangs during render: blocking subprocess is running on the event loop; move it to a thread or worker.
- Output concat fails: part files likely differ in codec, fps, resolution, pixel format, or audio layout.
- Tiny `scene_000x.mp4` files: ffmpeg failed early; inspect captured stderr and command arguments.
- No subtitles or broken CJK text: verify ASS file encoding is UTF-8 and use a font with required glyphs.
