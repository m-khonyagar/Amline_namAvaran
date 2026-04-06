from __future__ import annotations

from pydantic import BaseModel


class SendOtpRequest(BaseModel):
    mobile: str


class SendOtpResponse(BaseModel):
    ok: bool
    dev_code: str | None = None


class VerifyOtpRequest(BaseModel):
    mobile: str
    code: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshTokenRequest(BaseModel):
    refresh_token: str
