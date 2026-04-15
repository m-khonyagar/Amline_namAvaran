"""Transition guards for the contract state machine v5.0.

Each guard implements a ``check()`` method that returns ``(allowed, reason)``
where *reason* is ``None`` when the guard passes or a human-readable
explanation when it blocks the transition.

Guards are composable via :func:`run_guards` which short-circuits on the
first failure.
"""

from __future__ import annotations

import logging
from abc import ABC, abstractmethod
from datetime import datetime, timedelta, timezone
from typing import Any, Optional, Sequence

log = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Base
# ---------------------------------------------------------------------------

class TransitionGuard(ABC):
    """Abstract base for all contract transition guards."""

    @abstractmethod
    def check(self) -> tuple[bool, Optional[str]]:
        """Return ``(True, None)`` if guard passes, ``(False, reason)`` otherwise."""


# ---------------------------------------------------------------------------
# Concrete guards
# ---------------------------------------------------------------------------

class PartyVerifiedGuard(TransitionGuard):
    """All contract parties must have completed identity verification (KYC)."""

    def __init__(self, parties: Sequence[Any]) -> None:
        if parties is None:
            raise ValueError("parties must not be None")
        self.parties = parties

    def check(self) -> tuple[bool, Optional[str]]:
        if not self.parties:
            return False, "No parties to verify"
        for party in self.parties:
            kyc = getattr(party, "kyc_verified", False)
            if not kyc:
                party_id = getattr(party, "id", "unknown")
                return False, f"Party {party_id} has not completed KYC verification"
        return True, None


class AllRequiredSignedGuard(TransitionGuard):
    """Every required party must have a valid, non-expired signature."""

    def __init__(self, parties: Sequence[Any], *, now: datetime | None = None) -> None:
        if parties is None:
            raise ValueError("parties must not be None")
        self.parties = parties
        self._now = now or datetime.now(timezone.utc)

    def check(self) -> tuple[bool, Optional[str]]:
        if not self.parties:
            return False, "No parties to sign"
        for party in self.parties:
            sig_status = getattr(party, "signature_status", None)
            if sig_status != "SIGNED":
                party_id = getattr(party, "id", "unknown")
                return False, f"Party {party_id} has not signed (status={sig_status})"
            sig_expires = getattr(party, "signature_expires_at", None)
            if sig_expires is not None and sig_expires < self._now:
                party_id = getattr(party, "id", "unknown")
                return False, f"Party {party_id} signature has expired"
        return True, None


class AllSharesPaidGuard(TransitionGuard):
    """Total payments must cover the total amount due on the contract."""

    def __init__(self, total_due: float, total_paid: float) -> None:
        self.total_due = total_due
        self.total_paid = total_paid

    def check(self) -> tuple[bool, Optional[str]]:
        if self.total_due <= 0:
            return True, None
        if self.total_paid < self.total_due:
            gap = self.total_due - self.total_paid
            return False, f"Unpaid balance remaining: {gap:,.0f}"
        return True, None


class ReviewerAuthorizedGuard(TransitionGuard):
    """The actor performing the review must hold an authorised role."""

    ALLOWED_ROLES = frozenset({"admin", "legal_expert", "senior_reviewer"})

    def __init__(self, actor_role: str | None) -> None:
        self.actor_role = (actor_role or "").strip().lower()

    def check(self) -> tuple[bool, Optional[str]]:
        if self.actor_role not in self.ALLOWED_ROLES:
            return False, (
                f"Role '{self.actor_role}' is not authorised to review; "
                f"allowed: {', '.join(sorted(self.ALLOWED_ROLES))}"
            )
        return True, None


class AdminPrivilegeGuard(TransitionGuard):
    """The actor must have administrative privileges."""

    def __init__(self, actor_roles: Sequence[str] | None, *, required: str = "admin") -> None:
        self.actor_roles = [r.strip().lower() for r in (actor_roles or [])]
        self.required = required.strip().lower()

    def check(self) -> tuple[bool, Optional[str]]:
        if self.required not in self.actor_roles:
            return False, f"Actor lacks required '{self.required}' role"
        return True, None


class SLANotExceededGuard(TransitionGuard):
    """Contract must not have exceeded its SLA deadline."""

    def __init__(
        self,
        created_at: datetime | None,
        max_days: int = 30,
        *,
        now: datetime | None = None,
    ) -> None:
        self.created_at = created_at
        self.max_days = max_days
        self._now = now or datetime.now(timezone.utc)

    def check(self) -> tuple[bool, Optional[str]]:
        if self.created_at is None:
            return False, "Contract has no creation timestamp"
        age = self._now - self.created_at
        if age > timedelta(days=self.max_days):
            return False, f"SLA exceeded: {age.days} days > {self.max_days} day limit"
        return True, None


# ---------------------------------------------------------------------------
# Composition helper
# ---------------------------------------------------------------------------

def run_guards(guards: Sequence[TransitionGuard]) -> tuple[bool, Optional[str]]:
    """Run *guards* in order; short-circuit on the first failure."""
    for guard in guards:
        ok, reason = guard.check()
        if not ok:
            log.debug("Guard %s blocked: %s", type(guard).__name__, reason)
            return False, reason
    return True, None