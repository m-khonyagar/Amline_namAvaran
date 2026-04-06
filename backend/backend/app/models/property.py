from __future__ import annotations

import uuid

from sqlalchemy import ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampCreatedMixin, UUIDPkMixin


class Property(UUIDPkMixin, TimestampCreatedMixin, Base):
    __tablename__ = "properties"

    owner_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), index=True)
    city: Mapped[str] = mapped_column(String(64))
    address: Mapped[str] = mapped_column(String(256))
    area: Mapped[float] = mapped_column(Numeric(10, 2))
    rooms: Mapped[int] = mapped_column(Integer)
    year_built: Mapped[int | None] = mapped_column(Integer, nullable=True)
    property_type: Mapped[str] = mapped_column(String(64))
