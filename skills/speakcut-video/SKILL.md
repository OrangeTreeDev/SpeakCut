---
name: speakcut-video
description: Use this skill when the user wants to generate, inspect, patch, preview, or export a local short-form video from narration text with the speak-cut npm CLI. The skill calls speak-cut through stdio JSON or documented CLI flags; it never starts HTTP services or calls FastAPI directly.
metadata:
  short-description: Generate local videos with speak-cut CLI
---

# SpeakCut Video

## Protocol

Prefer the `speak-cut` npm CLI. Use `npx speak-cut` when the binary is not already installed.

```bash
npx speak-cut <<'JSON'
{"action":"healthcheck"}
JSON
```

Do not start FastAPI, Vite, or use HTTP for this skill. The CLI owns runtime setup, local storage, static preview packaging, and video export.

## Workflow

1. Run `npx speak-cut --version` or `healthcheck`.
2. For new videos, call `generate` through stdio JSON. Human-facing flag mode is acceptable only for simple one-shot commands.
3. Return `project_file`, `preview_file`, and `export_file` to the user.
4. The preview HTML is read-only. If the user asks for edits, translate the request into `patch` operations.
5. After patching, call `package_preview`; call `export` only when the user wants a rendered MP4.

## Actions

Generate:

```json
{
  "action": "generate",
  "text": "...",
  "aspect_ratio": "9:16",
  "voice_id": "zh-CN-YunxiNeural",
  "export": true,
  "package_preview": true
}
```

Patch:

```json
{
  "action": "patch",
  "project_file": "storage/projects/proj_xxx/project.speakcut.json",
  "changes": [
    {"op": "update_subtitle_style", "font_size": 60, "stroke_width": 3},
    {"op": "update_scene_text", "scene_index": 2, "text": "新的分镜文本"},
    {"op": "replace_scene_material", "scene_index": 3, "query": "city night street vertical video"}
  ],
  "regenerate": {"preview": true}
}
```

Export:

```json
{
  "action": "export",
  "project_file": "storage/projects/proj_xxx/project.speakcut.json"
}
```

For details, read `references/cli-protocol.md`, `references/patch-ops.md`, or `references/troubleshooting.md` only when needed.
