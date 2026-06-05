# Troubleshooting

- No `type: result`: inspect the last `type: error` line.
- Missing CLI: use `npx speak-cut` instead of assuming a global install.
- Missing external credentials: configure LLM/TTS/media providers before generating videos.
- Broken preview assets: rebuild with `package_preview`.
- Export failure: inspect stderr and generated ASS/video/audio files in the project bundle.
- Do not start HTTP services for this skill.
