"""CRM tasks table — leads/activities live in app.models.crm (single metadata)."""

from __future__ import annotations

import datetime as dt

from sqlalchemy import Boolean, Date, DateTime, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampCreatedMixin, UUIDPkMixin


class CrmTask(UUIDPkMixin, TimestampCreatedMixin, Base):
    __tablename__ = "crm_tasks"

    lead_id: Mapped[str] = mapped_column(String(36), index=True)
    title: Mapped[str] = mapped_column(String(256))
    due_date: Mapped[dt.date | None] = mapped_column(Date, nullable=True)
    done: Mapped[bool] = mapped_column(Boolean, default=False)
