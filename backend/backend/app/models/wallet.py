from __future__ import annotations

import uuid

from sqlalchemy import ForeignKey, Numeric
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, UUIDPkMixin


class Wallet(UUIDPkMixin, Base):
    __tablename__ = "wallets"

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), unique=True, index=True)
    balance: Mapped[float] = mapped_column(Numeric(14, 2), default=0)
