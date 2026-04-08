from __future__ import annotations

import os
from typing import Optional
from urllib.parse import urlencode

from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import HTMLResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.adapters.psp.callback_security import assert_psp_callback_ip_allowed
from app.adapters.psp.factory import get_psp_adapter, verify_psp_callback_params
from app.adapters.psp.idpay import verify_idpay_payment
from app.adapters.psp.nextpay import verify_nextpay_payment
from app.adapters.psp.types import PspVerifyResult
from app.adapters.psp.zarinpal import verify_zarinpal_payment
from app.core.errors import AmlineError
from app.core.rbac_deps import require_permission
from app.db.session import get_db
from app.models.payment import PaymentIntent, PaymentIntentStatus
from app.repositories.v1.p1_repositories import PaymentRepository
from app.schemas.v1.payments import (
    PaymentCallbackBody,
    PaymentIntentCreate,
    PaymentIntentDetailRead,
    PaymentIntentListResponse,
    PaymentIntentRead,
)
from app.services.v1.psp_payment_service import (
    apply_payment_gateway_result,
    safe_json_dumps,
)

router = APIRouter(prefix="/payments", tags=["payments"])


def _psp_guard(request: Request) -> None:
    secret = os.getenv("AMLINE_PSP_WEBHOOK_SECRET")
    if not secret:
        return
    if request.headers.get("X-PSP-Secret") != secret:
        raise AmlineError(
            "WEBHOOK_SIGNATURE_INVALID",
            "امضای وب‌هوک نامعتبر است.",
            status_code=403,
        )


def _public_base() -> str:
    return os.getenv("AMLINE_PUBLIC_API_BASE", "http://127.0.0.1:8080").rstrip("/")


def _intent_to_read(
    row: PaymentIntent, *, checkout: Optional[str] = None
) -> PaymentIntentRead:
    return PaymentIntentRead(
        id=row.id,
        user_id=row.user_id,
        amount_cents=row.amount_cents,
        currency=row.currency,
        idempotency_key=row.idempotency_key,
        status=row.status,
        psp_reference=row.psp_reference,
        psp_provider=row.psp_provider,
        checkout_url=checkout,
    )


def _intent_to_detail(row: PaymentIntent) -> PaymentIntentDetailRead:
    base = _intent_to_read(row, checkout=None)
    return PaymentIntentDetailRead(
        **base.model_dump(),
        psp_checkout_token=row.psp_checkout_token,
        last_verify_error=row.last_verify_error,
        verify_attempt_count=int(row.verify_attempt_count or 0),
        callback_payload=row.callback_payload,
        created_at=row.created_at.isoformat() if row.created_at else None,
        updated_at=row.updated_at.isoformat() if row.updated_at else None,
    )


def _callback_html(title: str, body: str, ok: bool) -> str:
    color = "#15803d" if ok else "#b91c1c"
    return f"""<!DOCTYPE html><html lang="fa" dir="rtl"><head><meta charset="utf-8"/>
<title>{title}</title></head><body style="font-family:tahoma,sans-serif;text-align:center;padding:2rem">
<h1 style="color:{color}">{title}</h1><p>{body}</p></body></html>"""


@router.post("/intents", response_model=PaymentIntentRead, status_code=201)
def create_payment_intent(
    body: PaymentIntentCreate,
    db: Session = Depends(get_db),
    _: None = Depends(require_permission("wallets:write")),
) -> PaymentIntentRead:
    pay = PaymentRepository(db)
    row = pay.create_intent(body)
    db.flush()
    psp = get_psp_adapter()
    checkout: Optional[str] = None
    if row.status == PaymentIntentStatus.PENDING:
        cb_url = f"{_public_base()}/api/v1/payments/callback/{psp.provider_key}"
        if row.psp_checkout_token and row.psp_provider == psp.provider_key:
            checkout = psp.resume_checkout_url(row)
        else:
            checkout = psp.initiate_checkout(pay, row, cb_url)
    db.commit()
    db.refresh(row)
    return _intent_to_read(row, checkout=checkout)


@router.get("/intents", response_model=PaymentIntentListResponse)
def list_payment_intents(
    skip: int = 0,
    limit: int = 50,
    status: Optional[PaymentIntentStatus] = None,
    user_id: Optional[str] = None,
    db: Session = Depends(get_db),
    _: None = Depends(require_permission("wallets:read")),
) -> PaymentIntentListResponse:
    pay = PaymentRepository(db)
    rows, total = pay.list_intents(
        skip=skip, limit=min(limit, 200), status=status, user_id=user_id
    )
    return PaymentIntentListResponse(
        total=total,
        items=[_intent_to_detail(r) for r in rows],
    )


@router.get("/intents/{intent_id}", response_model=PaymentIntentDetailRead)
def get_payment_intent(
    intent_id: str,
    db: Session = Depends(get_db),
    _: None = Depends(require_permission("wallets:read")),
) -> PaymentIntentDetailRead:
    pay = PaymentRepository(db)
    row = pay.get_intent(intent_id)
    if not row:
        raise AmlineError(
            "RESOURCE_NOT_FOUND",
            "پرداخت یافت نشد.",
            status_code=404,
            details={"entity": "payment_intent"},
        )
    return _intent_to_detail(row)


def _verify_by_provider(row: PaymentIntent) -> PspVerifyResult:
    prov = (row.psp_provider or "").lower()
    if prov == "zarinpal":
        return verify_zarinpal_payment(row.psp_checkout_token or "", row.amount_cents)
    if prov == "idpay":
        return verify_idpay_payment(row.psp_checkout_token or "", row.id)
    if prov == "nextpay":
        return verify_nextpay_payment(
            row.psp_checkout_token or "", row.id, row.amount_cents
        )
    return PspVerifyResult(
        success=False,
        error_code="PSP_UNKNOWN",
        error_message=f"تأیید برای provider={prov} پشتیبانی نمی‌شود.",
    )


@router.post(
    "/intents/{intent_id}/verify-retry", response_model=PaymentIntentDetailRead
)
def retry_payment_verification(
    intent_id: str,
    db: Session = Depends(get_db),
    _: None = Depends(require_permission("wallets:write")),
) -> PaymentIntentDetailRead:
    pay = PaymentRepository(db)
    row = pay.get_intent(intent_id)
    if not row:
        raise AmlineError(
            "RESOURCE_NOT_FOUND",
            "پرداخت یافت نشد.",
            status_code=404,
            details={"entity": "payment_intent"},
        )
    if row.status != PaymentIntentStatus.PENDING:
        raise AmlineError(
            "PSP_RETRY_NOT_PENDING",
            "فقط برای پرداخت در وضعیت انتظار قابل تلاش مجدد است.",
            status_code=409,
        )
    if not row.psp_checkout_token or not row.psp_provider:
        raise AmlineError(
            "PSP_RETRY_NO_SESSION",
            "نشست درگاه برای این intent ثبت نشده است.",
            status_code=409,
        )
    pay.bump_verify_attempt(row, None)
    db.flush()
    result = _verify_by_provider(row)
    if result.success:
        apply_payment_gateway_result(
            db,
            row,
            success=True,
            psp_reference=result.psp_reference,
            raw=result.raw_payload,
            audit_action="payment.verify_retry",
        )
    else:
        pay.mark_callback(
            row,
            False,
            None,
            result.raw_payload or result.error_message,
        )
        pay.bump_verify_attempt(row, result.error_message or result.error_code)
        db.commit()
        db.refresh(row)
    return _intent_to_detail(row)


@router.post("/callback", response_model=PaymentIntentRead)
def payment_callback_json(
    body: PaymentCallbackBody,
    request: Request,
    db: Session = Depends(get_db),
) -> PaymentIntentRead:
    _psp_guard(request)
    if not verify_psp_callback_params(
        os.getenv("AMLINE_PSP_PROVIDER") or "mock",
        {"verified": body.success},
    ):
        raise AmlineError(
            "PSP_VERIFY_STRICT_FAILED",
            "اعتبارسنجی پارامترهای وب‌هوک رد شد.",
            status_code=403,
        )
    pay = PaymentRepository(db)
    row = pay.get_intent(body.intent_id)
    if not row:
        raise AmlineError(
            "RESOURCE_NOT_FOUND",
            "پرداخت یافت نشد.",
            status_code=404,
            details={"entity": "payment_intent"},
        )
    if row.status != PaymentIntentStatus.PENDING:
        return _intent_to_read(row)
    apply_payment_gateway_result(
        db,
        row,
        success=body.success,
        psp_reference=body.psp_reference,
        raw=body.raw,
        audit_action="payment.callback",
    )
    return _intent_to_read(row)


def _get_intent_or_404(db: Session, intent_id: str) -> PaymentIntent:
    pay = PaymentRepository(db)
    row = pay.get_intent(intent_id)
    if not row:
        raise AmlineError(
            "RESOURCE_NOT_FOUND",
            "پرداخت یافت نشد.",
            status_code=404,
            details={"entity": "payment_intent"},
        )
    return row


@router.get("/callback/zarinpal", response_class=HTMLResponse)
def payment_callback_zarinpal(
    request: Request,
    db: Session = Depends(get_db),
    Authority: Optional[str] = Query(None),
    Status: Optional[str] = Query(None),
) -> HTMLResponse:
    assert_psp_callback_ip_allowed(request)
    if not Authority:
        return HTMLResponse(
            _callback_html("خطا", "پارامتر Authority دریافت نشد.", False),
            status_code=400,
        )
    stmt = (
        select(PaymentIntent)
        .where(
            PaymentIntent.psp_checkout_token == Authority,
            PaymentIntent.psp_provider == "zarinpal",
        )
        .limit(1)
    )
    row = db.scalars(stmt).first()
    if not row:
        return HTMLResponse(
            _callback_html("خطا", "تراکنش نامعتبر یا منقضی است.", False),
            status_code=404,
        )
    pay = PaymentRepository(db)
    if row.status != PaymentIntentStatus.PENDING:
        return HTMLResponse(
            _callback_html("توجه", "این پرداخت قبلاً پردازش شده است.", True),
            status_code=200,
        )
    raw_q = safe_json_dumps(dict(request.query_params))
    if (Status or "").upper() != "OK":
        pay.mark_callback(row, False, None, raw_q)
        db.commit()
        return HTMLResponse(
            _callback_html("ناموفق", "پرداخت توسط کاربر لغو یا ناموفق بود.", False),
            status_code=200,
        )
    pay.bump_verify_attempt(row, None)
    db.flush()
    vr = verify_zarinpal_payment(Authority, row.amount_cents)
    if not vr.success:
        pay.mark_callback(row, False, None, vr.raw_payload or raw_q)
        pay.bump_verify_attempt(row, vr.error_message or vr.error_code)
        db.commit()
        return HTMLResponse(
            _callback_html(
                "خطای تأیید", vr.error_message or "تأیید زرین‌پال ناموفق بود.", False
            ),
            status_code=200,
        )
    apply_payment_gateway_result(
        db,
        row,
        success=True,
        psp_reference=vr.psp_reference,
        raw=vr.raw_payload or raw_q,
        audit_action="payment.callback.zarinpal",
    )
    return HTMLResponse(
        _callback_html("موفق", "پرداخت با موفقیت ثبت شد.", True), status_code=200
    )


@router.get("/callback/idpay", response_class=HTMLResponse)
def payment_callback_idpay(
    request: Request,
    db: Session = Depends(get_db),
    payment_id: Optional[str] = Query(None, alias="id"),
    order_id: Optional[str] = Query(None),
    status: Optional[int] = Query(None),
) -> HTMLResponse:
    assert_psp_callback_ip_allowed(request)
    raw_q = safe_json_dumps(dict(request.query_params))
    if not payment_id or not order_id:
        return HTMLResponse(
            _callback_html("خطا", "پارامترهای id یا order_id ناقص است.", False),
            status_code=400,
        )
    pay = PaymentRepository(db)
    row = pay.get_intent(order_id)
    if not row:
        return HTMLResponse(
            _callback_html("خطا", "تراکنش یافت نشد.", False),
            status_code=404,
        )
    if row.psp_provider != "idpay" or row.psp_checkout_token != payment_id:
        pay.bump_verify_attempt(row, "IDPAY_TAMPER_MISMATCH")
        db.commit()
        return HTMLResponse(
            _callback_html("خطا", "عدم تطابق تراکنش درگاه.", False),
            status_code=403,
        )
    if row.status != PaymentIntentStatus.PENDING:
        return HTMLResponse(
            _callback_html("توجه", "این پرداخت قبلاً پردازش شده است.", True),
            status_code=200,
        )
    if status is not None and int(status) != 100:
        pay.mark_callback(row, False, None, raw_q)
        db.commit()
        return HTMLResponse(
            _callback_html("ناموفق", "وضعیت پرداخت ناموفق است.", False),
            status_code=200,
        )
    pay.bump_verify_attempt(row, None)
    db.flush()
    vr = verify_idpay_payment(payment_id, order_id)
    if not vr.success:
        pay.mark_callback(row, False, None, vr.raw_payload or raw_q)
        pay.bump_verify_attempt(row, vr.error_message or vr.error_code)
        db.commit()
        return HTMLResponse(
            _callback_html(
                "خطای تأیید", vr.error_message or "تأیید آیدی‌پی ناموفق بود.", False
            ),
            status_code=200,
        )
    apply_payment_gateway_result(
        db,
        row,
        success=True,
        psp_reference=vr.psp_reference,
        raw=vr.raw_payload or raw_q,
        audit_action="payment.callback.idpay",
    )
    return HTMLResponse(
        _callback_html("موفق", "پرداخت با موفقیت ثبت شد.", True), status_code=200
    )


@router.get("/callback/nextpay", response_class=HTMLResponse)
def payment_callback_nextpay(
    request: Request,
    db: Session = Depends(get_db),
    trans_id: Optional[str] = Query(None),
    order_id: Optional[str] = Query(None),
) -> HTMLResponse:
    assert_psp_callback_ip_allowed(request)
    if not trans_id or not order_id:
        return HTMLResponse(
            _callback_html("خطا", "پارامترهای trans_id یا order_id ناقص است.", False),
            status_code=400,
        )
    raw_q = safe_json_dumps(dict(request.query_params))
    pay = PaymentRepository(db)
    row = pay.get_intent(order_id)
    if not row:
        return HTMLResponse(
            _callback_html("خطا", "تراکنش یافت نشد.", False),
            status_code=404,
        )
    if row.psp_provider != "nextpay" or row.psp_checkout_token != trans_id:
        pay.bump_verify_attempt(row, "NEXTPAY_TAMPER_MISMATCH")
        db.commit()
        return HTMLResponse(
            _callback_html("خطا", "عدم تطابق تراکنش درگاه.", False),
            status_code=403,
        )
    if row.status != PaymentIntentStatus.PENDING:
        return HTMLResponse(
            _callback_html("توجه", "این پرداخت قبلاً پردازش شده است.", True),
            status_code=200,
        )
    pay.bump_verify_attempt(row, None)
    db.flush()
    vr = verify_nextpay_payment(trans_id, order_id, row.amount_cents)
    if not vr.success:
        pay.mark_callback(row, False, None, vr.raw_payload or raw_q)
        pay.bump_verify_attempt(row, vr.error_message or vr.error_code)
        db.commit()
        return HTMLResponse(
            _callback_html(
                "خطای تأیید", vr.error_message or "تأیید نکست‌پی ناموفق بود.", False
            ),
            status_code=200,
        )
    apply_payment_gateway_result(
        db,
        row,
        success=True,
        psp_reference=vr.psp_reference,
        raw=vr.raw_payload or raw_q,
        audit_action="payment.callback.nextpay",
    )
    return HTMLResponse(
        _callback_html("موفق", "پرداخت با موفقیت ثبت شد.", True), status_code=200
    )


@router.get("/callback/mock", response_class=HTMLResponse)
def payment_callback_mock(
    request: Request,
    db: Session = Depends(get_db),
    intent: str = Query(..., description="payment intent UUID"),
    ok: int = Query(1, ge=0, le=1),
) -> HTMLResponse:
    if os.getenv("AMLINE_ALLOW_MOCK_PSP_CALLBACK", "1").lower() not in (
        "1",
        "true",
        "yes",
    ):
        raise AmlineError("NOT_FOUND", "غیرفعال", status_code=404)
    assert_psp_callback_ip_allowed(request)
    pay = PaymentRepository(db)
    row = pay.get_intent(intent)
    if not row:
        return HTMLResponse(
            _callback_html("خطا", "تراکنش یافت نشد.", False),
            status_code=404,
        )
    if row.psp_provider != "mock":
        return HTMLResponse(
            _callback_html("خطا", "این intent برای mock نیست.", False),
            status_code=400,
        )
    if row.status != PaymentIntentStatus.PENDING:
        return HTMLResponse(
            _callback_html("توجه", "قبلاً پردازش شده است.", True),
            status_code=200,
        )
    raw_q = urlencode(dict(request.query_params))
    apply_payment_gateway_result(
        db,
        row,
        success=bool(ok),
        psp_reference="MOCK-REF" if ok else None,
        raw=raw_q,
        audit_action="payment.callback.mock",
    )
    return HTMLResponse(
        _callback_html("نتیجه", "موفق" if ok else "ناموفق (تست)", bool(ok)),
        status_code=200,
    )
