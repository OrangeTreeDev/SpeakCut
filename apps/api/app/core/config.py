from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


REPO_ROOT = Path(__file__).resolve().parents[4]


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

    llm_base_url: str = "https://open.bigmodel.cn/api/paas/v4"
    llm_api_key: str = ""
    llm_model: str = "glm-4.5-flash"
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
