"""Payment intents + idempotency (P1 — mock PSP ready)."""

from __future__ import annotations

import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import BigInteger, DateTime
from sqlalchemy import Enum as SAEnum
from sqlalchemy import Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


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
