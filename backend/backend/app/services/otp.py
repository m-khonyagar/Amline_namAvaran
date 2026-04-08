from __future__ import annotations

import random

from app.core.config import settings
import app.services.magic_otp as magic_otp
from app.services.redis_client import get_redis


def _allows_fixed_test_otp() -> bool:
    """در dev/staging همیشه؛ در production فقط با AMLINE_FIXED_TEST_OTP_ENABLED=true."""
    if settings.fixed_test_otp_enabled:
        return True
    return settings.env in ("dev", "staging")


def _fixed_test_otp_ok(mobile: str, code: str) -> bool:
    if not _allows_fixed_test_otp():
        return False
    return (
        mobile.strip() == settings.fixed_test_mobile.strip()
        and code.strip() == settings.fixed_test_otp.strip()
    )


def generate_code() -> str:
    return f"{random.randint(0, 999999):06d}"


def store_otp(mobile: str, code: str) -> None:
    if magic_otp.is_magic_mobile(mobile):
        code = magic_otp.magic_otp_code()
    r = get_redis()
    r.setex(f"otp:{mobile}", settings.otp_ttl_seconds, code)


def verify_otp(mobile: str, code: str) -> bool:
    if magic_otp.verify_magic_pair(mobile, code):
        return True
    if _fixed_test_otp_ok(mobile, code):
        return True
    r = get_redis()
    key = f"otp:{mobile}"
    expected = r.get(key)
    if expected is None:
        return False
    if expected != code:
        return False
    r.delete(key)
    return True
