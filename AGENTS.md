# AGENTS.md

Guidance for coding agents working in this repository.

## Project Overview

SpeakCut is a short-form video generation MVP. It turns narration text into scenes, finds stock video candidates, synthesizes voiceover audio, builds subtitle timelines, and exports a rendered video.

Main stack:

- Frontend: React 18, TypeScript, Vite, Zustand, Radix UI primitives, lucide-react
- Backend: FastAPI, SQLAlchemy, SQLite
- Media: FFmpeg, edge-tts, Pexels video assets
- LLM: OpenRouter OpenAI-compatible API

## Repository Layout

- `apps/web`: Vite React frontend.
- `apps/api`: FastAPI backend.
- `.agents/skills/ffmpeg-video-export`: project-level Codex skill for ffmpeg export design and debugging.
- `apps/api/app/api/routes.py`: API endpoints and background task entry points.
- `apps/api/app/services`: backend domain services for projects, LLM, TTS, media search, rendering, timelines, and files.
- `apps/api/app/models.py`: SQLAlchemy models.
- `apps/api/app/schemas.py`: Pydantic response/request models.
- `apps/api/tests`: backend tests.
- `storage`: generated audio, downloaded videos, exports, previews, and cached LLM output.
- `assets`: screenshots and UI reference assets.

Do not treat `storage`, `.venv`, `node_modules`, SQLite DB files, or generated media as source code.

## Development Commands

Install frontend dependencies:

```bash
npm install
```

Install backend dependencies:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r apps/api/requirements.txt
```

Start backend:

```bash
make api
```

Start frontend:

```bash
make web
```

Run backend tests:

```bash
make test-api
```

Run frontend tests:

```bash
make test-web
```

Run frontend type check:

```bash
cd apps/web && npm run lint
```

Root package scripts are also available:

```bash
npm run dev:web
npm run build:web
npm run test:web
```

## Local Runtime Notes

- Backend runs on port `8000`.
- Frontend runs on port `5173`.
- In development, Vite proxies `/api` and `/static` to `http://127.0.0.1:8000`.
- Frontend API calls should default to relative same-origin paths. Only set `VITE_API_BASE_URL` for deployments where the API is on a separate origin.
- Codespaces public port URLs can inject tunnel auth behavior. Prefer same-origin proxying during development.

## Environment And Secrets

Local configuration is read from `.env`, `.env.local`, `apps/api/.env*`, and `apps/web/.env.local` depending on process cwd and settings.

Important variables:

- `WEB_ORIGIN`: allowed frontend origin for backend CORS when cross-origin requests are used.
- `VITE_API_BASE_URL`: optional frontend API origin. Leave empty for same-origin proxy mode.
- `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL`: LLM provider configuration.
- `PEXELS_API_KEY`, `PIXABAY_API_KEY`: media provider credentials.
- `FFMPEG_BINARY`: ffmpeg executable path.
- `SUBTITLE_FONT_PATH`: font file used for export subtitles.

Never commit real API keys, `.env.local`, database files, generated media, or downloaded stock assets.

## Backend Conventions

- Keep API response shapes in `schemas.py` and route serialization in `routes.py`.
- Use `ProjectService` for project lifecycle operations. Avoid duplicating database logic in routes.
- Long-running work should run in background tasks or worker-style functions, not directly in request handlers.
- Blocking CPU/subprocess work from async service methods should be sent through `asyncio.to_thread(...)` or otherwise isolated from the event loop.
- Persist failure reasons into `error_message` where user-facing workflows need debuggability.
- Add focused tests under `apps/api/tests` for backend behavior changes.

## Rendering And Media Notes

- Use the project skill at `.agents/skills/ffmpeg-video-export` when changing video export behavior, debugging ffmpeg commands, or redesigning long-running render jobs.
- Export rendering is intentionally ffmpeg-based for memory stability.
- Do not reintroduce a renderer that keeps every scene clip loaded in memory at once.
- Keep export as: queue job, return `export_id`, render in background, poll `/api/v1/exports/{export_id}`.
- TTS uses `edge-tts`. Current code expects `boundary="WordBoundary"` so subtitle timelines get word-level timing.
- `edge-tts` can break when Microsoft changes service requirements. Prefer upgrading `edge-tts` and verifying real synthesis rather than adding fake audio fallbacks.
- Generated audio should live under `storage/generated/audio`.
- Downloaded source videos should live under `storage/downloads/videos`.
- Final exports should live under `storage/exports` and be served through `/static`.

## Frontend Conventions

- API client code lives in `apps/web/src/lib/api.ts`.
- Shared project state lives in `apps/web/src/store/projectStore.ts`.
- Route pages live in `apps/web/src/pages`.
- Reusable UI components live in `apps/web/src/components`.
- Use existing UI primitives and local styling patterns before adding new abstractions.
- Use lucide-react icons for buttons where suitable.
- Keep operational screens dense and task-focused; do not add marketing-style landing sections to app workflows.
- When adding async actions, expose clear loading/error states in the store and UI.

## Testing Expectations

Before finishing backend changes, run:

```bash
cd apps/api && ../../.venv/bin/pytest
```

Before finishing frontend changes, run:

```bash
cd apps/web && npm run lint
```

For full frontend tests:

```bash
cd apps/web && npm run test -- --run
```

If a command cannot be run, report that explicitly with the reason.

## Git And Workspace Safety

- The worktree may already contain user changes. Do not revert unrelated files.
- Avoid destructive commands such as `git reset --hard` or deleting generated/user files unless explicitly requested.
- Keep edits scoped to the requested task.
- Prefer small, testable changes over broad refactors.
- Use structured parsers and framework APIs where available.

## Known Gotchas

- Python target in the README mentions 3.11, but the current workspace may use Python 3.12. Verify compatibility by running tests.
- MoviePy APIs differ across versions. Avoid relying on old `TextClip` signatures.
- Codespaces tunnel URLs may return auth responses before requests reach FastAPI, which can look like CORS failures.
- Full video export is slow. The API should remain responsive while background rendering proceeds.
