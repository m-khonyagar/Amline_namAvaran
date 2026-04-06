from __future__ import annotations

import random

from app.core.config import settings
from app.services.redis_client import get_redis


def generate_code() -> str:
    return f"{random.randint(0, 999999):06d}"


def store_otp(mobile: str, code: str) -> None:
    r = get_redis()
    r.setex(f"otp:{mobile}", settings.otp_ttl_seconds, code)


def verify_otp(mobile: str, code: str) -> bool:
    r = get_redis()
    key = f"otp:{mobile}"
    expected = r.get(key)
    if expected is None:
        return False
    if expected != code:
        return False
    r.delete(key)
    return True
