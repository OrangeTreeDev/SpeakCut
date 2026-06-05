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
- `packages/speak-cut`: npm CLI wrapper used by agent skills. It calls the Python runtime through stdio and packages the static preview web build.
- `skills/speakcut-video`: standard installable skill source for `npx skills add`.
- `.agents/skills/ffmpeg-video-export`: project-level Codex skill for ffmpeg export design and debugging.
- `apps/api/app/api/routes.py`: API endpoints and background task entry points.
- `apps/api/app/services`: backend domain services for projects, LLM, TTS, media search, rendering, timelines, and files.
- `apps/api/app/workflows/agent_bundle.py`: local agent workflow for project bundle, preview packaging, patching, and export.
- `apps/api/scripts/speakcut.py`: stdio JSON entry point used by the npm CLI.
- `apps/api/app/models.py`: SQLAlchemy models.
- `apps/api/app/schemas.py`: Pydantic response/request models.
- `apps/api/tests`: backend tests.
- `apps/web/src/pages`: page entry points only.
- `apps/web/src/components`: reusable UI split into page components, common components, and shadcn components.
- `storage`: web/API generated audio, downloaded videos, exports, previews, and cached LLM output.
- `projects`, `generated`, `downloads`, `exports`, `speakcut.db`: default local CLI runtime output when `speak-cut` is run from the current directory.
- `assets`: screenshots and UI reference assets.

Do not treat `storage`, `projects`, `generated`, `downloads`, `exports`, `.speak-cut`, `.venv`, `node_modules`, SQLite DB files, or generated media as source code.

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

Build the agent CLI:

```bash
npm --workspace speak-cut run build
npm --workspace speak-cut run build:runtime
```

Run the local agent CLI:

```bash
npx speak-cut healthcheck
npx speak-cut generate --text "..." --export
```

## Local Runtime Notes

- Backend runs on port `8000`.
- Frontend runs on port `5173`.
- In development, Vite proxies `/api` and `/static` to `http://127.0.0.1:8000`.
- Frontend API calls should default to relative same-origin paths. Only set `VITE_API_BASE_URL` for deployments where the API is on a separate origin.
- Codespaces public port URLs can inject tunnel auth behavior. Prefer same-origin proxying during development.
- Agent skill usage should call `npx speak-cut` through CLI flags or stdio JSON. Do not start FastAPI, Vite, or any local HTTP service for skill execution.
- `speak-cut` defaults `STORAGE_ROOT` to the current working directory. Exported videos therefore land in `./exports`, project bundles in `./projects`, generated audio in `./generated`, downloaded media in `./downloads`, and SQLite state in `./speakcut.db`.
- `SPEAKCUT_DATA_DIR` can override the default current-directory data root. `SPEAKCUT_CACHE_DIR` can override the default `./.speak-cut/cache`.
- The static preview editor is read-only for users. User edit requests should be translated by the agent into skill patch operations, then applied through `speak-cut` and repackaged into HTML.
- The skill/CLI workflow is online-only. Do not add or use `offline: true`, fake audio, local fixture video, or offline generation fallbacks.

## Environment And Secrets

Local configuration is read from `.env`, `.env.local`, `apps/api/.env*`, and `apps/web/.env.local` depending on process cwd and settings.

Important variables:

- `WEB_ORIGIN`: allowed frontend origin for backend CORS when cross-origin requests are used.
- `VITE_API_BASE_URL`: optional frontend API origin. Leave empty for same-origin proxy mode.
- `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL`: LLM provider configuration.
- `PEXELS_API_KEY`, `PIXABAY_API_KEY`: media provider credentials.
- `SPEAKCUT_DATA_DIR`, `SPEAKCUT_CACHE_DIR`: optional local CLI data/cache directory overrides.
- `FFMPEG_BINARY`: optional ffmpeg executable path override. Leave unset when `ffmpeg` is available on `PATH`.
- `SUBTITLE_FONT_PATH`: font file used for export subtitles.

Never commit real API keys, `.env.local`, database files, generated media, downloaded stock assets, or local CLI output directories.

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
- For `speak-cut` CLI runs, the equivalent default locations are current-directory `generated/audio`, `downloads/videos`, and `exports`.

## Agent Skill And CLI Conventions

- `skills/speakcut-video/SKILL.md` is the installable skill source. Keep it concise and focused on how agents should call the npm CLI.
- `packages/speak-cut/src/speak-cut.ts` is the TypeScript CLI source. Rebuild with `npm --workspace speak-cut run build` after edits.
- `packages/speak-cut/runtime` is generated by `npm --workspace speak-cut run build:runtime`. Do not hand-edit generated runtime copies; update source files under `apps/api` or `apps/web`, then rebuild.
- Published npm installs of `speak-cut` do not read `apps/api/app` from the user's machine. They run the packaged Python runtime copied into `packages/speak-cut/runtime/api` during `build:runtime`; after changing `apps/api/app`, `apps/api/scripts`, `apps/api/requirements.txt`, or preview web assets, rebuild the runtime before publishing.
- The CLI must support both human-friendly flags and stdio JSON. Stdio JSON is the preferred protocol for agents.
- The CLI must not call FastAPI over HTTP for skill workflows. It should spawn the Python stdio runtime directly.
- The CLI should return JSON/NDJSON on stdout and send operational logs to stderr.
- If a request includes `offline: true` or `--offline`, fail explicitly instead of silently falling back.
- Preview packaging should use the compiled web build, not a Vite dev server.
- For changes requested from a preview, use `patch` operations and regenerate preview/export as needed.

## Frontend Conventions

- API client code lives in `apps/web/src/lib/api.ts`.
- Shared project state lives in `apps/web/src/store/projectStore.ts`.
- Route pages live in `apps/web/src/pages` and should stay thin. They wire route params, store actions, and layout composition, but should not contain substantial feature logic.
- Reusable UI components live in `apps/web/src/components` and should be split by responsibility:
  - `components/editor`, `components/home`, `components/project`: page-scoped components used by a single page or workflow.
  - `components/ui`: shadcn-style primitive components only.
  - top-level components in `components/`: shared components used across multiple pages.
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

Before finishing CLI or skill changes, run:

```bash
npm --workspace speak-cut run build
npx speak-cut healthcheck
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
