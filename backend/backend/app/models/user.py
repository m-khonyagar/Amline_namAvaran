from __future__ import annotations

import datetime as dt
import enum
import uuid

from sqlalchemy import DateTime, Enum, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampCreatedMixin, UUIDPkMixin


class UserRole(str, enum.Enum):
    user = "User"
    agent = "Agent"
    admin = "Admin"
    moderator = "Moderator"


class User(UUIDPkMixin, TimestampCreatedMixin, Base):
    __tablename__ = "users"

    mobile: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    national_code: Mapped[str | None] = mapped_column(String(16), nullable=True, index=True)
    name: Mapped[str | None] = mapped_column(String(128), nullable=True)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole, values_callable=lambda x: [e.value for e in x]), default=UserRole.user)
    tenant_score: Mapped[int] = mapped_column(Integer, default=0)
    referral_code: Mapped[str | None] = mapped_column(String(32), unique=True, nullable=True, index=True)

    # For future: KYC timestamps, etc.

