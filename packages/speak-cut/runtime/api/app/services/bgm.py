from __future__ import annotations

import logging
from time import perf_counter
from typing import Any

import httpx

from app.core.config import get_settings

logger = logging.getLogger("app.services.bgm")


class BGMService:
    def __init__(self) -> None:
        settings = get_settings()
        self.api_key = settings.pixabay_api_key
        self.timeout = settings.request_timeout_sec

    async def search_music(self, query: str, limit: int = 8) -> list[dict[str, Any]]:
        if not self.api_key:
            logger.info("bgm_search_skipped reason=no_api_key")
            return []
        started_at = perf_counter()
        logger.info("bgm_search_started query=%s limit=%s", query, limit)
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.get(
                "https://pixabay.com/api/audio/",
                params={"key": self.api_key, "q": query, "per_page": limit},
            )
            response.raise_for_status()
            hits = response.json().get("hits", [])
            results = [
                {
                    "id": f"bgm_{item['id']}",
                    "name": item.get("tags", "Untitled"),
                    "duration": item.get("duration", 0),
                    "preview_url": item.get("audio", ""),
                    "tags": item.get("tags", ""),
                }
                for item in hits
            ]
            logger.info(
                "bgm_search_completed query=%s result_count=%s duration_ms=%s",
                query,
                len(results),
                int((perf_counter() - started_at) * 1000),
            )
            return results

    async def recommend(self, scenes: list[dict[str, Any]], limit: int = 8) -> list[dict[str, Any]]:
        sentiment_counts = {"positive": 0, "neutral": 0, "negative": 0}
        for scene in scenes:
            sentiment = scene.get("sentiment", "neutral")
            if sentiment in sentiment_counts:
                sentiment_counts[sentiment] += 1
        dominant = max(sentiment_counts, key=sentiment_counts.get)
        query_map = {
            "positive": "upbeat happy inspiring",
            "neutral": "calm ambient relaxing",
            "negative": "sad dramatic tense",
        }
        logger.info("bgm_recommend_started dominant_sentiment=%s scene_count=%s", dominant, len(scenes))
        return await self.search_music(query_map.get(dominant, "cinematic storytelling"), limit)
