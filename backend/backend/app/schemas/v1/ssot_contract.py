"""Pydantic schemas for the SSOT Contract Domain endpoints."""
from __future__ import annotations

import datetime as dt
import uuid
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, Field


# ─────────────────────────── Drafts ──────────────────────────────


class DraftCreateBody(BaseModel):
    """بدنه ایجاد پیش‌نویس قرارداد."""

    model_config = ConfigDict(extra="ignore")

    visibility: str = Field(default="people_only", description="people_only | shared | team | public")
    advisor_id: Optional[str] = Field(default=None, description="شناسه مشاور (اختیاری)")
    step: str = Field(default="init", description="مرحله فعلی ویزارد")
    data: dict[str, Any] = Field(default_factory=dict, description="داده‌های JSON پیش‌نویس")


class DraftUpdateBody(BaseModel):
    """بدنه به‌روزرسانی پیش‌نویس."""

    model_config = ConfigDict(extra="ignore")

    visibility: Optional[str] = None
    advisor_id: Optional[str] = None
    step: Optional[str] = None
    data: Optional[dict[str, Any]] = None


class DraftOut(BaseModel):
    """پاسخ پیش‌نویس قرارداد."""

    id: str
    contract_id: Optional[str]
    user_id: str
    step: str
    data: dict[str, Any]
    version: int
    expires_at: dt.datetime
    created_at: dt.datetime
    updated_at: dt.datetime


# ─────────────────────────── Contracts ───────────────────────────


class FinalizeBody(BaseModel):
    """بدنه نهایی‌سازی پیش‌نویس به قرارداد."""

    model_config = ConfigDict(extra="ignore")

    contract_number: Optional[str] = Field(
        default=None, description="شماره قرارداد (اگر خالی باشد اتوماتیک ساخته می‌شود)"
    )


class ContractOut(BaseModel):
    """پاسخ قرارداد نهایی."""

    id: str
    contract_number: Optional[str]
    status: str
    visibility: str
    creator_id: str
    advisor_id: Optional[str]
    tracking_code: str
    created_at: dt.datetime
    updated_at: dt.datetime


class ContractListOut(BaseModel):
    """آیتم لیست قراردادها."""

    id: str
    contract_number: Optional[str]
    status: str
    visibility: str
    creator_id: str
    tracking_code: str
    created_at: dt.datetime


# ─────────────────────────── Parties ─────────────────────────────


class InviteBody(BaseModel):
    """بدنه دعوت طرف قرارداد."""

    model_config = ConfigDict(extra="ignore")

    user_id: str = Field(description="شناسه کاربر دعوت‌شده")
    role: str = Field(
        default="principal",
        description="creator | principal | representative | witness | agent_signer",
    )


class PartyOut(BaseModel):
    """پاسخ طرف قرارداد."""

    id: str
    contract_id: str
    user_id: str
    role: str
    signature_status: str
    invited_at: Optional[dt.datetime]
    signed_at: Optional[dt.datetime]


# ─────────────────────────── Sign / OTP ──────────────────────────


class SignBody(BaseModel):
    """بدنه تأیید OTP و امضا."""

    model_config = ConfigDict(extra="ignore")

    otp_code: str = Field(description="کد OTP دریافت‌شده")
    party_id: Optional[str] = Field(
        default=None, description="شناسه طرف قرارداد (اگر خالی باشد از کاربر جاری استفاده می‌شود)"
    )


class SignOut(BaseModel):
    """پاسخ امضای موفق."""

    ok: bool = True
    party_id: str
    signed_at: dt.datetime
    contract_status: str
