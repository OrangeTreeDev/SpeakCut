from __future__ import annotations

from datetime import datetime
from typing import Any, Optional
from uuid import uuid4

from sqlalchemy import DateTime, Float, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


def new_id(prefix: str) -> str:
    return f"{prefix}_{uuid4().hex[:12]}"


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=lambda: new_id("proj"))
    text: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="draft", nullable=False)
    aspect_ratio: Mapped[str] = mapped_column(String(8), nullable=False)
    voice_id: Mapped[str] = mapped_column(String(128), nullable=False)
    total_duration_ms: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    subtitle_style: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    bgm: Mapped[Optional[dict[str, Any]]] = mapped_column(JSON, default=None)
    preview_url: Mapped[Optional[str]] = mapped_column(String(512), default=None)
    error_message: Mapped[Optional[str]] = mapped_column(Text, default=None)
    timeline: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    scenes: Mapped[list["Scene"]] = relationship(back_populates="project", cascade="all, delete-orphan")
    exports: Mapped[list["ExportJob"]] = relationship(back_populates="project", cascade="all, delete-orphan")


class Scene(Base):
    __tablename__ = "scenes"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=lambda: new_id("scene"))
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id"), nullable=False, index=True)
    idx: Mapped[int] = mapped_column(Integer, nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    keywords_zh: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    keywords_en: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    sentiment: Mapped[str] = mapped_column(String(32), default="neutral", nullable=False)
    scene_description_en: Mapped[str] = mapped_column(Text, default="", nullable=False)
    duration_ms: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    selected_video: Mapped[Optional[dict[str, Any]]] = mapped_column(JSON, default=None)
    candidate_videos: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list, nullable=False)
    audio_url: Mapped[Optional[str]] = mapped_column(String(512), default=None)
    word_boundaries: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list, nullable=False)
    timeline: Mapped[Optional[dict[str, Any]]] = mapped_column(JSON, default=None)

    project: Mapped[Project] = relationship(back_populates="scenes")


class ExportJob(Base):
    __tablename__ = "export_jobs"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=lambda: new_id("exp"))
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id"), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(32), default="queued", nullable=False)
    download_url: Mapped[Optional[str]] = mapped_column(String(512), default=None)
    error_message: Mapped[Optional[str]] = mapped_column(Text, default=None)
    progress: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    project: Mapped[Project] = relationship(back_populates="exports")
