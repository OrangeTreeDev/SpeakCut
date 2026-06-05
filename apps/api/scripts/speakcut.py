#!/usr/bin/env python3
from __future__ import annotations

import asyncio
import json
import os
import shutil
import sys
from pathlib import Path
from typing import Any

API_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = API_ROOT.parents[1]
RUNTIME_VENV = Path(os.environ["SPEAKCUT_RUNTIME_VENV"]).resolve() if os.environ.get("SPEAKCUT_RUNTIME_VENV") else None
VENV_ROOT = RUNTIME_VENV or (REPO_ROOT / ".venv")
VENV_PYTHON = VENV_ROOT / ("Scripts/python.exe" if os.name == "nt" else "bin/python")
if VENV_PYTHON.exists() and Path(sys.prefix).resolve() != VENV_ROOT.resolve():
    os.execv(str(VENV_PYTHON), [str(VENV_PYTHON), str(Path(__file__).resolve()), *sys.argv[1:]])

if str(API_ROOT) not in sys.path:
    sys.path.insert(0, str(API_ROOT))

from app.core.database import Base, SessionLocal, engine, ensure_project_error_message_column
from app.services.files import ensure_storage_dirs
from app.workflows.agent_bundle import (
    apply_patch_ops,
    export_bundle,
    generate_project,
    inspect_project,
    package_preview,
)


def _json(event: dict[str, Any]) -> None:
    print(json.dumps(event, ensure_ascii=False), flush=True)


def _error(stage: str, exc: Exception) -> int:
    _json({"type": "error", "status": "failed", "stage": stage, "message": str(exc)})
    return 1


def _read_request() -> dict[str, Any]:
    raw = sys.stdin.read().strip()
    if not raw:
        raise ValueError("Expected a JSON request on stdin")
    return json.loads(raw)


def _init_storage() -> None:
    ensure_storage_dirs()
    Base.metadata.create_all(bind=engine)
    ensure_project_error_message_column()


def _healthcheck() -> dict[str, Any]:
    _init_storage()
    return {
        "type": "result",
        "status": "ok",
        "checks": {
            "python": True,
            "ffmpeg": shutil.which("ffmpeg") is not None,
            "storage": True,
            "sqlite": True,
        },
    }


async def _handle(request: dict[str, Any]) -> dict[str, Any]:
    action = request.get("action")
    if action == "healthcheck":
        return _healthcheck()
    if action == "package_preview":
        return {"type": "result", "status": "completed", "preview_file": str(package_preview(Path(request["project_file"])))}
    if action == "inspect":
        return inspect_project(Path(request["project_file"]))
    if action == "patch":
        return apply_patch_ops(Path(request["project_file"]), request.get("changes", []), request.get("regenerate"))
    if action == "export":
        return {
            "type": "result",
            "status": "completed",
            "export_file": str(export_bundle(Path(request["project_file"]))),
        }
    if action == "generate":
        if request.get("offline"):
            raise ValueError("offline mode has been removed; configure online LLM, TTS, and media providers")
        _init_storage()
        text = request.get("text")
        if not text and request.get("text_file"):
            text = Path(request["text_file"]).read_text(encoding="utf-8")
        if not text:
            raise ValueError("generate requires text or text_file")
        db = SessionLocal()
        try:
            return await generate_project(
                db,
                text,
                request.get("aspect_ratio", "9:16"),
                request.get("voice_id", "zh-CN-YunxiNeural"),
                export=bool(request.get("export", False)),
                preview=bool(request.get("package_preview", True)),
            )
        finally:
            db.close()
    raise ValueError(f"Unsupported action: {action}")


def main() -> int:
    try:
        request = _read_request()
        result = asyncio.run(_handle(request))
        _json(result)
        return 0
    except Exception as exc:
        return _error("cli", exc)


if __name__ == "__main__":
    raise SystemExit(main())
