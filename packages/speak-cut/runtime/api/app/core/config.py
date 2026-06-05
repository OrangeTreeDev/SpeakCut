import os
from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


def _detect_repo_root() -> Path:
    env_root = os.getenv("SPEAKCUT_REPO_ROOT")
    if env_root:
        return Path(env_root).resolve()

    current = Path(__file__).resolve()
    for parent in current.parents:
        if (parent / "apps" / "api").exists() and (parent / "package.json").exists():
            return parent
    for parent in current.parents:
        if (parent / "app").exists() and (parent / "requirements.txt").exists():
            return parent
    return current.parents[2]


REPO_ROOT = _detect_repo_root()


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(
            str(REPO_ROOT / ".env"),
            str(REPO_ROOT / ".env.local"),
            ".env",
            ".env.local",
        ),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_env: str = "development"
    project_name: str = "NarraClip"
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    web_origin: str = "http://localhost:5173"
    database_url: str = f"sqlite:///{(REPO_ROOT / 'apps/api/narraclip.db').as_posix()}"
    storage_root: str = str(REPO_ROOT / "storage")
    ffmpeg_binary: str = "ffmpeg"
    subtitle_font_path: str = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"

    llm_base_url: str = "https://openrouter.ai/api/v1"
    llm_api_key: str = ""
    llm_model: str = "openai/gpt-4o-mini"
    llm_http_referer: str = ""
    llm_app_title: str = "SpeakCut"
    pexels_api_key: str = ""
    pixabay_api_key: str = ""
    default_voice_id: str = "zh-CN-YunxiNeural"
    request_timeout_sec: float = Field(default=20.0, ge=5.0, le=120.0)
    pexels_retry_attempts: int = Field(default=3, ge=1, le=10)
    pexels_retry_backoff_sec: float = Field(default=1.0, ge=0.0, le=10.0)

    @property
    def storage_path(self) -> Path:
        return Path(self.storage_root).resolve()


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
