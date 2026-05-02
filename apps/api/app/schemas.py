from __future__ import annotations

from typing import Any, Optional

from pydantic import BaseModel, Field


DEFAULT_SUBTITLE_STYLE = {
    "font_family": "Noto Sans SC",
    "font_size": 48,
    "color": "#FFFFFF",
    "stroke_color": "#000000",
    "stroke_width": 2,
    "background_color": "#000000",
}


class ProjectCreate(BaseModel):
    text: str = Field(min_length=1, max_length=10000)
    aspect_ratio: str = Field(pattern="^(9:16|16:9)$")
    voice_id: str = Field(min_length=1)


class TestCaseGenerateRequest(BaseModel):
    requirement: str = Field(min_length=1, max_length=20000)
    test_type: str = Field(default="functional", pattern="^(functional|api|ui|integration|regression)$")
    case_count: int = Field(default=5, ge=1, le=20)
    language: str = Field(default="zh-CN", pattern="^(zh-CN|en-US)$")


class GeneratedTestCase(BaseModel):
    title: str
    preconditions: list[str]
    steps: list[str]
    expected_result: str
    priority: str


class TestCaseGenerateResponse(BaseModel):
    requirement: str
    test_type: str
    language: str
    cases: list[GeneratedTestCase]


class SceneUpdate(BaseModel):
    text: str = Field(min_length=1, max_length=2000)


class SceneVideoUpdate(BaseModel):
    video_id: int


class VoiceUpdate(BaseModel):
    voice_id: str


class SubtitleStyleUpdate(BaseModel):
    font_family: str = Field(min_length=1, max_length=120)
    font_size: int = Field(ge=24, le=72)
    color: str = Field(min_length=4, max_length=16)
    stroke_color: str = Field(min_length=4, max_length=16)
    stroke_width: int = Field(ge=0, le=5)
    background_color: str = Field(min_length=4, max_length=16)


class VideoAsset(BaseModel):
    id: int
    thumbnail: str
    video_url: str
    duration: int
    width: int = 0
    height: int = 0


class SceneVideoAssetUpdate(BaseModel):
    video: VideoAsset


class SceneResponse(BaseModel):
    index: int
    text: str
    keywords_zh: list[str]
    keywords_en: list[str]
    sentiment: str
    scene_description_en: str
    duration_ms: int
    selected_video: Optional[dict[str, Any]]
    candidate_videos: list[dict[str, Any]]
    audio_url: Optional[str]
    word_boundaries: list[dict[str, Any]]
    timeline: Optional[dict[str, Any]]


class ProjectResponse(BaseModel):
    project_id: str
    status: str
    aspect_ratio: str
    voice_id: str
    total_duration_ms: int
    subtitle_style: dict[str, Any]
    bgm: Optional[dict[str, Any]]
    preview_url: Optional[str]
    error_message: Optional[str]
    scenes: list[SceneResponse]


class ProjectSummaryResponse(BaseModel):
    project_id: str
    title: str
    status: str
    aspect_ratio: str
    voice_id: str
    total_duration_ms: int
    scene_count: int
    cover_image: Optional[str]
    updated_at: str
    created_at: str


class ProjectListResponse(BaseModel):
    items: list[ProjectSummaryResponse]
    total: int


class ProjectCreateResponse(BaseModel):
    project_id: str
    status: str
    estimated_time_sec: int


class ExportResponse(BaseModel):
    export_id: str
    status: str
    estimated_time_sec: Optional[int] = None
    download_url: Optional[str] = None
    error_message: Optional[str] = None
