"""P2 growth — requirements, chat, ratings, analytics."""

from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, List, Optional, Sequence, Tuple

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.models.growth import (
    AnalyticsEvent,
    Conversation,
    Message,
    PropertyRequirement,
    Rating,
    RatingTargetType,
    RequirementStatus,
)
from app.models.listing import DealType, Listing, ListingStatus, ListingVisibility


class RequirementRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(
        self,
        *,
        owner_user_id: str,
        deal_type: DealType,
        budget_min: Decimal,
        budget_max: Decimal,
        location_keywords: str,
        title_hint: str = "",
    ) -> PropertyRequirement:
        now = datetime.now(timezone.utc)
        row = PropertyRequirement(
            id=str(uuid.uuid4()),
            owner_user_id=owner_user_id,
            deal_type=deal_type,
            budget_min=budget_min,
            budget_max=budget_max,
            location_keywords=location_keywords,
            title_hint=title_hint,
            status=RequirementStatus.ACTIVE,
            created_at=now,
            updated_at=now,
        )
        self.db.add(row)
        self.db.commit()
        self.db.refresh(row)
        return row

    def get(self, req_id: str) -> Optional[PropertyRequirement]:
        return self.db.get(PropertyRequirement, req_id)


class ConversationRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(
        self,
        *,
        created_by: str,
        title: str = "",
        listing_id: Optional[str] = None,
        requirement_id: Optional[str] = None,
        participants: Optional[List[str]] = None,
    ) -> Conversation:
        parts = participants or [created_by]
        row = Conversation(
            id=str(uuid.uuid4()),
            title=title,
            listing_id=listing_id,
            requirement_id=requirement_id,
            created_by=created_by,
            participants_json=json.dumps(parts, ensure_ascii=False),
            created_at=datetime.now(timezone.utc),
        )
        self.db.add(row)
        self.db.commit()
        self.db.refresh(row)
        return row

    def get(self, cid: str) -> Optional[Conversation]:
        return self.db.get(Conversation, cid)

    def list_for_user(
        self, user_id: str, *, skip: int, limit: int
    ) -> Tuple[Sequence[Conversation], int]:
        filt = or_(
            Conversation.created_by == user_id,
            Conversation.participants_json.like(f'%"{user_id}"%'),
        )
        total = int(
            self.db.scalar(select(func.count()).select_from(Conversation).where(filt))
            or 0
        )
        stmt = (
            select(Conversation)
            .where(filt)
            .order_by(Conversation.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return self.db.scalars(stmt).all(), total


class MessageRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def add(self, *, conversation_id: str, sender_id: str, body: str) -> Message:
        row = Message(
            id=str(uuid.uuid4()),
            conversation_id=conversation_id,
            sender_id=sender_id,
            body=body,
            created_at=datetime.now(timezone.utc),
        )
        self.db.add(row)
        self.db.commit()
        self.db.refresh(row)
        return row

    def list_messages(
        self, conversation_id: str, *, skip: int, limit: int
    ) -> Tuple[Sequence[Message], int]:
        filt = Message.conversation_id == conversation_id
        total = int(
            self.db.scalar(select(func.count()).select_from(Message).where(filt)) or 0
        )
        stmt = (
            select(Message)
            .where(filt)
            .order_by(Message.created_at.asc())
            .offset(skip)
            .limit(limit)
        )
        return self.db.scalars(stmt).all(), total


class RatingRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def upsert(
        self,
        *,
        target_type: RatingTargetType,
        target_id: str,
        rater_id: str,
        stars: int,
        comment: Optional[str],
    ) -> Rating:
        stmt = select(Rating).where(
            Rating.target_type == target_type,
            Rating.target_id == target_id,
            Rating.rater_id == rater_id,
        )
        existing = self.db.scalars(stmt).first()
        now = datetime.now(timezone.utc)
        if existing:
            existing.stars = stars
            existing.comment = comment
            existing.created_at = now
            self.db.add(existing)
            self.db.commit()
            self.db.refresh(existing)
            return existing
        row = Rating(
            id=str(uuid.uuid4()),
            target_type=target_type,
            target_id=target_id,
            rater_id=rater_id,
            stars=stars,
            comment=comment,
            created_at=now,
        )
        self.db.add(row)
        self.db.commit()
        self.db.refresh(row)
        return row

    def aggregate(
        self, target_type: RatingTargetType, target_id: str
    ) -> Tuple[float, int]:
        stmt = select(func.avg(Rating.stars), func.count()).where(
            Rating.target_type == target_type, Rating.target_id == target_id
        )
        row = self.db.execute(stmt).one()
        avg, cnt = row[0], int(row[1] or 0)
        return (float(avg) if avg is not None else 0.0, cnt)


class AnalyticsRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def record(
        self,
        *,
        event_name: str,
        user_id: Optional[str],
        session_id: Optional[str],
        properties: Optional[dict[str, Any]],
    ) -> AnalyticsEvent:
        row = AnalyticsEvent(
            id=str(uuid.uuid4()),
            event_name=event_name,
            user_id=user_id,
            session_id=session_id,
            properties_json=(
                json.dumps(properties, ensure_ascii=False) if properties else None
            ),
            created_at=datetime.now(timezone.utc),
        )
        self.db.add(row)
        self.db.commit()
        self.db.refresh(row)
        return row

    def summary(
        self,
        *,
        event_name: Optional[str],
        since: Optional[datetime] = None,
        limit_groups: int = 50,
    ) -> list[dict[str, Any]]:
        stmt = select(AnalyticsEvent.event_name, func.count()).group_by(
            AnalyticsEvent.event_name
        )
        if event_name:
            stmt = stmt.where(AnalyticsEvent.event_name == event_name)
        if since is not None:
            stmt = stmt.where(AnalyticsEvent.created_at >= since)
        stmt = stmt.order_by(func.count().desc()).limit(limit_groups)
        return [
            {"event_name": r[0], "count": int(r[1])}
            for r in self.db.execute(stmt).all()
        ]


def load_matchable_listings(db: Session, *, limit: int = 500) -> Sequence[Listing]:
    stmt = (
        select(Listing)
        .where(
            Listing.status == ListingStatus.PUBLISHED,
            Listing.visibility.in_(
                [ListingVisibility.PUBLIC, ListingVisibility.NETWORK]
            ),
        )
        .order_by(Listing.updated_at.desc())
        .limit(limit)
    )
    return db.scalars(stmt).all()
