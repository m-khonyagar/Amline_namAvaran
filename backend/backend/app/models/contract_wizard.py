"""Wizard-style contract model for the admin/user flow."""
from __future__ import annotations

import datetime as dt

from sqlalchemy import JSON, DateTime, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampCreatedMixin, UUIDPkMixin


class WizardContract(UUIDPkMixin, TimestampCreatedMixin, Base):
    __tablename__ = "wizard_contracts"

    contract_type: Mapped[str] = mapped_column(String(64), default="PROPERTY_RENT")
    party_type: Mapped[str] = mapped_column(String(32))   # LANDLORD | TENANT | AGENT
    status: Mapped[str] = mapped_column(String(32), default="DRAFT", index=True)
    step: Mapped[str] = mapped_column(String(64), default="LANDLORD_INFORMATION")
    parties: Mapped[dict] = mapped_column(JSON, default=dict)
    owner_id: Mapped[str] = mapped_column(String(64), index=True)
    commission_paid_at: Mapped[dt.datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    updated_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: dt.datetime.now(dt.timezone.utc),
        onupdate=lambda: dt.datetime.now(dt.timezone.utc),
    )
