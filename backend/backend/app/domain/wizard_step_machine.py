"""
Wizard step graph — mirrors admin-ui `STEP_ORDER` / clone PR contract ordering.

Validates forward transitions so clients cannot skip stages or jump backwards.
Inspired by legacy PRContractStepManager (subset: linear wizard + sale bridge).
"""
from __future__ import annotations

from typing import Iterable, Tuple

PROPERTY_RENT = "PROPERTY_RENT"
BUYING_AND_SELLING = "BUYING_AND_SELLING"

# (from_step, to_step, contract_types)
_EDGES: Tuple[Tuple[str, str, frozenset[str]], ...] = (
    ("LANDLORD_INFORMATION", "TENANT_INFORMATION", frozenset({PROPERTY_RENT, BUYING_AND_SELLING})),
    ("TENANT_INFORMATION", "PLACE_INFORMATION", frozenset({PROPERTY_RENT, BUYING_AND_SELLING})),
    ("PLACE_INFORMATION", "DATING", frozenset({PROPERTY_RENT, BUYING_AND_SELLING})),
    ("DATING", "MORTGAGE", frozenset({PROPERTY_RENT, BUYING_AND_SELLING})),
    ("MORTGAGE", "RENTING", frozenset({PROPERTY_RENT})),
    ("MORTGAGE", "SIGNING", frozenset({BUYING_AND_SELLING})),
    ("MORTGAGE", "RENTING", frozenset({BUYING_AND_SELLING})),
    ("RENTING", "SIGNING", frozenset({PROPERTY_RENT, BUYING_AND_SELLING})),
    ("SIGNING", "WITNESS", frozenset({PROPERTY_RENT, BUYING_AND_SELLING})),
    ("WITNESS", "FINISH", frozenset({PROPERTY_RENT, BUYING_AND_SELLING})),
    ("WITNESS", "WITNESS", frozenset({PROPERTY_RENT, BUYING_AND_SELLING})),
)


def is_valid_transition(current_step: str, next_step: str, contract_type: str) -> bool:
    if current_step == next_step == "WITNESS":
        return True
    for a, b, types in _EDGES:
        if current_step == a and next_step == b and contract_type in types:
            return True
    return False


class InvalidStepTransitionError(ValueError):
    """Raised when client requests an illegal wizard step change."""

    def __init__(self, current_step: str, next_step: str, contract_type: str) -> None:
        self.current_step = current_step
        self.next_step = next_step
        self.contract_type = contract_type
        super().__init__("invalid_step_transition")


def assert_valid_transition(current_step: str, next_step: str, contract_type: str) -> None:
    if not is_valid_transition(current_step, next_step, contract_type):
        raise InvalidStepTransitionError(current_step, next_step, contract_type)


def mortgage_default_next(contract_type: str) -> str:
    return "SIGNING" if contract_type == BUYING_AND_SELLING else "RENTING"


def iter_allowed_next(current_step: str, contract_type: str) -> Iterable[str]:
    for a, b, types in _EDGES:
        if a == current_step and contract_type in types:
            yield b
