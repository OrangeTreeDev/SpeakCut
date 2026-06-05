from __future__ import annotations

import shutil
import subprocess
from functools import lru_cache

from app.core.config import get_settings


@lru_cache(maxsize=1)
def resolve_ffmpeg_binary() -> str:
    configured = get_settings().ffmpeg_binary
    if configured and configured != "ffmpeg":
        return configured

    system_ffmpeg = shutil.which(configured or "ffmpeg") or shutil.which("ffmpeg")
    if system_ffmpeg:
        return system_ffmpeg

    try:
        import imageio_ffmpeg

        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        return configured or "ffmpeg"


def check_ffmpeg() -> dict[str, object]:
    binary = resolve_ffmpeg_binary()
    try:
        subprocess.run([binary, "-version"], check=True, capture_output=True, timeout=10)
        return {"ok": True, "binary": binary}
    except Exception as exc:
        return {"ok": False, "binary": binary, "error": str(exc)}
