# SpeakCut

NarraClip MVP implementation for turning narration into short-form videos.

## Stack

- Frontend: React 18, TypeScript, Vite, Zustand
- Backend: FastAPI, SQLAlchemy, SQLite
- Video pipeline: FFmpeg, edge-tts
- LLM: OpenRouter OpenAI-compatible API

## Architecture

```mermaid
flowchart TB
  User["用户 / 浏览器"]

  subgraph Web["前端 apps/web"]
    Pages["页面\n创建 / 项目库 / 编辑"]
    Components["核心组件\n分镜列表 / 预览 / 检查器 / 导出栏"]
    Store["Zustand 状态\nprojectStore"]
    ApiClient["API Client\nlib/api.ts"]
  end

  subgraph Backend["后端 apps/api"]
    Routes["FastAPI 路由\napi/routes.py"]
    ProjectService["ProjectService\n项目生成 / 编辑 / 导出"]
    MediaServices["媒体与 AI 服务\nLLM / Pexels / TTS / Timeline / Renderer"]
    DB["SQLite\nProject / Scene / ExportJob"]
    Storage["storage\n音频 / 素材 / 导出 / LLM缓存"]
  end

  subgraph External["外部依赖"]
    OpenRouter["OpenRouter LLM"]
    Pexels["Pexels 视频素材"]
    EdgeTTS["edge-tts 语音"]
    FFmpeg["FFmpeg 渲染"]
  end

  User --> Pages
  Pages --> Components
  Components --> Store
  Store --> ApiClient
  ApiClient --> Routes

  Routes --> ProjectService
  ProjectService --> MediaServices
  ProjectService --> DB
  ProjectService --> Storage

  MediaServices --> OpenRouter
  MediaServices --> Pexels
  MediaServices --> EdgeTTS
  MediaServices --> FFmpeg

  Storage --> Components
```

## Quick Start

1. Copy `.env.example` to `.env.local` for local secrets and machine-specific overrides.
2. Install backend dependencies:
   `python3 -m venv .venv && source .venv/bin/activate && pip install -r apps/api/requirements.txt`
3. Install frontend dependencies:
   `npm install`
4. Start backend:
   `make api`
5. Start frontend:
   `make web`

## Tests

- Backend: `make test-api`
- Frontend: `make test-web`

## Notes

- Requires a reachable network for OpenRouter, Pexels, Edge TTS, and Pixabay.
- Requires `ffmpeg` installed and available on `PATH`.
- Python 3.11 is the target runtime. The current machine does not yet have it installed.
