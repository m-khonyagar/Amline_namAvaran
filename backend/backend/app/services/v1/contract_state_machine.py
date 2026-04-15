"""ماشین حالت قرارداد — نسخه v1 Service (wrapper برای v5.0).

این ماژول رابط سرویس v1 است که از پیاده‌سازی v5.0 استفاده می‌کند.
"""

from __future__ import annotations

from typing import Any

from app.domain.contracts.state_machine_v5 import (
    TERMINAL_STATES,
    ContractLifecycleStateV5,
    ContractStateMachineV5,
    get_state_machine_v5,
)
from app.domain.contracts.transition_guards import (
    ERROR_CODES,
    GUARD_REGISTRY,
    GuardError,
    SLAExceededError,
    TransitionError,
    UnauthorizedTransitionError,
)

__all__ = [
    "ContractLifecycleStateV5",
    "ContractStateMachineV5",
    "TransitionError",
    "GuardError",
    "SLAExceededError",
    "UnauthorizedTransitionError",
    "ERROR_CODES",
    "GUARD_REGISTRY",
    "TERMINAL_STATES",
    "get_state_machine_v5",
    "transition_contract_payload",
    "get_contract_state_machine",
]


def transition_contract_payload(
    payload: dict[str, Any],
    event: str,
    context: dict[str, Any] | None = None,
    *,
    skip_guards: bool = False,
) -> dict[str, Any]:
    """به‌روزرسانی فیلدهای lifecycle_state روی دیکشنری نمونه (بدون persist)."""
    sm = get_state_machine_v5()
    return sm.transition_payload(payload, event, context, skip_guards=skip_guards)


def get_contract_state_machine() -> ContractStateMachineV5:
    """دریافت نمونه singleton از ماشین حالت."""
    return get_state_machine_v5()
