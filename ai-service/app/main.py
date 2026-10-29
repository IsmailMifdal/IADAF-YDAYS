"""IA-DAF AI Service — FastAPI application entry point.

Startup sequence:
1. Apply database migrations (PostgreSQL, schema ai)
2. Initialise LLM backend (Ollama → OpenAI fallback)
3. Initialise RAG service (embeddings + ChromaDB)
4. Register with Eureka discovery service
5. Start the daily purge of expired conversations
"""

import asyncio
from contextlib import asynccontextmanager, suppress
from typing import AsyncIterator

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger

from app.api.routes import chat, document, document_analysis, health, skills, translate, users
from app.core.config import settings
from app.core.security import check_secret, frontend_claims
from app.models.database import purge_expired_conversations, run_migrations
from app.services.llm_service import llm_service
from app.services.rag_service import rag_service


# ---------------------------------------------------------------------------
# Lifespan
# ---------------------------------------------------------------------------


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Startup and shutdown lifecycle."""
    logger.info(f"🚀 Starting {settings.app_name} v{settings.app_version}…")
    check_secret()

    # 1. Bring the database schema up to date
    await run_migrations()
    logger.info("✅ Database migrations applied.")

    # 2. Initialise LLM backend
    llm_service.initialise()

    # 3. Initialise RAG pipeline (may take a few seconds the first time)
    rag_service.initialise()

    # 4. Register with Eureka
    _register_eureka()

    # 5. Retention purge (RGPD)
    purge_task = asyncio.create_task(_purge_conversations_daily())

    logger.info(
        f"✅ {settings.app_name} ready — http://{settings.app_host}:{settings.app_port}"
    )

    yield  # Application is running

    # Shutdown
    logger.info(f"🛑 Shutting down {settings.app_name}…")
    purge_task.cancel()
    with suppress(asyncio.CancelledError):
        await purge_task
    try:
        import py_eureka_client.eureka_client as eureka_client  # type: ignore

        await eureka_client.stop_async()
    except Exception:  # noqa: BLE001
        pass


async def _purge_conversations_daily() -> None:
    """Erase conversations past their retention period, at startup then daily."""
    while True:
        try:
            deleted = await purge_expired_conversations(settings.conversation_retention_days)
            if deleted:
                logger.info(
                    f"🗑️  Purged {deleted} conversation(s) inactive for more than "
                    f"{settings.conversation_retention_days} days."
                )
        except Exception as exc:  # noqa: BLE001 — a failed run must not kill the loop
            logger.error(f"Conversation purge failed: {exc}")
        await asyncio.sleep(24 * 60 * 60)


def _register_eureka() -> None:
    """Register this service with the Eureka discovery server."""
    try:
        import py_eureka_client.eureka_client as eureka_client  # type: ignore
        import asyncio

        host = settings.eureka_instance_hostname

        async def _do_register():
            await eureka_client.init_async(
                eureka_server=settings.eureka_server_url,
                app_name=settings.eureka_app_name,
                instance_port=settings.app_port,
                instance_host=host,
                health_check_url=f"http://{host}:{settings.app_port}/ai/health",
                status_page_url=f"http://{host}:{settings.app_port}/docs",
            )

        loop = asyncio.get_running_loop()
        loop.create_task(_do_register())

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

    # CORS — restricted to known origins.
    #
    # "*" together with allow_credentials=True is rejected by browsers anyway,
    # and would expose the service to any site if it were honoured.
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["Content-Type", "Authorization"],
    )

    # Routers
    application.include_router(health.router)  # /ai/health, /actuator/health
    # Everything but the health check needs a token signed by the frontend.
    protected = [Depends(frontend_claims)]
    application.include_router(chat.router, prefix="/ai", dependencies=protected)
    application.include_router(translate.router, prefix="/ai", dependencies=protected)
    application.include_router(document.router, prefix="/ai", dependencies=protected)
    application.include_router(users.router, prefix="/ai", dependencies=protected)
    application.include_router(document_analysis.router, prefix="/ai", dependencies=protected)
    application.include_router(skills.router, prefix="/ai", dependencies=protected)

    return application


app = create_app()
