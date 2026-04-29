from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy import inspect
from sqlalchemy import text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import get_settings


class Base(DeclarativeBase):
    pass


settings = get_settings()
connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}
engine = create_engine(settings.database_url, connect_args=connect_args)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)


def ensure_project_error_message_column() -> None:
    if not settings.database_url.startswith("sqlite"):
        return
    inspector = inspect(engine)
    if not inspector.has_table("projects"):
        return
    columns = {column["name"] for column in inspector.get_columns("projects")}
    if "error_message" in columns:
        return
    with engine.begin() as connection:
        connection.execute(text("ALTER TABLE projects ADD COLUMN error_message TEXT"))


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
