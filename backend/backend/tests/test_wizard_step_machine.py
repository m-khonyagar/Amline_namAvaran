"""Unit tests for wizard step graph (no DB / Redis)."""
from __future__ import annotations

import pytest

from app.domain.wizard_step_machine import (
    BUYING_AND_SELLING,
    PROPERTY_RENT,
    InvalidStepTransitionError,
    assert_valid_transition,
    is_valid_transition,
    mortgage_default_next,
)


def test_rent_happy_path_edges() -> None:
    assert is_valid_transition("LANDLORD_INFORMATION", "TENANT_INFORMATION", PROPERTY_RENT)
    assert is_valid_transition("MORTGAGE", "RENTING", PROPERTY_RENT)
    assert is_valid_transition("RENTING", "SIGNING", PROPERTY_RENT)


def test_sale_mortgage_to_signing_or_renting_bridge() -> None:
    assert is_valid_transition("MORTGAGE", "SIGNING", BUYING_AND_SELLING)
    assert is_valid_transition("MORTGAGE", "RENTING", BUYING_AND_SELLING)


def test_skip_tenant_rejected() -> None:
    assert not is_valid_transition("LANDLORD_INFORMATION", "SIGNING", PROPERTY_RENT)


def test_witness_self_loop() -> None:
    assert is_valid_transition("WITNESS", "WITNESS", PROPERTY_RENT)


def test_mortgage_default_next() -> None:
    assert mortgage_default_next(PROPERTY_RENT) == "RENTING"
    assert mortgage_default_next(BUYING_AND_SELLING) == "SIGNING"


def test_assert_valid_raises() -> None:
    with pytest.raises(InvalidStepTransitionError):
        assert_valid_transition("LANDLORD_INFORMATION", "FINISH", PROPERTY_RENT)
