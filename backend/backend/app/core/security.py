from __future__ import annotations

import random
import secrets
import string
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt

from app.core.config import settings


@dataclass(frozen=True)
class TokenPair:
    access_token: str
    refresh_token: str


def new_jti() -> str:
    return secrets.token_urlsafe(24)


def create_token(
    *,
    user_id: str,
    token_type: str,
    jti: str,
    expires_in: timedelta,
) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,
        "type": token_type,
        "jti": jti,
        "iat": now,
        "exp": now + expires_in,
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
    except jwt.PyJWTError as e:
        raise ValueError("invalid_token") from e


def generate_jwt(user_id: str, secret_key: str, expiration_minutes: int = 60) -> str:
    expiration = datetime.utcnow() + timedelta(minutes=expiration_minutes)
    return jwt.encode(
        {"user_id": user_id, "exp": expiration}, secret_key, algorithm="HS256"
    )


def verify_jwt(token: str, secret_key: str) -> dict:
    try:
        return jwt.decode(token, secret_key, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        return {"error": "Token has expired"}
    except jwt.InvalidTokenError:
        return {"error": "Invalid token"}


def generate_otp(length: int = 6) -> str:
    return "".join(random.choices(string.digits, k=length))


def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")


def verify_password(password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), hashed_password.encode("utf-8"))
