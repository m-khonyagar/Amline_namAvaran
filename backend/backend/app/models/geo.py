"""Iran provinces & cities (P1)."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Province(Base):
    __tablename__ = "provinces"

    id: Mapped[str] = mapped_column(
        String(8), primary_key=True
    )  # e.g. "23" for Tehran statistical code style
    name_fa: Mapped[str] = mapped_column(String(128), nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    cities: Mapped[list["City"]] = relationship("City", back_populates="province")


class City(Base):
    __tablename__ = "cities"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    province_id: Mapped[str] = mapped_column(
        String(8),
        ForeignKey("provinces.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name_fa: Mapped[str] = mapped_column(String(128), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    province: Mapped["Province"] = relationship("Province", back_populates="cities")
