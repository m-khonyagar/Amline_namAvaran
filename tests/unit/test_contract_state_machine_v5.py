"""
Unit Tests برای Contract State Machine v5.0
۱۵ سناریو آزمون
"""

from __future__ import annotations

import sys
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest

# ---------------------------------------------------------------------------
# Path setup — allow importing backend modules without installing the package
# ---------------------------------------------------------------------------
_BACKEND_ROOT = Path(__file__).resolve().parents[2] / "backend" / "backend"
if str(_BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(_BACKEND_ROOT))

from app.domain.contracts.state_machine_v5 import (
    ContractLifecycleStateV5,
    ContractStateMachineV5,
    Transition,
    get_contract_state_machine_v5,
)
from app.domain.contracts.transition_guards import (
    AdminPrivilegeGuard,
    AllPartiesVerifiedGuard,
    AllRequiredSignedGuard,
    AllSharesPaidGuard,
    PartyVerifiedGuard,
    ReviewerAuthorizedGuard,
    SLANotExceededGuard,
    check_guards,
)

S = ContractLifecycleStateV5


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _sm() -> ContractStateMachineV5:
    return ContractStateMachineV5()


def _future(days: int = 5) -> datetime:
    return datetime.now(tz=timezone.utc) + timedelta(days=days)


def _past(days: int = 1) -> datetime:
    return datetime.now(tz=timezone.utc) - timedelta(days=days)


# ===========================================================================
# Scenario 1 — Happy path: Draft → Complete
# ===========================================================================

def test_scenario_1_happy_path_draft_to_completed() -> None:
    """کامل‌ترین مسیر موفق از DRAFT تا COMPLETED."""
    sm = _sm()

    ctx_party = {"party_verified": True, "party_id": "p-1"}
    ctx_signed = {"required_signatures_count": 2, "completed_signatures_count": 2}
    ctx_paid = {"total_required": 1_000_000, "total_paid": 1_000_000}
    ctx_reviewer = {"user_role": "reviewer"}

    path = [
        (S.DRAFT.value, "save_step", {}),
        (S.IN_PROGRESS.value, "send_invites", {}),
        (S.AWAITING_COUNTERPARTY.value, "counterparty_accepts", ctx_party),
        (S.WAITING_SIGNATURES.value, "first_party_signs", {}),
        (S.PARTIALLY_SIGNED.value, "all_parties_signed", ctx_signed),
        (S.WAITING_PAYMENT.value, "payment_received", {}),
        (S.PAYMENT_PARTIAL.value, "all_shares_paid", ctx_paid),
        (S.UNDER_REVIEW.value, "reviewer_approves", ctx_reviewer),
        (S.APPROVED.value, "finalize", {}),
        (S.READY_FOR_TRACKING_CODE.value, "tracking_code_issued", {}),
    ]

    current = S.DRAFT.value
    for from_state, event, ctx in path:
        assert current == from_state, f"Expected {from_state}, got {current}"
        can, err = sm.can_transition(current, event, ctx)
        assert can, f"Transition blocked at {from_state} + {event}: {err}"
        current = sm.transition(current, event, ctx)

    assert current == S.COMPLETED.value


# ===========================================================================
# Scenario 2 — Counterparty rejection
# ===========================================================================

def test_scenario_2_counterparty_rejection() -> None:
    """طرف مقابل دعوت را رد می‌کند → REJECTED."""
    sm = _sm()
    can, _ = sm.can_transition(S.AWAITING_COUNTERPARTY.value, "counterparty_rejects")
    assert can
    result = sm.transition(S.AWAITING_COUNTERPARTY.value, "counterparty_rejects")
    assert result == S.REJECTED.value
    assert sm.is_terminal(result)


# ===========================================================================
# Scenario 3 — SLA expiration on awaiting counterparty
# ===========================================================================

def test_scenario_3_sla_expiration_awaiting_counterparty() -> None:
    """SLA دعوت‌نامه منقضی می‌شود → EXPIRED."""
    sm = _sm()
    result = sm.transition(S.AWAITING_COUNTERPARTY.value, "sla_expired")
    assert result == S.EXPIRED.value
    assert sm.is_terminal(result)


# ===========================================================================
# Scenario 4 — SLA expiration during signing
# ===========================================================================

def test_scenario_4_sla_expiration_during_signing() -> None:
    """SLA امضا منقضی می‌شود → EXPIRED."""
    sm = _sm()
    for state in (S.WAITING_SIGNATURES.value, S.PARTIALLY_SIGNED.value):
        result = sm.transition(state, "sla_expired")
        assert result == S.EXPIRED.value


# ===========================================================================
# Scenario 5 — Partial signatures (guard blocks premature advance)
# ===========================================================================

def test_scenario_5_partial_signatures_guard_blocks() -> None:
    """AllRequiredSignedGuard رد می‌شود وقتی امضاها ناقص است."""
    sm = _sm()
    incomplete_ctx = {"required_signatures_count": 2, "completed_signatures_count": 1}
    can, reason = sm.can_transition(
        S.PARTIALLY_SIGNED.value, "all_parties_signed", incomplete_ctx
    )
    assert not can
    assert "all_required_signed" in (reason or "")


# ===========================================================================
# Scenario 6 — Partial payments (guard blocks advance to review)
# ===========================================================================

def test_scenario_6_partial_payments_guard_blocks() -> None:
    """AllSharesPaidGuard رد می‌شود وقتی پرداخت ناقص است."""
    sm = _sm()
    partial_ctx = {"total_required": 1_000_000, "total_paid": 500_000}
    can, reason = sm.can_transition(
        S.PAYMENT_PARTIAL.value, "all_shares_paid", partial_ctx
    )
    assert not can
    assert "all_shares_paid" in (reason or "")


# ===========================================================================
# Scenario 7 — Review workflow: correction loop
# ===========================================================================

def test_scenario_7_review_correction_loop() -> None:
    """کارشناس اصلاح درخواست می‌دهد، طرفین اصلاح می‌کنند، و دوباره تأیید می‌شود."""
    sm = _sm()
    reviewer_ctx = {"user_role": "reviewer"}
    parties_ctx = {
        "parties": [{"verified": True}, {"verified": True}],
    }

    # Under review → needs correction
    result = sm.transition(S.UNDER_REVIEW.value, "request_correction", reviewer_ctx)
    assert result == S.NEEDS_CORRECTION.value

    # Correction submitted → back to under review
    result = sm.transition(S.NEEDS_CORRECTION.value, "correction_submitted", parties_ctx)
    assert result == S.UNDER_REVIEW.value

    # Now approved
    result = sm.transition(S.UNDER_REVIEW.value, "reviewer_approves", reviewer_ctx)
    assert result == S.APPROVED.value


# ===========================================================================
# Scenario 8 — Dispute handling
# ===========================================================================

def test_scenario_8_dispute_resolution_refund() -> None:
    """اختلاف → جبران خسارت → خاتمه."""
    sm = _sm()
    admin_ctx = {"user_role": "admin", "sla_deadline": _future(30)}

    result = sm.transition(S.COMPLETED.value, "dispute_raised", admin_ctx)
    assert result == S.DISPUTED.value

    result = sm.transition(S.DISPUTED.value, "resolution_refund", admin_ctx)
    assert result == S.COMPENSATING.value

    result = sm.transition(S.COMPENSATING.value, "ledger_reversed")
    assert result == S.TERMINATED.value
    assert sm.is_terminal(result)


def test_scenario_8b_dispute_resolution_dismissed() -> None:
    """اختلاف → رد اعتراض → بازگشت به تکمیل."""
    sm = _sm()
    admin_ctx = {"user_role": "admin", "sla_deadline": _future(10)}

    sm.transition(S.COMPLETED.value, "dispute_raised", admin_ctx)
    result = sm.transition(S.DISPUTED.value, "resolution_dismiss", admin_ctx)
    assert result == S.COMPLETED.value


# ===========================================================================
# Scenario 9 — Termination via void
# ===========================================================================

def test_scenario_9_void_draft() -> None:
    """ادمین پیش‌نویس را ابطال می‌کند → VOIDED."""
    sm = _sm()
    admin_ctx = {"user_role": "admin"}
    result = sm.transition(S.DRAFT.value, "void", admin_ctx)
    assert result == S.VOIDED.value
    assert sm.is_terminal(result)


# ===========================================================================
# Scenario 10 — Guard failure: non-reviewer tries to approve
# ===========================================================================

def test_scenario_10_guard_failure_non_reviewer() -> None:
    """کاربر عادی نمی‌تواند قرارداد را تأیید کند."""
    sm = _sm()
    user_ctx = {"user_role": "user"}
    can, reason = sm.can_transition(S.UNDER_REVIEW.value, "reviewer_approves", user_ctx)
    assert not can
    assert "reviewer_authorized" in (reason or "")


# ===========================================================================
# Scenario 11 — Guard failure: unverified party tries to accept
# ===========================================================================

def test_scenario_11_guard_failure_unverified_party() -> None:
    """طرف تأییدنشده نمی‌تواند دعوت را بپذیرد."""
    sm = _sm()
    ctx = {"party_verified": False, "party_id": "p-1"}
    can, reason = sm.can_transition(
        S.AWAITING_COUNTERPARTY.value, "counterparty_accepts", ctx
    )
    assert not can
    assert "party_verified" in (reason or "")


# ===========================================================================
# Scenario 12 — SLA deadline tracking via Transition.get_deadline()
# ===========================================================================

def test_scenario_12_sla_deadline_tracking() -> None:
    """Transition با sla_days باید deadline آینده برگرداند."""
    sm = _sm()
    t = sm.get_transition(S.IN_PROGRESS.value, "send_invites")
    assert t is not None
    assert t.sla_days == 7
    deadline = t.get_deadline()
    assert deadline is not None
    diff = deadline - datetime.now(tz=timezone.utc)
    assert timedelta(days=6) < diff < timedelta(days=8)


def test_scenario_12b_no_sla_returns_none() -> None:
    """Transition بدون SLA باید None برگرداند."""
    sm = _sm()
    t = sm.get_transition(S.DRAFT.value, "save_step")
    assert t is not None
    assert t.get_deadline() is None


# ===========================================================================
# Scenario 13 — Escalation workflow
# ===========================================================================

def test_scenario_13_escalation_and_admin_approval() -> None:
    """کارشناس ارجاع می‌دهد → ادمین تأیید می‌کند."""
    sm = _sm()
    reviewer_ctx = {"user_role": "reviewer"}
    admin_ctx = {"user_role": "admin"}

    result = sm.transition(S.UNDER_REVIEW.value, "escalate", reviewer_ctx)
    assert result == S.ESCALATED.value

    result = sm.transition(S.ESCALATED.value, "admin_approves", admin_ctx)
    assert result == S.APPROVED.value


def test_scenario_13b_escalation_and_admin_cancel() -> None:
    """ادمین قرارداد ارجاع‌داده‌شده را لغو می‌کند."""
    sm = _sm()
    reviewer_ctx = {"user_role": "reviewer"}
    admin_ctx = {"user_role": "admin"}

    sm.transition(S.UNDER_REVIEW.value, "escalate", reviewer_ctx)
    result = sm.transition(S.ESCALATED.value, "admin_cancels", admin_ctx)
    assert result == S.CANCELLED.value
    assert sm.is_terminal(result)


# ===========================================================================
# Scenario 14 — Invalid transition raises ValueError
# ===========================================================================

def test_scenario_14_invalid_transition_raises() -> None:
    """transition() باید برای event نامعتبر ValueError بدهد."""
    sm = _sm()
    with pytest.raises(ValueError, match="Invalid transition"):
        sm.transition(S.COMPLETED.value, "save_step")


# ===========================================================================
# Scenario 15 — SLA not-exceeded guard
# ===========================================================================

def test_scenario_15_sla_guard_passes_with_future_deadline() -> None:
    """SLANotExceededGuard با deadline آینده pass می‌شود."""
    guard = SLANotExceededGuard()
    assert guard.check({"sla_deadline": _future(5)})


def test_scenario_15b_sla_guard_fails_with_past_deadline() -> None:
    """SLANotExceededGuard با deadline گذشته رد می‌شود."""
    guard = SLANotExceededGuard()
    assert not guard.check({"sla_deadline": _past(1)})


def test_scenario_15c_sla_guard_passes_when_no_deadline() -> None:
    """SLANotExceededGuard بدون deadline همیشه pass می‌شود."""
    guard = SLANotExceededGuard()
    assert guard.check({})


# ===========================================================================
# Additional unit-level guard tests
# ===========================================================================

def test_guard_all_parties_verified_requires_min_two() -> None:
    """AllPartiesVerifiedGuard نیاز به حداقل ۲ طرف دارد."""
    guard = AllPartiesVerifiedGuard()
    assert not guard.check({"parties": [{"verified": True}]})
    assert guard.check({"parties": [{"verified": True}, {"verified": True}]})
    assert not guard.check({"parties": [{"verified": True}, {"verified": False}]})


def test_guard_all_shares_paid_boundary() -> None:
    """AllSharesPaidGuard حداقل ۹۹٪ پرداخت نیاز دارد."""
    guard = AllSharesPaidGuard()
    assert guard.check({"total_required": 100, "total_paid": 99})
    assert guard.check({"total_required": 100, "total_paid": 100})
    assert not guard.check({"total_required": 100, "total_paid": 98})
    assert not guard.check({"total_required": 0, "total_paid": 0})


def test_guard_admin_privilege() -> None:
    """AdminPrivilegeGuard فقط admin/superadmin را قبول می‌کند."""
    guard = AdminPrivilegeGuard()
    assert guard.check({"user_role": "admin"})
    assert guard.check({"user_role": "superadmin"})
    assert not guard.check({"user_role": "reviewer"})
    assert not guard.check({"user_role": "user"})


def test_check_guards_utility() -> None:
    """check_guards با guards ترکیبی کار می‌کند."""
    guards = [PartyVerifiedGuard(), ReviewerAuthorizedGuard()]

    all_pass, failed = check_guards(
        guards, {"party_verified": True, "party_id": "x", "user_role": "reviewer"}
    )
    assert all_pass
    assert failed is None

    all_pass, failed = check_guards(
        guards, {"party_verified": True, "party_id": "x", "user_role": "user"}
    )
    assert not all_pass
    assert failed == "reviewer_authorized"


def test_state_machine_count() -> None:
    """State machine باید دقیقاً ۲۰ state و ۲۵ transition داشته باشد."""
    assert len(ContractLifecycleStateV5) == 20
    sm = _sm()
    assert len(sm.transitions) == 25


def test_singleton_returns_same_instance() -> None:
    """get_contract_state_machine_v5 همیشه یک instance برمی‌گرداند."""
    a = get_contract_state_machine_v5()
    b = get_contract_state_machine_v5()
    assert a is b


def test_transition_get_guard_info() -> None:
    """get_guard_info باید لیست صحیح را برگرداند."""
    sm = _sm()
    t = sm.get_transition(S.UNDER_REVIEW.value, "reviewer_approves")
    assert t is not None
    info = t.get_guard_info()
    assert len(info) == 1
    assert info[0]["name"] == "reviewer_authorized"


def test_allowed_events_draft() -> None:
    """allowed_events برای DRAFT باید save_step و void را برگرداند."""
    sm = _sm()
    events = set(sm.allowed_events(S.DRAFT.value))
    assert {"save_step", "void"} == events
