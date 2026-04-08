"""CRM leads & activities (P1 — DB-backed; legacy `/admin/crm/*` remains in-memory)."""

from __future__ import annotations

import enum
import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import DateTime
from sqlalchemy import Enum as SAEnum
from sqlalchemy import ForeignKey, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.visit import Visit


class CrmLeadSource(str, enum.Enum):
    LISTING = "LISTING"
    REQUIREMENT = "REQUIREMENT"
    VISIT = "VISIT"
    MANUAL = "MANUAL"


class CrmActivityType(str, enum.Enum):
    CALL = "CALL"
    NOTE = "NOTE"
    FOLLOW_UP = "FOLLOW_UP"


class CrmLead(Base):
    __tablename__ = "crm_leads"

    id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    source: Mapped[CrmLeadSource] = mapped_column(
        SAEnum(
            CrmLeadSource,
            values_callable=lambda x: [e.value for e in x],
            native_enum=False,
            length=32,
        ),
        nullable=False,
        default=CrmLeadSource.MANUAL,
    )
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    mobile: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    need_type: Mapped[str] = mapped_column(String(32), nullable=False, default="RENT")
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="NEW")
    notes: Mapped[str] = mapped_column(Text, nullable=False, default="")
    assigned_to: Mapped[str | None] = mapped_column(String(64), nullable=True)
    contract_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    listing_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("listings.id", ondelete="SET NULL"), nullable=True
    )
    requirement_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    province_id: Mapped[str | None] = mapped_column(
        String(8),
        ForeignKey("provinces.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    city_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("cities.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    agency_id: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)
    sla_due_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, index=True
    )
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

    activities: Mapped[List["CrmActivity"]] = relationship(
        "CrmActivity", back_populates="lead", cascade="all, delete-orphan"
    )
    visits: Mapped[List["Visit"]] = relationship("Visit", back_populates="crm_lead")


class CrmActivity(Base):
    __tablename__ = "crm_activities"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    lead_id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False),
        ForeignKey("crm_leads.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    type: Mapped[CrmActivityType] = mapped_column(
        SAEnum(
            CrmActivityType,
            values_callable=lambda x: [e.value for e in x],
            native_enum=False,
            length=32,
        ),
        nullable=False,
    )
    note: Mapped[str] = mapped_column(Text, nullable=False, default="")
    user_id: Mapped[str] = mapped_column(String(64), nullable=False, default="system")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    lead: Mapped["CrmLead"] = relationship("CrmLead", back_populates="activities")
