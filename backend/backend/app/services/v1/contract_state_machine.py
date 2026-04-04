"""ماشین حالت قرارداد (Target) — منطق pure بدون وابستگی به HTTP."""

from __future__ import annotations

from enum import Enum
from typing import Any


class ContractLifecycleState(str, Enum):
    DRAFT = "draft"
    AWAITING_PARTIES = "awaiting_parties"
    SIGNING_IN_PROGRESS = "signing_in_progress"
    SIGNED_PENDING_PAYMENT = "signed_pending_payment"
    PAYMENT_PARTIAL = "payment_partial"
    PAYMENT_COMPLETE = "payment_complete"
    LEGAL_REVIEW = "legal_review"
    REGISTRY_SUBMITTED = "registry_submitted"
    REGISTRY_PENDING = "registry_pending"
    ACTIVE = "active"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    EXPIRED = "expired"
    DISPUTE_OPEN = "dispute_open"
    COMPENSATING = "compensating"
    FAILED_TERMINAL = "failed_terminal"


# (from_state, event) -> to_state
_TRANSITIONS: dict[tuple[str, str], str] = {
    (
        ContractLifecycleState.DRAFT.value,
        "invite_sent",
    ): ContractLifecycleState.AWAITING_PARTIES.value,
    (
        ContractLifecycleState.AWAITING_PARTIES.value,
        "party_ready",
    ): ContractLifecycleState.SIGNING_IN_PROGRESS.value,
    (
        ContractLifecycleState.AWAITING_PARTIES.value,
        "sla_signature_deadline",
    ): ContractLifecycleState.EXPIRED.value,
    (
        ContractLifecycleState.SIGNING_IN_PROGRESS.value,
        "all_signatures_ok",
    ): ContractLifecycleState.SIGNED_PENDING_PAYMENT.value,
    (
        ContractLifecycleState.SIGNING_IN_PROGRESS.value,
        "sla_signing_stall",
    ): ContractLifecycleState.EXPIRED.value,
    (
        ContractLifecycleState.SIGNED_PENDING_PAYMENT.value,
        "both_halves_paid",
    ): ContractLifecycleState.PAYMENT_COMPLETE.value,
    (
        ContractLifecycleState.SIGNED_PENDING_PAYMENT.value,
        "one_paid",
    ): ContractLifecycleState.PAYMENT_PARTIAL.value,
    (
        ContractLifecycleState.PAYMENT_PARTIAL.value,
        "other_pays",
    ): ContractLifecycleState.PAYMENT_COMPLETE.value,
    (
        ContractLifecycleState.PAYMENT_COMPLETE.value,
        "require_legal",
    ): ContractLifecycleState.LEGAL_REVIEW.value,
    (
        ContractLifecycleState.LEGAL_REVIEW.value,
        "approved",
    ): ContractLifecycleState.REGISTRY_SUBMITTED.value,
    (
        ContractLifecycleState.LEGAL_REVIEW.value,
        "rejected_edit_version",
    ): ContractLifecycleState.DRAFT.value,
    (
        ContractLifecycleState.REGISTRY_SUBMITTED.value,
        "ok",
    ): ContractLifecycleState.REGISTRY_PENDING.value,
    (
        ContractLifecycleState.REGISTRY_PENDING.value,
        "tracking_code",
    ): ContractLifecycleState.ACTIVE.value,
    (
        ContractLifecycleState.ACTIVE.value,
        "obligations_done",
    ): ContractLifecycleState.COMPLETED.value,
    (
        ContractLifecycleState.SIGNED_PENDING_PAYMENT.value,
        "dispute",
    ): ContractLifecycleState.DISPUTE_OPEN.value,
    (
        ContractLifecycleState.PAYMENT_PARTIAL.value,
        "dispute",
    ): ContractLifecycleState.DISPUTE_OPEN.value,
    (
        ContractLifecycleState.ACTIVE.value,
        "dispute",
    ): ContractLifecycleState.DISPUTE_OPEN.value,
    (
        ContractLifecycleState.DISPUTE_OPEN.value,
        "resolution_refund",
    ): ContractLifecycleState.COMPENSATING.value,
    (
        ContractLifecycleState.COMPENSATING.value,
        "ledger_reversed",
    ): ContractLifecycleState.CANCELLED.value,
    (
        ContractLifecycleState.DISPUTE_OPEN.value,
        "resolution_dismiss",
    ): ContractLifecycleState.ACTIVE.value,
}


class ContractStateMachine:
    """بررسی و اعمال انتقال حالت قرارداد (شناسهٔ حالت به‌صورت رشته)."""

    def can_transition(self, current: str, event: str) -> bool:
        return (current, event) in _TRANSITIONS

    def transition(self, current: str, event: str) -> str:
        key = (current, event)
        if key not in _TRANSITIONS:
            raise ValueError(f"Invalid transition: state={current!r} event={event!r}")
        return _TRANSITIONS[key]

    def allowed_events(self, current: str) -> list[str]:
        return [e for (s, e) in _TRANSITIONS if s == current]


def transition_contract_payload(payload: dict[str, Any], event: str) -> dict[str, Any]:
    """به‌روزرسانی فیلدهای status/substate روی دیکشنری نمونه (بدون persist)."""
    sm = ContractStateMachine()
    cur = str(
        payload.get("lifecycle_state") or payload.get("status") or "draft"
    ).lower()
    nxt = sm.transition(cur, event)
    out = {**payload, "lifecycle_state": nxt}
    return out


_sm: ContractStateMachine | None = None


def get_contract_state_machine() -> ContractStateMachine:
    global _sm
    if _sm is None:
        _sm = ContractStateMachine()
    return _sm
