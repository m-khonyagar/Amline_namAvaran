"""Focused tests for the guard-aware contract state machine."""

from __future__ import annotations

from datetime import datetime

import pytest

from app.domain.contracts.state_machine_v5 import get_state_machine_v5
from app.services.v1.contract_state_machine import (
    ContractLifecycleState,
    transition_contract_payload,
)


def test_draft_invite_requires_parties() -> None:
    sm = get_state_machine_v5()
    assert not sm.can_transition(ContractLifecycleState.DRAFT.value, "invite_sent", {})
    assert sm.can_transition(
        ContractLifecycleState.DRAFT.value,
        "invite_sent",
        {"parties": [{"id": "p1"}]},
    )


def test_happy_path_reaches_active() -> None:
    sm = get_state_machine_v5()
    onboarding = {"all_parties_verified": True}
    signing = {"all_signatures_valid": True}
    payment = {"payment_amount": 25_000}
    legal = {"reviewer_role": "legal"}
    registry = {"tracking_code": "TRK-1"}

    assert (
        sm.transition(ContractLifecycleState.AWAITING_PARTIES.value, "party_ready", onboarding)
        == ContractLifecycleState.SIGNING_IN_PROGRESS.value
    )
    assert (
        sm.transition(
            ContractLifecycleState.SIGNING_IN_PROGRESS.value,
            "all_signatures_ok",
            signing,
        )
        == ContractLifecycleState.SIGNED_PENDING_PAYMENT.value
    )
    assert (
        sm.transition(
            ContractLifecycleState.SIGNED_PENDING_PAYMENT.value,
            "both_halves_paid",
            payment,
        )
        == ContractLifecycleState.PAYMENT_COMPLETE.value
    )
    assert (
        sm.transition(
            ContractLifecycleState.PAYMENT_COMPLETE.value,
            "require_legal",
            legal,
        )
        == ContractLifecycleState.LEGAL_REVIEW.value
    )
    assert (
        sm.transition(ContractLifecycleState.LEGAL_REVIEW.value, "approved", legal)
        == ContractLifecycleState.REGISTRY_SUBMITTED.value
    )
    assert (
        sm.transition(ContractLifecycleState.REGISTRY_SUBMITTED.value, "ok")
        == ContractLifecycleState.REGISTRY_PENDING.value
    )
    assert (
        sm.transition(
            ContractLifecycleState.REGISTRY_PENDING.value,
            "tracking_code",
            registry,
        )
        == ContractLifecycleState.ACTIVE.value
    )


def test_sla_deadline_is_calculated_from_reference_time() -> None:
    sm = get_state_machine_v5()
    reference = datetime(2026, 4, 15, 9, 0, 0)

    result = sm.transition_result(
        ContractLifecycleState.AWAITING_PARTIES.value,
        "party_ready",
        {"all_parties_verified": True},
        reference_time=reference,
    )

    assert result.success is True
    assert result.sla_deadline == datetime(2026, 4, 18, 9, 0, 0)


def test_admin_only_transitions_are_guarded() -> None:
    sm = get_state_machine_v5()
    assert not sm.can_transition(
        ContractLifecycleState.ACTIVE.value,
        "suspend",
        {"user_role": "legal"},
    )
    assert sm.can_transition(
        ContractLifecycleState.ACTIVE.value,
        "suspend",
        {"user_role": "admin"},
    )


def test_terminal_state_rejects_future_transitions() -> None:
    sm = get_state_machine_v5()
    result = sm.transition_result(ContractLifecycleState.CANCELLED.value, "resume")
    assert result.success is False
    assert "Terminal state" in str(result.error)
    with pytest.raises(ValueError):
        sm.transition(ContractLifecycleState.CANCELLED.value, "resume")


def test_legal_rejection_round_trip_and_allowed_events() -> None:
    sm = get_state_machine_v5()
    assert sm.allowed_events(
        ContractLifecycleState.PAYMENT_COMPLETE.value,
        {"reviewer_role": "legal"},
    ) == ["require_legal"]
    assert (
        sm.transition(
            ContractLifecycleState.LEGAL_REVIEW.value,
            "rejected",
            {"reviewer_role": "legal"},
        )
        == ContractLifecycleState.LEGAL_REJECTED.value
    )
    assert (
        sm.transition(
            ContractLifecycleState.LEGAL_REJECTED.value,
            "resubmit",
            {"parties": [{"id": "p1"}]},
        )
        == ContractLifecycleState.DRAFT.value
    )


def test_transition_contract_payload_uses_payload_as_context() -> None:
    payload = {
        "status": ContractLifecycleState.DRAFT.value,
        "parties": [{"id": "seller"}],
    }

    result = transition_contract_payload(payload, "invite_sent")

    assert result["lifecycle_state"] == ContractLifecycleState.AWAITING_PARTIES.value
    assert result["status"] == ContractLifecycleState.AWAITING_PARTIES.value
