from __future__ import annotations

import uuid

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampCreatedMixin, UUIDPkMixin


class Document(UUIDPkMixin, TimestampCreatedMixin, Base):
    __tablename__ = "documents"

    contract_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("contracts.id", ondelete="CASCADE"), index=True)

    html_s3_key: Mapped[str | None] = mapped_column(String(512), nullable=True)
    pdf_s3_key: Mapped[str | None] = mapped_column(String(512), nullable=True)

    html_local_path: Mapped[str | None] = mapped_column(String(512), nullable=True)
    pdf_local_path: Mapped[str | None] = mapped_column(String(512), nullable=True)
