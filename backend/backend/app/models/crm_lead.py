"""CRM Lead model."""
from __future__ import annotations

import datetime as dt

from sqlalchemy import Boolean, Date, DateTime, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampCreatedMixin, UUIDPkMixin


class CrmLead(UUIDPkMixin, TimestampCreatedMixin, Base):
    __tablename__ = "crm_leads"

    full_name: Mapped[str] = mapped_column(String(128))
    mobile: Mapped[str] = mapped_column(String(32), index=True)
    need_type: Mapped[str] = mapped_column(String(32))  # RENT | BUY | SELL
    status: Mapped[str] = mapped_column(String(32), default="NEW", index=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    assigned_to: Mapped[str | None] = mapped_column(String(64), nullable=True)
    contract_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    updated_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: dt.datetime.now(dt.timezone.utc),
        onupdate=lambda: dt.datetime.now(dt.timezone.utc),
    )


class CrmActivity(UUIDPkMixin, TimestampCreatedMixin, Base):
    __tablename__ = "crm_activities"

    lead_id: Mapped[str] = mapped_column(String(64), index=True)
    type: Mapped[str] = mapped_column(String(64))
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    user_id: Mapped[str] = mapped_column(String(64))


class CrmTask(UUIDPkMixin, TimestampCreatedMixin, Base):
    __tablename__ = "crm_tasks"

    lead_id: Mapped[str] = mapped_column(String(64), index=True)
    title: Mapped[str] = mapped_column(String(256))
    due_date: Mapped[dt.date | None] = mapped_column(Date, nullable=True)
    done: Mapped[bool] = mapped_column(Boolean, default=False)
