import os
from pprint import pformat

import pytest

from app.core.config import Settings, get_settings
from app.services.llm import LLMService


def _get_api_key() -> str:
    env_key = os.getenv("LLM_API_KEY") or os.getenv("OPENROUTER_API_KEY")
    if env_key:
        return env_key

    return Settings().llm_api_key


@pytest.mark.integration
def test_openrouter_llm_analyze_narration_returns_scenes(monkeypatch: pytest.MonkeyPatch) -> None:
    api_key = _get_api_key()
    if not api_key:
        pytest.skip("Set LLM_API_KEY or OPENROUTER_API_KEY to run the OpenRouter LLM integration test.")

    monkeypatch.setenv("LLM_API_KEY", api_key)
    settings = Settings()
    monkeypatch.setenv("LLM_BASE_URL", settings.llm_base_url)
    monkeypatch.setenv("LLM_MODEL", settings.llm_model)
    get_settings.cache_clear()

    try:
        service = LLMService()
        result = service.analyze_narration(
            "今天带你看一间安静的咖啡店。先从门口的招牌开始，再拍店内手冲咖啡的过程，最后给出成品和顾客微笑的镜头。"
        )
    finally:
        get_settings.cache_clear()

    print("LLM result:")
    print(pformat(result, sort_dicts=False))

    assert isinstance(result, dict)
    assert "scenes" in result
    assert isinstance(result["scenes"], list)
    assert result["scenes"]

    first_scene = result["scenes"][0]
    assert isinstance(first_scene.get("text"), str)
    assert isinstance(first_scene.get("keywords_zh"), list)
    assert isinstance(first_scene.get("keywords_en"), list)
    assert first_scene.get("sentiment") in {"positive", "neutral", "negative"}
    assert isinstance(first_scene.get("scene_description_en"), str)
