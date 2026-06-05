# Patch Operations

Supported patch operations:

```json
{"op":"update_subtitle_style","font_size":60,"stroke_width":3}
```

```json
{"op":"update_scene_text","scene_index":2,"text":"新的分镜文本"}
```

```json
{"op":"replace_scene_material","scene_index":3,"query":"city night street vertical video"}
```

The static preview is read-only. User edit requests should become `patch` JSON, followed by `package_preview`, and optionally `export`.

