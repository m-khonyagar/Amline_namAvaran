"""Pure contract state machine logic with guard-aware transitions."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from enum import Enum
from typing import Optional

from app.domain.contracts.transition_guards import (
    GuardContext,
    evaluate_guard,
)


class ContractLifecycleState(str, Enum):
    DRAFT = "draft"
    AWAITING_PARTIES = "awaiting_parties"
    SIGNING_IN_PROGRESS = "signing_in_progress"
    SIGNED_PENDING_PAYMENT = "signed_pending_payment"
    PAYMENT_PARTIAL = "payment_partial"
    PAYMENT_COMPLETE = "payment_complete"
    LEGAL_REVIEW = "legal_review"
    LEGAL_REJECTED = "legal_rejected"
    REGISTRY_SUBMITTED = "registry_submitted"
    REGISTRY_PENDING = "registry_pending"
    ACTIVE = "active"
    SUSPENDED = "suspended"
    AMENDMENT_REQUESTED = "amendment_requested"
    AMENDMENT_IN_PROGRESS = "amendment_in_progress"
    COMPLETED = "completed"
    DISPUTE_OPEN = "dispute_open"
    DISPUTE_MEDIATION = "dispute_mediation"
    COMPENSATING = "compensating"
    CANCELLED = "cancelled"
    EXPIRED = "expired"


TERMINAL_STATES = frozenset(
    {
        ContractLifecycleState.COMPLETED.value,
        ContractLifecycleState.CANCELLED.value,
        ContractLifecycleState.EXPIRED.value,
    }
)


@dataclass(frozen=True)
class Transition:
    from_state: str
    event: str
    to_state: str
    guard: Optional[str] = None
    sla_hours: Optional[int] = None
    description: str = ""


@dataclass(frozen=True)
class TransitionResult:
    success: bool
    new_state: str
    transition: Optional[Transition] = None
    error: Optional[str] = None
    sla_deadline: Optional[datetime] = None


TRANSITIONS: tuple[Transition, ...] = (
    Transition(
        ContractLifecycleState.DRAFT.value,
        "invite_sent",
        ContractLifecycleState.AWAITING_PARTIES.value,
        guard="can_invite_parties",
        description="Invite the contract parties.",
    ),
    Transition(
        ContractLifecycleState.AWAITING_PARTIES.value,
        "party_ready",
        ContractLifecycleState.SIGNING_IN_PROGRESS.value,
        guard="all_parties_verified",
        sla_hours=72,
        description="All contract parties are ready to sign.",
    ),
    Transition(
        ContractLifecycleState.AWAITING_PARTIES.value,
        "sla_signature_deadline",
        ContractLifecycleState.EXPIRED.value,
        sla_hours=72,
        description="Party onboarding SLA expired.",
    ),
    Transition(
        ContractLifecycleState.SIGNING_IN_PROGRESS.value,
        "all_signatures_ok",
        ContractLifecycleState.SIGNED_PENDING_PAYMENT.value,
        guard="all_signatures_valid",
        sla_hours=48,
        description="All required signatures were validated.",
    ),
    Transition(
        ContractLifecycleState.SIGNING_IN_PROGRESS.value,
        "sla_signing_stall",
        ContractLifecycleState.EXPIRED.value,
        sla_hours=48,
        description="Signing window expired.",
    ),
    Transition(
        ContractLifecycleState.SIGNED_PENDING_PAYMENT.value,
        "one_paid",
        ContractLifecycleState.PAYMENT_PARTIAL.value,
        guard="payment_amount_valid",
        description="One side has completed payment.",
    ),
    Transition(
        ContractLifecycleState.SIGNED_PENDING_PAYMENT.value,
        "both_halves_paid",
        ContractLifecycleState.PAYMENT_COMPLETE.value,
        guard="payment_amount_valid",
        description="All payment legs are complete.",
    ),
    Transition(
        ContractLifecycleState.PAYMENT_PARTIAL.value,
        "other_pays",
        ContractLifecycleState.PAYMENT_COMPLETE.value,
        guard="payment_amount_valid",
        description="The remaining party completed payment.",
    ),
    Transition(
        ContractLifecycleState.PAYMENT_COMPLETE.value,
        "require_legal",
        ContractLifecycleState.LEGAL_REVIEW.value,
        guard="reviewer_authorized",
        description="Escalate for legal review.",
    ),
    Transition(
        ContractLifecycleState.PAYMENT_COMPLETE.value,
        "skip_legal",
        ContractLifecycleState.REGISTRY_SUBMITTED.value,
        guard="admin_privilege",
        description="Administrative bypass of legal review.",
    ),
    Transition(
        ContractLifecycleState.LEGAL_REVIEW.value,
        "approved",
        ContractLifecycleState.REGISTRY_SUBMITTED.value,
        guard="reviewer_authorized",
        description="Legal review approved the contract.",
    ),
    Transition(
        ContractLifecycleState.LEGAL_REVIEW.value,
        "rejected",
        ContractLifecycleState.LEGAL_REJECTED.value,
        guard="reviewer_authorized",
        description="Legal review rejected the contract.",
    ),
    Transition(
        ContractLifecycleState.LEGAL_REVIEW.value,
        "rejected_edit_version",
        ContractLifecycleState.DRAFT.value,
        guard="reviewer_authorized",
        description="Legacy rejection flow back to draft.",
    ),
    Transition(
        ContractLifecycleState.LEGAL_REJECTED.value,
        "resubmit",
        ContractLifecycleState.DRAFT.value,
        guard="can_invite_parties",
        description="Rejected contract is resubmitted.",
    ),
    Transition(
        ContractLifecycleState.REGISTRY_SUBMITTED.value,
        "ok",
        ContractLifecycleState.REGISTRY_PENDING.value,
        description="Registry accepted the submission.",
    ),
    Transition(
        ContractLifecycleState.REGISTRY_PENDING.value,
        "tracking_code",
        ContractLifecycleState.ACTIVE.value,
        guard="tracking_code_present",
        description="Tracking code received from the registry.",
    ),
    Transition(
        ContractLifecycleState.ACTIVE.value,
        "obligations_done",
        ContractLifecycleState.COMPLETED.value,
        description="Contract obligations were fulfilled.",
    ),
    Transition(
        ContractLifecycleState.ACTIVE.value,
        "suspend",
        ContractLifecycleState.SUSPENDED.value,
        guard="admin_privilege",
        description="Administratively suspend the contract.",
    ),
    Transition(
        ContractLifecycleState.SUSPENDED.value,
        "resume",
        ContractLifecycleState.ACTIVE.value,
        guard="admin_privilege",
        description="Resume a suspended contract.",
    ),
    Transition(
        ContractLifecycleState.ACTIVE.value,
        "request_amendment",
        ContractLifecycleState.AMENDMENT_REQUESTED.value,
        guard="all_parties_verified",
        description="Open the amendment flow.",
    ),
    Transition(
        ContractLifecycleState.AMENDMENT_REQUESTED.value,
        "start_amendment",
        ContractLifecycleState.AMENDMENT_IN_PROGRESS.value,
        guard="reviewer_authorized",
        description="Begin amendment drafting.",
    ),
    Transition(
        ContractLifecycleState.AMENDMENT_IN_PROGRESS.value,
        "amendment_done",
        ContractLifecycleState.ACTIVE.value,
        guard="all_signatures_valid",
        description="Return to active after amendment signatures.",
    ),
    Transition(
        ContractLifecycleState.SIGNED_PENDING_PAYMENT.value,
        "dispute",
        ContractLifecycleState.DISPUTE_OPEN.value,
        description="Open a payment-stage dispute.",
    ),
    Transition(
        ContractLifecycleState.PAYMENT_PARTIAL.value,
        "dispute",
        ContractLifecycleState.DISPUTE_OPEN.value,
        description="Open a partial-payment dispute.",
    ),
    Transition(
        ContractLifecycleState.ACTIVE.value,
        "dispute",
        ContractLifecycleState.DISPUTE_OPEN.value,
        description="Open a live-contract dispute.",
    ),
    Transition(
        ContractLifecycleState.DISPUTE_OPEN.value,
        "escalate",
        ContractLifecycleState.DISPUTE_MEDIATION.value,
        guard="admin_privilege",
        description="Escalate dispute to mediation.",
    ),
    Transition(
        ContractLifecycleState.DISPUTE_MEDIATION.value,
        "resolution_refund",
        ContractLifecycleState.COMPENSATING.value,
        guard="admin_privilege",
        description="Refund resolution approved.",
    ),
    Transition(
        ContractLifecycleState.DISPUTE_OPEN.value,
        "resolution_dismiss",
        ContractLifecycleState.ACTIVE.value,
        guard="reviewer_authorized",
        description="Dismiss dispute and return to active.",
    ),
    Transition(
        ContractLifecycleState.COMPENSATING.value,
        "ledger_reversed",
        ContractLifecycleState.CANCELLED.value,
        guard="admin_privilege",
        description="Compensation settled and contract cancelled.",
    ),
)

_TRANSITION_MAP = {(t.from_state, t.event): t for t in TRANSITIONS}


def _guard_passes(guard: str, context: Optional[GuardContext]) -> bool:
    if context is None:
        return True
    return evaluate_guard(guard, context)


class ContractStateMachine:
    """Guard-aware contract state machine with a backward-compatible API."""

    def get_transition(self, current: str, event: str) -> Optional[Transition]:
        return _TRANSITION_MAP.get((current, event))

    def is_terminal(self, state: str) -> bool:
        return state in TERMINAL_STATES

    def can_transition(
        self,
        current: str,
        event: str,
        context: Optional[GuardContext] = None,
    ) -> bool:
        transition = self.get_transition(current, event)
        if transition is None or self.is_terminal(current):
            return False
        if transition.guard:
            return _guard_passes(transition.guard, context)
        return True

    def transition_result(
        self,
        current: str,
        event: str,
        context: Optional[GuardContext] = None,
        *,
        reference_time: Optional[datetime] = None,
    ) -> TransitionResult:
        if self.is_terminal(current):
            return TransitionResult(
                success=False,
                new_state=current,
                error=f"Terminal state cannot transition: state={current!r}",
            )

        transition = self.get_transition(current, event)
        if transition is None:
            return TransitionResult(
                success=False,
                new_state=current,
                error=f"Invalid transition: state={current!r} event={event!r}",
            )

        if transition.guard and not _guard_passes(transition.guard, context):
            return TransitionResult(
                success=False,
                new_state=current,
                transition=transition,
                error=f"Guard failed: {transition.guard}",
            )

        base_time = reference_time or datetime.now(UTC)
        sla_deadline = None
        if transition.sla_hours is not None:
            sla_deadline = base_time + timedelta(hours=transition.sla_hours)

        return TransitionResult(
            success=True,
            new_state=transition.to_state,
            transition=transition,
            sla_deadline=sla_deadline,
        )

    def transition(
        self,
        current: str,
        event: str,
        context: Optional[GuardContext] = None,
    ) -> str:
        result = self.transition_result(current, event, context)
        if not result.success:
            raise ValueError(result.error)
        return result.new_state

    def allowed_events(
        self,
        current: str,
        context: Optional[GuardContext] = None,
    ) -> list[str]:
        return [
            event
            for (state, event), transition in _TRANSITION_MAP.items()
            if state == current
            and (
                transition.guard is None
                or _guard_passes(transition.guard, context)
            )
        ]


def transition_contract_payload(
    payload: dict[str, object],
    event: str,
    context: Optional[GuardContext] = None,
) -> dict[str, object]:
    """Return a new payload with updated lifecycle_state/status fields."""

    sm = get_contract_state_machine()
    current = str(payload.get("lifecycle_state") or payload.get("status") or "draft").lower()
    transition_context = dict(payload)
    if context:
        transition_context.update(context)
    next_state = sm.transition(current, event, transition_context)
    return {
        **payload,
        "lifecycle_state": next_state,
        "status": next_state,
    }


_sm: ContractStateMachine | None = None


def get_contract_state_machine() -> ContractStateMachine:
    global _sm
    if _sm is None:
        _sm = ContractStateMachine()
    return _sm
