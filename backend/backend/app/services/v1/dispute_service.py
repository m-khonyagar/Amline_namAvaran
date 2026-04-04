"""سرویس اختلاف — اسکلت؛ persist با SQLAlchemy در مرحله بعد."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

from app.models.dispute import DisputeCategory, DisputeStatus


class DisputeService:
    def open_dispute(
        self,
        contract_id: str,
        *,
        raised_by_party_id: str | None,
        category: DisputeCategory,
    ) -> dict[str, Any]:
        return {
            "id": str(uuid.uuid4()),
            "contract_id": contract_id,
            "raised_by_party_id": raised_by_party_id,
            "category": category.value,
            "status": DisputeStatus.OPEN.value,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "note": "Wire to DB session in next iteration",
        }

    def add_evidence(self, dispute_id: str, evidence: dict[str, Any]) -> dict[str, Any]:
        return {"dispute_id": dispute_id, "evidence_id": str(uuid.uuid4()), **evidence}

    def get_dispute_status(self, dispute_id: str) -> dict[str, Any]:
        return {"dispute_id": dispute_id, "status": DisputeStatus.OPEN.value}

    def resolve_dispute(self, dispute_id: str, resolution: str) -> dict[str, Any]:
        return {
            "dispute_id": dispute_id,
            "resolution": resolution,
            "resolved_at": datetime.now(timezone.utc).isoformat(),
        }


_ds: DisputeService | None = None


def get_dispute_service() -> DisputeService:
    global _ds
    if _ds is None:
        _ds = DisputeService()
    return _ds
