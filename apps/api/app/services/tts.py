from __future__ import annotations

import logging
from pathlib import Path
from time import perf_counter

import edge_tts

logger = logging.getLogger("app.services.tts")


class TTSService:
    async def synthesize_scene(self, text: str, voice_id: str, output_audio_path: Path) -> dict:
        started_at = perf_counter()
        logger.info(
            "tts_synthesize_started voice_id=%s output=%s text_length=%s",
            voice_id,
            output_audio_path.name,
            len(text),
        )
        communicate = edge_tts.Communicate(text=text, voice=voice_id, rate="+0%", pitch="+0Hz", boundary="WordBoundary")
        word_boundaries: list[dict] = []
        total_duration_ms = 0

        with output_audio_path.open("wb") as audio_file:
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    audio_file.write(chunk["data"])
                elif chunk["type"] == "WordBoundary":
                    wb = {
                        "text": chunk["text"],
                        "offset_ms": chunk["offset"] // 10000,
                        "duration_ms": chunk["duration"] // 10000,
                    }
                    word_boundaries.append(wb)
                    total_duration_ms = wb["offset_ms"] + wb["duration_ms"]

        result = {
            "audio_path": str(output_audio_path),
            "duration_ms": total_duration_ms,
            "word_boundaries": word_boundaries,
        }
        logger.info(
            "tts_synthesize_completed voice_id=%s output=%s duration_ms=%s boundaries=%s elapsed_ms=%s",
            voice_id,
            output_audio_path.name,
            total_duration_ms,
            len(word_boundaries),
            int((perf_counter() - started_at) * 1000),
        )
        return result
