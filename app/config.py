from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field
import secrets

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    DATABASE_URL: str = "postgresql+asyncpg://a2a:a2a@postgres:5432/a2a"
    REDIS_URL: str = "redis://redis:6379/0"
    ADMIN_KEY: str | None = None
    EVENT_QUEUE_MAXSIZE: int = 10000
    UPSTREAM_CONNECT_TIMEOUT_S: float = 5.0
    UPSTREAM_IDLE_TIMEOUT_S: float = 120.0
    CARD_CACHE_TTL_S: float = 5.0
    LOG_LEVEL: str = "info"

settings = Settings()

