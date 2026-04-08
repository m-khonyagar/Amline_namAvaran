"""Admin auth endpoints — /admin/otp/send, /admin/login.

Mirrors the contract consumed by admin-ui and amline-ui frontends.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.models.audit_log import AuditLogEntry
from app.models.user import User, UserRole
from app.services import auth_tokens
from app.services.magic_otp import is_magic_mobile, magic_otp_code
from app.services.otp import _allows_fixed_test_otp, generate_code, store_otp, verify_otp
from app.services.sms import send_otp_sms
from app.services.users_bootstrap import ensure_referral_code, ensure_user_wallet

router = APIRouter()

_ROLE_PERMISSIONS = {
    "Admin": [
        "contracts:read", "contracts:write",
        "users:read", "users:write",
        "ads:read", "ads:write",
        "wallets:read", "wallets:write",
        "settings:read", "settings:write",
        "audit:read", "roles:read", "roles:write",
        "reports:read", "notifications:read",
        "crm:read", "crm:write",
    ],
    "Moderator": [
        "contracts:read", "contracts:write",
        "users:read", "crm:read", "crm:write",
        "reports:read", "notifications:read",
    ],
    "Agent": ["contracts:read", "contracts:write", "crm:read", "crm:write"],
    "User": ["contracts:read", "contracts:write"],
}


def _permissions(user: User):
    role_val = user.role.value if hasattr(user.role, "value") else str(user.role)
    return _ROLE_PERMISSIONS.get(role_val, [])


class OtpBody(BaseModel):
    mobile: str


class LoginBody(BaseModel):
    mobile: str
    otp: str


@router.post("/otp/send")
def otp_send(body: OtpBody):
    code = magic_otp_code() if is_magic_mobile(body.mobile) else generate_code()
    store_otp(body.mobile, code)
    if settings.env == "dev":
        # در dev کد واقعی در Redis؛ برای موبایل تست ثابت همان OTP کانونی را هم در dev_code نشان می‌دهیم.
        dev_hint = code
        if _allows_fixed_test_otp() and body.mobile.strip() == settings.fixed_test_mobile.strip():
            dev_hint = settings.fixed_test_otp
        return {"success": True, "message": "ok", "dev_code": dev_hint}
    # در staging/production SMS واقعی ارسال می‌شود (به‌جز شمارهٔ جادویی)
    if not is_magic_mobile(body.mobile):
        send_otp_sms(body.mobile, code)
    return {"success": True, "message": "ok"}


@router.post("/login")
def admin_login(body: LoginBody, db: Session = Depends(get_db)):
    if not verify_otp(body.mobile, body.otp):
        raise HTTPException(status_code=400, detail="invalid_or_expired_code")

    user = db.query(User).filter(User.mobile == body.mobile).one_or_none()
    if user is None:
        user = User(mobile=body.mobile, role=UserRole.user)
        db.add(user)
        db.commit()
        db.refresh(user)

    ensure_user_wallet(db, user.id)
    ensure_referral_code(db, user)

    if settings.bootstrap_admin_mobile and body.mobile == settings.bootstrap_admin_mobile:
        user.role = UserRole.admin

    log = AuditLogEntry(
        user_id=str(user.id), action="auth.login", entity="session", metadata_json=None
    )
    db.add(log)
    db.commit()

    pair = auth_tokens.issue_tokens(str(user.id))
    role_val = user.role.value if hasattr(user.role, "value") else str(user.role)
    return {
        "access_token": pair.access_token,
        "refresh_token": pair.refresh_token,
        "user": {
            "id": str(user.id),
            "mobile": user.mobile,
            "full_name": user.name,
            "role": role_val,
            "role_id": f"role-{role_val.lower()}",
            "permissions": _permissions(user),
        },
    }
