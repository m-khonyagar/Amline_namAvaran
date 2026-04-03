"""Zarinpal REST: PaymentRequest + PaymentVerification (production)."""

from __future__ import annotations

import json
import os
from typing import TYPE_CHECKING, Optional

import httpx

from app.adapters.psp.types import PspVerifyResult
from app.core.errors import AmlineError

if TYPE_CHECKING:
    from app.models.payment import PaymentIntent
    from app.repositories.v1.p1_repositories import PaymentRepository


def _api_base() -> str:
    override = os.getenv("ZARINPAL_API_BASE", "").strip()
    if override:
        return override.rstrip("/")
    sandbox = os.getenv("ZARINPAL_SANDBOX", "1").lower() in ("1", "true", "yes")
    return "https://sandbox.zarinpal.com" if sandbox else "https://api.zarinpal.com"


def _web_base() -> str:
    woverride = os.getenv("ZARINPAL_WEB_BASE", "").strip()
    if woverride:
        return woverride.rstrip("/")
    sandbox = os.getenv("ZARINPAL_SANDBOX", "1").lower() in ("1", "true", "yes")
    return "https://sandbox.zarinpal.com" if sandbox else "https://www.zarinpal.com"


class ZarinpalPspAdapter:
    provider_key = "zarinpal"

    def resume_checkout_url(self, intent: PaymentIntent) -> Optional[str]:
        if intent.psp_checkout_token:
            return f"{_web_base()}/pg/StartPay/{intent.psp_checkout_token}"
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
        merchant = os.getenv("ZARINPAL_MERCHANT_ID", "").strip()
        if not merchant:
            raise AmlineError(
                "PSP_CONFIG_MISSING",
                "ZARINPAL_MERCHANT_ID تنظیم نشده است.",
                status_code=503,
            )
        desc = os.getenv("ZARINPAL_PAYMENT_DESCRIPTION", "شارژ کیف پول املاین")[:255]
        url = f"{_api_base()}/pg/rest/WebGate/PaymentRequest.json"
        payload = {
            "MerchantID": merchant,
            "Amount": int(intent.amount_cents),
            "CallbackURL": callback_url,
            "Description": desc,
        }
        try:
            r = httpx.post(url, json=payload, timeout=30.0)
            r.raise_for_status()
            data = r.json()
        except (httpx.HTTPError, ValueError, json.JSONDecodeError) as e:
            raise AmlineError(
                "PSP_REQUEST_FAILED",
                "درخواست زرین‌پال ناموفق بود.",
                status_code=502,
                details={"provider": "zarinpal", "error": str(e)},
            ) from e
        status = data.get("Status")
        if status != 100:
            raise AmlineError(
                "PSP_REQUEST_REJECTED",
                _zarinpal_status_message(status),
                status_code=502,
                details={"provider": "zarinpal", "status": status, "response": data},
            )
        authority = data.get("Authority")
        if not authority:
            raise AmlineError(
                "PSP_REQUEST_INVALID",
                "پاسخ زرین‌پال فاقد Authority است.",
                status_code=502,
                details={"response": data},
            )
        repo.set_psp_session(
            intent, provider=self.provider_key, checkout_token=str(authority)
        )
        return f"{_web_base()}/pg/StartPay/{authority}"


def _zarinpal_status_message(status: object) -> str:
    mapping = {
        -1: "اطلاعات ارسالی ناقص است.",
        -2: "IP یا مرچنت نامعتبر است.",
        -3: "با این مرچنت امکان پرداخت نیست.",
        -4: "سطح تأیید پایین‌تر از سطح نقره‌ای.",
        -11: "درخواست مورد نظر یافت نشد.",
        -12: "امکان ویرایش درخواست نیست.",
        -21: "هیچ نوع عملیات مالی برای این تراکنش یافت نشد.",
        -22: "تراکنش ناموفق بود.",
        -33: "مبلغ تراکنش با مبلغ پرداخت‌شده مطابقت ندارد.",
        101: "تراکنش قبلاً تأیید شده است.",
    }
    try:
        return mapping.get(int(status), f"وضعیت زرین‌پال: {status}")
    except (TypeError, ValueError):
        return f"وضعیت زرین‌پال: {status}"


def verify_zarinpal_payment(
    authority: str,
    amount_rials: int,
) -> PspVerifyResult:
    merchant = os.getenv("ZARINPAL_MERCHANT_ID", "").strip()
    if not merchant:
        return PspVerifyResult(
            success=False,
            error_code="PSP_CONFIG_MISSING",
            error_message="ZARINPAL_MERCHANT_ID تنظیم نشده است.",
        )
    url = f"{_api_base()}/pg/rest/WebGate/PaymentVerification.json"
    payload = {
        "MerchantID": merchant,
        "Authority": authority,
        "Amount": int(amount_rials),
    }
    try:
        r = httpx.post(url, json=payload, timeout=30.0)
        r.raise_for_status()
        data = r.json()
    except (httpx.HTTPError, ValueError, json.JSONDecodeError) as e:
        return PspVerifyResult(
            success=False,
            error_code="PSP_VERIFY_HTTP_ERROR",
            error_message=str(e),
        )
    status = data.get("Status")
    ref_id = data.get("RefID")
    raw = json.dumps(data, ensure_ascii=False)
    if status in (100, 101):
        ref_s = str(ref_id) if ref_id is not None else str(authority)
        return PspVerifyResult(
            success=True,
            psp_reference=ref_s,
            raw_payload=raw,
            provider_status=status,
        )
    return PspVerifyResult(
        success=False,
        raw_payload=raw,
        error_code=f"ZP_STATUS_{status}",
        error_message=_zarinpal_status_message(status),
        provider_status=status,
    )
