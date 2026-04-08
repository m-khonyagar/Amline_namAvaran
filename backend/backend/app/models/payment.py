"""Payment intents + idempotency (P1 — mock PSP ready)."""

from __future__ import annotations

import enum
import uuid
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import BigInteger, DateTime, ForeignKey, Numeric
from sqlalchemy import Enum as SAEnum
from sqlalchemy import Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


# ── Legacy `payments` table (0001_init) — used by /payments/pay-rent, tests ──


class PaymentStatus(str, enum.Enum):
    pending = "pending"
    completed = "completed"
    failed = "failed"
    refunded = "refunded"


class Payment(Base):
    __tablename__ = "payments"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    contract_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("contracts.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    payer_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    payment_type: Mapped[str] = mapped_column(String(32), nullable=False)
    status: Mapped[PaymentStatus] = mapped_column(
        SAEnum(
            PaymentStatus,
            name="paymentstatus",
            native_enum=False,
            values_callable=lambda x: [e.value for e in x],
            length=32,
        ),
        nullable=False,
    )
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class PaymentIntentStatus(str, enum.Enum):
    PENDING = "PENDING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class PaymentIntent(Base):
    __tablename__ = "payment_intents"
    __table_args__ = (
        UniqueConstraint("idempotency_key", name="uq_payment_idempotency"),
    )

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    user_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    contract_id: Mapped[str | None] = mapped_column(
        String(64), nullable=True, index=True
    )
    party_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    amount_cents: Mapped[int] = mapped_column(BigInteger, nullable=False)
    currency: Mapped[str] = mapped_column(String(8), nullable=False, default="IRR")
    idempotency_key: Mapped[str] = mapped_column(String(128), nullable=False)
    status: Mapped[PaymentIntentStatus] = mapped_column(
        SAEnum(
            PaymentIntentStatus,
            values_callable=lambda x: [e.value for e in x],
            native_enum=False,
            length=32,
        ),
        nullable=False,
        default=PaymentIntentStatus.PENDING,
    )
    psp_reference: Mapped[str | None] = mapped_column(String(128), nullable=True)
    psp_provider: Mapped[str | None] = mapped_column(String(32), nullable=True)
    psp_checkout_token: Mapped[str | None] = mapped_column(Text, nullable=True)
    last_verify_error: Mapped[str | None] = mapped_column(String(512), nullable=True)
    verify_attempt_count: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0
    )
    callback_payload: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
    paid_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
