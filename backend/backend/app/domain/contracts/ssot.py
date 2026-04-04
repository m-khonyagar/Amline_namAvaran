"""SSOT v2.0 contract foundation — kinds, lifecycle, party roles (§3.1–3.2).

Used by in-memory contract flow today; ORM models can mirror these strings.
"""

from __future__ import annotations

from enum import Enum
from typing import AbstractSet, FrozenSet, Mapping, Optional

# --- Canonical contract kinds (product / sweep.yaml) ---


class ContractKind(str, Enum):
    RENT = "RENT"
    SALE = "SALE"
    EXCHANGE = "EXCHANGE"
    CONSTRUCTION = "CONSTRUCTION"
    PRE_SALE = "PRE_SALE"
    LEASE_TO_OWN = "LEASE_TO_OWN"


# Legacy / API type strings → SSOT kind
_TYPE_TO_KIND: dict[str, str] = {
    "PROPERTY_RENT": ContractKind.RENT.value,
    "RENT": ContractKind.RENT.value,
    "BUYING_AND_SELLING": ContractKind.SALE.value,
    "SALE": ContractKind.SALE.value,
    "EXCHANGE": ContractKind.EXCHANGE.value,
    "CONSTRUCTION": ContractKind.CONSTRUCTION.value,
    "PRE_SALE": ContractKind.PRE_SALE.value,
    "LEASE_TO_OWN": ContractKind.LEASE_TO_OWN.value,
}


def normalize_ssot_kind(contract_type: Optional[str]) -> str:
    raw = (contract_type or "PROPERTY_RENT").strip().upper()
    return _TYPE_TO_KIND.get(raw, raw if raw in {k.value for k in ContractKind} else ContractKind.RENT.value)


# --- Lifecycle (§3.1) ---


class ContractLifecycleStatus(str, Enum):
    DRAFT = "DRAFT"
    IN_PROGRESS = "IN_PROGRESS"
    PENDING_SIGNATURES = "PENDING_SIGNATURES"
    EXECUTED = "EXECUTED"
    COMPLETED = "COMPLETED"
    REVOKED = "REVOKED"
    CANCELLED = "CANCELLED"


class ContractProductStatusV2(str, Enum):
    """نمای محصول طبق Amline_Complete_Master_Spec_v2 §۳.۱ — نگاشت در STATUS_MAPPING_v2."""

    DRAFT = "DRAFT"
    AWAITING_SIGNATURES = "AWAITING_SIGNATURES"
    SIGNED = "SIGNED"
    REVIEWED_BY_EXPERT = "REVIEWED_BY_EXPERT"
    FINALIZED = "FINALIZED"
    TERMINATED = "TERMINATED"


def lifecycle_status_to_product_v2(
    storage_status: str,
    *,
    substate: Optional[str] = None,
) -> str:
    """Storage/SSOT → برچسب v2 برای API و فرانت."""
    s = (storage_status or "").strip().upper()
    sub = (substate or "").strip().lower() if substate else ""
    if s in (ContractLifecycleStatus.REVOKED.value, ContractLifecycleStatus.CANCELLED.value):
        return ContractProductStatusV2.TERMINATED.value
    if s == ContractLifecycleStatus.COMPLETED.value:
        return ContractProductStatusV2.FINALIZED.value
    if s == ContractLifecycleStatus.EXECUTED.value:
        if sub in ("legal_approved", "reviewed_by_expert", "expert_ok"):
            return ContractProductStatusV2.REVIEWED_BY_EXPERT.value
        return ContractProductStatusV2.SIGNED.value
    if s == ContractLifecycleStatus.PENDING_SIGNATURES.value:
        return ContractProductStatusV2.AWAITING_SIGNATURES.value
    return ContractProductStatusV2.DRAFT.value


_TERMINAL: FrozenSet[str] = frozenset(
    {
        ContractLifecycleStatus.COMPLETED.value,
        ContractLifecycleStatus.REVOKED.value,
        ContractLifecycleStatus.CANCELLED.value,
    }
)

# Directed edges: from -> allowed targets
_TRANSITIONS: dict[str, AbstractSet[str]] = {
    ContractLifecycleStatus.DRAFT.value: frozenset(
        {
            ContractLifecycleStatus.IN_PROGRESS.value,
            ContractLifecycleStatus.PENDING_SIGNATURES.value,
            ContractLifecycleStatus.REVOKED.value,
            ContractLifecycleStatus.CANCELLED.value,
        }
    ),
    ContractLifecycleStatus.IN_PROGRESS.value: frozenset(
        {
            ContractLifecycleStatus.PENDING_SIGNATURES.value,
            ContractLifecycleStatus.REVOKED.value,
            ContractLifecycleStatus.CANCELLED.value,
        }
    ),
    ContractLifecycleStatus.PENDING_SIGNATURES.value: frozenset(
        {
            ContractLifecycleStatus.EXECUTED.value,
            ContractLifecycleStatus.REVOKED.value,
            ContractLifecycleStatus.CANCELLED.value,
        }
    ),
    ContractLifecycleStatus.EXECUTED.value: frozenset(
        {
            ContractLifecycleStatus.COMPLETED.value,
            ContractLifecycleStatus.REVOKED.value,
        }
    ),
    ContractLifecycleStatus.COMPLETED.value: frozenset(),
    ContractLifecycleStatus.REVOKED.value: frozenset(),
    ContractLifecycleStatus.CANCELLED.value: frozenset(),
}


def can_transition(from_status: str, to_status: str) -> bool:
    if from_status == to_status:
        return True
    allowed = _TRANSITIONS.get(from_status)
    if allowed is None:
        return False
    return to_status in allowed


def assert_transition_ok(from_status: str, to_status: str) -> None:
    from app.core.errors import AmlineError

    if can_transition(from_status, to_status):
        return
    raise AmlineError(
        "CONTRACT_STATUS_TRANSITION_INVALID",
        "انتقال وضعیت قرارداد مجاز نیست.",
        status_code=409,
        details={"from": from_status, "to": to_status},
    )


# --- Party roles by kind (§3.2) — SSOT role names ---

_KIND_PARTY_ROLES: dict[str, FrozenSet[str]] = {
    ContractKind.RENT.value: frozenset({"LANDLORD", "TENANT"}),
    ContractKind.SALE.value: frozenset({"SELLER", "BUYER"}),
    ContractKind.EXCHANGE.value: frozenset(
        {
            "EXCHANGER_FIRST",
            "EXCHANGER_SECOND",
            "EXCHANGER_A",
            "EXCHANGER_B",
            "EXCHANGER_PRIMARY",
            "EXCHANGER_COUNTER",
        }
    ),
    ContractKind.CONSTRUCTION.value: frozenset({"LAND_OWNER", "CONTRACTOR"}),
    ContractKind.PRE_SALE.value: frozenset({"DEVELOPER", "BUYER"}),
    ContractKind.LEASE_TO_OWN.value: frozenset({"LESSOR", "LESSEE"}),
}

# Legacy New-Flow buckets → default SSOT role
_BUCKET_DEFAULT_ROLE: dict[str, str] = {
    "landlords": "LANDLORD",
    "tenants": "TENANT",
    "sellers": "SELLER",
    "buyers": "BUYER",
}


def allowed_party_roles_for_kind(kind: str) -> FrozenSet[str]:
    return _KIND_PARTY_ROLES.get(kind, frozenset())


def is_party_role_allowed_for_kind(kind: str, role: str) -> bool:
    r = (role or "").strip().upper()
    return r in allowed_party_roles_for_kind(kind)


def default_ssot_role_for_bucket(bucket: str) -> Optional[str]:
    return _BUCKET_DEFAULT_ROLE.get(bucket)


DEFAULT_EXTERNAL_REFS: dict[str, Optional[str]] = {
    "khodnevis_id": None,
    "katib_id": None,
    "tracking_code": None,
}


def merge_external_refs(
    current: Optional[Mapping[str, Optional[str]]],
    patch: Optional[Mapping[str, Optional[str]]],
) -> dict[str, Optional[str]]:
    base = dict(DEFAULT_EXTERNAL_REFS)
    if current:
        for k in base:
            if k in current:
                base[k] = current[k]
    if patch:
        for k in base:
            if k in patch:
                base[k] = patch[k]
    return base


def is_terminal_status(status: str) -> bool:
    return status in _TERMINAL
