"""P1 DB repositories (visits, CRM v1, wallet, payments, legal, registry, notify, geo, rbac, audit)."""

from __future__ import annotations

import json
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, List, Optional, Sequence, Tuple

from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.models.audit_log import AuditLogEntry
from app.models.crm import CrmActivity, CrmLead, CrmLeadSource
from app.models.geo import City, Province
from app.models.legal import LegalReview, LegalReviewStatus
from app.models.notification_event import (
    NotificationChannel,
    NotificationEvent,
    NotificationStatus,
)
from app.models.payment import PaymentIntent, PaymentIntentStatus
from app.models.rbac import RbacRole, UserRole
from app.models.registry_job import RegistryJob, RegistryJobStatus
from app.models.visit import Visit, VisitOutcome, VisitStatus
from app.models.wallet import LedgerEntryType, WalletAccount, WalletLedgerEntry
from app.schemas.v1.crm_v1 import CrmActivityCreate, CrmLeadCreate, CrmLeadPatch
from app.schemas.v1.payments import PaymentIntentCreate
from app.schemas.v1.visits import VisitCreate


class CrmV1Repository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_leads(
        self,
        *,
        skip: int = 0,
        limit: int = 50,
        source: Optional[CrmLeadSource] = None,
        status: Optional[str] = None,
        sla_overdue_only: bool = False,
        agency_id: Optional[str] = None,
    ) -> Tuple[Sequence[CrmLead], int]:
        stmt = select(CrmLead)
        count_stmt = select(func.count()).select_from(CrmLead)
        now = datetime.now(timezone.utc)
        filters = []
        if source is not None:
            filters.append(CrmLead.source == source)
        if status is not None:
            filters.append(CrmLead.status == status)
        if agency_id is not None:
            filters.append(CrmLead.agency_id == agency_id)
        if sla_overdue_only:
            filters.append(CrmLead.sla_due_at.is_not(None))
            filters.append(CrmLead.sla_due_at < now)
        for f in filters:
            stmt = stmt.where(f)
            count_stmt = count_stmt.where(f)
        total = int(self.db.scalar(count_stmt) or 0)
        stmt = stmt.order_by(CrmLead.created_at.desc()).offset(skip).limit(limit)
        return self.db.scalars(stmt).all(), total

    def get_lead(self, lead_id: str) -> Optional[CrmLead]:
        return self.db.get(CrmLead, lead_id)

    def create_lead(self, data: CrmLeadCreate, sla_hours: int) -> CrmLead:
        now = datetime.now(timezone.utc)
        pid = data.province_id
        cid = data.city_id
        if cid and not pid:
            c = self.db.get(City, cid)
            if c:
                pid = c.province_id
        row = CrmLead(
            source=data.source,
            full_name=data.full_name,
            mobile=data.mobile,
            need_type=data.need_type,
            status=data.status,
            notes=data.notes,
            assigned_to=data.assigned_to,
            contract_id=data.contract_id,
            listing_id=data.listing_id,
            requirement_id=data.requirement_id,
            province_id=pid,
            city_id=cid,
            sla_due_at=now + timedelta(hours=sla_hours),
            created_at=now,
            updated_at=now,
        )
        self.db.add(row)
        self.db.flush()
        return row

    def patch_lead(self, row: CrmLead, data: CrmLeadPatch) -> CrmLead:
        patch = data.model_dump(exclude_none=True)
        if patch.get("city_id") and not patch.get("province_id"):
            c = self.db.get(City, patch["city_id"])
            if c:
                patch["province_id"] = c.province_id
        for k, v in patch.items():
            setattr(row, k, v)
        row.updated_at = datetime.now(timezone.utc)
        return row

    def add_activity(
        self, lead: CrmLead, body: CrmActivityCreate, user_id: str
    ) -> CrmActivity:
        act = CrmActivity(
            lead_id=lead.id,
            type=body.type,
            note=body.note,
            user_id=body.user_id or user_id,
            created_at=datetime.now(timezone.utc),
        )
        self.db.add(act)
        return act

    def list_activities(self, lead_id: str) -> List[CrmActivity]:
        stmt = (
            select(CrmActivity)
            .where(CrmActivity.lead_id == lead_id)
            .order_by(CrmActivity.created_at.desc())
        )
        return list(self.db.scalars(stmt).all())


class VisitRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_visits(
        self,
        *,
        skip: int = 0,
        limit: int = 50,
        listing_id: Optional[str] = None,
        crm_lead_id: Optional[str] = None,
        status: Optional[VisitStatus] = None,
    ) -> Tuple[Sequence[Visit], int]:
        stmt = select(Visit)
        count_stmt = select(func.count()).select_from(Visit)
        filters = []
        if listing_id:
            filters.append(Visit.listing_id == listing_id)
        if crm_lead_id:
            filters.append(Visit.crm_lead_id == crm_lead_id)
        if status is not None:
            filters.append(Visit.status == status)
        for f in filters:
            stmt = stmt.where(f)
            count_stmt = count_stmt.where(f)
        total = int(self.db.scalar(count_stmt) or 0)
        stmt = stmt.order_by(Visit.created_at.desc()).offset(skip).limit(limit)
        return self.db.scalars(stmt).all(), total

    def get(self, vid: str) -> Optional[Visit]:
        return self.db.get(Visit, vid)

    def create(self, body: VisitCreate) -> Visit:
        now = datetime.now(timezone.utc)
        st = VisitStatus.SCHEDULED if body.scheduled_at else VisitStatus.REQUESTED
        row = Visit(
            listing_id=body.listing_id,
            crm_lead_id=body.crm_lead_id,
            scheduled_at=body.scheduled_at,
            status=st,
            outcome=VisitOutcome.NONE,
            created_at=now,
            updated_at=now,
        )
        self.db.add(row)
        self.db.flush()
        return row

    def schedule(self, row: Visit, scheduled_at: datetime) -> Visit:
        row.scheduled_at = scheduled_at
        row.status = VisitStatus.SCHEDULED
        row.updated_at = datetime.now(timezone.utc)
        return row

    def complete(
        self, row: Visit, outcome: VisitOutcome, notes: Optional[str]
    ) -> Visit:
        row.status = VisitStatus.COMPLETED
        row.outcome = outcome
        row.outcome_notes = notes
        row.completed_at = datetime.now(timezone.utc)
        row.updated_at = row.completed_at
        return row


class WalletRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_or_create_account(
        self, user_id: str, currency: str = "IRR"
    ) -> WalletAccount:
        stmt = select(WalletAccount).where(WalletAccount.user_id == user_id)
        row = self.db.scalars(stmt).first()
        if row:
            return row
        now = datetime.now(timezone.utc)
        row = WalletAccount(user_id=user_id, currency=currency, created_at=now)
        self.db.add(row)
        self.db.flush()
        return row

    def balance_cents(self, account_id: str) -> int:
        stmt = select(WalletLedgerEntry).where(
            WalletLedgerEntry.account_id == account_id
        )
        total = 0
        for e in self.db.scalars(stmt).all():
            if e.entry_type == LedgerEntryType.CREDIT:
                total += e.amount_cents
            else:
                total -= e.amount_cents
        return total

    def find_by_idempotency(
        self, account_id: str, key: str
    ) -> Optional[WalletLedgerEntry]:
        stmt = select(WalletLedgerEntry).where(
            WalletLedgerEntry.account_id == account_id,
            WalletLedgerEntry.idempotency_key == key,
        )
        return self.db.scalars(stmt).first()

    def append_entry(
        self,
        account: WalletAccount,
        *,
        amount_cents: int,
        entry_type: LedgerEntryType,
        reference_type: str,
        reference_id: Optional[str],
        idempotency_key: Optional[str],
        memo: Optional[str],
    ) -> WalletLedgerEntry:
        if idempotency_key:
            ex = self.find_by_idempotency(account.id, idempotency_key)
            if ex:
                return ex
        row = WalletLedgerEntry(
            account_id=account.id,
            amount_cents=amount_cents,
            entry_type=entry_type,
            reference_type=reference_type,
            reference_id=reference_id,
            idempotency_key=idempotency_key,
            memo=memo,
            created_at=datetime.now(timezone.utc),
        )
        self.db.add(row)
        self.db.flush()
        return row


class PaymentRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_intent(self, intent_id: str) -> Optional[PaymentIntent]:
        return self.db.get(PaymentIntent, intent_id)

    def find_by_idempotency(self, key: str) -> Optional[PaymentIntent]:
        stmt = select(PaymentIntent).where(PaymentIntent.idempotency_key == key)
        return self.db.scalars(stmt).first()

    def create_intent(self, body: PaymentIntentCreate) -> PaymentIntent:
        ex = self.find_by_idempotency(body.idempotency_key)
        if ex:
            return ex
        now = datetime.now(timezone.utc)
        row = PaymentIntent(
            user_id=body.user_id,
            amount_cents=body.amount_cents,
            currency=body.currency,
            idempotency_key=body.idempotency_key,
            status=PaymentIntentStatus.PENDING,
            created_at=now,
            updated_at=now,
        )
        self.db.add(row)
        self.db.flush()
        return row

    def set_psp_session(
        self,
        row: PaymentIntent,
        *,
        provider: str,
        checkout_token: Optional[str],
    ) -> PaymentIntent:
        row.psp_provider = provider
        row.psp_checkout_token = checkout_token
        row.updated_at = datetime.now(timezone.utc)
        return row

    def bump_verify_attempt(
        self, row: PaymentIntent, error: Optional[str] = None
    ) -> PaymentIntent:
        row.verify_attempt_count = int(row.verify_attempt_count or 0) + 1
        row.last_verify_error = error
        row.updated_at = datetime.now(timezone.utc)
        return row

    def list_intents(
        self,
        *,
        skip: int = 0,
        limit: int = 50,
        status: Optional[PaymentIntentStatus] = None,
        user_id: Optional[str] = None,
    ) -> Tuple[Sequence[PaymentIntent], int]:
        stmt = select(PaymentIntent)
        count_q = select(func.count()).select_from(PaymentIntent)
        if status is not None:
            stmt = stmt.where(PaymentIntent.status == status)
            count_q = count_q.where(PaymentIntent.status == status)
        if user_id:
            stmt = stmt.where(PaymentIntent.user_id == user_id)
            count_q = count_q.where(PaymentIntent.user_id == user_id)
        total = int(self.db.scalar(count_q) or 0)
        stmt = stmt.order_by(PaymentIntent.created_at.desc()).offset(skip).limit(limit)
        rows = self.db.scalars(stmt).all()
        return rows, total

    def mark_callback(
        self,
        row: PaymentIntent,
        success: bool,
        psp_ref: Optional[str],
        raw: Optional[str],
    ) -> PaymentIntent:
        row.status = (
            PaymentIntentStatus.COMPLETED if success else PaymentIntentStatus.FAILED
        )
        row.psp_reference = psp_ref
        row.callback_payload = raw
        row.updated_at = datetime.now(timezone.utc)
        return row


class LegalRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_reviews(
        self, *, skip: int = 0, limit: int = 50, contract_id: Optional[str] = None
    ) -> Tuple[Sequence[LegalReview], int]:
        stmt = select(LegalReview)
        count = select(func.count()).select_from(LegalReview)
        if contract_id:
            stmt = stmt.where(LegalReview.contract_id == contract_id)
            count = count.where(LegalReview.contract_id == contract_id)
        total = int(self.db.scalar(count) or 0)
        stmt = stmt.order_by(LegalReview.created_at.desc()).offset(skip).limit(limit)
        return self.db.scalars(stmt).all(), total

    def get(self, rid: str) -> Optional[LegalReview]:
        return self.db.get(LegalReview, rid)

    def create(self, contract_id: str) -> LegalReview:
        now = datetime.now(timezone.utc)
        row = LegalReview(
            contract_id=contract_id,
            status=LegalReviewStatus.PENDING,
            created_at=now,
        )
        self.db.add(row)
        self.db.flush()
        return row

    def decide(
        self,
        row: LegalReview,
        approve: bool,
        comment: Optional[str],
        reviewer_id: Optional[str],
    ) -> LegalReview:
        row.status = (
            LegalReviewStatus.APPROVED if approve else LegalReviewStatus.REJECTED
        )
        row.comment = comment
        row.reviewer_id = reviewer_id
        row.decided_at = datetime.now(timezone.utc)
        return row


class RegistryRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create_job(self, contract_id: str, payload_json: Optional[str]) -> RegistryJob:
        now = datetime.now(timezone.utc)
        tc = f"REG-MOCK-{uuid.uuid4().hex[:12].upper()}"
        row = RegistryJob(
            contract_id=contract_id,
            status=RegistryJobStatus.COMPLETED,
            tracking_code=tc,
            payload_json=payload_json,
            created_at=now,
            updated_at=now,
        )
        self.db.add(row)
        self.db.flush()
        return row

    def get_by_contract(self, contract_id: str) -> Optional[RegistryJob]:
        stmt = (
            select(RegistryJob)
            .where(RegistryJob.contract_id == contract_id)
            .order_by(RegistryJob.created_at.desc())
            .limit(1)
        )
        return self.db.scalars(stmt).first()


class NotificationRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def log(
        self,
        *,
        channel: NotificationChannel,
        recipient: str,
        template_key: str,
        payload: Optional[dict[str, Any]],
        status: NotificationStatus,
    ) -> NotificationEvent:
        row = NotificationEvent(
            channel=channel,
            recipient=recipient,
            template_key=template_key,
            payload_json=json.dumps(payload) if payload else None,
            status=status,
            created_at=datetime.now(timezone.utc),
        )
        self.db.add(row)
        self.db.flush()
        return row


class GeoRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_provinces(self) -> List[Province]:
        stmt = select(Province).order_by(Province.sort_order, Province.id)
        return list(self.db.scalars(stmt).all())

    def list_cities(self, province_id: str) -> List[City]:
        stmt = (
            select(City).where(City.province_id == province_id).order_by(City.name_fa)
        )
        return list(self.db.scalars(stmt).all())


class RbacRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_roles(self) -> List[RbacRole]:
        return list(self.db.scalars(select(RbacRole)).all())

    def list_user_roles(self, user_id: str) -> List[str]:
        stmt = select(UserRole.role_code).where(UserRole.user_id == user_id)
        return list(self.db.scalars(stmt).all())

    def set_user_roles(self, user_id: str, codes: List[str]) -> None:
        self.db.execute(delete(UserRole).where(UserRole.user_id == user_id))
        for c in codes:
            self.db.add(
                UserRole(
                    user_id=user_id,
                    role_code=c,
                    created_at=datetime.now(timezone.utc),
                )
            )

    def permissions_for_user(self, user_id: str) -> List[str]:
        codes = self.list_user_roles(user_id)
        if not codes:
            return []
        perms: List[str] = []
        for role in self.db.scalars(
            select(RbacRole).where(RbacRole.code.in_(codes))
        ).all():
            try:
                perms.extend(json.loads(role.permissions_json))
            except json.JSONDecodeError:
                continue
        return list(dict.fromkeys(perms))


class AuditDbRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def write(
        self, *, user_id: str, action: str, entity: str, metadata: Optional[dict]
    ) -> AuditLogEntry:
        row = AuditLogEntry(
            user_id=user_id,
            action=action,
            entity=entity,
            metadata_json=json.dumps(metadata) if metadata else None,
            created_at=datetime.now(timezone.utc),
        )
        self.db.add(row)
        self.db.flush()
        return row
