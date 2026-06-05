# SpeakCut Skill 技术方案

## 目标

将 SpeakCut 封装为可被 Codex、Claude Code 等本地 agent 调用的 Skill。用户输入一段文本后，agent 通过 Skill 调用 `speak-cut` npm CLI 生成短视频，并返回本地项目文件、只读预览 HTML 和导出视频路径。

Skill **优先使用 stdio JSON 协议** 调用 `speak-cut`，可在简单场景使用 CLI 参数模式；不通过 HTTP 调用 SpeakCut，也不负责启动 FastAPI 或 Vite。

## 使用模式

SpeakCut 保留两种使用方式：

```text
Web 服务模式：
React Web -> FastAPI -> Core Workflows -> SQLite/storage

Agent Skill 模式：
Codex / Claude Code -> SpeakCut Skill -> npx speak-cut -> CLI stdio JSON -> Core Workflows -> project bundle / preview / export
```

两种模式共享同一套核心 workflow。

正确依赖方向：

```text
FastAPI -> Core Workflows
CLI     -> Core Workflows
```

不要设计成：

```text
CLI -> HTTP -> FastAPI
FastAPI -> subprocess CLI
```

## 核心边界

### Skill

负责：

- 判断何时使用 SpeakCut。
- 将用户自然语言转换为 `speak-cut` CLI stdio JSON。
- 调用 `npx speak-cut` 或已安装的 `speak-cut`。
- 解析 CLI stdout JSON / NDJSON。
- 返回 `project_file`、`preview_file`、`export_file`。
- 根据用户修改建议生成结构化 patch 请求。

不负责：

- 启动 HTTP 服务。
- 调用 FastAPI 接口。
- 直接操作 SQLite。
- 直接改写 `storage`。
- 直接拼 FFmpeg 命令。

### CLI

负责：

- 从 stdin 接收 JSON 请求。
- 向 stdout 输出 JSON / NDJSON。
- 调用核心 workflow。
- 生成 project bundle。
- 生成只读静态预览。
- 导出视频。

CLI 作为独立 npm 包分发，包名建议为 `speak-cut`。Skill 不携带完整应用运行时，只指导 agent 使用 CLI。

### Core Workflows

负责：

- 文本分镜。
- 素材检索。
- TTS 配音。
- 字幕时间轴。
- ASS 字幕生成。
- FFmpeg 渲染。
- 项目修改。
- 项目导出。
- 静态预览打包。

### Web

负责：

- Web 服务模式下的交互式编辑。
- API 模式预览。
- 项目管理。

Web 是 SpeakCut 项目能力，不是 Skill 默认调用路径。

## 推荐目录

Skill 标准发布目录：

```text
skills/speakcut-video/
├── SKILL.md
├── agents/
│   └── openai.yaml
└── references/
    ├── cli-protocol.md
    ├── patch-ops.md
    ├── project-bundle.md
    └── troubleshooting.md
```

项目内新增：

```text
apps/api/app/workflows/
├── generate.py
├── patch.py
├── export.py
├── package_preview.py
└── inspect.py

apps/api/scripts/
└── speakcut.py
```

安装方式：

```bash
npx skills add https://github.com/your-org/SpeakCut/tree/main/skills/speakcut-video -a codex
```

或从完整仓库安装指定 skill：

```bash
npx skills add your-org/SpeakCut --skill speakcut-video -a codex
```

## stdio 协议

Skill 调用 `speak-cut` 时优先使用 stdin / stdout。

调用形式：

```bash
npx speak-cut <<'JSON'
{
  "action": "generate",
  "text": "这里是一段旁白",
  "aspect_ratio": "9:16",
  "voice_id": "zh-CN-YunxiNeural",
  "export": true,
  "package_preview": true
}
JSON
```

简单参数模式：

```bash
npx speak-cut generate --text-file input.txt --aspect-ratio 9:16 --voice-id zh-CN-YunxiNeural --export --preview
```

CLI 可以输出 NDJSON 进度：

```json
{"type":"progress","stage":"llm","message":"analyzing narration"}
{"type":"progress","stage":"tts","scene_index":1}
{"type":"progress","stage":"render","message":"rendering scene 1"}
{"type":"result","status":"completed","project_id":"proj_xxx","project_file":"storage/projects/proj_xxx/project.speakcut.json","preview_file":"storage/projects/proj_xxx/preview/index.html","export_file":"storage/projects/proj_xxx/exports/final.mp4"}
```

失败输出：

```json
{
  "type": "error",
  "status": "failed",
  "stage": "tts",
  "message": "edge-tts synthesis failed",
  "project_id": "proj_xxx"
}
```

约定：

- stdout 只输出机器可解析 JSON / NDJSON。
- 人类日志写入 stderr。
- 最终结果必须包含 `type: "result"` 或 `type: "error"`。
- 路径使用本地文件路径。

## CLI Action

Skill 只依赖以下 action：

```text
healthcheck
generate
inspect
patch
export
package_preview
```

### healthcheck

检查本地运行条件。

输入：

```json
{"action":"healthcheck"}
```

输出：

```json
{
  "type": "result",
  "status": "ok",
  "checks": {
    "python": true,
    "ffmpeg": true,
    "storage": true,
    "llm_config": true,
    "tts": true
  }
}
```

### generate

根据文本生成项目，可选直接导出和打包预览。

输入：

```json
{
  "action": "generate",
  "text": "...",
  "aspect_ratio": "9:16",
  "voice_id": "zh-CN-YunxiNeural",
  "export": false,
  "package_preview": true
}
```

输出：

```json
{
  "type": "result",
  "status": "completed",
  "project_id": "proj_xxx",
  "project_file": "storage/projects/proj_xxx/project.speakcut.json",
  "preview_file": "storage/projects/proj_xxx/preview/index.html",
  "export_file": null
}
```

### inspect

读取项目摘要。

输入：

```json
{
  "action": "inspect",
  "project_file": "storage/projects/proj_xxx/project.speakcut.json"
}
```

输出：

```json
{
  "type": "result",
  "status": "completed",
  "project_id": "proj_xxx",
  "scene_count": 6,
  "duration_ms": 38200,
  "has_export": false
}
```

### patch

根据结构化修改更新项目。用户自然语言修改建议由 Skill 转换为 patch JSON。

输入：

```json
{
  "action": "patch",
  "project_file": "storage/projects/proj_xxx/project.speakcut.json",
  "changes": [
    {
      "op": "update_subtitle_style",
      "font_size": 60,
      "stroke_width": 3
    },
    {
      "op": "update_scene_text",
      "scene_index": 2,
      "text": "新的分镜文本"
    },
    {
      "op": "replace_scene_material",
      "scene_index": 3,
      "query": "city night street vertical video"
    }
  ],
  "regenerate": {
    "tts": true,
    "timeline": true,
    "preview": true
  }
}
```

输出：

```json
{
  "type": "result",
  "status": "completed",
  "project_file": "storage/projects/proj_xxx/project.speakcut.json",
  "preview_file": "storage/projects/proj_xxx/preview/index.html",
  "changed": ["subtitle_style", "scene_text", "material", "timeline", "preview"]
}
```

### export

导出当前项目。

输入：

```json
{
  "action": "export",
  "project_file": "storage/projects/proj_xxx/project.speakcut.json"
}
```

输出：

```json
{
  "type": "result",
  "status": "completed",
  "project_id": "proj_xxx",
  "export_file": "storage/projects/proj_xxx/exports/final.mp4"
}
```

### package_preview

重新生成只读静态预览。

输入：

```json
{
  "action": "package_preview",
  "project_file": "storage/projects/proj_xxx/project.speakcut.json"
}
```

输出：

```json
{
  "type": "result",
  "status": "completed",
  "preview_file": "storage/projects/proj_xxx/preview/index.html"
}
```

## Project Bundle

Agent 模式生成本地项目包：

```text
storage/projects/proj_xxx/
├── project.speakcut.json
├── preview/
│   ├── index.html
│   ├── assets/
│   └── project-data.js
├── media/
│   ├── audio/
│   ├── videos/
│   └── thumbnails/
├── subtitles/
│   └── scene_0001.ass
└── exports/
    └── final.mp4
```

`project.speakcut.json` 是 Agent 模式的项目事实源：

```json
{
  "project_id": "proj_xxx",
  "text": "...",
  "aspect_ratio": "9:16",
  "voice_id": "zh-CN-YunxiNeural",
  "subtitle_style": {
    "font_family": "Noto Sans SC",
    "font_size": 48,
    "color": "#FFFFFF",
    "stroke_color": "#000000",
    "stroke_width": 2
  },
  "scenes": [
    {
      "index": 1,
      "text": "...",
      "duration_ms": 4200,
      "selected_video": "media/videos/scene_0001.mp4",
      "audio": "media/audio/scene_0001.mp3",
      "subtitles": [
        {"text": "字幕文本", "start_ms": 0, "end_ms": 1200}
      ]
    }
  ]
}
```

## 只读静态预览

Agent 模式不启动 HTTP。

预览使用 `apps/web` 的编译结果。CLI 将编译产物复制到：

```text
storage/projects/proj_xxx/preview/
```

并生成：

```text
preview/project-data.js
```

内容：

```js
window.__SPEAKCUT_PROJECT__ = {...}
```

静态 HTML 只读展示：

- 最终视频。
- 分镜列表。
- 字幕时间轴。
- 选中素材。
- 候选素材。
- 音频信息。
- 项目文件路径。
- 导出文件路径。

用户修改不在 HTML 内保存。

修改流程：

```text
用户查看 preview/index.html
  ↓
用户告诉 agent 修改建议
  ↓
Skill 转换为 patch JSON
  ↓
CLI patch 更新 project bundle
  ↓
CLI package_preview 重建静态预览
  ↓
用户刷新 HTML
```

## 数据本地化

本地保存：

```text
SQLite
storage/generated/audio
storage/downloads/videos
storage/exports
storage/projects
project.speakcut.json
preview HTML
```

说明：

- 项目数据、媒体缓存、字幕文件、预览文件、导出结果保存在本地。
- 默认 LLM、edge-tts、Pexels/Pixabay 仍可能访问外部服务。
- 完全离线需要后续接入本地 LLM、本地 TTS 和本地素材库。

## Skill Workflow

```text
1. 用户输入文本生成视频。
2. Skill 调用 `npx speak-cut` healthcheck。
3. Skill 通过 stdio JSON 调用 generate。
4. CLI 生成 project bundle。
5. CLI 可选导出 MP4。
6. CLI 生成只读 preview HTML。
7. Skill 返回 project_file / preview_file / export_file。
8. 用户提出修改建议。
9. Skill 转成 patch JSON。
10. CLI patch 更新项目。
11. CLI 重建 preview / export。
12. Skill 返回新结果。
```

## 实施顺序

1. 抽出 `Core Workflows`，让 FastAPI 和 CLI 共享。
2. 新增 `speak-cut` npm CLI。
3. 实现 stdio JSON 协议和参数模式。
4. 实现 `healthcheck`、`generate`、`inspect`、`patch`、`export`、`package_preview`。
5. 实现 project bundle。
6. 实现只读静态预览打包。
7. 新增标准发布目录 `skills/speakcut-video`。
8. 编写 `SKILL.md` 和 references。
9. 保留并适配现有 Web 服务模式。

## 关键结论

SpeakCut Skill 的首选调用协议是：

```text
stdio JSON over speak-cut npm CLI
```

SpeakCut 项目的最终形态是：

```text
一个核心视频生成引擎
两个产品入口：
- Web: React + FastAPI
- Agent: Skill + npx speak-cut + CLI stdio

两个预览方式：
- Web 编辑器：可交互
- 静态 HTML：只读

一个 Agent 写入入口：
- CLI / Core Workflow
```
