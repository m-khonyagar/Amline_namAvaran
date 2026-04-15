"""Tests for contract state machine v5.0 and transition guards.

Covers lifecycle transitions, guard enforcement, error cases,
audit logging, and edge cases.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Optional

import pytest

from backend.backend.app.domain.contracts.ssot import ContractLifecycleStatus
from backend.backend.app.domain.contracts.state_machine_v5 import (
    AuditEntry,
    ContractStateMachine,
    StateMachineError,
)
from backend.backend.app.domain.contracts.transition_guards import (
    AdminPrivilegeGuard,
    AllRequiredSignedGuard,
    AllSharesPaidGuard,
    PartyVerifiedGuard,
    ReviewerAuthorizedGuard,
    SLANotExceededGuard,
    TransitionGuard,
    run_guards,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

@dataclass
class FakeParty:
    id: str = "party-1"
    kyc_verified: bool = True
    signature_status: str = "SIGNED"
    signature_expires_at: Optional[datetime] = None


class _AlwaysPassGuard(TransitionGuard):
    def check(self):
        return True, None


class _AlwaysFailGuard(TransitionGuard):
    def check(self):
        return False, "always fails"


# ===========================================================================
# Transition Guards
# ===========================================================================


class TestPartyVerifiedGuard:
    def test_passes_when_all_verified(self):
        parties = [FakeParty(kyc_verified=True), FakeParty(id="p2", kyc_verified=True)]
        ok, reason = PartyVerifiedGuard(parties).check()
        assert ok is True
        assert reason is None

    def test_fails_when_unverified(self):
        parties = [FakeParty(kyc_verified=True), FakeParty(id="p2", kyc_verified=False)]
        ok, reason = PartyVerifiedGuard(parties).check()
        assert ok is False
        assert "p2" in reason

    def test_fails_on_empty_list(self):
        ok, reason = PartyVerifiedGuard([]).check()
        assert ok is False

    def test_rejects_none(self):
        with pytest.raises(ValueError):
            PartyVerifiedGuard(None)


class TestAllRequiredSignedGuard:
    def test_passes_when_all_signed(self):
        parties = [FakeParty(signature_status="SIGNED")]
        ok, _ = AllRequiredSignedGuard(parties).check()
        assert ok is True

    def test_fails_when_not_signed(self):
        parties = [FakeParty(signature_status="PENDING")]
        ok, reason = AllRequiredSignedGuard(parties).check()
        assert ok is False
        assert "PENDING" in reason

    def test_fails_when_expired(self):
        expired = datetime.now(timezone.utc) - timedelta(hours=1)
        parties = [FakeParty(signature_status="SIGNED", signature_expires_at=expired)]
        ok, reason = AllRequiredSignedGuard(parties).check()
        assert ok is False
        assert "expired" in reason

    def test_rejects_none(self):
        with pytest.raises(ValueError):
            AllRequiredSignedGuard(None)


class TestAllSharesPaidGuard:
    def test_passes_when_fully_paid(self):
        ok, _ = AllSharesPaidGuard(total_due=1000, total_paid=1000).check()
        assert ok is True

    def test_passes_when_overpaid(self):
        ok, _ = AllSharesPaidGuard(total_due=1000, total_paid=1500).check()
        assert ok is True

    def test_fails_on_underpayment(self):
        ok, reason = AllSharesPaidGuard(total_due=1000, total_paid=500).check()
        assert ok is False
        assert "500" in reason

    def test_zero_due_always_passes(self):
        ok, _ = AllSharesPaidGuard(total_due=0, total_paid=0).check()
        assert ok is True


class TestReviewerAuthorizedGuard:
    def test_admin_allowed(self):
        ok, _ = ReviewerAuthorizedGuard("admin").check()
        assert ok is True

    def test_legal_expert_allowed(self):
        ok, _ = ReviewerAuthorizedGuard("legal_expert").check()
        assert ok is True

    def test_random_role_blocked(self):
        ok, reason = ReviewerAuthorizedGuard("intern").check()
        assert ok is False
        assert "intern" in reason

    def test_none_role_blocked(self):
        ok, _ = ReviewerAuthorizedGuard(None).check()
        assert ok is False


class TestAdminPrivilegeGuard:
    def test_passes_with_admin(self):
        ok, _ = AdminPrivilegeGuard(["admin", "user"]).check()
        assert ok is True

    def test_fails_without_admin(self):
        ok, reason = AdminPrivilegeGuard(["user", "viewer"]).check()
        assert ok is False
        assert "admin" in reason

    def test_empty_roles(self):
        ok, _ = AdminPrivilegeGuard([]).check()
        assert ok is False


class TestSLANotExceededGuard:
    def test_within_sla(self):
        created = datetime.now(timezone.utc) - timedelta(days=5)
        ok, _ = SLANotExceededGuard(created, max_days=30).check()
        assert ok is True

    def test_exceeded_sla(self):
        created = datetime.now(timezone.utc) - timedelta(days=45)
        ok, reason = SLANotExceededGuard(created, max_days=30).check()
        assert ok is False
        assert "exceeded" in reason.lower()

    def test_no_creation_date(self):
        ok, reason = SLANotExceededGuard(None).check()
        assert ok is False
        assert "timestamp" in reason.lower()


class TestRunGuards:
    def test_all_pass(self):
        ok, reason = run_guards([_AlwaysPassGuard(), _AlwaysPassGuard()])
        assert ok is True
        assert reason is None

    def test_short_circuits_on_failure(self):
        ok, reason = run_guards([_AlwaysPassGuard(), _AlwaysFailGuard(), _AlwaysPassGuard()])
        assert ok is False
        assert reason == "always fails"

    def test_empty_guards(self):
        ok, _ = run_guards([])
        assert ok is True


# ===========================================================================
# Contract State Machine
# ===========================================================================


class TestContractStateMachine:
    def test_initial_state(self):
        sm = ContractStateMachine()
        assert sm.current_status == "DRAFT"
        assert sm.is_terminal is False

    def test_invalid_initial_status(self):
        with pytest.raises(StateMachineError, match="Invalid"):
            ContractStateMachine("NONEXISTENT")

    def test_basic_transition(self):
        sm = ContractStateMachine()
        entry = sm.transition("IN_PROGRESS", actor_id="user-1")
        assert sm.current_status == "IN_PROGRESS"
        assert entry.from_status == "DRAFT"
        assert entry.to_status == "IN_PROGRESS"
        assert entry.actor_id == "user-1"

    def test_full_happy_path(self):
        sm = ContractStateMachine()
        sm.transition("IN_PROGRESS")
        sm.transition("PENDING_SIGNATURES")
        sm.transition("EXECUTED")
        sm.transition("COMPLETED")
        assert sm.current_status == "COMPLETED"
        assert sm.is_terminal is True
        assert len(sm.audit_log) == 4

    def test_terminal_blocks_further_transitions(self):
        sm = ContractStateMachine()
        sm.transition("CANCELLED")
        assert sm.is_terminal is True
        with pytest.raises(StateMachineError, match="terminal"):
            sm.transition("DRAFT")

    def test_illegal_transition_blocked(self):
        sm = ContractStateMachine()
        with pytest.raises(StateMachineError, match="not allowed"):
            sm.transition("COMPLETED")

    def test_self_transition_allowed(self):
        sm = ContractStateMachine()
        ok, _ = sm.can_transition_to("DRAFT")
        assert ok is True

    def test_revoke_from_any_non_terminal(self):
        for status in ("DRAFT", "IN_PROGRESS", "PENDING_SIGNATURES", "EXECUTED"):
            sm = ContractStateMachine(status)
            sm.transition("REVOKED")
            assert sm.current_status == "REVOKED"

    def test_cancel_from_early_stages(self):
        for status in ("DRAFT", "IN_PROGRESS", "PENDING_SIGNATURES"):
            sm = ContractStateMachine(status)
            sm.transition("CANCELLED")
            assert sm.current_status == "CANCELLED"

    def test_guards_block_transition(self):
        sm = ContractStateMachine(
            guards_by_target={"IN_PROGRESS": [_AlwaysFailGuard()]}
        )
        ok, reason = sm.can_transition_to("IN_PROGRESS")
        assert ok is False
        assert reason == "always fails"

        with pytest.raises(StateMachineError, match="always fails"):
            sm.transition("IN_PROGRESS")

    def test_guards_allow_transition(self):
        sm = ContractStateMachine(
            guards_by_target={"IN_PROGRESS": [_AlwaysPassGuard()]}
        )
        sm.transition("IN_PROGRESS")
        assert sm.current_status == "IN_PROGRESS"

    def test_register_guards_after_construction(self):
        sm = ContractStateMachine()
        sm.register_guards("IN_PROGRESS", [_AlwaysFailGuard()])
        ok, _ = sm.can_transition_to("IN_PROGRESS")
        assert ok is False

    def test_audit_log_preserved(self):
        sm = ContractStateMachine()
        sm.transition("IN_PROGRESS", actor_id="a", metadata={"reason": "test"})
        sm.transition("PENDING_SIGNATURES", actor_id="b")

        log = sm.audit_log
        assert len(log) == 2
        assert log[0].from_status == "DRAFT"
        assert log[0].metadata["reason"] == "test"
        assert log[1].actor_id == "b"

    def test_sla_tracker_populated(self):
        sm = ContractStateMachine()
        sm.transition("IN_PROGRESS")
        assert "DRAFT" in sm.sla_tracker
        assert "IN_PROGRESS" in sm.sla_tracker

    def test_unknown_target_rejected(self):
        sm = ContractStateMachine()
        ok, reason = sm.can_transition_to("BOGUS")
        assert ok is False
        assert "Unknown" in reason

    def test_guards_with_real_party_verified(self):
        parties = [FakeParty(kyc_verified=True)]
        sm = ContractStateMachine(
            guards_by_target={
                "IN_PROGRESS": [PartyVerifiedGuard(parties)],
            }
        )
        sm.transition("IN_PROGRESS")
        assert sm.current_status == "IN_PROGRESS"

    def test_guards_with_failing_party_verified(self):
        parties = [FakeParty(kyc_verified=False)]
        sm = ContractStateMachine(
            guards_by_target={
                "IN_PROGRESS": [PartyVerifiedGuard(parties)],
            }
        )
        with pytest.raises(StateMachineError, match="KYC"):
            sm.transition("IN_PROGRESS")


class TestAuditEntry:
    def test_to_dict(self):
        entry = AuditEntry(
            from_status="DRAFT",
            to_status="IN_PROGRESS",
            actor_id="user-1",
            metadata={"reason": "test"},
        )
        d = entry.to_dict()
        assert d["from"] == "DRAFT"
        assert d["to"] == "IN_PROGRESS"
        assert d["actor"] == "user-1"
        assert d["reason"] == "test"
        assert "ts" in d
