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

    # ChromaDB vector store
    chroma_persist_dir: str = "./app/data/vectorstore"

    # SQLite database (for conversation history)
    database_url: str = "sqlite+aiosqlite:///./app/data/iadaf.db"

    # PostgreSQL database (for lead emails)
    postgres_url: str = "postgresql+asyncpg://iadaf_user:iadaf_password@localhost:5432/iadaf_db"



settings = Settings()
