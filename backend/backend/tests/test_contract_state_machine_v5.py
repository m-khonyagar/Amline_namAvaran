"""تست‌های جامع ماشین حالت قرارداد v5.0 — ۱۵ سناریو.

این تست‌ها بدون نیاز به دیتابیس یا Redis اجرا می‌شوند (pure unit tests).
"""

from __future__ import annotations

import pytest

from app.domain.contracts.state_machine_v5 import (
    TERMINAL_STATES,
    ContractLifecycleStateV5,
    ContractStateMachineV5,
    _DISPUTABLE_STATES,
    get_state_machine_v5,
)
from app.domain.contracts.transition_guards import (
    GuardError,
    TransitionError,
)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def sm() -> ContractStateMachineV5:
    return ContractStateMachineV5()


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

S = ContractLifecycleStateV5  # alias for brevity


def _skip(sm: ContractStateMachineV5, current: str, event: str) -> str:
    """اجرای انتقال بدون بررسی guards."""
    return sm.transition(current, event, skip_guards=True)


# ===========================================================================
# سناریو ۱ — Happy Path کامل
# ===========================================================================

def test_happy_path_full(sm: ContractStateMachineV5) -> None:
    """draft → ... → completed (مسیر کامل موفق)."""
    state = S.DRAFT.value

    state = _skip(sm, state, "save_step")
    assert state == S.IN_PROGRESS.value

    state = _skip(sm, state, "send_invites")
    assert state == S.AWAITING_COUNTERPARTY.value

    state = _skip(sm, state, "counterparty_accepts")
    assert state == S.WAITING_SIGNATURES.value

    state = _skip(sm, state, "first_party_signs")
    assert state == S.PARTIALLY_SIGNED.value

    state = _skip(sm, state, "all_signatures_complete")
    assert state == S.WAITING_PAYMENT.value

    state = _skip(sm, state, "both_shares_paid")
    assert state == S.UNDER_REVIEW.value

    state = _skip(sm, state, "reviewer_approves")
    assert state == S.APPROVED.value

    state = _skip(sm, state, "finalize")
    assert state == S.READY_FOR_TRACKING_CODE.value

    state = _skip(sm, state, "tracking_code_issued")
    assert state == S.COMPLETED.value


# ===========================================================================
# سناریو ۲ — رد شدن توسط طرف مقابل
# ===========================================================================

def test_counterparty_rejection(sm: ContractStateMachineV5) -> None:
    """awaiting_counterparty → rejected."""
    nxt = _skip(sm, S.AWAITING_COUNTERPARTY.value, "counterparty_rejects")
    assert nxt == S.REJECTED.value


# ===========================================================================
# سناریو ۳ — انقضای SLA (awaiting_counterparty)
# ===========================================================================

def test_sla_expiration_counterparty(sm: ContractStateMachineV5) -> None:
    """awaiting_counterparty → expired (بعد از ۷ روز)."""
    nxt = _skip(sm, S.AWAITING_COUNTERPARTY.value, "sla_counterparty_expired")
    assert nxt == S.EXPIRED.value


# ===========================================================================
# سناریو ۴ — امضای جزئی
# ===========================================================================

def test_partial_signature_flow(sm: ContractStateMachineV5) -> None:
    """waiting_signatures → partially_signed → waiting_signatures."""
    state = S.WAITING_SIGNATURES.value
    state = _skip(sm, state, "first_party_signs")
    assert state == S.PARTIALLY_SIGNED.value

    # برگشت به waiting_signatures برای امضای دوم
    state = _skip(sm, state, "await_second_signature")
    assert state == S.WAITING_SIGNATURES.value


# ===========================================================================
# سناریو ۵ — پرداخت جزئی
# ===========================================================================

def test_partial_payment_flow(sm: ContractStateMachineV5) -> None:
    """waiting_payment → payment_partial → under_review."""
    state = S.WAITING_PAYMENT.value

    state = _skip(sm, state, "one_share_paid")
    assert state == S.PAYMENT_PARTIAL.value

    state = _skip(sm, state, "all_shares_paid")
    assert state == S.UNDER_REVIEW.value


# ===========================================================================
# سناریو ۶ — تأیید بررسی
# ===========================================================================

def test_review_approval(sm: ContractStateMachineV5) -> None:
    """under_review → approved."""
    nxt = sm.transition(
        S.UNDER_REVIEW.value,
        "reviewer_approves",
        context={"reviewer_authorized": True},
    )
    assert nxt == S.APPROVED.value


# ===========================================================================
# سناریو ۷ — رد بررسی
# ===========================================================================

def test_review_rejection(sm: ContractStateMachineV5) -> None:
    """under_review → rejected."""
    nxt = sm.transition(
        S.UNDER_REVIEW.value,
        "reviewer_rejects",
        context={"reviewer_authorized": True},
    )
    assert nxt == S.REJECTED.value


# ===========================================================================
# سناریو ۸ — درخواست اصلاح در بررسی
# ===========================================================================

def test_review_needs_correction_then_resubmit(sm: ContractStateMachineV5) -> None:
    """under_review → needs_correction → in_progress."""
    state = sm.transition(
        S.UNDER_REVIEW.value,
        "reviewer_requests_changes",
        context={"reviewer_authorized": True},
    )
    assert state == S.NEEDS_CORRECTION.value

    state = _skip(sm, state, "user_resubmits")
    assert state == S.IN_PROGRESS.value


# ===========================================================================
# سناریو ۹ — ارجاع به سطح بالاتر
# ===========================================================================

def test_review_escalation_then_senior_approves(sm: ContractStateMachineV5) -> None:
    """under_review → escalated → approved."""
    state = sm.transition(
        S.UNDER_REVIEW.value,
        "escalate_to_senior",
        context={"reviewer_authorized": True},
    )
    assert state == S.ESCALATED.value

    state = sm.transition(
        state,
        "senior_approves",
        context={"reviewer_authorized": True},
    )
    assert state == S.APPROVED.value


# ===========================================================================
# سناریو ۱۰ — مسیر اختلاف → جبران خسارت → لغو
# ===========================================================================

def test_dispute_path_refund(sm: ContractStateMachineV5) -> None:
    """(under_review) → disputed → compensating → cancelled."""
    state = S.UNDER_REVIEW.value

    state = _skip(sm, state, "raise_dispute")
    assert state == S.DISPUTED.value

    state = _skip(sm, state, "decision_refund")
    assert state == S.COMPENSATING.value

    state = _skip(sm, state, "ledger_reversed")
    assert state == S.CANCELLED.value


# ===========================================================================
# سناریو ۱۱ — رد اختلاف
# ===========================================================================

def test_dispute_dismiss(sm: ContractStateMachineV5) -> None:
    """disputed → completed (اختلاف رد شد)."""
    nxt = _skip(sm, S.DISPUTED.value, "decision_dismiss")
    assert nxt == S.COMPLETED.value


# ===========================================================================
# سناریو ۱۲ — فسخ قرارداد نهایی‌شده
# ===========================================================================

def test_terminal_termination(sm: ContractStateMachineV5) -> None:
    """completed → terminated."""
    nxt = _skip(sm, S.COMPLETED.value, "terminate")
    assert nxt == S.TERMINATED.value


# ===========================================================================
# سناریو ۱۳ — ابطال توسط ادمین
# ===========================================================================

def test_admin_void(sm: ContractStateMachineV5) -> None:
    """completed → voided (ادمین ابطال می‌کند)."""
    nxt = sm.transition(
        S.COMPLETED.value,
        "admin_void",
        context={"reviewer_authorized": True},
    )
    assert nxt == S.VOIDED.value


# ===========================================================================
# سناریو ۱۴ — شکست guard (شرط پیشنیاز برقرار نیست)
# ===========================================================================

def test_guard_precondition_failure_reviewer_not_authorized(sm: ContractStateMachineV5) -> None:
    """under_review → reviewer_approves بدون مجوز → GuardError."""
    with pytest.raises(GuardError) as exc_info:
        sm.transition(
            S.UNDER_REVIEW.value,
            "reviewer_approves",
            context={"reviewer_authorized": False},
        )
    err = exc_info.value
    assert err.code == "GUARD_PRECONDITION_FAILED"
    assert err.guard_name == "reviewer_authorized"
    assert err.current_state == S.UNDER_REVIEW.value
    assert err.event == "reviewer_approves"


def test_guard_payment_not_received(sm: ContractStateMachineV5) -> None:
    """waiting_payment → both_shares_paid بدون تأیید پرداخت → GuardError."""
    with pytest.raises(GuardError) as exc_info:
        sm.transition(
            S.WAITING_PAYMENT.value,
            "both_shares_paid",
            context={"payment_received": False},
        )
    err = exc_info.value
    assert err.code == "GUARD_PRECONDITION_FAILED"
    assert err.guard_name == "payment_received"


def test_invalid_transition_raises(sm: ContractStateMachineV5) -> None:
    """انتقال نامعتبر → TransitionError."""
    with pytest.raises(TransitionError) as exc_info:
        sm.transition(S.DRAFT.value, "nonexistent_event")
    err = exc_info.value
    assert err.code == "INVALID_TRANSITION"
    assert err.current_state == S.DRAFT.value
    assert err.event == "nonexistent_event"


# ===========================================================================
# سناریو ۱۵ — بررسی فیلدهای deadline SLA
# ===========================================================================

def test_sla_deadline_tracking_counterparty(sm: ContractStateMachineV5) -> None:
    """بررسی محاسبه مهلت SLA برای رویداد sla_counterparty_expired."""
    from datetime import datetime, timezone

    base = datetime(2026, 1, 1, tzinfo=timezone.utc)
    deadline = sm.get_sla_deadline("sla_counterparty_expired", from_dt=base)
    assert deadline is not None
    delta = deadline - base
    assert delta.days == 7


def test_sla_deadline_tracking_signature(sm: ContractStateMachineV5) -> None:
    """بررسی محاسبه مهلت SLA برای رویداد sla_signature_expired."""
    from datetime import datetime, timezone

    base = datetime(2026, 1, 1, tzinfo=timezone.utc)
    deadline = sm.get_sla_deadline("sla_signature_expired", from_dt=base)
    assert deadline is not None
    assert deadline.day == 8  # ۷ روز بعد


def test_sla_deadline_none_for_normal_event(sm: ContractStateMachineV5) -> None:
    """رویدادهای عادی مهلت SLA ندارند."""
    deadline = sm.get_sla_deadline("save_step")
    assert deadline is None


def test_sla_deadline_populated_in_payload(sm: ContractStateMachineV5) -> None:
    """اطمینان از اینکه payload نتیجه انتقال SLA دارای sla_deadline است."""
    payload = {"lifecycle_state": S.AWAITING_COUNTERPARTY.value}
    result = sm.transition_payload(payload, "sla_counterparty_expired", skip_guards=True)
    assert result["lifecycle_state"] == S.EXPIRED.value
    assert "sla_deadline" in result


# ===========================================================================
# تست‌های کمکی — بررسی کلی state machine
# ===========================================================================

def test_all_20_states_defined() -> None:
    """بررسی اینکه هر ۲۰ state تعریف شده است."""
    states = {s.value for s in ContractLifecycleStateV5}
    required = {
        "draft", "in_progress", "awaiting_counterparty", "waiting_signatures",
        "partially_signed", "waiting_payment", "payment_partial", "under_review",
        "approved", "ready_for_tracking_code", "completed", "rejected",
        "expired", "cancelled", "terminated",
        # v5.0 جدید
        "needs_correction", "escalated", "disputed", "compensating", "voided",
    }
    assert required == states


def test_terminal_states_cannot_transition(sm: ContractStateMachineV5) -> None:
    """حالت‌های نهایی نباید رویداد مجاز داشته باشند (به جز completed که می‌تواند terminate/void شود)."""
    truly_terminal = TERMINAL_STATES - {
        ContractLifecycleStateV5.COMPLETED.value  # completed → terminate/void مجاز است
    }
    for state in truly_terminal:
        allowed = sm.allowed_events(state)
        assert allowed == [], f"State {state!r} should be terminal but has events: {allowed}"


def test_disputable_states_include_key_states() -> None:
    """بررسی اینکه حالت‌های قابل اختلاف شامل مراحل کلیدی می‌شوند."""
    assert S.UNDER_REVIEW.value in _DISPUTABLE_STATES
    assert S.WAITING_PAYMENT.value in _DISPUTABLE_STATES
    assert S.IN_PROGRESS.value in _DISPUTABLE_STATES
    # حالت‌های terminal نباید در disputable_states باشند
    assert S.REJECTED.value not in _DISPUTABLE_STATES
    assert S.CANCELLED.value not in _DISPUTABLE_STATES


def test_get_state_machine_v5_singleton() -> None:
    """بررسی singleton بودن ماشین حالت."""
    sm1 = get_state_machine_v5()
    sm2 = get_state_machine_v5()
    assert sm1 is sm2


def test_payment_partial_retry(sm: ContractStateMachineV5) -> None:
    """payment_partial → retry → waiting_payment."""
    nxt = _skip(sm, S.PAYMENT_PARTIAL.value, "retry_payment")
    assert nxt == S.WAITING_PAYMENT.value


def test_draft_cancel(sm: ContractStateMachineV5) -> None:
    """draft → cancelled."""
    nxt = _skip(sm, S.DRAFT.value, "cancel")
    assert nxt == S.CANCELLED.value


def test_transition_payload_updates_lifecycle_state(sm: ContractStateMachineV5) -> None:
    """transition_payload باید lifecycle_state را به‌روز کند."""
    payload = {"id": "123", "lifecycle_state": "draft", "extra": "data"}
    result = sm.transition_payload(payload, "save_step", skip_guards=True)
    assert result["lifecycle_state"] == "in_progress"
    assert result["id"] == "123"
    assert result["extra"] == "data"
