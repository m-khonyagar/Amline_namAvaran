"""Transition Guards — شرط‌های پیشنیاز برای انتقال‌های ماشین حالت v5.0.

هر guard یک تابع است که یک dict از context می‌گیرد و True/False برمی‌گرداند.
اگر شرط برقرار نباشد، استثنای GuardError پرتاب می‌شود.

Guards موجود:
- party_verified          — طرف احراز هویت شده است
- all_required_signed     — تمام امضاهای الزامی کامل شده
- payment_received        — پرداخت دریافت شده
- reviewer_authorized     — کارشناس مجاز است
- sla_not_exceeded        — SLA منقضی نشده (مقدار True یعنی باید منقضی شده باشد تا انتقال اتفاق بیفتد)
"""

from __future__ import annotations

from typing import Any, Callable


# ---------------------------------------------------------------------------
# Error classes
# ---------------------------------------------------------------------------


class TransitionError(ValueError):
    """خطای انتقال نامعتبر."""

    def __init__(
        self,
        *,
        code: str,
        message: str,
        current_state: str,
        event: str,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.current_state = current_state
        self.event = event

    def __repr__(self) -> str:
        return (
            f"TransitionError(code={self.code!r}, "
            f"current_state={self.current_state!r}, event={self.event!r})"
        )


class GuardError(ValueError):
    """خطای شرط پیشنیاز."""

    def __init__(
        self,
        *,
        code: str,
        message: str,
        guard_name: str,
        current_state: str,
        event: str,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.guard_name = guard_name
        self.current_state = current_state
        self.event = event

    def __repr__(self) -> str:
        return (
            f"GuardError(code={self.code!r}, guard={self.guard_name!r}, "
            f"current_state={self.current_state!r}, event={self.event!r})"
        )


class SLAExceededError(GuardError):
    """خطای انقضای SLA."""

    def __init__(self, *, current_state: str, event: str) -> None:
        super().__init__(
            code="SLA_EXCEEDED",
            message="مهلت SLA منقضی شده است",
            guard_name="sla_not_exceeded",
            current_state=current_state,
            event=event,
        )


class UnauthorizedTransitionError(GuardError):
    """خطای دسترسی غیرمجاز."""

    def __init__(self, *, current_state: str, event: str) -> None:
        super().__init__(
            code="UNAUTHORIZED_TRANSITION",
            message="کاربر مجاز به این انتقال نیست",
            guard_name="reviewer_authorized",
            current_state=current_state,
            event=event,
        )


# ---------------------------------------------------------------------------
# Error code registry (کدهای خطا)
# ---------------------------------------------------------------------------

ERROR_CODES: dict[str, str] = {
    "INVALID_TRANSITION": "انتقال نامعتبر — ترکیب state/event در جدول انتقال وجود ندارد",
    "GUARD_PRECONDITION_FAILED": "شرط پیشنیاز برقرار نیست",
    "SLA_EXCEEDED": "مهلت SLA منقضی شده است",
    "UNAUTHORIZED_TRANSITION": "کاربر مجاز به این انتقال نیست",
}


# ---------------------------------------------------------------------------
# Guard functions
# ---------------------------------------------------------------------------

GuardFn = Callable[[dict[str, Any]], bool]


def _guard_party_verified(ctx: dict[str, Any]) -> bool:
    """طرف احراز هویت شده است."""
    return bool(ctx.get("party_verified", False))


def _guard_all_required_signed(ctx: dict[str, Any]) -> bool:
    """تمام امضاهای الزامی کامل شده."""
    return bool(ctx.get("all_required_signed", False))


def _guard_payment_received(ctx: dict[str, Any]) -> bool:
    """پرداخت دریافت شده."""
    return bool(ctx.get("payment_received", False))


def _guard_reviewer_authorized(ctx: dict[str, Any]) -> bool:
    """کارشناس مجاز است."""
    return bool(ctx.get("reviewer_authorized", False))


def _guard_sla_not_exceeded(ctx: dict[str, Any]) -> bool:
    """SLA باید منقضی شده باشد تا این رویداد اجازه اجرا داشته باشد.

    این guard برای رویدادهای مرتبط با انقضای SLA استفاده می‌شود
    (مثلاً sla_counterparty_expired) و زمانی True برمی‌گرداند که
    واقعاً SLA رد شده باشد (یعنی ctx["sla_exceeded"] == True).
    """
    return bool(ctx.get("sla_exceeded", False))


# ---------------------------------------------------------------------------
# Guard registry
# ---------------------------------------------------------------------------

GUARD_REGISTRY: dict[str, GuardFn] = {
    "party_verified": _guard_party_verified,
    "all_required_signed": _guard_all_required_signed,
    "payment_received": _guard_payment_received,
    "reviewer_authorized": _guard_reviewer_authorized,
    "sla_not_exceeded": _guard_sla_not_exceeded,
}
