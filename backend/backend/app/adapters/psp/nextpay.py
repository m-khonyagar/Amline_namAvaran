"""NextPay HTTP gateway: token + verify (amount in Tomans per gateway docs)."""

from __future__ import annotations

import json
import os
from typing import TYPE_CHECKING, Optional
from urllib.parse import urlencode

import httpx

from app.adapters.psp.types import PspVerifyResult
from app.core.errors import AmlineError

if TYPE_CHECKING:
    from app.models.payment import PaymentIntent
    from app.repositories.v1.p1_repositories import PaymentRepository


def _token_url() -> str:
    return os.getenv(
        "NEXTPAY_TOKEN_HTTP_URL",
        "https://api.nextpay.org/gateway/token.http",
    ).rstrip("/")


def _verify_url() -> str:
    return os.getenv(
        "NEXTPAY_VERIFY_HTTP_URL",
        "https://api.nextpay.org/gateway/verify.http",
    ).rstrip("/")


def _payment_page_base() -> str:
    return os.getenv(
        "NEXTPAY_PAYMENT_PAGE_BASE",
        "https://nextpay.org/nx/gateway/payment",
    ).rstrip("/")


def _amount_tomans(amount_rials: int) -> int:
    """NextPay expects integer Tomans (ریال → تومان)."""
    t = max(1, int(amount_rials) // 10)
    min_t = int(os.getenv("NEXTPAY_MIN_AMOUNT_TOMANS", "100") or "100")
    return max(min_t, t)


class NextPayPspAdapter:
    provider_key = "nextpay"

    def resume_checkout_url(self, intent: PaymentIntent) -> Optional[str]:
        if intent.psp_checkout_token:
            return f"{_payment_page_base()}/{intent.psp_checkout_token}"
        return None

    def initiate_checkout(
        self,
        repo: PaymentRepository,
        intent: PaymentIntent,
        callback_url: str,
    ) -> str:
        existing = self.resume_checkout_url(intent)
        if existing and intent.psp_provider == self.provider_key:
            return existing
        api_key = os.getenv("NEXTPAY_API_KEY", "").strip()
        if not api_key:
            raise AmlineError(
                "PSP_CONFIG_MISSING",
                "NEXTPAY_API_KEY تنظیم نشده است.",
                status_code=503,
            )
        amount_t = _amount_tomans(intent.amount_cents)
        form = {
            "api_key": api_key,
            "amount": str(amount_t),
            "order_id": intent.id,
            "callback_uri": callback_url,
        }
        headers = {
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": "Amline-PSP/1.0",
        }
        try:
            r = httpx.post(
                _token_url(),
                content=urlencode(form),
                headers=headers,
                timeout=30.0,
            )
            r.raise_for_status()
            data = r.json()
        except (httpx.HTTPError, ValueError, json.JSONDecodeError) as e:
            raise AmlineError(
                "PSP_REQUEST_FAILED",
                "درخواست نکست‌پی ناموفق بود.",
                status_code=502,
                details={"provider": "nextpay", "error": str(e)},
            ) from e
        code = data.get("code")
        trans_id = data.get("trans_id")
        if not _nextpay_token_ok(code) or not trans_id:
            raise AmlineError(
                "PSP_REQUEST_REJECTED",
                _nextpay_code_message(code),
                status_code=502,
                details={"response": data},
            )
        repo.set_psp_session(
            intent, provider=self.provider_key, checkout_token=str(trans_id)
        )
        return f"{_payment_page_base()}/{trans_id}"


def _nextpay_token_ok(code: object) -> bool:
    try:
        return int(code) == -1
    except (TypeError, ValueError):
        return str(code).strip() == "-1"


def _nextpay_code_message(code: object) -> str:
    try:
        c = int(code)
    except (TypeError, ValueError):
        return f"کد نکست‌پی: {code}"
    messages = {
        -1: "توکن با موفقیت ایجاد شد (در انتظار پرداخت).",
        0: "تراکنش موفق.",
        -2: "پرداخت ناموفق یا لغو شده.",
    }
    return messages.get(c, f"کد نکست‌پی: {c}")


def verify_nextpay_payment(
    trans_id: str,
    order_id: str,
    amount_rials: int,
) -> PspVerifyResult:
    api_key = os.getenv("NEXTPAY_API_KEY", "").strip()
    if not api_key:
        return PspVerifyResult(
            success=False,
            error_code="PSP_CONFIG_MISSING",
            error_message="NEXTPAY_API_KEY تنظیم نشده است.",
        )
    amount_t = _amount_tomans(amount_rials)
    form = {
        "api_key": api_key,
        "trans_id": trans_id,
        "order_id": order_id,
        "amount": str(amount_t),
    }
    headers = {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Amline-PSP/1.0",
    }
    try:
        r = httpx.post(
            _verify_url(),
            content=urlencode(form),
            headers=headers,
            timeout=30.0,
        )
        r.raise_for_status()
        data = r.json()
    except (httpx.HTTPError, ValueError, json.JSONDecodeError) as e:
        return PspVerifyResult(
            success=False,
            error_code="PSP_VERIFY_HTTP_ERROR",
            error_message=str(e),
        )
    raw = json.dumps(data, ensure_ascii=False)
    code = data.get("code")
    try:
        ic = int(code)
    except (TypeError, ValueError):
        ic = -999
    if ic == 0:
        return PspVerifyResult(
            success=True,
            psp_reference=str(trans_id),
            raw_payload=raw,
            provider_status=code,
        )
    return PspVerifyResult(
        success=False,
        raw_payload=raw,
        error_code=f"NEXTPAY_VERIFY_{code}",
        error_message=_nextpay_code_message(code),
        provider_status=code,
    )
