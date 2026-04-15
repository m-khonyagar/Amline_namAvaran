"""ماشین حالت قرارداد نسخه v5.0 — Amline Enterprise Master v5.0.

توسعه از ۱۵ state به ۲۰ state با اضافه کردن:
- Review states (needs_correction, escalated)
- Dispute/compensation states (disputed, compensating)
- Void state (voided)
- SLA deadline tracking
- Enhanced transition guards
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from enum import Enum
from typing import Any, FrozenSet

from app.domain.contracts.transition_guards import (
    GUARD_REGISTRY,
    GuardError,
    TransitionError,
)


class ContractLifecycleStateV5(str, Enum):
    # --- Original 15 States ---
    DRAFT = "draft"
    IN_PROGRESS = "in_progress"
    AWAITING_COUNTERPARTY = "awaiting_counterparty"
    WAITING_SIGNATURES = "waiting_signatures"
    PARTIALLY_SIGNED = "partially_signed"
    WAITING_PAYMENT = "waiting_payment"
    PAYMENT_PARTIAL = "payment_partial"
    UNDER_REVIEW = "under_review"
    APPROVED = "approved"
    READY_FOR_TRACKING_CODE = "ready_for_tracking_code"
    COMPLETED = "completed"
    REJECTED = "rejected"
    EXPIRED = "expired"
    CANCELLED = "cancelled"
    TERMINATED = "terminated"

    # --- New 5 States (v5.0) ---
    NEEDS_CORRECTION = "needs_correction"
    ESCALATED = "escalated"
    DISPUTED = "disputed"
    COMPENSATING = "compensating"
    VOIDED = "voided"


# States that cannot transition further (terminal states)
TERMINAL_STATES: FrozenSet[str] = frozenset(
    {
        ContractLifecycleStateV5.COMPLETED.value,
        ContractLifecycleStateV5.REJECTED.value,
        ContractLifecycleStateV5.EXPIRED.value,
        ContractLifecycleStateV5.CANCELLED.value,
        ContractLifecycleStateV5.TERMINATED.value,
        ContractLifecycleStateV5.VOIDED.value,
    }
)

# Non-terminal states from which a dispute may be raised
_DISPUTABLE_STATES: FrozenSet[str] = frozenset(
    s.value
    for s in ContractLifecycleStateV5
    if s.value not in TERMINAL_STATES
    and s != ContractLifecycleStateV5.DISPUTED
    and s != ContractLifecycleStateV5.COMPENSATING
)

# SLA durations (in days) per transition event
SLA_DAYS: dict[str, int] = {
    "sla_counterparty_expired": 7,   # awaiting_counterparty → expired
    "sla_signature_expired": 7,       # waiting_signatures → expired
    "escalation_review_expired": 3,   # escalated → auto-approve or reject
}


# ---------------------------------------------------------------------------
# Transition table: (from_state, event) → to_state
# ---------------------------------------------------------------------------
#
# Each entry maps (current_state_value, event_name) → next_state_value.
# Guards (pre-conditions) are declared separately in TRANSITION_GUARDS below.
#
_TRANSITIONS: dict[tuple[str, str], str] = {
    # --- Draft Phase ---
    (ContractLifecycleStateV5.DRAFT.value, "save_step"): ContractLifecycleStateV5.IN_PROGRESS.value,
    (ContractLifecycleStateV5.DRAFT.value, "cancel"): ContractLifecycleStateV5.CANCELLED.value,

    # --- Invitation Phase ---
    (ContractLifecycleStateV5.IN_PROGRESS.value, "send_invites"): ContractLifecycleStateV5.AWAITING_COUNTERPARTY.value,
    (ContractLifecycleStateV5.AWAITING_COUNTERPARTY.value, "sla_counterparty_expired"): ContractLifecycleStateV5.EXPIRED.value,
    (ContractLifecycleStateV5.AWAITING_COUNTERPARTY.value, "counterparty_rejects"): ContractLifecycleStateV5.REJECTED.value,

    # --- Signature Phase ---
    (ContractLifecycleStateV5.AWAITING_COUNTERPARTY.value, "counterparty_accepts"): ContractLifecycleStateV5.WAITING_SIGNATURES.value,
    (ContractLifecycleStateV5.WAITING_SIGNATURES.value, "first_party_signs"): ContractLifecycleStateV5.PARTIALLY_SIGNED.value,
    (ContractLifecycleStateV5.PARTIALLY_SIGNED.value, "await_second_signature"): ContractLifecycleStateV5.WAITING_SIGNATURES.value,
    (ContractLifecycleStateV5.PARTIALLY_SIGNED.value, "all_signatures_complete"): ContractLifecycleStateV5.WAITING_PAYMENT.value,
    (ContractLifecycleStateV5.WAITING_SIGNATURES.value, "sla_signature_expired"): ContractLifecycleStateV5.EXPIRED.value,

    # --- Payment Phase ---
    (ContractLifecycleStateV5.WAITING_PAYMENT.value, "one_share_paid"): ContractLifecycleStateV5.PAYMENT_PARTIAL.value,
    (ContractLifecycleStateV5.PAYMENT_PARTIAL.value, "retry_payment"): ContractLifecycleStateV5.WAITING_PAYMENT.value,
    (ContractLifecycleStateV5.PAYMENT_PARTIAL.value, "all_shares_paid"): ContractLifecycleStateV5.UNDER_REVIEW.value,
    (ContractLifecycleStateV5.WAITING_PAYMENT.value, "both_shares_paid"): ContractLifecycleStateV5.UNDER_REVIEW.value,

    # --- Review Phase (NEW in v5) ---
    (ContractLifecycleStateV5.UNDER_REVIEW.value, "reviewer_approves"): ContractLifecycleStateV5.APPROVED.value,
    (ContractLifecycleStateV5.UNDER_REVIEW.value, "reviewer_requests_changes"): ContractLifecycleStateV5.NEEDS_CORRECTION.value,
    (ContractLifecycleStateV5.UNDER_REVIEW.value, "reviewer_rejects"): ContractLifecycleStateV5.REJECTED.value,
    (ContractLifecycleStateV5.UNDER_REVIEW.value, "escalate_to_senior"): ContractLifecycleStateV5.ESCALATED.value,
    (ContractLifecycleStateV5.NEEDS_CORRECTION.value, "user_resubmits"): ContractLifecycleStateV5.IN_PROGRESS.value,
    (ContractLifecycleStateV5.ESCALATED.value, "senior_approves"): ContractLifecycleStateV5.APPROVED.value,
    (ContractLifecycleStateV5.ESCALATED.value, "senior_rejects"): ContractLifecycleStateV5.REJECTED.value,

    # --- Completion Phase ---
    (ContractLifecycleStateV5.APPROVED.value, "finalize"): ContractLifecycleStateV5.READY_FOR_TRACKING_CODE.value,
    (ContractLifecycleStateV5.READY_FOR_TRACKING_CODE.value, "tracking_code_issued"): ContractLifecycleStateV5.COMPLETED.value,

    # --- Dispute Phase (NEW in v5) ---
    # "raise_dispute" is handled dynamically below for all non-terminal states
    (ContractLifecycleStateV5.DISPUTED.value, "decision_refund"): ContractLifecycleStateV5.COMPENSATING.value,
    (ContractLifecycleStateV5.COMPENSATING.value, "ledger_reversed"): ContractLifecycleStateV5.CANCELLED.value,
    (ContractLifecycleStateV5.DISPUTED.value, "decision_dismiss"): ContractLifecycleStateV5.COMPLETED.value,

    # --- Termination ---
    (ContractLifecycleStateV5.COMPLETED.value, "terminate"): ContractLifecycleStateV5.TERMINATED.value,
    (ContractLifecycleStateV5.COMPLETED.value, "admin_void"): ContractLifecycleStateV5.VOIDED.value,
}

# Add "raise_dispute" transition for all non-terminal, non-dispute states
for _state in _DISPUTABLE_STATES:
    _TRANSITIONS[(_state, "raise_dispute")] = ContractLifecycleStateV5.DISPUTED.value


# ---------------------------------------------------------------------------
# Guard requirements per (from_state, event) — list of guard names
# ---------------------------------------------------------------------------
TRANSITION_GUARDS: dict[tuple[str, str], list[str]] = {
    (ContractLifecycleStateV5.IN_PROGRESS.value, "send_invites"): ["party_verified"],
    (ContractLifecycleStateV5.AWAITING_COUNTERPARTY.value, "counterparty_accepts"): ["party_verified"],
    (ContractLifecycleStateV5.PARTIALLY_SIGNED.value, "all_signatures_complete"): ["all_required_signed"],
    (ContractLifecycleStateV5.PAYMENT_PARTIAL.value, "all_shares_paid"): ["payment_received"],
    (ContractLifecycleStateV5.WAITING_PAYMENT.value, "both_shares_paid"): ["payment_received"],
    (ContractLifecycleStateV5.UNDER_REVIEW.value, "reviewer_approves"): ["reviewer_authorized"],
    (ContractLifecycleStateV5.UNDER_REVIEW.value, "reviewer_requests_changes"): ["reviewer_authorized"],
    (ContractLifecycleStateV5.UNDER_REVIEW.value, "reviewer_rejects"): ["reviewer_authorized"],
    (ContractLifecycleStateV5.UNDER_REVIEW.value, "escalate_to_senior"): ["reviewer_authorized"],
    (ContractLifecycleStateV5.ESCALATED.value, "senior_approves"): ["reviewer_authorized"],
    (ContractLifecycleStateV5.ESCALATED.value, "senior_rejects"): ["reviewer_authorized"],
    (ContractLifecycleStateV5.AWAITING_COUNTERPARTY.value, "sla_counterparty_expired"): ["sla_not_exceeded"],
    (ContractLifecycleStateV5.WAITING_SIGNATURES.value, "sla_signature_expired"): ["sla_not_exceeded"],
    (ContractLifecycleStateV5.COMPLETED.value, "admin_void"): ["reviewer_authorized"],
}


class ContractStateMachineV5:
    """ماشین حالت قرارداد نسخه ۵ — ۲۰ state، ۲۵+ transition، با Guards."""

    # ------------------------------------------------------------------
    # Query helpers
    # ------------------------------------------------------------------

    def can_transition(self, current: str, event: str) -> bool:
        """آیا این انتقال در جدول تعریف شده است؟"""
        return (current, event) in _TRANSITIONS

    def allowed_events(self, current: str) -> list[str]:
        """رویدادهای مجاز از state فعلی."""
        return [e for (s, e) in _TRANSITIONS if s == current]

    def get_sla_deadline(self, event: str, from_dt: datetime | None = None) -> datetime | None:
        """محاسبه مهلت SLA بر اساس رویداد. None یعنی بدون SLA."""
        days = SLA_DAYS.get(event)
        if days is None:
            return None
        base = from_dt or datetime.now(tz=timezone.utc)
        return base + timedelta(days=days)

    # ------------------------------------------------------------------
    # Core transition
    # ------------------------------------------------------------------

    def transition(
        self,
        current: str,
        event: str,
        context: dict[str, Any] | None = None,
        *,
        skip_guards: bool = False,
    ) -> str:
        """
        اعمال انتقال حالت.

        Parameters
        ----------
        current:      حالت فعلی (مقدار رشته‌ای enum)
        event:        نام رویداد
        context:      متادیتا برای ارزیابی guards (مثلاً {"reviewer_authorized": True})
        skip_guards:  اگر True باشد، guards اجرا نمی‌شوند (فقط برای تست)

        Returns
        -------
        مقدار رشته‌ای حالت بعدی

        Raises
        ------
        TransitionError:  انتقال نامعتبر
        GuardError:       شرط پیشنیاز برقرار نیست
        """
        key = (current, event)
        if key not in _TRANSITIONS:
            raise TransitionError(
                code="INVALID_TRANSITION",
                message=f"انتقال نامعتبر: state={current!r} event={event!r}",
                current_state=current,
                event=event,
            )

        if not skip_guards:
            guard_names = TRANSITION_GUARDS.get(key, [])
            ctx = context or {}
            for guard_name in guard_names:
                guard_fn = GUARD_REGISTRY.get(guard_name)
                if guard_fn and not guard_fn(ctx):
                    raise GuardError(
                        code="GUARD_PRECONDITION_FAILED",
                        message=f"شرط پیشنیاز برقرار نیست: {guard_name}",
                        guard_name=guard_name,
                        current_state=current,
                        event=event,
                    )

        return _TRANSITIONS[key]

    def transition_payload(
        self,
        payload: dict[str, Any],
        event: str,
        context: dict[str, Any] | None = None,
        *,
        skip_guards: bool = False,
    ) -> dict[str, Any]:
        """اعمال انتقال روی دیکشنری داده قرارداد (بدون persist)."""
        cur = str(payload.get("lifecycle_state") or payload.get("status") or "draft").lower()
        nxt = self.transition(cur, event, context, skip_guards=skip_guards)
        sla_deadline = self.get_sla_deadline(event)
        out = {**payload, "lifecycle_state": nxt}
        if sla_deadline is not None:
            out["sla_deadline"] = sla_deadline.isoformat()
        return out


# ---------------------------------------------------------------------------
# Module-level singleton
# ---------------------------------------------------------------------------
_sm_v5: ContractStateMachineV5 | None = None


def get_state_machine_v5() -> ContractStateMachineV5:
    global _sm_v5
    if _sm_v5 is None:
        _sm_v5 = ContractStateMachineV5()
    return _sm_v5
