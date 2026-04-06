"""RBAC roles stored in DB."""
from __future__ import annotations

import uuid
from typing import List

from sqlalchemy import JSON, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampCreatedMixin, UUIDPkMixin


class Role(UUIDPkMixin, TimestampCreatedMixin, Base):
    __tablename__ = "roles"

    name: Mapped[str] = mapped_column(String(128), unique=True, index=True)
    description: Mapped[str | None] = mapped_column(String(256), nullable=True)
    permissions: Mapped[list] = mapped_column(JSON, default=list)
