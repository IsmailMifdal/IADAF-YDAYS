"""LLM service — any OpenAI-compatible API: OpenAI, an EU provider such as
Mistral (OPENAI_BASE_URL), or a local Ollama, which speaks the same protocol.

Provides a unified asynchronous interface — ``agenerate(prompt)`` for a
whole answer, ``astream(prompt)`` for one streamed piece by piece —
regardless of the provider. Built on the official ``openai`` SDK alone: the
LangChain wrappers it replaces brought a large dependency tree, and its
vulnerabilities, for three function calls.
"""

from typing import AsyncIterator, Optional

import httpx
from loguru import logger
from openai import AsyncOpenAI

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


class LLMService:
    """One OpenAI-compatible chat model, chosen at startup."""

    def __init__(self) -> None:
        self._client: Optional[AsyncOpenAI] = None
        self._model = ""
        self._temperature = settings.openai_temperature
        self._max_tokens = settings.openai_max_tokens

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
        """Use the local Ollama instance if it answers, OpenAI otherwise."""
        base_url = settings.ollama_base_url.rstrip("/")
        try:
            httpx.get(f"{base_url}/api/tags", timeout=5).raise_for_status()
        except httpx.HTTPError as exc:
            logger.warning(f"Ollama not available ({type(exc).__name__}). Trying OpenAI fallback…")
            self._setup_openai()
            return

        # Ollama serves the OpenAI protocol under /v1; it ignores the key.
        self._client = AsyncOpenAI(
            base_url=f"{base_url}/v1",
            api_key="ollama",
            timeout=settings.openai_timeout_seconds,
        )
        self._model = settings.ollama_model
        logger.info(f"Ollama backend ready — model: {self._model} @ {base_url}")

    def _setup_openai(self) -> None:
        """Set up OpenAI or a compatible provider (model from ``OPENAI_MODEL``)."""
        if not settings.openai_api_key:
            logger.warning(
                "Neither Ollama nor OpenAI is available. "
                "The service will run in degraded mode."
            )
            return

        base_url = settings.openai_base_url or DEFAULT_OPENAI_BASE_URL
        self._client = AsyncOpenAI(
            api_key=settings.openai_api_key,
            # Always explicit: the SDK also reads OPENAI_BASE_URL from the
            # environment, and docker-compose passes it as an empty string
            # when unset — which the SDK takes for a URL and fails every
            # request with "Connection error".
            base_url=base_url,
            timeout=settings.openai_timeout_seconds,
        )
        self._model = settings.openai_model
        logger.info(f"OpenAI-compatible backend ready — model: {self._model} @ {base_url}")

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------
    #
    # Asynchronous on purpose: the service runs on a single event loop, and a
    # blocking LLM call (up to OPENAI_TIMEOUT_SECONDS) froze every other
    # request meanwhile, health checks included.

    def _request(self, prompt: str, stream: bool) -> dict:
        return {
            "model": self._model,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": self._temperature,
            "max_tokens": self._max_tokens,
            "stream": stream,
        }

    async def agenerate(self, prompt: str) -> str:
        """Generate a text response for *prompt*.

        Returns a user-friendly error message when no backend is available
        instead of raising an exception (degraded-mode behaviour).
        """
        if self._client is None:
            return UNAVAILABLE_MESSAGE

        try:
            completion = await self._client.chat.completions.create(**self._request(prompt, False))
            return completion.choices[0].message.content or ""
        except Exception as exc:  # noqa: BLE001
            logger.error(f"LLM generation error: {exc}")
            return GENERATION_ERROR_MESSAGE

    async def astream(self, prompt: str) -> AsyncIterator[str]:
        """Yield the response to *prompt* piece by piece, as it is generated.

        Without a backend, yields the degraded-mode message. A backend error
        mid-answer is raised, not swallowed: the caller must tell the user
        the answer is incomplete. A reader that stops early (the visitor left)
        closes the upstream request, and the generation billed with it.
        """
        if self._client is None:
            yield UNAVAILABLE_MESSAGE
            return

        stream = await self._client.chat.completions.create(**self._request(prompt, True))
        try:
            async for chunk in stream:
                piece = chunk.choices[0].delta.content if chunk.choices else None
                if piece:
                    yield piece
        finally:
            await stream.close()

    @property
    def is_available(self) -> bool:
        """Return True when an LLM backend is ready."""
        return self._client is not None


# Module-level singleton
llm_service = LLMService()
