from __future__ import annotations

import datetime as dt
import uuid

from sqlalchemy import DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, UUIDPkMixin


class ArbitrationMessage(UUIDPkMixin, Base):
    __tablename__ = "arbitration_messages"

    arbitration_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("arbitrations.id", ondelete="CASCADE"),
        index=True,
    )
    author_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), index=True)

    body: Mapped[str] = mapped_column(Text)
    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: dt.datetime.now(dt.timezone.utc),
        index=True,
    )
