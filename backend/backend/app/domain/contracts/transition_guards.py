"""Reusable guard predicates for contract state transitions."""

from __future__ import annotations

from typing import Any, Callable

GuardContext = dict[str, Any]
GuardFn = Callable[[GuardContext], bool]


def can_invite_parties(context: GuardContext) -> bool:
    return bool(context.get("parties"))


def all_parties_verified(context: GuardContext) -> bool:
    return bool(context.get("all_parties_verified"))


def all_signatures_valid(context: GuardContext) -> bool:
    if "all_signatures_valid" in context:
        return bool(context.get("all_signatures_valid"))
    signature_count = int(context.get("signature_count", 0))
    required_signatures = int(context.get("required_signatures", 1))
    return signature_count >= required_signatures


def payment_amount_valid(context: GuardContext) -> bool:
    return float(context.get("payment_amount", 0) or 0) > 0


def reviewer_authorized(context: GuardContext) -> bool:
    return str(context.get("reviewer_role", "")).lower() in {"legal", "admin"}


def admin_privilege(context: GuardContext) -> bool:
    return str(context.get("user_role", "")).lower() == "admin"


def tracking_code_present(context: GuardContext) -> bool:
    if context.get("tracking_code"):
        return True
    external_refs = context.get("external_refs")
    if isinstance(external_refs, dict):
        return bool(external_refs.get("tracking_code"))
    return False


GUARDS: dict[str, GuardFn] = {
    "can_invite_parties": can_invite_parties,
    "all_parties_verified": all_parties_verified,
    "all_signatures_valid": all_signatures_valid,
    "payment_amount_valid": payment_amount_valid,
    "reviewer_authorized": reviewer_authorized,
    "admin_privilege": admin_privilege,
    "tracking_code_present": tracking_code_present,
}


def evaluate_guard(name: str, context: GuardContext) -> bool:
    guard = GUARDS.get(name)
    if guard is None:
        raise KeyError(f"Unknown guard: {name}")
    return guard(context)
