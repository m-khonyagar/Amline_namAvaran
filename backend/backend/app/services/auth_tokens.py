from __future__ import annotations

import datetime as dt

from app.core.config import settings
from app.core.security import TokenPair, create_token, new_jti
from app.services.redis_client import get_redis


def _access_expires() -> dt.timedelta:
    return dt.timedelta(minutes=settings.jwt_access_minutes)


def _refresh_expires() -> dt.timedelta:
    return dt.timedelta(days=settings.jwt_refresh_days)


def issue_tokens(user_id: str) -> TokenPair:
    access_jti = new_jti()
    refresh_jti = new_jti()

    access = create_token(user_id=user_id, token_type="access", jti=access_jti, expires_in=_access_expires())
    refresh = create_token(user_id=user_id, token_type="refresh", jti=refresh_jti, expires_in=_refresh_expires())

    # Store refresh token jti so we can revoke/rotate.
    r = get_redis()
    r.setex(f"refresh:{refresh_jti}", int(_refresh_expires().total_seconds()), "1")

    return TokenPair(access_token=access, refresh_token=refresh)


def rotate_refresh(*, refresh_jti: str) -> None:
    r = get_redis()
    r.delete(f"refresh:{refresh_jti}")


def is_refresh_active(refresh_jti: str) -> bool:
    r = get_redis()
    return r.exists(f"refresh:{refresh_jti}") == 1
