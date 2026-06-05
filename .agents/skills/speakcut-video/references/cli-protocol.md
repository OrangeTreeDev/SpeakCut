# speak-cut CLI Protocol

SpeakCut Skill uses the `speak-cut` npm CLI. Prefer stdio JSON for agent calls; CLI flags are allowed for simple human-facing examples. Human logs must go to stderr; stdout must remain JSON or NDJSON.

Run with:

```bash
npx speak-cut <<'JSON'
{"action":"healthcheck"}
JSON
```

If the user has installed it globally, `speak-cut` may be used instead of `npx speak-cut`.

Required actions:

- `healthcheck`
- `generate`
- `inspect`
- `patch`
- `export`
- `package_preview`

Successful final output:

```json
{"type":"result","status":"completed"}
```

Failed final output:

```json
{"type":"error","status":"failed","stage":"tts","message":"..."}
```

Simple flag form:

```bash
npx speak-cut generate --text-file input.txt --aspect-ratio 9:16 --voice-id zh-CN-YunxiNeural --export --preview
```
