from __future__ import annotations

import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum as SAEnum, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class UserRole(str, enum.Enum):
    """Must match PostgreSQL enum ``userrole`` (see alembic 0001_init)."""

    user = "User"
    agent = "Agent"
    admin = "Admin"
    moderator = "Moderator"


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    mobile: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    national_code: Mapped[str | None] = mapped_column(String(16), nullable=True, index=True)
    name: Mapped[str | None] = mapped_column(String(128), nullable=True)
    role: Mapped[UserRole] = mapped_column(
        SAEnum(
            UserRole,
            name="userrole",
            native_enum=False,
            values_callable=lambda o: [e.value for e in o],
            length=32,
        ),
        nullable=False,
        server_default=UserRole.user.value,
    )
    tenant_score: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    referral_code: Mapped[str | None] = mapped_column(String(32), nullable=True, unique=True, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
