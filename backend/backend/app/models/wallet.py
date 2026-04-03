"""Wallet accounts + immutable ledger entries (P1)."""
from __future__ import annotations

import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import BigInteger, DateTime, Enum as SAEnum, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class LedgerEntryType(str, enum.Enum):
    CREDIT = "CREDIT"
    DEBIT = "DEBIT"


class WalletAccount(Base):
    __tablename__ = "wallet_accounts"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    user_id: Mapped[str] = mapped_column(String(64), nullable=False, unique=True, index=True)
    currency: Mapped[str] = mapped_column(String(8), nullable=False, default="IRR")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )

    entries: Mapped[list["WalletLedgerEntry"]] = relationship(
        "WalletLedgerEntry", back_populates="account", cascade="all, delete-orphan"
    )


class WalletLedgerEntry(Base):
    __tablename__ = "wallet_ledger_entries"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    account_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("wallet_accounts.id", ondelete="CASCADE"), nullable=False, index=True
    )
    amount_cents: Mapped[int] = mapped_column(BigInteger, nullable=False)
    entry_type: Mapped[LedgerEntryType] = mapped_column(
        SAEnum(
            LedgerEntryType,
            values_callable=lambda x: [e.value for e in x],
            native_enum=False,
            length=16,
        ),
        nullable=False,
    )
    reference_type: Mapped[str] = mapped_column(String(64), nullable=False, default="manual")
    reference_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    idempotency_key: Mapped[str | None] = mapped_column(String(128), nullable=True)
    memo: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )

    account: Mapped["WalletAccount"] = relationship("WalletAccount", back_populates="entries")
