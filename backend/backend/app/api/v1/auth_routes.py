from datetime import datetime, timezone

from fastapi import APIRouter

from app.repositories.memory.state import get_store
from app.schemas.v1.payloads import LoginBody, OtpBody

router = APIRouter(tags=["auth"])


@router.get("/auth/me")
def auth_me() -> dict:
    return get_store().user_with_permissions()


@router.post("/admin/otp/send")
def otp_send(_body: OtpBody) -> dict:
    return {"success": True, "message": "ok"}


@router.post("/admin/login")
def admin_login(body: LoginBody) -> dict:
    s = get_store()
    u = s.user_with_permissions()
    s.audit_event(u["id"], "auth.login", "session", {"mobile": body.mobile})
    sid = f"sess-{int(datetime.now(timezone.utc).timestamp() * 1000)}"
    s.sessions_store.insert(
        0,
        {
            "id": sid,
            "user_id": u["id"],
            "started_at": datetime.now(timezone.utc).isoformat(),
            "last_seen_at": datetime.now(timezone.utc).isoformat(),
            "ip": "127.0.0.1",
        },
    )
    return {
        "access_token": "mock-token-123",
        "refresh_token": "mock-refresh-123",
        "user": u,
    }
