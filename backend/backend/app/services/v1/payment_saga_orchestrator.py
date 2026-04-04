"""Saga پرداخت split + PSP — اسکلت؛ منطق کامل در مراحل بعدی."""

from __future__ import annotations

from typing import Any

from app.services.v1.discount_service import get_discount_service


class PaymentSagaOrchestrator:
    def create_split_intents(
        self,
        contract_id: str,
        total_commission_cents: int,
        *,
        party_a_user_id: str,
        party_b_user_id: str,
        discount_code: str | None = None,
    ) -> dict[str, Any]:
        net, disc_meta = get_discount_service().apply_discount(
            total_commission_cents, discount_code or "", user_id=party_a_user_id
        )
        half = net // 2
        rem = net - 2 * half
        return {
            "contract_id": contract_id,
            "net_cents": net,
            "party_a_cents": half + rem,
            "party_b_cents": half,
            "discount": disc_meta,
            "note": "Persist PaymentIntent rows in next iteration",
        }

    def handle_webhook(self, payload: dict[str, Any]) -> dict[str, Any]:
        return {"ok": True, "stub": True, "payload_keys": list(payload.keys())}

    def check_completion(self, contract_id: str) -> dict[str, Any]:
        return {"contract_id": contract_id, "complete": False}

    def refund_intent(self, intent_id: str) -> dict[str, Any]:
        return {"intent_id": intent_id, "stub": True}


_orch: PaymentSagaOrchestrator | None = None


def get_payment_saga_orchestrator() -> PaymentSagaOrchestrator:
    global _orch
    if _orch is None:
        _orch = PaymentSagaOrchestrator()
    return _orch
