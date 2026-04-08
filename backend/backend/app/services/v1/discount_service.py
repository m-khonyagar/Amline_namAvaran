"""تخفیف قرارداد/کمیسیون — اسکلت قابل گسترش (اعتبارسنجی + اعمال)."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass
class DiscountResult:
    ok: bool
    code: str | None
    amount_off_cents: int
    message: str | None = None


class DiscountService:
    """فعلاً rule درون‌حافظه؛ بعداً اتصال به DB یا سرویس billing."""

    def validate_discount(
        self, code: str, *, user_id: str | None = None
    ) -> DiscountResult:
        c = (code or "").strip().upper()
        if not c:
            return DiscountResult(False, None, 0, message="empty_code")
        if c == "AML10":
            return DiscountResult(True, c, 0, message="percent_10_stub")
        return DiscountResult(False, c, 0, message="invalid_code")

    def apply_discount(
        self,
        base_amount_cents: int,
        code: str,
        *,
        user_id: str | None = None,
    ) -> tuple[int, dict[str, Any]]:
        vr = self.validate_discount(code, user_id=user_id)
        if not vr.ok:
            return base_amount_cents, {"applied": False, "reason": vr.message}
        # نمونه: ۱۰٪ تخفیف برای AML10
        if vr.code == "AML10":
            off = int(base_amount_cents * 0.10)
            net = max(0, base_amount_cents - off)
            return net, {"applied": True, "code": vr.code, "off_cents": off}
        return base_amount_cents, {"applied": False}

    def get_usage(self, code: str, user_id: str) -> dict[str, Any]:
        return {"code": code, "user_id": user_id, "used_count": 0}


_svc: DiscountService | None = None


def get_discount_service() -> DiscountService:
    global _svc
    if _svc is None:
        _svc = DiscountService()
    return _svc
