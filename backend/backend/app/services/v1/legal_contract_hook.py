"""Best-effort sync of legal review outcome into in-memory contract (wizard)."""

from __future__ import annotations

import logging

logger = logging.getLogger(__name__)


def apply_legal_decision_to_memory_contract(contract_id: str, approved: bool) -> None:
    try:
        from app.repositories.memory.state import get_store

        s = get_store()
        c = s.contracts.get(contract_id)
        if not c:
            return
        c["legal_review_status"] = "APPROVED" if approved else "REJECTED"
    except Exception as exc:
        logger.debug("legal contract hook skipped: %s", exc)
