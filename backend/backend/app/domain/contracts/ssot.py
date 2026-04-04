"""Amline contract SSOT catalog (aligned with Product Master Specification v2.0 naming).

In-repo execution SSOT: ``docs/AMLINE_MASTER_SPEC.md``. This module is the backend
single source for allowed ``contract_type`` values, canonical kinds, and flow labels
(S1–S5, P1–P4, T1) carried on in-memory wizard contracts until a full DB model lands.
"""

from __future__ import annotations

from enum import Enum
from typing import Any, Dict, FrozenSet, List, Tuple

from app.core.errors import AmlineError


class ContractKind(str, Enum):
    """Canonical contract kinds (SSOT v2.0)."""

    RENT = "RENT"
    SALE = "SALE"
    EXCHANGE = "EXCHANGE"
    CONSTRUCTION = "CONSTRUCTION"
    PRE_SALE = "PRE_SALE"
    LEASE_TO_OWN = "LEASE_TO_OWN"


# Signature / payment / combined flows — identifiers for UI + audit (full automation TBD)
SIGNATURE_FLOW_STAGES: Tuple[str, ...] = ("S1", "S2", "S3", "S4", "S5")
PAYMENT_FLOW_STAGES: Tuple[str, ...] = ("P1", "P2", "P3", "P4")
COMBINED_FLOW_T1 = "T1"

# Legacy / API aliases → canonical kind
_ALIAS_TO_KIND: Dict[str, ContractKind] = {
    "PROPERTY_RENT": ContractKind.RENT,
    "RENT": ContractKind.RENT,
    "BUYING_AND_SELLING": ContractKind.SALE,
    "PROPERTY_SALE": ContractKind.SALE,
    "SALE": ContractKind.SALE,
    "EXCHANGE": ContractKind.EXCHANGE,
    "PROPERTY_EXCHANGE": ContractKind.EXCHANGE,
    "CONSTRUCTION": ContractKind.CONSTRUCTION,
    "PRE_SALE": ContractKind.PRE_SALE,
    "PRESALE": ContractKind.PRE_SALE,
    "LEASE_TO_OWN": ContractKind.LEASE_TO_OWN,
    "LEASE2OWN": ContractKind.LEASE_TO_OWN,
}

_CANONICAL_VALUES: FrozenSet[str] = frozenset(k.value for k in ContractKind)


def normalize_contract_kind(contract_type: str | None) -> ContractKind:
    """Resolve client ``contract_type`` string to :class:`ContractKind`."""
    raw = (contract_type or "PROPERTY_RENT").strip().upper()
    if raw in _CANONICAL_VALUES:
        return ContractKind(raw)
    if raw in _ALIAS_TO_KIND:
        return _ALIAS_TO_KIND[raw]
    raise AmlineError(
        "CONTRACT_TYPE_UNKNOWN",
        "نوع قرارداد ناشناخته است.",
        status_code=422,
        details={
            "contract_type": contract_type,
            "allowed": sorted(_canonical_and_alias_strings()),
        },
    )


def _canonical_and_alias_strings() -> List[str]:
    seen = set(_CANONICAL_VALUES)
    out = list(_CANONICAL_VALUES)
    for a in _ALIAS_TO_KIND:
        if a not in seen:
            seen.add(a)
            out.append(a)
    return sorted(out)


def uses_renting_stage(kind: ContractKind) -> bool:
    """Whether the wizard includes the RENTING step after MORTGAGE (SSOT profile)."""
    return kind in (ContractKind.RENT, ContractKind.LEASE_TO_OWN)


def default_ssot_meta(kind: ContractKind) -> Dict[str, Any]:
    """Initial SSOT payload stored on each new in-memory contract."""
    return {
        "ssot_kind": kind.value,
        "ssot_version": "v2.0",
        "signature_flow": {
            "stages": list(SIGNATURE_FLOW_STAGES),
            "completed": [],
            "current": None,
        },
        "payment_flow": {
            "stages": list(PAYMENT_FLOW_STAGES),
            "completed": [],
            "current": None,
        },
        "combined_flow_t1": {"id": COMBINED_FLOW_T1, "active": False},
        "terms": {"by_kind": kind.value, "payload": {}},
        "commission": {
            "model": "platform_default_stub",
            "note": "Replace with SSOT commission engine + ledger postings",
        },
    }


def contract_catalog() -> Dict[str, Any]:
    """Public catalog for ``GET /contracts/ssot/catalog``."""
    return {
        "ssot": "Amline Complete Product Master Specification v2.0",
        "in_repo_docs": [
            "docs/AMLINE_MASTER_SPEC.md",
            "docs/ARCHITECTURE_CONTRACT_PLATFORM_PRODUCTION.md",
        ],
        "contract_kinds": [k.value for k in ContractKind],
        "aliases": {k: v.value for k, v in sorted(_ALIAS_TO_KIND.items())},
        "signature_flow_stages": list(SIGNATURE_FLOW_STAGES),
        "payment_flow_stages": list(PAYMENT_FLOW_STAGES),
        "combined_flow": COMBINED_FLOW_T1,
        "party_person_types": ["NATURAL_PERSON", "LEGAL_PERSON"],
        "uses_renting_stage_by_kind": {k.value: uses_renting_stage(k) for k in ContractKind},
    }
