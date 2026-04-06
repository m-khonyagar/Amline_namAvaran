"""ConsultantProfile model."""
from __future__ import annotations

import datetime as dt
import uuid

from sqlalchemy import DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, UUIDPkMixin


class ConsultantProfile(UUIDPkMixin, Base):
    __tablename__ = "consultant_profiles"

    user_id: Mapped[str] = mapped_column(String(64), index=True)
    full_name: Mapped[str] = mapped_column(String(128))
    mobile: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    national_code: Mapped[str] = mapped_column(String(16))
    license_no: Mapped[str] = mapped_column(String(64))
    city: Mapped[str] = mapped_column(String(64))
    agency_name: Mapped[str | None] = mapped_column(String(128), nullable=True)
    verification_tier: Mapped[str] = mapped_column(String(32), default="NONE")
    application_status: Mapped[str] = mapped_column(String(32), default="SUBMITTED")
    credit_score: Mapped[int] = mapped_column(Integer, default=0)
    active_contracts_count: Mapped[int] = mapped_column(Integer, default=0)
    assigned_leads_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: dt.datetime.now(dt.timezone.utc),
    )
    updated_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: dt.datetime.now(dt.timezone.utc),
        onupdate=lambda: dt.datetime.now(dt.timezone.utc),
    )
