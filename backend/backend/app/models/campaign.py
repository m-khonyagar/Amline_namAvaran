from __future__ import annotations

import datetime as dt

from sqlalchemy import Date, Enum, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, UUIDPkMixin


class Campaign(UUIDPkMixin, Base):
    __tablename__ = "campaigns"

    name: Mapped[str] = mapped_column(String(128))
    type: Mapped[str] = mapped_column(String(64))
    discount_percent: Mapped[int] = mapped_column(Integer, default=0)

    start_date: Mapped[dt.date] = mapped_column(Date)
    end_date: Mapped[dt.date] = mapped_column(Date)

    status: Mapped[str] = mapped_column(String(32), default="active", index=True)
