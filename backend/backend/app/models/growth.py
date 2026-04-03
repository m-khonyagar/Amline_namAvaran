"""P2 Growth Layer — requirements, chat, ratings, analytics."""

from __future__ import annotations

import enum
import uuid
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import DateTime
from sqlalchemy import Enum as SAEnum
from sqlalchemy import ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.listing import DealType


class RequirementStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    CLOSED = "CLOSED"


class PropertyRequirement(Base):
    __tablename__ = "property_requirements"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    owner_user_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    deal_type: Mapped[DealType] = mapped_column(
        SAEnum(
            DealType,
            values_callable=lambda x: [e.value for e in x],
            native_enum=False,
            length=32,
        ),
        nullable=False,
    )
    budget_min: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    budget_max: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    location_keywords: Mapped[str] = mapped_column(
        String(512), nullable=False, default=""
    )
    title_hint: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    status: Mapped[RequirementStatus] = mapped_column(
        SAEnum(
            RequirementStatus,
            values_callable=lambda x: [e.value for e in x],
            native_enum=False,
            length=32,
        ),
        nullable=False,
        default=RequirementStatus.ACTIVE,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    conversations: Mapped[list["Conversation"]] = relationship(
        "Conversation", back_populates="requirement"
    )


class Conversation(Base):
    __tablename__ = "conversations"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    listing_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("listings.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    requirement_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("property_requirements.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    created_by: Mapped[str] = mapped_column(String(64), nullable=False)
    participants_json: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    requirement: Mapped["PropertyRequirement | None"] = relationship(
        "PropertyRequirement", back_populates="conversations"
    )
    messages: Mapped[list["Message"]] = relationship(
        "Message", back_populates="conversation", cascade="all, delete-orphan"
    )


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    conversation_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("conversations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    sender_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    read_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    conversation: Mapped["Conversation"] = relationship(
        "Conversation", back_populates="messages"
    )


class RatingTargetType(str, enum.Enum):
    AGENT = "AGENT"
    LISTING = "LISTING"
    VISIT = "VISIT"


class Rating(Base):
    __tablename__ = "ratings"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    target_type: Mapped[RatingTargetType] = mapped_column(
        SAEnum(
            RatingTargetType,
            values_callable=lambda x: [e.value for e in x],
            native_enum=False,
            length=32,
        ),
        nullable=False,
        index=True,
    )
    target_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    rater_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    stars: Mapped[int] = mapped_column(Integer, nullable=False)
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )


class AnalyticsEvent(Base):
    __tablename__ = "analytics_events"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    event_name: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    user_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    session_id: Mapped[str | None] = mapped_column(
        String(64), nullable=True, index=True
    )
    properties_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
