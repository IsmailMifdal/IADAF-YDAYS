"""LLM service — Ollama (Mistral) with OpenAI fallback.

Provides a unified ``generate(prompt)`` interface regardless of the
underlying provider.
"""

from loguru import logger

from app.core.config import settings


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
        """Set up OpenAI GPT-3.5-turbo as fallback."""
        if not settings.openai_api_key:
            logger.warning(
                "Neither Ollama nor OpenAI is available. "
                "The service will run in degraded mode."
            )
            return

        try:
            from langchain_openai import ChatOpenAI  # type: ignore

            self._llm = ChatOpenAI(
                model="gpt-4o-mini",
                openai_api_key=settings.openai_api_key,
                temperature=0.1,
            )
            self._openai_available = True
            logger.info("OpenAI fallback backend ready.")
        except Exception as exc:  # noqa: BLE001
            logger.error(f"Failed to initialise OpenAI: {exc}")

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def generate(self, prompt: str) -> str:
        """Generate a text response for *prompt*.

        Returns a user-friendly error message when no backend is available
        instead of raising an exception (degraded-mode behaviour).
        """
        if self._llm is None:
            return (
                "⚠️  Le service IA n'est pas encore disponible. "
                "Veuillez réessayer dans quelques instants. "
                "Si le problème persiste, consultez service-public.fr."
            )

        try:
            result = self._llm.invoke(prompt)
            # ChatOpenAI returns an AIMessage object; Ollama returns a str.
            if hasattr(result, "content"):
                return str(result.content)
            return str(result)
        except Exception as exc:  # noqa: BLE001
            logger.error(f"LLM generation error: {exc}")
            return (
                "⚠️  Une erreur est survenue lors de la génération de la réponse. "
                "Veuillez réessayer ou consulter service-public.fr."
            )

    @property
    def is_available(self) -> bool:
        """Return True when at least one LLM backend is ready."""
        return self._llm is not None


# Module-level singleton
llm_service = LLMService()
