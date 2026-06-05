# Project Bundle

Agent mode writes local project bundles under:

```text
storage/projects/{project_id}/
├── project.speakcut.json
├── preview/
├── media/
├── subtitles/
└── exports/
```

`project.speakcut.json` is the project source of truth for Skill/CLI mode.

Preview HTML is read-only and uses `window.__SPEAKCUT_PROJECT__` from `preview/project-data.js`.

