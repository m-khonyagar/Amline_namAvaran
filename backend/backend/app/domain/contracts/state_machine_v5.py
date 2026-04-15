"""Contract State Machine v5.0 — guard-aware lifecycle management.

Integrates with :mod:`app.domain.contracts.ssot` for canonical state
definitions and transition rules, and with :mod:`.transition_guards`
for pre-condition enforcement.

Usage::

    sm = ContractStateMachine(current_status="DRAFT")
    ok, reason = sm.can_transition_to("IN_PROGRESS")
    if ok:
        sm.transition("IN_PROGRESS", actor_id="user-42")
"""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Optional, Sequence

from backend.backend.app.domain.contracts.ssot import (
    ContractLifecycleStatus,
    can_transition,
    is_terminal_status,
)
from backend.backend.app.domain.contracts.transition_guards import (
    TransitionGuard,
    run_guards,
)

log = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Audit log entry
# ---------------------------------------------------------------------------

@dataclass
class AuditEntry:
    """Immutable record of a single state transition."""

    from_status: str
    to_status: str
    actor_id: Optional[str]
    timestamp: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    metadata: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {
            "from": self.from_status,
            "to": self.to_status,
            "actor": self.actor_id,
            "ts": self.timestamp.isoformat(),
            **self.metadata,
        }


# ---------------------------------------------------------------------------
# Errors
# ---------------------------------------------------------------------------

class StateMachineError(Exception):
    """Raised when a state-machine operation is invalid."""

    def __init__(self, message: str, *, from_status: str = "", to_status: str = "") -> None:
        self.from_status = from_status
        self.to_status = to_status
        super().__init__(message)


# ---------------------------------------------------------------------------
# State machine
# ---------------------------------------------------------------------------

_VALID_STATUSES = frozenset(s.value for s in ContractLifecycleStatus)


class ContractStateMachine:
    """Manages contract lifecycle transitions with guard enforcement.

    Parameters
    ----------
    current_status:
        Current :class:`ContractLifecycleStatus` value (string).
    guards_by_target:
        Optional mapping of ``target_status → list[TransitionGuard]``
        evaluated before a transition is allowed.
    """

    def __init__(
        self,
        current_status: str = ContractLifecycleStatus.DRAFT.value,
        *,
        guards_by_target: dict[str, Sequence[TransitionGuard]] | None = None,
    ) -> None:
        if current_status not in _VALID_STATUSES:
            raise StateMachineError(
                f"Invalid initial status: {current_status}",
                from_status=current_status,
            )
        self._status = current_status
        self._guards: dict[str, Sequence[TransitionGuard]] = dict(guards_by_target or {})
        self._audit: list[AuditEntry] = []
        self._sla_tracker: dict[str, float] = {current_status: time.monotonic()}

    # -- read-only properties ------------------------------------------------

    @property
    def current_status(self) -> str:
        return self._status

    @property
    def is_terminal(self) -> bool:
        return is_terminal_status(self._status)

    @property
    def audit_log(self) -> list[AuditEntry]:
        return list(self._audit)

    @property
    def sla_tracker(self) -> dict[str, float]:
        return dict(self._sla_tracker)

    # -- transition logic ----------------------------------------------------

    def can_transition_to(self, target: str) -> tuple[bool, Optional[str]]:
        """Check whether transitioning to *target* is allowed.

        Returns ``(True, None)`` when allowed or ``(False, reason)``
        when blocked by topology or a guard.
        """
        if target not in _VALID_STATUSES:
            return False, f"Unknown target status: {target}"

        if self.is_terminal:
            return False, f"Current status '{self._status}' is terminal — no transitions allowed"

        if not can_transition(self._status, target):
            return False, (
                f"Transition from '{self._status}' to '{target}' "
                "is not allowed by the lifecycle graph"
            )

        # Run guards registered for the target state
        guards = self._guards.get(target, [])
        if guards:
            return run_guards(guards)

        return True, None

    def transition(
        self,
        target: str,
        *,
        actor_id: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> AuditEntry:
        """Execute the transition to *target*.

        Raises :class:`StateMachineError` if the transition is not
        allowed (topology or guard failure).

        Returns the :class:`AuditEntry` for the transition.
        """
        ok, reason = self.can_transition_to(target)
        if not ok:
            raise StateMachineError(
                reason or "Transition blocked",
                from_status=self._status,
                to_status=target,
            )

        previous = self._status
        self._status = target

        entry = AuditEntry(
            from_status=previous,
            to_status=target,
            actor_id=actor_id,
            metadata=metadata or {},
        )
        self._audit.append(entry)
        self._sla_tracker[target] = time.monotonic()

        log.info(
            "ContractStateMachine: %s → %s (actor=%s)",
            previous,
            target,
            actor_id,
        )
        return entry

    def register_guards(self, target: str, guards: Sequence[TransitionGuard]) -> None:
        """Register (or replace) guards for transitions into *target*."""
        self._guards[target] = list(guards)