from functools import lru_cache
from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent
DEV_SECRET = "dev-only-secret-change-me-in-production-0123456789"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=BASE_DIR / ".env", extra="ignore")

    environment: str = "development"
    database_url: str = "postgresql+psycopg://verdescope:verdescope@localhost:5433/verdescope"
    secret_key: str = DEV_SECRET
    access_token_minutes: int = 60 * 8

    # Built React app served by FastAPI (set to /app/static in Docker)
    static_dir: str = str(BASE_DIR.parent / "frontend" / "dist")
    # Mount a Railway volume here so uploads survive redeploys
    upload_dir: str = str(BASE_DIR / "data" / "uploads")
    max_upload_mb: int = 100

    # Seeding: company content is always seeded on an empty DB; demo data only when true
    seed_demo: bool = True
    admin_email: str | None = None
    admin_password: str | None = None

    # Outbound email: "smtp", "resend" or "" (disabled: replies are stored but not delivered)
    email_provider: str = ""
    smtp_host: str | None = None
    smtp_port: int = 587
    smtp_user: str | None = None
    smtp_password: str | None = None
    smtp_starttls: bool = True
    resend_api_key: str | None = None
    # Envelope sender, must be a verified domain/address with the provider
    mail_from: str | None = None

    cors_origins: list[str] = ["http://localhost:5173"]

    @field_validator("database_url")
    @classmethod
    def _normalise_db_url(cls, v: str) -> str:
        # Railway/Heroku style URLs -> SQLAlchemy psycopg3 driver
        for prefix in ("postgres://", "postgresql://"):
            if v.startswith(prefix):
                return "postgresql+psycopg://" + v[len(prefix):]
        return v

    @property
    def is_production(self) -> bool:
        return self.environment == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()
