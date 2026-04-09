"""Global exception handlers + domain exception for unified ErrorResponse."""

from __future__ import annotations

import logging
import uuid
from typing import Any, List, Optional, Sequence, Union

from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.responses import JSONResponse

from app.schemas.v1.errors import ErrorInfo, ErrorResponse, FieldErrorItem

logger = logging.getLogger(__name__)


class AmlineError(Exception):
    """Raise from routes/services instead of HTTPException for domain errors."""

    def __init__(
        self,
        code: str,
        message: str,
        *,
        status_code: int = 400,
        details: Optional[dict[str, Any]] = None,
        field_errors: Optional[List[FieldErrorItem]] = None,
    ) -> None:
        self.code = code
        self.message = message
        self.status_code = status_code
        self.details = details
        self.field_errors = field_errors
        super().__init__(message)


def _request_id(request: Request) -> str:
    existing = getattr(request.state, "request_id", None)
    if existing:
        return str(existing)
    rid = request.headers.get("X-Request-Id") or str(uuid.uuid4())
    request.state.request_id = rid
    return rid


def _error_payload(
    *,
    code: str,
    message: str,
    request_id: str,
    details: Optional[dict[str, Any]] = None,
    field_errors: Optional[List[FieldErrorItem]] = None,
    legacy_detail: Optional[Union[str, List[Any], dict[str, Any]]] = None,
) -> dict[str, Any]:
    err = ErrorInfo(
        code=code,
        message=message,
        details=details,
        request_id=request_id,
    )
    body = ErrorResponse(
        error=err,
        request_id=request_id,
        field_errors=field_errors,
    )
    data = jsonable_encoder(body.model_dump(exclude_none=True))
    # Legacy FastAPI / mock clients often read `detail` only
    data["detail"] = legacy_detail if legacy_detail is not None else message
    return data


def _validation_field_errors(errors: Sequence[dict[str, Any]]) -> List[FieldErrorItem]:
    out: List[FieldErrorItem] = []
    for e in errors:
        loc = e.get("loc") or ()
        parts: List[str] = []
        for p in loc:
            if p == "body":
                continue
            parts.append(str(p))
        field = ".".join(parts) if parts else "body"
        out.append(
            FieldErrorItem(
                field=field,
                code=str(e.get("type", "validation_error")),
                message=str(e.get("msg", "Invalid value")),
            )
        )
    return out


def _http_exception_to_amline(
    exc: StarletteHTTPException,
) -> tuple[int, str, str, Optional[dict]]:
    status = exc.status_code
    detail = exc.detail
    if isinstance(detail, dict):
        code = str(detail.get("code", "RESOURCE_NOT_FOUND"))
        msg = str(detail.get("message", "Error"))
        details = detail.get("details")
        if isinstance(details, dict):
            return status, code, msg, details
        return status, code, msg, None
    d = str(detail) if detail is not None else "Error"
    mapping: dict[int, tuple[str, str]] = {
        404: ("RESOURCE_NOT_FOUND", "منبع یافت نشد."),
        422: ("VALIDATION_FAILED", "ورودی نامعتبر است."),
        429: ("RATE_LIMIT_EXCEEDED", "تعداد درخواست بیش از حد مجاز است."),
        401: ("AUTH_TOKEN_INVALID", "احراز هویت نامعتبر است."),
        403: ("RESOURCE_ACCESS_DENIED", "دسترسی مجاز نیست."),
    }
    code, default_msg = mapping.get(status, ("INTERNAL_ERROR", "خطای داخلی رخ داد."))
    if status >= 500:
        code = "INTERNAL_ERROR"
    detail_map: dict[str, tuple[str, str]] = {
        "not_found": ("RESOURCE_NOT_FOUND", "منبع یافت نشد."),
        "party_type is required": (
            "VALIDATION_FAILED",
            "نوع طرف قرارداد الزامی است.",
        ),
        "role_not_found": ("RESOURCE_NOT_FOUND", "نقش یافت نشد."),
        "challenge_not_found": ("RESOURCE_NOT_FOUND", "چالش OTP یافت نشد."),
        "no_active_challenge": (
            "OTP_INVALID_OR_EXPIRED",
            "کد تایید فعالی وجود ندارد یا منقضی شده است.",
        ),
        "otp_expired": ("OTP_INVALID_OR_EXPIRED", "کد تایید منقضی شده است."),
        "otp_invalid": ("OTP_INVALID_OR_EXPIRED", "کد تایید نادرست است."),
        "otp_locked": (
            "OTP_INVALID_OR_EXPIRED",
            "به‌دلیل تلاش‌های مکرر موقتاً قفل شده است.",
        ),
        "otp_rate_limited": ("OTP_RATE_LIMITED", "ارسال کد تایید بیش از حد مجاز است."),
        "invalid_mobile": ("VALIDATION_FAILED", "شماره موبایل معتبر نیست."),
        "mobile_mismatch": (
            "OTP_INVALID_OR_EXPIRED",
            "شماره موبایل با چالش مطابقت ندارد.",
        ),
        "purpose_mismatch": (
            "OTP_INVALID_OR_EXPIRED",
            "نوع عملیات با چالش مطابقت ندارد.",
        ),
        "national_code_mismatch": (
            "VALIDATION_FAILED",
            "کد ملی با ثبت‌شده مطابقت ندارد.",
        ),
        "invalid_otp_format": ("VALIDATION_FAILED", "فرمت کد تایید نامعتبر است."),
        "commission_required": (
            "COMMISSION_REQUIRED",
            "پرداخت کارمزد قبل از امضا الزامی است.",
        ),
    }
    if d in detail_map:
        code, default_msg = detail_map[d]
    return (
        status,
        code,
        default_msg,
        {"detail": d} if d and d not in detail_map else None,
    )


async def amline_error_handler(request: Request, exc: AmlineError) -> JSONResponse:
    rid = _request_id(request)
    body = _error_payload(
        code=exc.code,
        message=exc.message,
        request_id=rid,
        details=exc.details,
        field_errors=exc.field_errors,
    )
    return JSONResponse(status_code=exc.status_code, content=body)


async def http_exception_handler(
    request: Request, exc: StarletteHTTPException
) -> JSONResponse:
    rid = _request_id(request)
    status, code, msg, details = _http_exception_to_amline(exc)
    legacy = exc.detail if isinstance(exc.detail, str) else None
    body = _error_payload(
        code=code,
        message=msg,
        request_id=rid,
        details=details,
        legacy_detail=legacy,
    )
    return JSONResponse(status_code=status, content=body)


async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    rid = _request_id(request)
    field_errors = _validation_field_errors(exc.errors())
    raw = exc.errors()
    body = _error_payload(
        code="VALIDATION_FAILED",
        message="اطلاعات ارسال‌شده معتبر نیست.",
        request_id=rid,
        field_errors=field_errors,
        legacy_detail=raw,
    )
    return JSONResponse(status_code=422, content=body)


async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled error: %s", exc)
    rid = _request_id(request)
    body = _error_payload(
        code="INTERNAL_ERROR",
        message="خطای داخلی رخ داد.",
        request_id=rid,
        details=None,
    )
    return JSONResponse(status_code=500, content=body)


def register_exception_handlers(app: FastAPI) -> None:
    app.add_exception_handler(AmlineError, amline_error_handler)
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(Exception, unhandled_exception_handler)


def register_request_id_middleware(app: FastAPI) -> None:
    @app.middleware("http")
    async def _request_id_middleware(request: Request, call_next: Any) -> Any:
        rid = request.headers.get("X-Request-Id") or str(uuid.uuid4())
        request.state.request_id = rid
        response = await call_next(request)
        response.headers["X-Request-Id"] = rid
        return response
