from fastapi import APIRouter

from app.repositories.memory.state import get_store

router = APIRouter(tags=["auth"])


@router.get("/auth/me")
def auth_me() -> dict:
    return get_store().user_with_permissions()


# /admin/otp/send and /admin/login are served by legacy_admin_auth on platform_router
# (DB-backed). Memory-only stubs removed to avoid shadowing when AMLINE_OTP_MAGIC_ENABLED=1.
