"""IA-DAF AI Service — FastAPI application entry point.

Startup sequence:
1. Initialise SQLite database
2. Initialise LLM backend (Ollama → OpenAI fallback)
3. Initialise RAG service (embeddings + ChromaDB)
4. Register with Eureka discovery service
"""

from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger

from app.api.routes import chat, document, health, translate
from app.core.config import settings
from app.models.database import init_db
from app.services.llm_service import llm_service
from app.services.rag_service import rag_service


# ---------------------------------------------------------------------------
# Lifespan
# ---------------------------------------------------------------------------


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Startup and shutdown lifecycle."""
    logger.info(f"🚀 Starting {settings.app_name} v{settings.app_version}…")

    # 1. Initialise database tables
    await init_db()
    logger.info("✅ Database initialised.")

    # 2. Initialise LLM backend
    llm_service.initialise()

    # 3. Initialise RAG pipeline (may take a few seconds the first time)
    rag_service.initialise()

    # 4. Register with Eureka
    _register_eureka()

    logger.info(
        f"✅ {settings.app_name} ready — http://{settings.app_host}:{settings.app_port}"
    )

    yield  # Application is running

    # Shutdown
    logger.info(f"🛑 Shutting down {settings.app_name}…")
    try:
        import py_eureka_client.eureka_client as eureka_client  # type: ignore

        await eureka_client.stop_async()
    except Exception:  # noqa: BLE001
        pass


def _register_eureka() -> None:
    """Register this service with the Eureka discovery server."""
    try:
        import py_eureka_client.eureka_client as eureka_client  # type: ignore

        eureka_client.init(
            eureka_server=settings.eureka_server_url,
            app_name=settings.eureka_app_name,
            instance_port=settings.app_port,
            instance_host="ai-service",
            health_check_url=f"http://ai-service:{settings.app_port}/ai/health",
            status_page_url=f"http://ai-service:{settings.app_port}/docs",
        )
        logger.info(
            f"✅ Registered with Eureka — app={settings.eureka_app_name} "
            f"@ {settings.eureka_server_url}"
        )
    except Exception as exc:  # noqa: BLE001
        logger.warning(
            f"⚠️  Eureka registration failed ({exc}). "
            f"Service will run without discovery."
        )


# ---------------------------------------------------------------------------
# Application factory
# ---------------------------------------------------------------------------


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    application = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        description=(
            "IA-DAF — Assistant IA pour les démarches administratives françaises. "
            "Powered by FastAPI + LangChain + ChromaDB + Mistral."
        ),
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan,
    )

    # CORS — open for development
    application.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Routers
    application.include_router(health.router)  # /ai/health, /actuator/health
    application.include_router(chat.router, prefix="/ai")
    application.include_router(translate.router, prefix="/ai")
    application.include_router(document.router, prefix="/ai")

    return application


app = create_app()
