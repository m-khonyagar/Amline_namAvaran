from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="AMLINE_", env_file=".env", extra="ignore")

    env: str = "dev"

    database_url: str
    redis_url: str

    jwt_secret: str
    jwt_issuer: str = "amline"
    jwt_access_minutes: int = 15
    jwt_refresh_days: int = 30

    s3_endpoint_url: str | None = None
    s3_access_key: str | None = None
    s3_secret_key: str | None = None
    s3_bucket: str = "amline-docs"
    s3_region: str = "us-east-1"

    otp_ttl_seconds: int = 120

    # Notification worker settings
    notification_max_attempts: int = 5
    notification_retry_base_seconds: int = 5
    notification_retry_max_seconds: int = 300
    notification_stuck_ms: int = 60000

    # Dev convenience: if set, this mobile becomes Admin on login.
    bootstrap_admin_mobile: str | None = None


settings = Settings()
