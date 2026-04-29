from __future__ import annotations

import httpx
import pytest

from app.services import pexels as pexels_module
from app.services.pexels import PexelsService


class _MockResponse:
    def __init__(self, payload: dict, status_code: int = 200) -> None:
        self._payload = payload
        self.status_code = status_code

    def raise_for_status(self) -> None:
        if self.status_code >= 400:
            request = httpx.Request("GET", "https://api.pexels.com/videos/search")
            response = httpx.Response(self.status_code, request=request)
            raise httpx.HTTPStatusError("status error", request=request, response=response)

    def json(self) -> dict:
        return self._payload


@pytest.mark.asyncio
async def test_search_videos_retries_request_errors(monkeypatch: pytest.MonkeyPatch) -> None:
    attempts = 0

    class _MockClient:
        def __init__(self, *args, **kwargs) -> None:
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb) -> None:
            return None

        async def get(self, *args, **kwargs):
            nonlocal attempts
            attempts += 1
            if attempts < 3:
                raise httpx.ConnectError("temporary connect error")
            return _MockResponse(
                {
                    "videos": [
                        {
                            "id": 1,
                            "image": "thumb",
                            "duration": 9,
                            "width": 1080,
                            "height": 1920,
                            "video_files": [{"height": 1080, "link": "video"}],
                        }
                    ]
                }
            )

    monkeypatch.setattr(pexels_module.httpx, "AsyncClient", _MockClient)

    service = PexelsService()
    service.retry_attempts = 3
    service.retry_backoff_sec = 0

    videos = await service.search_videos("query", "portrait")

    assert attempts == 3
    assert videos[0]["video_url"] == "video"


@pytest.mark.asyncio
async def test_search_videos_raises_after_retry_limit(monkeypatch: pytest.MonkeyPatch) -> None:
    attempts = 0

    class _MockClient:
        def __init__(self, *args, **kwargs) -> None:
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb) -> None:
            return None

        async def get(self, *args, **kwargs):
            nonlocal attempts
            attempts += 1
            raise httpx.ConnectError("still failing")

    monkeypatch.setattr(pexels_module.httpx, "AsyncClient", _MockClient)

    service = PexelsService()
    service.retry_attempts = 3
    service.retry_backoff_sec = 0

    with pytest.raises(httpx.ConnectError, match="still failing"):
        await service.search_videos("query", "portrait")

    assert attempts == 3
