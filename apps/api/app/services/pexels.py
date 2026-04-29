from __future__ import annotations

import asyncio
import logging
from time import perf_counter
from typing import Any

import httpx

from app.core.config import get_settings

logger = logging.getLogger("app.services.pexels")


def _pick_best_file(files: list[dict[str, Any]]) -> str:
    ordered = sorted(files, key=lambda item: item.get("height", 0), reverse=True)
    for file_item in ordered:
        if file_item.get("height", 0) >= 720:
            return file_item.get("link", "")
    return ordered[0].get("link", "") if ordered else ""


class PexelsService:
    def __init__(self) -> None:
        settings = get_settings()
        self.api_key = settings.pexels_api_key
        self.timeout = settings.request_timeout_sec
        self.retry_attempts = settings.pexels_retry_attempts
        self.retry_backoff_sec = settings.pexels_retry_backoff_sec

    def _should_retry_status(self, status_code: int) -> bool:
        return status_code == 429 or 500 <= status_code < 600

    async def search_videos(self, query: str, orientation: str, per_page: int = 8) -> list[dict[str, Any]]:
        started_at = perf_counter()
        logger.info(
            "pexels_search_started query=%s orientation=%s per_page=%s",
            query,
            orientation,
            per_page,
        )
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = None
            for attempt in range(1, self.retry_attempts + 1):
                try:
                    response = await client.get(
                        "https://api.pexels.com/videos/search",
                        headers={"Authorization": self.api_key},
                        params={
                            "query": query,
                            "per_page": per_page,
                            "orientation": orientation,
                            "size": "medium",
                        },
                    )
                    response.raise_for_status()
                    break
                except httpx.HTTPStatusError as exc:
                    if attempt >= self.retry_attempts or not self._should_retry_status(exc.response.status_code):
                        raise
                    logger.warning(
                        "pexels_search_retryable_status query=%s status_code=%s attempt=%s/%s",
                        query,
                        exc.response.status_code,
                        attempt,
                        self.retry_attempts,
                    )
                except httpx.RequestError as exc:
                    if attempt >= self.retry_attempts:
                        raise
                    logger.warning(
                        "pexels_search_request_error query=%s attempt=%s/%s error=%s",
                        query,
                        attempt,
                        self.retry_attempts,
                        exc,
                    )

                if self.retry_backoff_sec > 0:
                    await asyncio.sleep(self.retry_backoff_sec * attempt)

            if response is None:
                raise RuntimeError("Pexels request finished without a response")

            videos = response.json().get("videos", [])
            results = [
                {
                    "id": video["id"],
                    "thumbnail": video["image"],
                    "video_url": _pick_best_file(video.get("video_files", [])),
                    "duration": video.get("duration", 0),
                    "width": video.get("width", 0),
                    "height": video.get("height", 0),
                }
                for video in videos
            ]
            logger.info(
                "pexels_search_completed query=%s result_count=%s duration_ms=%s",
                query,
                len(results),
                int((perf_counter() - started_at) * 1000),
            )
            return results
