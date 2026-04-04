"""اسکلت معماری پروداکشن قرارداد — smoke tests."""

from __future__ import annotations

from app.models.dispute import DisputeCategory, DisputeStatus
from app.services.v1.contract_state_machine import (
    ContractLifecycleState,
    get_contract_state_machine,
)
from app.services.v1.discount_service import get_discount_service
from app.services.v1.payment_saga_orchestrator import get_payment_saga_orchestrator
from app.services.v1.dispute_service import get_dispute_service
from app.integrations.registry_adapter import get_registry_adapter


def test_state_machine_draft_to_awaiting() -> None:
    sm = get_contract_state_machine()
    assert sm.can_transition(ContractLifecycleState.DRAFT.value, "invite_sent")
    assert (
        sm.transition(ContractLifecycleState.DRAFT.value, "invite_sent")
        == ContractLifecycleState.AWAITING_PARTIES.value
    )


def test_discount_aml10() -> None:
    d = get_discount_service()
    net, meta = d.apply_discount(100_000, "AML10", user_id="u1")
    assert meta.get("applied") is True
    assert net == 90_000


def test_payment_saga_split_rounding() -> None:
    o = get_payment_saga_orchestrator()
    r = o.create_split_intents(
        "c1",
        100_001,
        party_a_user_id="a",
        party_b_user_id="b",
        discount_code=None,
    )
    assert r["party_a_cents"] + r["party_b_cents"] == r["net_cents"]


def test_dispute_open_stub() -> None:
    ds = get_dispute_service()
    out = ds.open_dispute(
        "c1", raised_by_party_id="p1", category=DisputeCategory.PAYMENT
    )
    assert out["status"] == DisputeStatus.OPEN.value


def test_registry_adapter_mock() -> None:
    a = get_registry_adapter()
    s = a.submit_contract("c1", {})
    assert s["status"] == "SUBMITTED"
