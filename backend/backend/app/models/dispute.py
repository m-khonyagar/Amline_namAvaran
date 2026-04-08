"""اختلاف، مدارک، و یخ‌زدگی ledger (معماری پروداکشن قرارداد)."""

from __future__ import annotations

import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import BigInteger, DateTime
from sqlalchemy import Enum as SAEnum
from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class DisputeCategory(str, enum.Enum):
    PAYMENT = "PAYMENT"
    SIGNATURE = "SIGNATURE"
    REGISTRY = "REGISTRY"
    LEGAL = "LEGAL"
    OTHER = "OTHER"


class DisputeStatus(str, enum.Enum):
    OPEN = "OPEN"
    UNDER_REVIEW = "UNDER_REVIEW"
    RESOLVED = "RESOLVED"
    REJECTED = "REJECTED"


class DisputeResolutionType(str, enum.Enum):
    REFUND_FULL = "REFUND_FULL"
    REFUND_PARTIAL = "REFUND_PARTIAL"
    PAYOUT_SPLIT = "PAYOUT_SPLIT"
    CANCEL_CONTRACT = "CANCEL_CONTRACT"
    DISMISS = "DISMISS"


class DisputeEvidenceType(str, enum.Enum):
    AUDIT_REF = "AUDIT_REF"
    CHAT_EXPORT = "CHAT_EXPORT"
    SIGNATURE_SNAPSHOT = "SIGNATURE_SNAPSHOT"
    UPLOAD = "UPLOAD"


class Dispute(Base):
    __tablename__ = "contract_disputes"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    contract_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    raised_by_party_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    category: Mapped[DisputeCategory] = mapped_column(
        SAEnum(
            DisputeCategory,
            values_callable=lambda x: [e.value for e in x],
            native_enum=False,
            length=32,
        ),
        nullable=False,
    )
    status: Mapped[DisputeStatus] = mapped_column(
        SAEnum(
            DisputeStatus,
            values_callable=lambda x: [e.value for e in x],
            native_enum=False,
            length=32,
        ),
        nullable=False,
        default=DisputeStatus.OPEN,
    )
    resolution_type: Mapped[DisputeResolutionType | None] = mapped_column(
        SAEnum(
            DisputeResolutionType,
            values_callable=lambda x: [e.value for e in x],
            native_enum=False,
            length=32,
        ),
        nullable=True,
    )
    resolver_user_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    resolved_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    evidence: Mapped[list["DisputeEvidence"]] = relationship(
        back_populates="dispute", cascade="all, delete-orphan"
    )


class DisputeEvidence(Base):
    __tablename__ = "contract_dispute_evidence"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    dispute_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("contract_disputes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    type: Mapped[DisputeEvidenceType] = mapped_column(
        SAEnum(
            DisputeEvidenceType,
            values_callable=lambda x: [e.value for e in x],
            native_enum=False,
            length=32,
        ),
        nullable=False,
    )
    storage_uri: Mapped[str] = mapped_column(Text, nullable=False)
    hash_sha256: Mapped[str | None] = mapped_column(String(64), nullable=True)
    submitted_by: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    dispute: Mapped["Dispute"] = relationship(back_populates="evidence")


class LedgerHold(Base):
    """یخ‌زدگی مبلغ روی حساب داخلی تا زمان حل اختلاف."""

    __tablename__ = "ledger_holds"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    wallet_or_ledger_account: Mapped[str] = mapped_column(String(64), nullable=False)
    amount_cents: Mapped[int] = mapped_column(BigInteger, nullable=False)
    currency: Mapped[str] = mapped_column(String(8), nullable=False, default="IRR")
    dispute_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("contract_disputes.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    reason: Mapped[str | None] = mapped_column(String(256), nullable=True)
    released_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
