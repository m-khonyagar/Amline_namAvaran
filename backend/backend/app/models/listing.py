"""SQLAlchemy Listing model (Master Spec v3.1 — visibility + deal type)."""

from __future__ import annotations

import enum
import uuid
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import DateTime
from sqlalchemy import Enum as SAEnum
from sqlalchemy import Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class DealType(str, enum.Enum):
    RENT = "RENT"
    SALE = "SALE"
    MORTGAGE = "MORTGAGE"


class ListingVisibility(str, enum.Enum):
    NETWORK = "NETWORK"
    PUBLIC = "PUBLIC"


class ListingStatus(str, enum.Enum):
    DRAFT = "draft"
    READY_TO_PUBLISH = "ready_to_publish"
    PUBLISHED = "published"
    ARCHIVED = "archived"


class Listing(Base):
    __tablename__ = "listings"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    deal_type: Mapped[DealType] = mapped_column(
        SAEnum(
            DealType,
            values_callable=lambda x: [e.value for e in x],
            native_enum=False,
            length=32,
        ),
        nullable=False,
    )
    visibility: Mapped[ListingVisibility] = mapped_column(
        SAEnum(
            ListingVisibility,
            values_callable=lambda x: [e.value for e in x],
            native_enum=False,
            length=32,
        ),
        nullable=False,
        default=ListingVisibility.NETWORK,
    )
    price_amount: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(8), nullable=False, default="IRR")
    location_summary: Mapped[str] = mapped_column(
        String(512), nullable=False, default=""
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    owner_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    status: Mapped[ListingStatus] = mapped_column(
        SAEnum(
            ListingStatus,
            values_callable=lambda x: [e.value for e in x],
            native_enum=False,
            length=32,
        ),
        nullable=False,
        default=ListingStatus.DRAFT,
    )
    inventory_file_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    area_sqm: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    room_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    agency_id: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)
    region_id: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)
    search_document: Mapped[str | None] = mapped_column(Text, nullable=True)
    latitude: Mapped[Decimal | None] = mapped_column(Numeric(10, 7), nullable=True)
    longitude: Mapped[Decimal | None] = mapped_column(Numeric(10, 7), nullable=True)
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
