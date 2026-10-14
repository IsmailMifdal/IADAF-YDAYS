"""Application configuration via pydantic-settings.

All settings can be overridden using environment variables or a .env file.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Service identity
    app_name: str = "IA-DAF AI Service"
    app_version: str = "1.0.0"
    app_host: str = "0.0.0.0"
    app_port: int = 8086

    # Eureka discovery
    eureka_server_url: str = "http://localhost:8761/eureka"
    eureka_app_name: str = "AI-SERVICE"
    eureka_instance_hostname: str = "localhost"

    # Ollama / LLM
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "mistral"

    # OpenAI fallback
    openai_api_key: str = ""
    use_openai: bool = False
    openai_model: str = "gpt-4o-mini"
    # Any OpenAI-compatible endpoint. Empty means OpenAI itself (servers in the
    # US — a transfer outside the EU under the RGPD). Set it to an EU-hosted
    # provider to keep conversations in the EU, e.g. https://api.mistral.ai/v1
    # with OPENAI_MODEL=mistral-small-latest and that provider's key.
    openai_base_url: str = ""
    # Low by default: administrative answers must be factual, not creative.
    openai_temperature: float = 0.1
    openai_max_tokens: int = 1000
    openai_timeout_seconds: float = 30

    # ChromaDB vector store
    chroma_persist_dir: str = "./app/data/vectorstore"

    # SQLite database (for conversation history)
    database_url: str = "sqlite+aiosqlite:///./app/data/iadaf.db"

    # Conversations older than this are purged automatically (RGPD — limitation
    # de la durée de conservation). Anonymous chats can't be tied to a person,
    # so this purge is the only way they are ever erased.
    conversation_retention_days: int = 30

    # Shared secret with the frontend. Only a caller presenting it may attach a
    # user id to a conversation or erase a user's data — without it, anyone
    # reaching the gateway could do both for any account.
    internal_api_token: str = ""

    # CORS — comma-separated list of browser origins allowed to call this service
    # directly. In normal operation the frontend proxies every call server-side,
    # so this only needs to cover direct browser access (local debugging, docs).
    cors_origins: str = "http://localhost:3000"

    @property
    def cors_origins_list(self) -> list[str]:
        """`cors_origins` split into a list, ignoring blanks."""
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]



settings = Settings()
