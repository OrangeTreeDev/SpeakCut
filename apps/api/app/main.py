import logging
from time import perf_counter

from fastapi import FastAPI
from fastapi import Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.routes import router
from app.core.config import get_settings
from app.core.database import Base, engine, ensure_project_error_message_column
from app.core.logging import setup_logging
from app.services.files import ensure_storage_dirs

settings = get_settings()
setup_logging()
logger = logging.getLogger("app.main")


def create_app() -> FastAPI:
    ensure_storage_dirs()
    Base.metadata.create_all(bind=engine)
    ensure_project_error_message_column()
    app = FastAPI(title=settings.project_name)
    allow_origins = [origin.strip() for origin in settings.web_origin.split(",") if origin.strip()]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allow_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    logger.info("cors_origins=%s", allow_origins)
    app.include_router(router)
    app.mount("/static", StaticFiles(directory=str(settings.storage_path)), name="static")

    @app.middleware("http")
    async def log_requests(request: Request, call_next):
        started_at = perf_counter()
        logger.info("request_started method=%s path=%s", request.method, request.url.path)
        try:
            response = await call_next(request)
        except Exception:
            duration_ms = int((perf_counter() - started_at) * 1000)
            logger.exception(
                "request_failed method=%s path=%s duration_ms=%s",
                request.method,
                request.url.path,
                duration_ms,
            )
            raise
        duration_ms = int((perf_counter() - started_at) * 1000)
        logger.info(
            "request_completed method=%s path=%s status_code=%s duration_ms=%s",
            request.method,
            request.url.path,
            response.status_code,
            duration_ms,
        )
        return response

    @app.get("/health")
    def healthcheck() -> dict:
        logger.info("healthcheck_ok")
        return {"status": "ok"}

    return app


app = create_app()
