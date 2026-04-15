"""
Transition Guards برای State Machine v5.0
Guard conditions برای بررسی شرایط پیشنیاز هر transition
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from datetime import datetime, timezone
from typing import Any, Optional


class TransitionGuardBase(ABC):
    """Base class برای تمام guards"""

    @abstractmethod
    def check(self, context: dict[str, Any]) -> bool:
        """بررسی شرط"""

    @abstractmethod
    def get_name(self) -> str:
        """نام guard"""

    @abstractmethod
    def get_description(self) -> str:
        """توضیح guard"""


# ---------------------------------------------------------------------------
# Party Verification Guards
# ---------------------------------------------------------------------------


class PartyVerifiedGuard(TransitionGuardBase):
    """طرف احراز هویت شده است"""

    def check(self, context: dict[str, Any]) -> bool:
        return context.get("party_verified", False) and bool(context.get("party_id"))

    def get_name(self) -> str:
        return "party_verified"

    def get_description(self) -> str:
        return "طرف احراز هویت شده است"


class AllPartiesVerifiedGuard(TransitionGuardBase):
    """تمام طرفین احراز هویت شده‌اند"""

    def check(self, context: dict[str, Any]) -> bool:
        parties: list[dict[str, Any]] = context.get("parties", [])
        if not parties or len(parties) < 2:
            return False
        return all(party.get("verified") for party in parties)

    def get_name(self) -> str:
        return "all_parties_verified"

    def get_description(self) -> str:
        return "تمام طرفین احراز هویت شده‌اند"


# ---------------------------------------------------------------------------
# Signature Guards
# ---------------------------------------------------------------------------


class AllRequiredSignedGuard(TransitionGuardBase):
    """تمام امضاهای الزامی کامل شده"""

    def check(self, context: dict[str, Any]) -> bool:
        required: int = context.get("required_signatures_count", 0)
        completed: int = context.get("completed_signatures_count", 0)
        return required > 0 and completed >= required

    def get_name(self) -> str:
        return "all_required_signed"

    def get_description(self) -> str:
        return "تمام امضاهای الزامی کامل شده"


# ---------------------------------------------------------------------------
# Payment Guards
# ---------------------------------------------------------------------------


class AllSharesPaidGuard(TransitionGuardBase):
    """تمام سهم‌ها پرداخت شده"""

    def check(self, context: dict[str, Any]) -> bool:
        total_required: float = context.get("total_required", 0)
        total_paid: float = context.get("total_paid", 0)
        if total_required == 0:
            return False
        percentage = (total_paid / total_required) * 100
        return percentage >= 99.0

    def get_name(self) -> str:
        return "all_shares_paid"

    def get_description(self) -> str:
        return "تمام سهم‌ها پرداخت شده"


# ---------------------------------------------------------------------------
# Review Guards
# ---------------------------------------------------------------------------


class ReviewerAuthorizedGuard(TransitionGuardBase):
    """کارشناس مجاز است"""

    def check(self, context: dict[str, Any]) -> bool:
        user_role: str = context.get("user_role", "")
        return user_role in {"reviewer", "senior_reviewer", "admin", "superadmin"}

    def get_name(self) -> str:
        return "reviewer_authorized"

    def get_description(self) -> str:
        return "کارشناس مجاز است"


# ---------------------------------------------------------------------------
# SLA Guards
# ---------------------------------------------------------------------------


class SLANotExceededGuard(TransitionGuardBase):
    """SLA منقضی نشده"""

    def check(self, context: dict[str, Any]) -> bool:
        deadline = context.get("sla_deadline")
        if not deadline:
            return True
        if isinstance(deadline, str):
            deadline = datetime.fromisoformat(deadline)
        # Normalise to aware datetimes for comparison
        now = datetime.now(tz=timezone.utc)
        if deadline.tzinfo is None:
            deadline = deadline.replace(tzinfo=timezone.utc)
        return now < deadline

    def get_name(self) -> str:
        return "sla_not_exceeded"

    def get_description(self) -> str:
        return "SLA منقضی نشده"


# ---------------------------------------------------------------------------
# Admin Guards
# ---------------------------------------------------------------------------


class AdminPrivilegeGuard(TransitionGuardBase):
    """دسترسی ادمین"""

    def check(self, context: dict[str, Any]) -> bool:
        user_role: str = context.get("user_role", "")
        return user_role in {"admin", "superadmin"}

    def get_name(self) -> str:
        return "admin_privilege"

    def get_description(self) -> str:
        return "دسترسی ادمین"


# ---------------------------------------------------------------------------
# Utility helpers
# ---------------------------------------------------------------------------


def check_guards(
    guards: list[TransitionGuardBase],
    context: dict[str, Any],
) -> tuple[bool, Optional[str]]:
    """بررسی تمام guards به ترتیب.

    Returns:
        ``(all_passed, first_failed_guard_name)``
    """
    for guard in guards:
        if not guard.check(context):
            return False, guard.get_name()
    return True, None
