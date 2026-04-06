from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import decode_token
from app.db.session import get_db
from app.models.user import User, UserRole
from app.schemas.auth import (
    RefreshTokenRequest,
    SendOtpRequest,
    SendOtpResponse,
    TokenResponse,
    VerifyOtpRequest,
)
from app.services import auth_tokens
from app.services.otp import generate_code, store_otp, verify_otp
from app.services.users_bootstrap import ensure_referral_code, ensure_user_wallet

router = APIRouter()


@router.post("/send-otp", response_model=SendOtpResponse)
def send_otp(req: SendOtpRequest):
    code = generate_code()
    store_otp(req.mobile, code)

    # TODO: integrate SMS provider.
    if settings.env == "dev":
        return SendOtpResponse(ok=True, dev_code=code)

    return SendOtpResponse(ok=True)


@router.post("/verify-otp", response_model=TokenResponse)
def verify(req: VerifyOtpRequest, db: Session = Depends(get_db)):
    if not verify_otp(req.mobile, req.code):
        raise HTTPException(status_code=400, detail="invalid_or_expired_code")

    user = db.query(User).filter(User.mobile == req.mobile).one_or_none()
    if user is None:
        user = User(mobile=req.mobile)
        db.add(user)
        db.commit()
        db.refresh(user)

    # Bootstrap user infra (wallet, referral code)
    ensure_user_wallet(db, user.id)
    ensure_referral_code(db, user)

    # Dev-only convenience: bootstrap an Admin user.
    if settings.bootstrap_admin_mobile and req.mobile == settings.bootstrap_admin_mobile:
        user.role = UserRole.admin

    db.commit()

    pair = auth_tokens.issue_tokens(str(user.id))
    return TokenResponse(access_token=pair.access_token, refresh_token=pair.refresh_token)


@router.post("/refresh-token", response_model=TokenResponse)
def refresh(req: RefreshTokenRequest):
    try:
        payload = decode_token(req.refresh_token)
    except ValueError:
        raise HTTPException(status_code=401, detail="invalid_token")

    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="invalid_token_type")

    refresh_jti = payload.get("jti")
    user_id = payload.get("sub")

    if not refresh_jti or not user_id:
        raise HTTPException(status_code=401, detail="invalid_token")

    if not auth_tokens.is_refresh_active(refresh_jti):
        raise HTTPException(status_code=401, detail="refresh_revoked")

    # rotate
    auth_tokens.rotate_refresh(refresh_jti=refresh_jti)
    pair = auth_tokens.issue_tokens(user_id)
    return TokenResponse(access_token=pair.access_token, refresh_token=pair.refresh_token)

