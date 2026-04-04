"""موتور تسویه / بازپرداخت — اسکلت idempotent (اتصال ledger بعداً)."""

from __future__ import annotations

import uuid
from typing import Any


class SettlementEngine:
    def create_refund_command(
        self, *, contract_id: str, amount_cents: int, idempotency_key: str
    ) -> dict[str, Any]:
        return {
            "command_id": str(uuid.uuid4()),
            "contract_id": contract_id,
            "amount_cents": amount_cents,
            "idempotency_key": idempotency_key,
            "status": "PENDING",
        }

    def execute_refund(self, command_id: str) -> dict[str, Any]:
        return {"command_id": command_id, "status": "STUB"}

    def reverse_commission(self, ledger_entry_id: str) -> dict[str, Any]:
        return {"reversal_of": ledger_entry_id, "status": "STUB"}


_se: SettlementEngine | None = None


def get_settlement_engine() -> SettlementEngine:
    global _se
    if _se is None:
        _se = SettlementEngine()
    return _se
