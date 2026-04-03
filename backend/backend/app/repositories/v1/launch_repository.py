"""Persistence for beta / onboarding / support / billing / ops error ingest."""

from __future__ import annotations

import hashlib
import json
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import List, Optional, Sequence

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.launch import (
    BetaInvitation,
    BetaInviteStatus,
    ClientErrorReport,
    OnboardingEvent,
    SubscriptionPlan,
    SubscriptionStatus,
    SupportMessage,
    SupportTicket,
    SupportTicketStatus,
    UserGamification,
    UserSubscription,
)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _hash_token(raw: str) -> str:
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


class LaunchRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    # --- Beta ---
    def create_beta_invitation(
        self, email: str, invited_by_user_id: str | None, ttl_days: int = 14
    ) -> tuple[str, BetaInvitation]:
        raw = secrets.token_urlsafe(32)
        row = BetaInvitation(
            id=str(uuid.uuid4()),
            email=email.strip().lower(),
            token_hash=_hash_token(raw),
            status=BetaInviteStatus.PENDING.value,
            invited_by_user_id=invited_by_user_id,
            expires_at=_utcnow() + timedelta(days=ttl_days),
            created_at=_utcnow(),
        )
        self.db.add(row)
        self.db.flush()
        return raw, row

    def accept_beta_invitation(
        self, raw_token: str, user_id: str
    ) -> BetaInvitation | None:
        h = _hash_token(raw_token)
        row = self.db.scalars(
            select(BetaInvitation).where(BetaInvitation.token_hash == h)
        ).first()
        if not row or row.status != BetaInviteStatus.PENDING.value:
            return None
        exp = row.expires_at
        if exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)
        if exp < _utcnow():
            row.status = BetaInviteStatus.EXPIRED.value
            return None
        row.status = BetaInviteStatus.ACCEPTED.value
        row.accepted_user_id = user_id
        return row

    def list_beta_invitations(
        self, skip: int, limit: int
    ) -> tuple[List[BetaInvitation], int]:
        total = int(
            self.db.scalar(select(func.count()).select_from(BetaInvitation)) or 0
        )
        rows = list(
            self.db.scalars(
                select(BetaInvitation)
                .order_by(BetaInvitation.created_at.desc())
                .offset(skip)
                .limit(limit)
            ).all()
        )
        return rows, total

    # --- Onboarding ---
    def add_onboarding_event(
        self, user_id: str, step: str, payload: dict | None
    ) -> OnboardingEvent:
        row = OnboardingEvent(
            id=str(uuid.uuid4()),
            user_id=user_id,
            step=step,
            payload_json=json.dumps(payload, ensure_ascii=False) if payload else None,
            created_at=_utcnow(),
        )
        self.db.add(row)
        self.db.flush()
        return row

    def list_onboarding_events(
        self, user_id: str, limit: int = 50
    ) -> Sequence[OnboardingEvent]:
        return self.db.scalars(
            select(OnboardingEvent)
            .where(OnboardingEvent.user_id == user_id)
            .order_by(OnboardingEvent.created_at.desc())
            .limit(limit)
        ).all()

    # --- Support ---
    def create_ticket(
        self, user_id: str, subject: str, priority: str, body: str
    ) -> SupportTicket:
        now = _utcnow()
        t = SupportTicket(
            id=str(uuid.uuid4()),
            user_id=user_id,
            subject=subject,
            status=SupportTicketStatus.OPEN.value,
            priority=priority,
            created_at=now,
            updated_at=now,
        )
        self.db.add(t)
        self.db.flush()
        m = SupportMessage(
            id=str(uuid.uuid4()),
            ticket_id=t.id,
            author_user_id=user_id,
            body=body,
            created_at=now,
        )
        self.db.add(m)
        self.db.flush()
        return t

    def add_support_message(
        self, ticket_id: str, author_user_id: str, body: str
    ) -> SupportMessage:
        m = SupportMessage(
            id=str(uuid.uuid4()),
            ticket_id=ticket_id,
            author_user_id=author_user_id,
            body=body,
            created_at=_utcnow(),
        )
        t = self.db.get(SupportTicket, ticket_id)
        if t:
            t.updated_at = _utcnow()
        self.db.add(m)
        self.db.flush()
        return m

    def list_tickets_for_user(
        self, user_id: str, skip: int, limit: int
    ) -> tuple[List[SupportTicket], int]:
        filt = SupportTicket.user_id == user_id
        total = int(
            self.db.scalar(select(func.count()).select_from(SupportTicket).where(filt))
            or 0
        )
        rows = list(
            self.db.scalars(
                select(SupportTicket)
                .where(filt)
                .order_by(SupportTicket.updated_at.desc())
                .offset(skip)
                .limit(limit)
            ).all()
        )
        return rows, total

    def get_ticket(self, ticket_id: str) -> SupportTicket | None:
        return self.db.get(SupportTicket, ticket_id)

    def list_messages(self, ticket_id: str) -> List[SupportMessage]:
        return list(
            self.db.scalars(
                select(SupportMessage)
                .where(SupportMessage.ticket_id == ticket_id)
                .order_by(SupportMessage.created_at.asc())
            ).all()
        )

    # --- Billing ---
    def seed_default_plans_if_empty(self) -> None:
        n = int(self.db.scalar(select(func.count()).select_from(SubscriptionPlan)) or 0)
        if n > 0:
            return
        for code, name, price in (
            ("starter", "استارتر", 0),
            ("pro", "حرفه‌ای", 9_900_000),
            ("business", "کسب‌وکار", 29_900_000),
        ):
            self.db.add(
                SubscriptionPlan(
                    id=str(uuid.uuid4()),
                    code=code,
                    name_fa=name,
                    price_cents=price,
                    cycle="monthly",
                    is_active=True,
                    meta_json=None,
                    created_at=_utcnow(),
                )
            )
        self.db.flush()

    def list_plans(self) -> List[SubscriptionPlan]:
        return list(
            self.db.scalars(
                select(SubscriptionPlan)
                .where(SubscriptionPlan.is_active.is_(True))
                .order_by(SubscriptionPlan.price_cents.asc())
            ).all()
        )

    def subscribe_user(self, user_id: str, plan_code: str) -> UserSubscription | None:
        plan = self.db.scalars(
            select(SubscriptionPlan).where(SubscriptionPlan.code == plan_code)
        ).first()
        if not plan:
            return None
        sub = UserSubscription(
            id=str(uuid.uuid4()),
            user_id=user_id,
            plan_id=plan.id,
            status=SubscriptionStatus.ACTIVE.value,
            current_period_end=_utcnow() + timedelta(days=30),
            created_at=_utcnow(),
        )
        self.db.add(sub)
        self.db.flush()
        return sub

    def get_user_subscription(self, user_id: str) -> Optional[UserSubscription]:
        return self.db.scalars(
            select(UserSubscription)
            .where(UserSubscription.user_id == user_id)
            .order_by(UserSubscription.created_at.desc())
            .limit(1)
        ).first()

    # --- Gamification ---
    def get_or_create_gamification(self, user_id: str) -> UserGamification:
        row = self.db.get(UserGamification, user_id)
        if row:
            return row
        row = UserGamification(
            user_id=user_id, points=0, level=1, badges_json="[]", updated_at=_utcnow()
        )
        self.db.add(row)
        self.db.flush()
        return row

    # --- Client errors ---
    def record_client_error(
        self,
        *,
        message: str,
        stack: str | None,
        url: str | None,
        user_id: str | None,
        fingerprint: str | None,
    ) -> ClientErrorReport:
        row = ClientErrorReport(
            id=str(uuid.uuid4()),
            fingerprint=fingerprint,
            message=message[:1024],
            stack=stack,
            url=url[:2048] if url else None,
            user_id=user_id,
            created_at=_utcnow(),
        )
        self.db.add(row)
        self.db.flush()
        return row
