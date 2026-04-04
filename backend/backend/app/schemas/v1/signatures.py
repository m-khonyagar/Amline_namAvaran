from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class SignRequestBody(BaseModel):
    model_config = ConfigDict(extra="ignore")

    mobile: Optional[str] = None
    party_id: Optional[str] = None


class SignVerifyBody(BaseModel):
    model_config = ConfigDict(extra="ignore")

    otp: str
    mobile: str
    salt: str = ""
    party_id: Optional[str] = None
    challenge_id: Optional[str] = None
    signature_method: Optional[str] = Field(
        default=None,
        description="SELF_OTP | AGENT_OTP | ADMIN_OTP | AUTO",
    )
    agent_user_id: Optional[str] = None


class AgentSignVerifyBody(BaseModel):
    model_config = ConfigDict(extra="ignore")

    otp: str
    mobile: str
    party_id: str
    agent_user_id: str
    salt: str = ""
    challenge_id: Optional[str] = None


class AdminAssistSignRequestBody(BaseModel):
    model_config = ConfigDict(extra="ignore")

    party_id: str


class AdminAssistSignVerifyBody(BaseModel):
    model_config = ConfigDict(extra="ignore")

    party_id: str
    otp: str
    mobile: str
    agent_user_id: str
    salt: str = ""
    challenge_id: Optional[str] = None


class LegacySendSignBody(BaseModel):
    """Payload از admin-ui (`SendSignRequestDto`)."""

    model_config = ConfigDict(extra="ignore")

    party_id: Optional[int | str] = None
    signer_id: Optional[int | str] = None
    user_id: Optional[int | str] = None
    sign_type: Optional[str] = "OTP"


class WitnessRequestBody(BaseModel):
    model_config = ConfigDict(extra="ignore")

    national_code: str
    mobile: str
    witness_type: Optional[str] = None
    witness_name: Optional[str] = None


class WitnessVerifyBody(BaseModel):
    model_config = ConfigDict(extra="ignore")

    otp: str
    mobile: str
    national_code: str
    salt: str = ""
    witness_type: Optional[str] = None
    challenge_id: Optional[str] = None
    next_step: Optional[str] = Field(
        default=None, description="اختیاری؛ پیش‌فرض FINISH پس از تایید شاهد"
    )


class SignRequestResponse(BaseModel):
    ok: bool = True
    challenge_id: str
    expires_in_seconds: int
    masked_phone: str
    debug_code: Optional[str] = None


class SignVerifyResponse(BaseModel):
    ok: bool = True


class WitnessRequestResponse(BaseModel):
    ok: bool = True
    challenge_id: str
    expires_in_seconds: int
    masked_phone: str
    debug_code: Optional[str] = None


class WitnessVerifyResponse(BaseModel):
    ok: bool = True
    next_step: str
