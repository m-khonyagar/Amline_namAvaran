from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, Header

from app.core.security import decode_token
from app.repositories.memory.state import get_store
from app.services import auth_tokens

logger = logging.getLogger(__name__)

router = APIRouter(tags=["auth"])


@router.get("/auth/me")
def auth_me() -> dict:
    return get_store().user_with_permissions()


@router.post("/auth/logout")
def auth_logout(
    authorization: Optional[str] = Header(default=None),
) -> dict:
    """خروج از سیستم — ابطال refresh token فعلی."""
    if authorization and authorization.startswith("Bearer "):
        token = authorization[7:]
        try:
            payload = decode_token(token)
            jti = payload.get("jti")
            if payload.get("type") == "refresh" and jti:
                auth_tokens.rotate_refresh(refresh_jti=jti)
        except (ValueError, KeyError):
            logger.debug("Logout token decode failed — proceeding with client-side logout")
    return {"ok": True}


# /admin/otp/send and /admin/login are served by legacy_admin_auth on platform_router
# (DB-backed). Memory-only stubs removed to avoid shadowing when AMLINE_OTP_MAGIC_ENABLED=1.
