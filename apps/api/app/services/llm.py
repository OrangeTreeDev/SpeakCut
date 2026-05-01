from __future__ import annotations

import json
import logging
from time import perf_counter

from openai import OpenAI

from app.core.config import get_settings

SYSTEM_PROMPT = """你是一个视频脚本分析助手。用户会给你一段口播旁白文本，你需要：

1. 将旁白按语义切分为多个场景，每段 15-40 字，对应 3-10 秒分镜。
2. 为每个场景提取 2-5 个可搜索的视觉关键词（中文+英文）。
3. 标注每段情感（positive / neutral / negative）。
4. 用一句英文描述理想画面。

严格输出 JSON：
{
  "scenes": [
    {
      "index": 0,
      "text": "原始旁白文本",
      "keywords_zh": ["关键词1"],
      "keywords_en": ["keyword1"],
      "sentiment": "neutral",
      "scene_description_en": "A description of the ideal visual"
    }
  ]
}"""

logger = logging.getLogger("app.services.llm")


class LLMService:
    def __init__(self) -> None:
        settings = get_settings()
        default_headers = {}
        if settings.llm_http_referer:
            default_headers["HTTP-Referer"] = settings.llm_http_referer
        if settings.llm_app_title:
            default_headers["X-Title"] = settings.llm_app_title

        self.client = OpenAI(
            api_key=settings.llm_api_key,
            base_url=settings.llm_base_url,
            timeout=settings.request_timeout_sec,
            default_headers=default_headers,
        )
        self.model = settings.llm_model

    def analyze_narration(self, text: str) -> dict:
        started_at = perf_counter()
        logger.info("llm_analyze_narration_started model=%s text_length=%s", self.model, len(text))
        response = self.client.chat.completions.create(
            model=self.model,
            temperature=0.3,
            max_tokens=4096,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": f"请分析以下旁白文本：\n\n{text}"},
            ],
        )
        content = response.choices[0].message.content or '{"scenes":[]}'
        data = json.loads(content)
        logger.info(
            "llm_analyze_narration_completed model=%s scene_count=%s duration_ms=%s",
            self.model,
            len(data.get("scenes", [])),
            int((perf_counter() - started_at) * 1000),
        )
        return data

    def analyze_single_scene(self, text: str, context: str = "") -> dict:
        started_at = perf_counter()
        logger.info("llm_analyze_single_scene_started model=%s text_length=%s", self.model, len(text))
        response = self.client.chat.completions.create(
            model=self.model,
            temperature=0.3,
            max_tokens=1024,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": f"上下文：{context}\n\n请只分析以下文本并输出单个 scene 对象：\n{text}"},
            ],
        )
        content = response.choices[0].message.content or "{}"
        data = json.loads(content)
        if "scenes" in data:
            scene_data = data["scenes"][0]
        else:
            scene_data = data
        logger.info(
            "llm_analyze_single_scene_completed model=%s duration_ms=%s",
            self.model,
            int((perf_counter() - started_at) * 1000),
        )
        return scene_data
