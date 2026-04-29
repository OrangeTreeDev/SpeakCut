from pathlib import Path
import hashlib
import json
from typing import Optional

from app.core.config import get_settings


def ensure_storage_dirs() -> None:
    settings = get_settings()
    for folder in ["generated/audio", "downloads/videos", "exports", "previews", "llm"]:
        (settings.storage_path / folder).mkdir(parents=True, exist_ok=True)


def relative_url(path: Path) -> str:
    settings = get_settings()
    return f"/static/{path.resolve().relative_to(settings.storage_path)}"


def write_json(path: Path, payload: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def text_key(text: str) -> str:
    return hashlib.sha256(text.strip().encode("utf-8")).hexdigest()[:16]


def local_path_to_static_url(path_str: Optional[str]) -> Optional[str]:
    if not path_str:
        return None
    path = Path(path_str).resolve()
    settings = get_settings()
    try:
        return relative_url(path)
    except ValueError:
        if str(path).startswith(str(settings.storage_path)):
            return relative_url(path)
    return path_str
