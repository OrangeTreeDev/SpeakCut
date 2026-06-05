# speak-cut

Local CLI runtime for SpeakCut video generation.

The CLI is designed for agent skills. It accepts stdio JSON or simple command-line flags, then runs the bundled Python/FastAPI domain code directly without starting an HTTP server.

## Usage

```bash
npx speak-cut healthcheck
```

Generate a local project, static preview, and exported MP4:

```bash
npx speak-cut generate --text "输入一段旁白文本" --export
```

Agent stdio protocol:

```bash
npx speak-cut <<'JSON'
{"action":"generate","text":"输入一段旁白文本","export":true,"package_preview":true}
JSON
```

By default, output is written under the current directory:

- `projects/`
- `generated/`
- `downloads/`
- `exports/`
- `speakcut.db`

Override the data root with:

```bash
SPEAKCUT_DATA_DIR=/path/to/data npx speak-cut generate --text "..." --export
```

## Required Runtime Configuration

Set these environment variables before generating videos:

```bash
LLM_BASE_URL=https://openrouter.ai/api/v1
LLM_API_KEY=...
LLM_MODEL=openai/gpt-4o-mini
PEXELS_API_KEY=...
FFMPEG_BINARY=ffmpeg
```

TTS uses `edge-tts` and requires network access, but no separate API key.

## Skill Install

Install the SpeakCut skill into supported agents with:

```bash
npx skills add https://github.com/OrangeTreeDev/SpeakCut --skill speakcut-video
```

The installed skill calls this CLI with `npx speak-cut`.
