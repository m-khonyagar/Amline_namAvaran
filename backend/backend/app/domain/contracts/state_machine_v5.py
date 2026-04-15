"""
State Machine قرارداد نسخه v5.0
۲۰ state + ۲۵ transition + Guard conditions + SLA deadline tracking

سازگاری با contract_state_machine.py فعلی از طریق توابع bridge حفظ شده.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from enum import Enum
from typing import Any, Optional

from app.domain.contracts.transition_guards import (
    AdminPrivilegeGuard,
    AllPartiesVerifiedGuard,
    AllRequiredSignedGuard,
    AllSharesPaidGuard,
    PartyVerifiedGuard,
    ReviewerAuthorizedGuard,
    SLANotExceededGuard,
    TransitionGuardBase,
    check_guards,
)


# ---------------------------------------------------------------------------
# 20 States
# ---------------------------------------------------------------------------


class ContractLifecycleStateV5(str, Enum):
    """۲۰ وضعیت چرخه حیات قرارداد v5.0"""

    DRAFT = "draft"
    IN_PROGRESS = "in_progress"
    AWAITING_COUNTERPARTY = "awaiting_counterparty"
    REJECTED = "rejected"
    EXPIRED = "expired"
    WAITING_SIGNATURES = "waiting_signatures"
    PARTIALLY_SIGNED = "partially_signed"
    WAITING_PAYMENT = "waiting_payment"
    PAYMENT_PARTIAL = "payment_partial"
    UNDER_REVIEW = "under_review"
    NEEDS_CORRECTION = "needs_correction"
    ESCALATED = "escalated"
    APPROVED = "approved"
    READY_FOR_TRACKING_CODE = "ready_for_tracking_code"
    COMPLETED = "completed"
    DISPUTED = "disputed"
    COMPENSATING = "compensating"
    CANCELLED = "cancelled"
    TERMINATED = "terminated"
    VOIDED = "voided"


# Terminal states — no further transitions allowed
_TERMINAL_STATES: frozenset[str] = frozenset(
    {
        ContractLifecycleStateV5.COMPLETED.value,
        ContractLifecycleStateV5.REJECTED.value,
        ContractLifecycleStateV5.EXPIRED.value,
        ContractLifecycleStateV5.CANCELLED.value,
        ContractLifecycleStateV5.TERMINATED.value,
        ContractLifecycleStateV5.VOIDED.value,
    }
)


# ---------------------------------------------------------------------------
# Transition dataclass
# ---------------------------------------------------------------------------


@dataclass
class Transition:
    """تعریف یک انتقال در state machine"""

    from_state: str
    to_state: str
    event: str
    description: str
    guards: list[TransitionGuardBase] = field(default_factory=list)
    sla_days: Optional[int] = None

    def can_execute(
        self, context: dict[str, Any]
    ) -> tuple[bool, Optional[str]]:
        """بررسی آیا انتقال با توجه به context ممکن است."""
        all_passed, failed_guard = check_guards(self.guards, context)
        if not all_passed:
            return False, f"Guard failed: {failed_guard}"
        return True, None

    def get_deadline(self) -> Optional[datetime]:
        """محاسبه deadline بر اساس SLA (از لحظه فعلی)."""
        if self.sla_days is None:
            return None
        return datetime.now(tz=timezone.utc) + timedelta(days=self.sla_days)

    def get_guard_info(self) -> list[dict[str, str]]:
        """متادیتای guards برای اهداف مستندسازی/لاگ."""
        return [
            {"name": g.get_name(), "description": g.get_description()}
            for g in self.guards
        ]


# ---------------------------------------------------------------------------
# State Machine v5.0
# ---------------------------------------------------------------------------


class ContractStateMachineV5:
    """ماشین حالت قرارداد نسخه v5.0

    ۲۰ state، ۲۵ transition، guard conditions، و SLA tracking.
    """

    def __init__(self) -> None:
        self.transitions: dict[tuple[str, str], Transition] = {}
        self._register_transitions()

    # ------------------------------------------------------------------
    # Registration helpers
    # ------------------------------------------------------------------

    def register(self, transition: Transition) -> None:
        """ثبت یک transition در جدول."""
        key = (transition.from_state, transition.event)
        self.transitions[key] = transition

    def _register_transitions(self) -> None:
        """ثبت تمام ۲۵ transition."""

        S = ContractLifecycleStateV5  # alias for brevity

        # ── 1. DRAFT → IN_PROGRESS ────────────────────────────────────
        self.register(Transition(
            from_state=S.DRAFT.value,
            to_state=S.IN_PROGRESS.value,
            event="save_step",
            description="ذخیره مرحله ویزارد",
            guards=[],
        ))

        # ── 2. IN_PROGRESS → AWAITING_COUNTERPARTY ────────────────────
        self.register(Transition(
            from_state=S.IN_PROGRESS.value,
            to_state=S.AWAITING_COUNTERPARTY.value,
            event="send_invites",
            description="ارسال دعوت به طرفین",
            guards=[],
            sla_days=7,
        ))

        # ── 3. AWAITING_COUNTERPARTY → WAITING_SIGNATURES ─────────────
        self.register(Transition(
            from_state=S.AWAITING_COUNTERPARTY.value,
            to_state=S.WAITING_SIGNATURES.value,
            event="counterparty_accepts",
            description="طرف مقابل قبول کرد",
            guards=[PartyVerifiedGuard()],
            sla_days=7,
        ))

        # ── 4. AWAITING_COUNTERPARTY → REJECTED ───────────────────────
        self.register(Transition(
            from_state=S.AWAITING_COUNTERPARTY.value,
            to_state=S.REJECTED.value,
            event="counterparty_rejects",
            description="طرف مقابل رد کرد",
            guards=[],
        ))

        # ── 5. AWAITING_COUNTERPARTY → EXPIRED (SLA) ──────────────────
        self.register(Transition(
            from_state=S.AWAITING_COUNTERPARTY.value,
            to_state=S.EXPIRED.value,
            event="sla_expired",
            description="انقضای SLA دعوت‌نامه",
            guards=[],
        ))

        # ── 6. WAITING_SIGNATURES → PARTIALLY_SIGNED ──────────────────
        self.register(Transition(
            from_state=S.WAITING_SIGNATURES.value,
            to_state=S.PARTIALLY_SIGNED.value,
            event="first_party_signs",
            description="اولین امضا ثبت شد",
            guards=[],
            sla_days=7,
        ))

        # ── 7. WAITING_SIGNATURES → EXPIRED (SLA) ─────────────────────
        self.register(Transition(
            from_state=S.WAITING_SIGNATURES.value,
            to_state=S.EXPIRED.value,
            event="sla_expired",
            description="انقضای SLA امضا",
            guards=[],
        ))

        # ── 8. PARTIALLY_SIGNED → WAITING_PAYMENT ─────────────────────
        self.register(Transition(
            from_state=S.PARTIALLY_SIGNED.value,
            to_state=S.WAITING_PAYMENT.value,
            event="all_parties_signed",
            description="تمام امضاها تکمیل شده",
            guards=[AllRequiredSignedGuard()],
            sla_days=7,
        ))

        # ── 9. PARTIALLY_SIGNED → EXPIRED (SLA) ──────────────────────
        self.register(Transition(
            from_state=S.PARTIALLY_SIGNED.value,
            to_state=S.EXPIRED.value,
            event="sla_expired",
            description="انقضای SLA تکمیل امضاها",
            guards=[],
        ))

        # ── 10. WAITING_PAYMENT → PAYMENT_PARTIAL ─────────────────────
        self.register(Transition(
            from_state=S.WAITING_PAYMENT.value,
            to_state=S.PAYMENT_PARTIAL.value,
            event="payment_received",
            description="پرداخت دریافت شد",
            guards=[],
            sla_days=30,
        ))

        # ── 11. PAYMENT_PARTIAL → UNDER_REVIEW ────────────────────────
        self.register(Transition(
            from_state=S.PAYMENT_PARTIAL.value,
            to_state=S.UNDER_REVIEW.value,
            event="all_shares_paid",
            description="تمام سهم‌ها پرداخت شده",
            guards=[AllSharesPaidGuard()],
            sla_days=1,
        ))

        # ── 12. UNDER_REVIEW → APPROVED ───────────────────────────────
        self.register(Transition(
            from_state=S.UNDER_REVIEW.value,
            to_state=S.APPROVED.value,
            event="reviewer_approves",
            description="تأیید توسط کارشناس",
            guards=[ReviewerAuthorizedGuard()],
        ))

        # ── 13. UNDER_REVIEW → NEEDS_CORRECTION ───────────────────────
        self.register(Transition(
            from_state=S.UNDER_REVIEW.value,
            to_state=S.NEEDS_CORRECTION.value,
            event="request_correction",
            description="درخواست اصلاح توسط کارشناس",
            guards=[ReviewerAuthorizedGuard()],
        ))

        # ── 14. UNDER_REVIEW → ESCALATED ──────────────────────────────
        self.register(Transition(
            from_state=S.UNDER_REVIEW.value,
            to_state=S.ESCALATED.value,
            event="escalate",
            description="ارجاع به مدیر ارشد",
            guards=[ReviewerAuthorizedGuard()],
        ))

        # ── 15. NEEDS_CORRECTION → UNDER_REVIEW ───────────────────────
        self.register(Transition(
            from_state=S.NEEDS_CORRECTION.value,
            to_state=S.UNDER_REVIEW.value,
            event="correction_submitted",
            description="اصلاحیه ارسال شد",
            guards=[AllPartiesVerifiedGuard()],
        ))

        # ── 16. NEEDS_CORRECTION → ESCALATED ──────────────────────────
        self.register(Transition(
            from_state=S.NEEDS_CORRECTION.value,
            to_state=S.ESCALATED.value,
            event="escalate",
            description="ارجاع به مدیر ارشد از مرحله اصلاح",
            guards=[AdminPrivilegeGuard()],
        ))

        # ── 17. ESCALATED → APPROVED ──────────────────────────────────
        self.register(Transition(
            from_state=S.ESCALATED.value,
            to_state=S.APPROVED.value,
            event="admin_approves",
            description="تأیید ادمین",
            guards=[AdminPrivilegeGuard()],
        ))

        # ── 18. ESCALATED → CANCELLED ─────────────────────────────────
        self.register(Transition(
            from_state=S.ESCALATED.value,
            to_state=S.CANCELLED.value,
            event="admin_cancels",
            description="لغو توسط ادمین",
            guards=[AdminPrivilegeGuard()],
        ))

        # ── 19. APPROVED → READY_FOR_TRACKING_CODE ────────────────────
        self.register(Transition(
            from_state=S.APPROVED.value,
            to_state=S.READY_FOR_TRACKING_CODE.value,
            event="finalize",
            description="نهایی‌سازی",
            guards=[],
        ))

        # ── 20. READY_FOR_TRACKING_CODE → COMPLETED ───────────────────
        self.register(Transition(
            from_state=S.READY_FOR_TRACKING_CODE.value,
            to_state=S.COMPLETED.value,
            event="tracking_code_issued",
            description="صدور کد رهگیری",
            guards=[],
        ))

        # ── 21. COMPLETED → DISPUTED ──────────────────────────────────
        self.register(Transition(
            from_state=S.COMPLETED.value,
            to_state=S.DISPUTED.value,
            event="dispute_raised",
            description="اعتراض به قرارداد تکمیل‌شده",
            guards=[SLANotExceededGuard()],
        ))

        # ── 22. DISPUTED → COMPENSATING ───────────────────────────────
        self.register(Transition(
            from_state=S.DISPUTED.value,
            to_state=S.COMPENSATING.value,
            event="resolution_refund",
            description="تصمیم استرداد وجه",
            guards=[AdminPrivilegeGuard()],
        ))

        # ── 23. DISPUTED → COMPLETED ──────────────────────────────────
        self.register(Transition(
            from_state=S.DISPUTED.value,
            to_state=S.COMPLETED.value,
            event="resolution_dismiss",
            description="رد اعتراض و بازگشت به تکمیل",
            guards=[AdminPrivilegeGuard()],
        ))

        # ── 24. COMPENSATING → TERMINATED ─────────────────────────────
        self.register(Transition(
            from_state=S.COMPENSATING.value,
            to_state=S.TERMINATED.value,
            event="ledger_reversed",
            description="معکوس‌سازی دفتر کل و خاتمه",
            guards=[],
        ))

        # ── 25. DRAFT → VOIDED ────────────────────────────────────────
        self.register(Transition(
            from_state=S.DRAFT.value,
            to_state=S.VOIDED.value,
            event="void",
            description="ابطال پیش‌نویس",
            guards=[AdminPrivilegeGuard()],
        ))

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def can_transition(
        self,
        current_state: str,
        event: str,
        context: Optional[dict[str, Any]] = None,
    ) -> tuple[bool, Optional[str]]:
        """بررسی امکان transition.

        Returns:
            ``(allowed, error_message_or_None)``
        """
        if context is None:
            context = {}
        key = (current_state, event)
        if key not in self.transitions:
            return False, f"Invalid transition: state={current_state!r} event={event!r}"
        return self.transitions[key].can_execute(context)

    def transition(
        self,
        current_state: str,
        event: str,
        context: Optional[dict[str, Any]] = None,
    ) -> str:
        """اعمال transition و بازگشت state جدید.

        Raises:
            ValueError: اگر transition مجاز نباشد یا guard رد شود.
        """
        allowed, reason = self.can_transition(current_state, event, context)
        if not allowed:
            raise ValueError(reason)
        return self.transitions[(current_state, event)].to_state

    def get_transition(
        self, current_state: str, event: str
    ) -> Optional[Transition]:
        """دریافت شیء Transition بدون بررسی."""
        return self.transitions.get((current_state, event))

    def allowed_events(self, current_state: str) -> list[str]:
        """لیست eventهای مجاز در وضعیت فعلی."""
        return [e for (s, e) in self.transitions if s == current_state]

    def is_terminal(self, state: str) -> bool:
        """آیا state پایانی است؟"""
        return state in _TERMINAL_STATES


# ---------------------------------------------------------------------------
# Singleton accessor
# ---------------------------------------------------------------------------

_sm_v5: Optional[ContractStateMachineV5] = None


def get_contract_state_machine_v5() -> ContractStateMachineV5:
    global _sm_v5
    if _sm_v5 is None:
        _sm_v5 = ContractStateMachineV5()
    return _sm_v5
