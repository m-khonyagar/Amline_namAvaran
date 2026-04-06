from __future__ import annotations

import datetime as dt
import secrets
from dataclasses import dataclass

from jose import JWTError, jwt

from app.core.config import settings


@dataclass(frozen=True)
class TokenPair:
    access_token: str
    refresh_token: str


def _now_utc() -> dt.datetime:
    return dt.datetime.now(dt.timezone.utc)


def new_jti() -> str:
    return secrets.token_urlsafe(24)


def create_token(*, user_id: str, token_type: str, jti: str, expires_in: dt.timedelta) -> str:
    now = _now_utc()
    payload = {
        "iss": settings.jwt_issuer,
        "sub": user_id,
        "iat": int(now.timestamp()),
        "exp": int((now + expires_in).timestamp()),
        "type": token_type,
        "jti": jti,
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=["HS256"], issuer=settings.jwt_issuer)
    except JWTError as e:
        raise ValueError("invalid_token") from e
