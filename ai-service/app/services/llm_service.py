"""LLM service — Ollama (Mistral) with OpenAI fallback.

Provides a unified asynchronous interface — ``agenerate(prompt)`` for a
whole answer, ``astream(prompt)`` for one streamed piece by piece —
regardless of the underlying provider.
"""

from typing import Any, AsyncIterator

from loguru import logger

from app.core.config import settings

DEFAULT_OPENAI_BASE_URL = "https://api.openai.com/v1"

UNAVAILABLE_MESSAGE = (
    "⚠️  Le service IA n'est pas encore disponible. "
    "Veuillez réessayer dans quelques instants. "
    "Si le problème persiste, consultez service-public.fr."
)
GENERATION_ERROR_MESSAGE = (
    "⚠️  Une erreur est survenue lors de la génération de la réponse. "
    "Veuillez réessayer ou consulter service-public.fr."
)


def _text(result: Any) -> str:
    """Text of an LLM result: ChatOpenAI returns message objects, Ollama str."""
    return str(result.content) if hasattr(result, "content") else str(result)


class LLMService:
    """Abstraction layer over Ollama / OpenAI language models."""

    def __init__(self) -> None:
        self._ollama_available: bool = False
        self._openai_available: bool = False
        self._llm = None  # lazy-initialised

    # ------------------------------------------------------------------
    # Initialisation
    # ------------------------------------------------------------------

    def initialise(self) -> None:
        """Probe available LLM backends and set up the active one."""
        if settings.use_openai and settings.openai_api_key:
            self._setup_openai()
        else:
            self._setup_ollama()

    def _setup_ollama(self) -> None:
        """Try to connect to the local Ollama instance."""
        try:
            import requests  # type: ignore
            from langchain_community.llms import Ollama  # type: ignore

            # Use the Ollama REST API health endpoint to confirm availability
            response = requests.get(
                f"{settings.ollama_base_url}/api/tags", timeout=5
            )
            response.raise_for_status()

            llm = Ollama(
                base_url=settings.ollama_base_url,
                model=settings.ollama_model,
                temperature=0.1,
            )
            self._llm = llm
            self._ollama_available = True
            logger.info(
                f"Ollama backend ready — model: {settings.ollama_model} "
                f"@ {settings.ollama_base_url}"
            )
        except Exception as exc:  # noqa: BLE001
            logger.warning(
                f"Ollama not available ({exc}). Trying OpenAI fallback…"
            )
            self._setup_openai()

    def _setup_openai(self) -> None:
        """Set up OpenAI (model from ``OPENAI_MODEL``)."""
        if not settings.openai_api_key:
            logger.warning(
                "Neither Ollama nor OpenAI is available. "
                "The service will run in degraded mode."
            )
            return

        try:
            from langchain_openai import ChatOpenAI  # type: ignore

            self._llm = ChatOpenAI(
                model=settings.openai_model,
                openai_api_key=settings.openai_api_key,
                temperature=settings.openai_temperature,
                max_tokens=settings.openai_max_tokens,
                timeout=settings.openai_timeout_seconds,
                # Always explicit: the OpenAI SDK also reads OPENAI_BASE_URL
                # from the environment, and docker-compose passes it as an
                # empty string when unset — which the SDK takes for a URL and
                # fails every request with "Connection error".
                base_url=settings.openai_base_url or DEFAULT_OPENAI_BASE_URL,
            )
            self._openai_available = True
            logger.info(
                f"OpenAI-compatible backend ready — model: {settings.openai_model} "
                f"@ {settings.openai_base_url or DEFAULT_OPENAI_BASE_URL}"
            )
        except Exception as exc:  # noqa: BLE001
            logger.error(f"Failed to initialise OpenAI: {exc}")

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------
    #
    # Asynchronous on purpose: the service runs on a single event loop, and a
    # blocking LLM call (up to OPENAI_TIMEOUT_SECONDS) froze every other
    # request meanwhile, health checks included.

    async def agenerate(self, prompt: str) -> str:
        """Generate a text response for *prompt*.

        Returns a user-friendly error message when no backend is available
        instead of raising an exception (degraded-mode behaviour).
        """
        if self._llm is None:
            return UNAVAILABLE_MESSAGE

        try:
            return _text(await self._llm.ainvoke(prompt))
        except Exception as exc:  # noqa: BLE001
            logger.error(f"LLM generation error: {exc}")
            return GENERATION_ERROR_MESSAGE

    async def astream(self, prompt: str) -> AsyncIterator[str]:
        """Yield the response to *prompt* piece by piece, as it is generated.

        Without a backend, yields the degraded-mode message. A backend error
        mid-answer is raised, not swallowed: the caller must tell the user
        the answer is incomplete.
        """
        if self._llm is None:
            yield UNAVAILABLE_MESSAGE
            return

        async for chunk in self._llm.astream(prompt):
            piece = _text(chunk)
            if piece:
                yield piece

    @property
    def is_available(self) -> bool:
        """Return True when at least one LLM backend is ready."""
        return self._llm is not None


# Module-level singleton
llm_service = LLMService()
