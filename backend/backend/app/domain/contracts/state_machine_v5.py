"""Compatibility exports for the richer v5 contract state machine."""

from __future__ import annotations

from app.services.v1.contract_state_machine import (
    ContractLifecycleState as ContractState,
    ContractStateMachine as ContractStateMachineV5,
    TERMINAL_STATES,
    TRANSITIONS,
    Transition,
    TransitionResult,
    get_contract_state_machine,
)


def get_state_machine_v5() -> ContractStateMachineV5:
    return get_contract_state_machine()
