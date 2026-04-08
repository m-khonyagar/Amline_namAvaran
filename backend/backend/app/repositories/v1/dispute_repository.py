"""دسترسی DB برای اختلاف قرارداد."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Sequence

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.dispute import (
    Dispute,
    DisputeCategory,
    DisputeEvidence,
    DisputeEvidenceType,
    DisputeStatus,
)


class DisputeRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(
        self,
        contract_id: str,
        *,
        raised_by_party_id: str | None,
        category: DisputeCategory,
    ) -> Dispute:
        d = Dispute(
            id=str(uuid.uuid4()),
            contract_id=contract_id,
            raised_by_party_id=raised_by_party_id,
            category=category,
            status=DisputeStatus.OPEN,
            created_at=datetime.now(timezone.utc),
        )
        self.db.add(d)
        self.db.flush()
        return d

    def get(self, dispute_id: str) -> Dispute | None:
        return self.db.get(Dispute, dispute_id)

    def list_for_contract(self, contract_id: str) -> tuple[Sequence[Dispute], int]:
        stmt = (
            select(Dispute)
            .where(Dispute.contract_id == contract_id)
            .order_by(Dispute.created_at.desc())
        )
        rows = list(self.db.scalars(stmt).all())
        cnt = self.db.scalar(
            select(func.count()).select_from(Dispute).where(
                Dispute.contract_id == contract_id
            )
        )
        return rows, int(cnt or 0)

    def add_evidence(
        self,
        dispute_id: str,
        *,
        ev_type: DisputeEvidenceType,
        storage_uri: str,
        hash_sha256: str | None,
        submitted_by: str | None,
    ) -> DisputeEvidence:
        ev = DisputeEvidence(
            id=str(uuid.uuid4()),
            dispute_id=dispute_id,
            type=ev_type,
            storage_uri=storage_uri,
            hash_sha256=hash_sha256,
            submitted_by=submitted_by,
            created_at=datetime.now(timezone.utc),
        )
        self.db.add(ev)
        self.db.flush()
        return ev
