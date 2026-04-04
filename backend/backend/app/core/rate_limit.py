"""محدودیت نرخ سراسری (SlowAPI) — حافظه یا Redis؛ خاموش با AMLINE_RATE_LIMIT_ENABLED=0."""

from __future__ import annotations

import os

from fastapi import FastAPI
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address


def _enabled() -> bool:
    return os.getenv("AMLINE_RATE_LIMIT_ENABLED", "1").lower() not in (
        "0",
        "false",
        "no",
    )


def _storage_uri() -> str:
    return (os.getenv("REDIS_URL") or "").strip() or "memory://"


def _default_limit() -> str:
    return os.getenv("AMLINE_RATE_LIMIT_DEFAULT", "300/minute").strip()


limiter: Limiter | None
if _enabled():
    limiter = Limiter(
        key_func=get_remote_address,
        default_limits=[_default_limit()],
        storage_uri=_storage_uri(),
    )
else:
    limiter = None


def register_rate_limit(app: FastAPI) -> None:
    if limiter is None:
        return
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    app.add_middleware(SlowAPIMiddleware)
