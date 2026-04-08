from __future__ import annotations

import datetime as dt
import enum
import uuid

from sqlalchemy import DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, UUIDPkMixin


class ArbitrationStatus(str, enum.Enum):
    open = "open"
    under_review = "under_review"
    resolved = "resolved"
    rejected = "rejected"


class Arbitration(UUIDPkMixin, Base):
    __tablename__ = "arbitrations"

    contract_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("contracts.id", ondelete="RESTRICT"), index=True)
    claimant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), index=True)
    respondent_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), index=True)

    reason: Mapped[str] = mapped_column(String(128))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    status: Mapped[ArbitrationStatus] = mapped_column(Enum(ArbitrationStatus), default=ArbitrationStatus.open, index=True)

    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), default=lambda: dt.datetime.now(dt.timezone.utc), index=True)
    resolved_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, index=True)

    resolver_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    resolution: Mapped[str | None] = mapped_column(Text, nullable=True)
