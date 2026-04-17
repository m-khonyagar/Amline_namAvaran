"""SSOT Contract Domain models (Step 2).

Tables:
  ssot_contracts         — نهایی‌شده (Contract entity)
  ssot_contract_drafts   — پیش‌نویس جدا از قرارداد نهایی
  ssot_contract_parties  — طرف‌های قرارداد با نقش و وضعیت امضا
  ssot_signatures        — اطلاعات OTP و امضای هر طرف
"""
from __future__ import annotations

import datetime as dt
import enum
import uuid

from sqlalchemy import DateTime, ForeignKey, Index, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


# ─────────────────────────── Enums ───────────────────────────────


class ContractVisibility(str, enum.Enum):
    people_only = "people_only"
    shared = "shared"
    team = "team"
    public = "public"


class ContractPartyRole(str, enum.Enum):
    creator = "creator"
    principal = "principal"
    representative = "representative"
    witness = "witness"
    agent_signer = "agent_signer"


class SignatureStatus(str, enum.Enum):
    pending = "pending"
    sent = "sent"
    signed = "signed"
    expired = "expired"
    declined = "declined"


class SsotContractStatus(str, enum.Enum):
    draft = "draft"
    active = "active"
    signed = "signed"
    completed = "completed"
    revoked = "revoked"
    expired = "expired"


# ─────────────────────────── Models ──────────────────────────────


class SsotContract(Base):
    """قرارداد نهایی‌شده (SSOT final entity)."""

    __tablename__ = "ssot_contracts"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    contract_number: Mapped[str | None] = mapped_column(String(64), unique=True, nullable=True)
    status: Mapped[str] = mapped_column(
        String(32), nullable=False, default=SsotContractStatus.draft.value, index=True
    )
    visibility: Mapped[str] = mapped_column(
        String(32), nullable=False, default=ContractVisibility.people_only.value, index=True
    )
    creator_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    # nullable — مشاور اختیاری است
    advisor_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    tracking_code: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: dt.datetime.now(dt.timezone.utc),
    )
    updated_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: dt.datetime.now(dt.timezone.utc),
        onupdate=lambda: dt.datetime.now(dt.timezone.utc),
    )

    # Relationships
    drafts: Mapped[list["SsotContractDraft"]] = relationship(
        "SsotContractDraft", back_populates="contract", cascade="all, delete-orphan"
    )
    parties: Mapped[list["SsotContractParty"]] = relationship(
        "SsotContractParty", back_populates="contract", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("ix_ssot_contracts_creator_visibility", "creator_id", "visibility"),
    )


class SsotContractDraft(Base):
    """پیش‌نویس قرارداد (جدا از قرارداد نهایی).

    هر پیش‌نویس می‌تواند تا ۷ روز زنده بماند (expires_at).
    contract_id تا زمان finalize خالی است.
    """

    __tablename__ = "ssot_contract_drafts"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    # nullable تا زمان finalize
    contract_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("ssot_contracts.id", ondelete="SET NULL"), nullable=True, index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    step: Mapped[str] = mapped_column(String(64), nullable=False, default="init")
    data: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    expires_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: dt.datetime.now(dt.timezone.utc) + dt.timedelta(days=7),
    )
    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: dt.datetime.now(dt.timezone.utc),
    )
    updated_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: dt.datetime.now(dt.timezone.utc),
        onupdate=lambda: dt.datetime.now(dt.timezone.utc),
    )

    # Relationship
    contract: Mapped["SsotContract | None"] = relationship("SsotContract", back_populates="drafts")


class SsotContractParty(Base):
    """طرف قرارداد با نقش و وضعیت امضا."""

    __tablename__ = "ssot_contract_parties"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    contract_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("ssot_contracts.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    role: Mapped[str] = mapped_column(
        String(32), nullable=False, default=ContractPartyRole.principal.value
    )
    signature_status: Mapped[str] = mapped_column(
        String(32), nullable=False, default=SignatureStatus.pending.value, index=True
    )
    invited_at: Mapped[dt.datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    signed_at: Mapped[dt.datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relationships
    contract: Mapped["SsotContract"] = relationship("SsotContract", back_populates="parties")
    signatures: Mapped[list["SsotSignature"]] = relationship(
        "SsotSignature", back_populates="party", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("ix_ssot_contract_parties_contract_user", "contract_id", "user_id"),
    )


class SsotSignature(Base):
    """اطلاعات OTP و امضای هر طرف قرارداد.

    قوانین OTP:
      - otp_expires_at: ۵ دقیقه از زمان صدور
      - attempts: حداکثر ۳ بار (بعد از آن قفل)
      - locked_until: ۱۵ دقیقه قفل پس از ۳ تلاش ناموفق
    """

    __tablename__ = "ssot_signatures"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    contract_party_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("ssot_contract_parties.id", ondelete="CASCADE"), nullable=False, index=True
    )
    otp_code: Mapped[str | None] = mapped_column(String(16), nullable=True)
    otp_expires_at: Mapped[dt.datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    attempts: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    locked_until: Mapped[dt.datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    signature_hash: Mapped[str | None] = mapped_column(String(128), nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(64), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: dt.datetime.now(dt.timezone.utc),
    )

    # Relationship
    party: Mapped["SsotContractParty"] = relationship(
        "SsotContractParty", back_populates="signatures"
    )
