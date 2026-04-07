"""نیازمندی‌های بازار (خرید/رهن/معاوضه) — ذخیرهٔ پایدار در PostgreSQL."""
from __future__ import annotations

import uuid

from sqlalchemy import JSON, Boolean, Float, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampCreatedMixin, UUIDPkMixin


class MarketRequirement(UUIDPkMixin, TimestampCreatedMixin, Base):
    __tablename__ = "market_requirements"

    user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    kind: Mapped[str] = mapped_column(String(16), index=True)
    status: Mapped[str] = mapped_column(String(32), default="QUEUED", index=True)
    queue_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    publish_title: Mapped[str] = mapped_column(String(512))
    city_label: Mapped[str] = mapped_column(String(128), default="", index=True)
    neighborhood_label: Mapped[str] = mapped_column(String(128), default="")
    price_label: Mapped[str] = mapped_column(String(256), default="توافقی")
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    property_type_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    property_type_label: Mapped[str | None] = mapped_column(String(128), nullable=True)
    min_area: Mapped[float | None] = mapped_column(Float, nullable=True)
    total_price: Mapped[float | None] = mapped_column(Float, nullable=True)
    build_year: Mapped[float | None] = mapped_column(Float, nullable=True)
    renovated: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    rooms: Mapped[str | None] = mapped_column(String(32), nullable=True)
    amenities: Mapped[dict | None] = mapped_column(JSON, nullable=True)


class PromoCode(UUIDPkMixin, TimestampCreatedMixin, Base):
    __tablename__ = "promo_codes"

    code: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    discount_type: Mapped[str] = mapped_column(String(32), default="PERCENTAGE")
    discount_value: Mapped[float] = mapped_column(Float, default=0.0)
    active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true", index=True)
    note: Mapped[str | None] = mapped_column(String(256), nullable=True)
