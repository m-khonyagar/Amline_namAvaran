from __future__ import annotations

import os
from dataclasses import dataclass


def _bool(name: str, default: bool = False) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def _int(name: str, default: int) -> int:
    raw = os.getenv(name)
    if raw is None or raw.strip() == "":
        return default
    try:
        return int(raw)
    except ValueError:
        return default


_jwt_secret_raw = (os.getenv("AMLINE_JWT_SECRET") or "").strip()


@dataclass(frozen=True)
class Settings:
    env: str = os.getenv("AMLINE_ENV", "dev")
    redis_url: str = os.getenv("AMLINE_REDIS_URL", "redis://localhost:6379/0")

    jwt_secret: str = (
        _jwt_secret_raw
        if _jwt_secret_raw
        else "dev-insecure-secret-minimum-32-characters-long!!"
    )

    jwt_access_minutes: int = _int("AMLINE_JWT_ACCESS_MINUTES", 60)
    jwt_refresh_days: int = _int("AMLINE_JWT_REFRESH_DAYS", 30)

    otp_ttl_seconds: int = _int("AMLINE_OTP_TTL_SECONDS", 120)
    fixed_test_mobile: str = os.getenv("AMLINE_FIXED_TEST_MOBILE", "09100000000")
    fixed_test_otp: str = os.getenv("AMLINE_FIXED_TEST_OTP", "11111")
    fixed_test_otp_enabled: bool = _bool("AMLINE_FIXED_TEST_OTP_ENABLED", False)
    bootstrap_admin_mobile: str = os.getenv("AMLINE_BOOTSTRAP_ADMIN_MOBILE", "")

    notification_retry_base_seconds: int = _int("AMLINE_NOTIFICATION_RETRY_BASE_SECONDS", 5)
    notification_retry_max_seconds: int = _int("AMLINE_NOTIFICATION_RETRY_MAX_SECONDS", 300)

    pdf_generator_url: str = os.getenv("AMLINE_PDF_GENERATOR_URL", "http://localhost:8001")
    commission_discount_codes: str = os.getenv("AMLINE_COMMISSION_DISCOUNT_CODES", "")

    s3_endpoint_url: str = os.getenv("AMLINE_S3_ENDPOINT_URL", "")
    s3_access_key: str = os.getenv("AMLINE_S3_ACCESS_KEY", "")
    s3_secret_key: str = os.getenv("AMLINE_S3_SECRET_KEY", "")
    s3_region: str = os.getenv("AMLINE_S3_REGION", "us-east-1")
    s3_bucket: str = os.getenv("AMLINE_S3_BUCKET", "")


settings = Settings()
