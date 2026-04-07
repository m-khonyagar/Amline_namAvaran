"""Dev mock API for local frontend testing (no production use)."""
from __future__ import annotations

import os
from datetime import date as date_cls
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from commission_calc import commission_invoice_from_contract_dict
from commission_discount import invoice_with_optional_discount
from fastapi import Cookie, Depends, FastAPI, Header, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from pydantic import BaseModel, field_validator

from wizard_step_machine import InvalidStepTransitionError, assert_valid_transition, mortgage_default_next


def _stage_dump(s: BaseModel) -> Dict[str, Any]:
    if hasattr(s, "model_dump"):
        return s.model_dump()
    return s.dict()


# ورود یکدست برای تست: ادمین-ui، amline-ui، و تماس‌های /admin/login روی mock
FIXED_TEST_MOBILE = "09100000000"
FIXED_TEST_OTP = "11111"

app = FastAPI(title="Amline Dev Mock API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
        "http://localhost:3003",
        "http://localhost:3004",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://127.0.0.1:3002",
        "http://127.0.0.1:3003",
        "http://127.0.0.1:3004",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

FULL_ADMIN_PERMS = [
    "contracts:read",
    "contracts:write",
    "users:read",
    "users:write",
    "ads:read",
    "ads:write",
    "wallets:read",
    "wallets:write",
    "settings:read",
    "settings:write",
    "audit:read",
    "roles:read",
    "roles:write",
    "reports:read",
    "notifications:read",
]

ROLES: List[Dict[str, Any]] = [
    {
        "id": "role-admin",
        "name": "مدیر کامل",
        "description": "دسترسی به همه ماژول‌ها",
        "permissions": list(FULL_ADMIN_PERMS),
    },
    {
        "id": "role-support",
        "name": "پشتیبانی",
        "description": "مشاهده قرارداد و CRM، بدون تنظیمات سیستم",
        "permissions": [
            "contracts:read",
            "contracts:write",
            "users:read",
            "crm:read",
            "crm:write",
            "reports:read",
            "notifications:read",
        ],
    },
    {
        "id": "role-supervisor",
        "name": "سوپروایزر",
        "description": "نظارت و گزارش، بدون حذف کاربر",
        "permissions": [
            "contracts:read",
            "contracts:write",
            "users:read",
            "audit:read",
            "reports:read",
            "wallets:read",
            "notifications:read",
        ],
    },
]

MOCK_USER: Dict[str, Any] = {
    "id": "mock-001",
    "mobile": FIXED_TEST_MOBILE,
    "full_name": "کاربر تست ادمین",
    "role": "admin",
    "role_id": "role-admin",
    "permissions": list(FULL_ADMIN_PERMS),
}

audit_logs: List[Dict[str, Any]] = []
notifications_store: List[Dict[str, Any]] = [
    {
        "id": "n1",
        "title": "قرارداد جدید ثبت شد",
        "body": "یک قرارداد در صف بررسی است.",
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
]
sessions_store: List[Dict[str, Any]] = []
activity_by_user_day: Dict[str, int] = {}
_audit_seq = 1


def _audit_event(
    user_id: str,
    action: str,
    entity: str,
    metadata: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    global _audit_seq
    ev = {
        "id": f"aud-{_audit_seq}",
        "user_id": user_id,
        "action": action,
        "entity": entity,
        "metadata": metadata or {},
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    _audit_seq += 1
    audit_logs.insert(0, ev)
    day = ev["created_at"][:10]
    key = f"{user_id}:{day}"
    activity_by_user_day[key] = activity_by_user_day.get(key, 0) + 1
    return ev


contracts: Dict[str, Dict[str, Any]] = {}
id_counter = 1
_file_upload_seq = 10_000


def _apply_contract_step(c: Dict[str, Any], new_step: str) -> str:
    try:
        assert_valid_transition(c["step"], new_step, c["type"])
    except InvalidStepTransitionError as e:
        raise HTTPException(
            status_code=422,
            detail={
                "code": "invalid_step_transition",
                "from": e.current_step,
                "to": e.next_step,
                "contract_type": e.contract_type,
            },
        ) from e
    c["step"] = new_step
    return new_step


def _next_id() -> str:
    global id_counter
    cid = f"contract-{id_counter:03d}"
    id_counter += 1
    return cid


_WIZARD_STATUS_NO_COMMISSION_OVERLAY = frozenset({"REVOKED", "COMPLETED", "REJECTED"})


def _effective_status(c: Dict[str, Any]) -> str:
    raw = c.get("status") or "DRAFT"
    if raw in _WIZARD_STATUS_NO_COMMISSION_OVERLAY:
        return raw
    if c.get("step") == "SIGNING" and not c.get("commission_paid_at"):
        return "PENDING_COMMISSION"
    return raw


def _require_commission_paid_for_signing_mock(c: Dict[str, Any]) -> None:
    if c.get("step") == "SIGNING" and not c.get("commission_paid_at"):
        raise HTTPException(status_code=400, detail="commission_required")


def _merge_contract_parties(c: Dict[str, Any], updates: Dict[str, Any]) -> None:
    p = dict(c.get("parties") or {})
    if not isinstance(p, dict):
        p = {}
    p.update(updates)
    c["parties"] = p


def _commission_discount_codes_csv() -> str:
    return os.environ.get("AMLINE_COMMISSION_DISCOUNT_CODES", "")


def _commission_invoice_payload(c: Dict[str, Any], discount_code: Optional[str] = None) -> Dict[str, Any]:
    base = commission_invoice_from_contract_dict(c)
    try:
        return invoice_with_optional_discount(
            base,
            _commission_discount_codes_csv(),
            discount_code,
            reject_invalid=bool(discount_code and discount_code.strip()),
        )
    except ValueError:
        raise HTTPException(
            status_code=422,
            detail={"code": "invalid_discount_code", "hint": "کد تخفیف معتبر نیست"},
        )


def _contract_json(c: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": c["id"],
        "type": c["type"],
        "status": _effective_status(c),
        "step": c["step"],
        "party_type": c.get("party_type"),
        "parties": c.get("parties", {}),
        "is_owner": True,
        "key": "mock-key",
        "password": None,
        "created_at": c.get("created_at", datetime.now(timezone.utc).isoformat()),
    }


def _get(cid: str) -> Dict[str, Any]:
    c = contracts.get(cid)
    if not c:
        raise HTTPException(status_code=404, detail="not_found")
    return c


@app.get("/health")
def health() -> Dict[str, str]:
    return {"status": "ok"}


def _user_with_permissions() -> Dict[str, Any]:
    u = {**MOCK_USER}
    rid = u.get("role_id")
    if rid:
        for r in ROLES:
            if r["id"] == rid:
                u["permissions"] = list(r["permissions"])
                break
    return u


@app.get("/auth/me")
def auth_me() -> Dict[str, Any]:
    return _user_with_permissions()


class OtpBody(BaseModel):
    mobile: str


@app.post("/admin/otp/send")
def otp_send(_body: OtpBody) -> Dict[str, Any]:
    out: Dict[str, Any] = {"success": True, "message": "ok"}
    if (_body.mobile or "").strip() == FIXED_TEST_MOBILE:
        out["dev_code"] = FIXED_TEST_OTP
    return out


class LoginBody(BaseModel):
    mobile: str
    otp: str


@app.post("/admin/login")
def admin_login(_body: LoginBody) -> Dict[str, Any]:
    m = (_body.mobile or "").strip()
    o = (_body.otp or "").strip()
    if m != FIXED_TEST_MOBILE or o != FIXED_TEST_OTP:
        raise HTTPException(status_code=400, detail="invalid_or_expired_code")
    u = _user_with_permissions()
    _audit_event(u["id"], "auth.login", "session", {"mobile": _body.mobile})
    sid = f"sess-{int(datetime.now(timezone.utc).timestamp() * 1000)}"
    sessions_store.insert(
        0,
        {
            "id": sid,
            "user_id": u["id"],
            "started_at": datetime.now(timezone.utc).isoformat(),
            "last_seen_at": datetime.now(timezone.utc).isoformat(),
            "ip": "127.0.0.1",
        },
    )
    return {
        "access_token": "mock-token-123",
        "refresh_token": "mock-refresh-123",
        "user": u,
    }


class StartBody(BaseModel):
    contract_type: Optional[str] = "PROPERTY_RENT"
    party_type: Optional[str] = None
    is_guaranteed: Optional[bool] = False


@app.post("/contracts/start", status_code=201)
def contracts_start(body: StartBody) -> Dict[str, Any]:
    if not body.party_type:
        raise HTTPException(status_code=422, detail="party_type is required")
    ctype = body.contract_type or "PROPERTY_RENT"
    cid = _next_id()
    now = datetime.now(timezone.utc).isoformat()
    c = {
        "id": cid,
        "type": ctype,
        "status": "DRAFT",
        "step": "LANDLORD_INFORMATION",
        "party_type": body.party_type,
        "parties": {},
        "created_at": now,
    }
    contracts[cid] = c
    return _contract_json(c)


@app.get("/contracts/list")
def contracts_list() -> List[Dict[str, Any]]:
    return [_contract_json(x) for x in contracts.values()]


@app.get("/contracts/resolve-info")
def resolve_info() -> Dict[str, str]:
    return {"result": "ok"}


@app.get("/contracts/{contract_id}")
def contracts_get(contract_id: str) -> Dict[str, Any]:
    return _contract_json(_get(contract_id))


@app.get("/contracts/{contract_id}/status")
def contracts_status(contract_id: str) -> Dict[str, Any]:
    c = _get(contract_id)
    return {
        "status": _effective_status(c),
        "step": c["step"],
        "contract_id": c["id"],
        "type": c["type"],
    }


@app.get("/contracts/{contract_id}/commission/invoice")
def commission_invoice(
    contract_id: str,
    discount_code: Optional[str] = Query(None),
) -> Dict[str, Any]:
    c = _get(contract_id)
    paid = bool(c.get("commission_paid_at"))
    inv = _commission_invoice_payload(c, discount_code=discount_code)
    return {
        **inv,
        "invoice_id": f"inv-{c['id']}",
        "commission_paid": paid,
        "commission_paid_at": c.get("commission_paid_at"),
    }


class CommissionPayBody(BaseModel):
    use_wallet_credit: bool = False
    use_all_wallet_credits: bool = False
    wallet_credits: Optional[int] = None
    discount_code: Optional[str] = None


@app.post("/contracts/{contract_id}/commission/pay")
def commission_pay(contract_id: str, body: CommissionPayBody) -> Dict[str, Any]:
    c = _get(contract_id)
    if c.get("commission_paid_at"):
        return {
            "ok": True,
            "redirect_url": "/",
            "used_wallet": False,
            "already_paid": True,
        }
    _ = _commission_invoice_payload(c, discount_code=body.discount_code)
    use_wallet = bool(body.use_wallet_credit or body.use_all_wallet_credits)
    if use_wallet:
        c["commission_paid_at"] = datetime.now(timezone.utc).isoformat()
        return {"ok": True, "redirect_url": "/", "used_wallet": True}
    return {
        "ok": True,
        "redirect_url": f"/financials/bank/gateway?contract_id={contract_id}",
        "used_wallet": False,
    }


@app.post("/contracts/{contract_id}/revoke")
def contracts_revoke(contract_id: str) -> Dict[str, Any]:
    c = _get(contract_id)
    if c["status"] in ("REVOKED", "COMPLETED"):
        raise HTTPException(status_code=400, detail="invalid_state_transition")
    c["status"] = "REVOKED"
    return {"ok": True}


@app.post("/contracts/{contract_id}/party/landlord", status_code=201)
def party_landlord(contract_id: str) -> Dict[str, Any]:
    c = _get(contract_id)
    party_id = f"party-landlord-{int(datetime.now().timestamp() * 1000)}"
    row = {
        "id": party_id,
        "contract": _contract_json(c),
        "party_type": "LANDLORD",
        "person_type": "NATURAL_PERSON",
    }
    landlords = c.setdefault("parties", {}).setdefault("landlords", [])
    landlords.append(row)
    return row


@app.patch("/contracts/{contract_id}/party/{party_id}")
def party_patch(contract_id: str, party_id: str) -> Dict[str, Any]:
    c = _get(contract_id)
    return {
        "id": party_id,
        "contract": _contract_json(c),
        "party_type": "LANDLORD",
        "person_type": "NATURAL_PERSON",
    }


class SetStepBody(BaseModel):
    next_step: Optional[str] = None


class HomeInfoBody(BaseModel):
    postal_code: str = "0000000000"
    area_m2: float = 100.0
    property_use_type: str = "RESIDENTIAL"
    restroom_type: str = "WC"
    heating_system_type: str = "CENTRAL"
    cooling_system_type: str = "SPLIT"
    next_step: Optional[str] = None


class DatingBody(BaseModel):
    start_date: str
    end_date: str
    delivery_date: Optional[str] = None
    next_step: Optional[str] = None


class PaymentStage(BaseModel):
    due_date: str
    payment_type: str
    amount: int
    cheque_image_file_id: Optional[int] = None


class MortgageBody(BaseModel):
    total_amount: int
    stages: List[PaymentStage]
    next_step: Optional[str] = None


class RentingBody(BaseModel):
    monthly_rent_amount: int
    rent_due_day_of_month: Optional[int] = None
    stages: List[PaymentStage] = []
    next_step: Optional[str] = None

    @field_validator("rent_due_day_of_month")
    @classmethod
    def validate_day(cls, v: Optional[int]) -> Optional[int]:
        if v is None:
            return v
        if not 1 <= v <= 31:
            raise ValueError("rent_due_day_of_month must be between 1 and 31")
        return v


class SalePriceBody(BaseModel):
    total_price: int
    stages: List[PaymentStage]
    next_step: Optional[str] = None

    @field_validator("total_price")
    @classmethod
    def positive(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("total_price must be positive")
        return v


@app.post("/contracts/{contract_id}/party/landlord/set")
def landlord_set(contract_id: str, body: SetStepBody) -> Dict[str, Any]:
    c = _get(contract_id)
    nxt = body.next_step or "TENANT_INFORMATION"
    _apply_contract_step(c, nxt)
    return {"next_step": nxt}


@app.post("/contracts/{contract_id}/party/tenant", status_code=201)
def party_tenant(contract_id: str) -> Dict[str, Any]:
    c = _get(contract_id)
    party_id = f"party-tenant-{int(datetime.now().timestamp() * 1000)}"
    row = {
        "id": party_id,
        "contract": _contract_json(c),
        "party_type": "TENANT",
        "person_type": "NATURAL_PERSON",
    }
    tenants = c.setdefault("parties", {}).setdefault("tenants", [])
    tenants.append(row)
    return row


@app.post("/contracts/{contract_id}/party/tenant/set")
def tenant_set(contract_id: str, body: SetStepBody) -> Dict[str, Any]:
    c = _get(contract_id)
    nxt = body.next_step or "PLACE_INFORMATION"
    _apply_contract_step(c, nxt)
    return {"next_step": nxt}


@app.delete("/contracts/{contract_id}/party/{party_id}")
def party_delete(contract_id: str, party_id: str) -> Dict[str, bool]:
    _get(contract_id)
    return {"ok": True}


@app.post("/contracts/{contract_id}/home-info", status_code=201)
def home_info(contract_id: str, body: HomeInfoBody) -> Dict[str, Any]:
    c = _get(contract_id)
    nxt = body.next_step or "DATING"
    _apply_contract_step(c, nxt)
    _merge_contract_parties(
        c,
        {
            "postal_code": body.postal_code,
            "area_m2": body.area_m2,
            "property_use_type": body.property_use_type,
        },
    )
    return {"next_step": nxt}


@app.post("/contracts/{contract_id}/dating", status_code=201)
def dating(contract_id: str, body: DatingBody) -> Dict[str, Any]:
    try:
        start = date_cls.fromisoformat(body.start_date)
        end = date_cls.fromisoformat(body.end_date)
    except ValueError:
        raise HTTPException(status_code=422, detail="invalid_date_format")
    if end <= start:
        raise HTTPException(status_code=422, detail="end_date_before_start_date")
    c = _get(contract_id)
    nxt = body.next_step or "MORTGAGE"
    _apply_contract_step(c, nxt)
    upd: Dict[str, Any] = {"lease_start_date": body.start_date, "lease_end_date": body.end_date}
    if body.delivery_date:
        upd["delivery_date"] = body.delivery_date
    _merge_contract_parties(c, upd)
    return {"next_step": nxt}


@app.post("/contracts/{contract_id}/mortgage", status_code=201)
def mortgage(contract_id: str, body: MortgageBody) -> Dict[str, Any]:
    stages_sum = sum(s.amount for s in body.stages)
    if stages_sum != body.total_amount:
        raise HTTPException(status_code=422, detail="stages_sum_mismatch")
    c = _get(contract_id)
    if c.get("type") == "BUYING_AND_SELLING":
        raise HTTPException(status_code=422, detail="use_sale_price_endpoint")
    nxt = body.next_step or mortgage_default_next(c["type"])
    _apply_contract_step(c, nxt)
    _merge_contract_parties(
        c,
        {
            "deposit_amount": body.total_amount,
            "mortgage_payment_stages": [_stage_dump(s) for s in body.stages],
        },
    )
    return {"next_step": nxt}


@app.post("/contracts/{contract_id}/renting", status_code=201)
def renting(contract_id: str, body: RentingBody) -> Dict[str, Any]:
    c = _get(contract_id)
    nxt = body.next_step or "SIGNING"
    _apply_contract_step(c, nxt)
    if c.get("type") == "PROPERTY_RENT":
        upd: Dict[str, Any] = {
            "rent_amount": body.monthly_rent_amount,
            "rent_payment_stages": [_stage_dump(s) for s in body.stages],
        }
        if body.rent_due_day_of_month is not None:
            upd["rent_due_day_of_month"] = body.rent_due_day_of_month
        _merge_contract_parties(c, upd)
    return {"next_step": nxt}


@app.post("/contracts/{contract_id}/sale-price", status_code=201)
def sale_price(contract_id: str, body: SalePriceBody) -> Dict[str, Any]:
    stages_sum = sum(s.amount for s in body.stages)
    if body.stages and stages_sum != body.total_price:
        raise HTTPException(status_code=422, detail="stages_sum_mismatch")
    c = _get(contract_id)
    if c.get("type") != "BUYING_AND_SELLING":
        raise HTTPException(status_code=422, detail="sale_price_contract_type")
    nxt = body.next_step or "SIGNING"
    _apply_contract_step(c, nxt)
    _merge_contract_parties(
        c,
        {
            "sale_price": body.total_price,
            "sale_payment_stages": [_stage_dump(s) for s in body.stages],
        },
    )
    return {"next_step": nxt}


@app.post("/contracts/{contract_id}/sign", status_code=201)
def sign(contract_id: str) -> Dict[str, Any]:
    c = _get(contract_id)
    _require_commission_paid_for_signing_mock(c)
    return {}


@app.post("/contracts/{contract_id}/sign/verify")
def sign_verify(contract_id: str) -> Dict[str, Any]:
    c = _get(contract_id)
    _require_commission_paid_for_signing_mock(c)
    return {"ok": True}


@app.post("/contracts/{contract_id}/sign/set")
def sign_set(contract_id: str, body: SetStepBody) -> Dict[str, Any]:
    c = _get(contract_id)
    _require_commission_paid_for_signing_mock(c)
    nxt = body.next_step or "WITNESS"
    _apply_contract_step(c, nxt)
    return {"next_step": nxt}


@app.post("/contracts/{contract_id}/add-witness")
def add_witness(contract_id: str, body: SetStepBody) -> Dict[str, Any]:
    c = _get(contract_id)
    nxt = body.next_step or "WITNESS"
    _apply_contract_step(c, nxt)
    return {"next_step": nxt}


@app.post("/contracts/{contract_id}/witness/send-otp", status_code=201)
def witness_send_otp(_contract_id: str) -> Dict[str, Any]:
    return {}


@app.post("/contracts/{contract_id}/witness/verify")
def witness_verify(contract_id: str, body: SetStepBody) -> Dict[str, Any]:
    c = _get(contract_id)
    nxt = body.next_step or "FINISH"
    _apply_contract_step(c, nxt)
    c["status"] = "COMPLETED"
    return {"ok": True, "next_step": nxt}


@app.get("/contracts/{contract_id}/addendums")
def contract_addendums_list(contract_id: str) -> List[Any]:
    c = _get(contract_id)
    return list(c.get("addendums") or [])


@app.get("/contracts/{contract_id}/pdf")
def contract_pdf(contract_id: str) -> Dict[str, Any]:
    c = _get(contract_id)
    if c["status"] == "DRAFT":
        raise HTTPException(status_code=400, detail="contract_not_ready")
    return {"url": None, "status": "PENDING"}


@app.post("/files/upload", status_code=201)
def files_upload() -> Dict[str, Any]:
    global _file_upload_seq
    _file_upload_seq += 1
    return {"id": _file_upload_seq, "url": None}


@app.get("/provinces/cities")
def provinces_cities() -> List[Any]:
    return []


@app.get("/provinces")
def provinces() -> List[Any]:
    return []


@app.get("/financials/wallets")
def wallets() -> Dict[str, Any]:
    return {
        "id": "wallet-001",
        "credit": 3_000_000,
        "user_id": "mock-001",
        "status": "ACTIVE",
    }


@app.get("/financials/bank/gateway", response_class=HTMLResponse)
def bank_gateway_mock() -> HTMLResponse:
    return HTMLResponse(
        "<!DOCTYPE html><html lang=fa dir=rtl><meta charset=utf-8><title>درگاه (mock)</title>"
        "<body style=font-family:sans-serif;padding:1.5rem><h1>درگاه آزمایشی</h1>"
        "<p>در dev-mock-api پرداخت واقعی ثبت نمی‌شود؛ دکمه بازگشت را بزنید.</p>"
        "<button type=button onclick=history.back()>بازگشت</button></body></html>"
    )


class MockBankBody(BaseModel):
    contract_id: str


@app.post("/financials/bank/mock-verify")
def bank_mock_verify(body: MockBankBody) -> Dict[str, Any]:
    c = _get(body.contract_id)
    c["commission_paid_at"] = datetime.now(timezone.utc).isoformat()
    return {"ok": True}


# --- نیازمندی‌ها و بازار (Hamgit-style؛ پنل کاربر amline-ui) ---

QUEUE_MESSAGE_FA = (
    "نیازمندی شما با موفقیت ثبت شد. زمان انتظار در صف حداکثر ۲ ساعت می‌باشد."
)

_req_seq = 0
requirements_store: List[Dict[str, Any]] = []

MARKET_SEED: List[Dict[str, Any]] = [
    {
        "id": "seed-1",
        "kind": "buy",
        "user_id": "seed",
        "publish_title": "آگهی خرید و فروش آپارتمان",
        "city_label": "قم",
        "neighborhood_label": "پردیسان",
        "price_label": "۱۲ میلیارد تومان",
        "description": "آپارتمان ۹۰ متری، نوساز، نزدیک بلوار.",
        "status": "PUBLISHED",
    },
    {
        "id": "seed-2",
        "kind": "rent",
        "user_id": "seed",
        "publish_title": "آگهی رهن و اجاره آپارتمان",
        "city_label": "قم",
        "neighborhood_label": "قنوات",
        "price_label": "رهن ۵۰۰ / اجاره ۸ میلیون",
        "description": "دو خواب، پارکینگ و انباری.",
        "status": "PUBLISHED",
    },
    {
        "id": "seed-3",
        "kind": "barter",
        "user_id": "seed",
        "publish_title": "معاوضه ملک با آپارتمان",
        "city_label": "تهران",
        "neighborhood_label": "ونک",
        "price_label": "توافقی",
        "description": "زمین تجاری به‌ازای آپارتمان در قم.",
        "status": "PUBLISHED",
    },
    {
        "id": "seed-4",
        "kind": "buy",
        "user_id": "seed",
        "publish_title": "خرید ویلایی مسکونی",
        "city_label": "قم",
        "neighborhood_label": "جعفریه",
        "price_label": "۸ میلیارد تومان",
        "description": "بنای ۲۵۰ متر، حیاط اختصاصی.",
        "status": "PUBLISHED",
    },
    {
        "id": "seed-5",
        "kind": "rent",
        "user_id": "seed",
        "publish_title": "اجاره مغازه تجاری",
        "city_label": "قم",
        "neighborhood_label": "مرکز",
        "price_label": "اجاره ۱۵ میلیون",
        "description": "بر اصلی، مناسب خرده‌فروشی.",
        "status": "PUBLISHED",
    },
    {
        "id": "seed-6",
        "kind": "barter",
        "user_id": "seed",
        "publish_title": "معاوضه آپارتمان با مغازه",
        "city_label": "قم",
        "neighborhood_label": "سلفچگان",
        "price_label": "هم‌ارزش",
        "description": "آپارتمان ۱۱۰ متری با مغازه ۴۰ متری.",
        "status": "PUBLISHED",
    },
]


def _next_requirement_id() -> str:
    global _req_seq
    _req_seq += 1
    return f"req-{_req_seq:06d}"


def _require_session_user(
    authorization: Optional[str] = Header(None),
    access_token: Optional[str] = Cookie(None),
) -> str:
    if authorization and authorization.strip().lower().startswith("bearer "):
        return str(MOCK_USER["id"])
    if access_token:
        return str(MOCK_USER["id"])
    raise HTTPException(status_code=401, detail="unauthorized")


def _all_market_rows() -> List[Dict[str, Any]]:
    return list(MARKET_SEED) + list(requirements_store)


def _row_to_feed_item(r: Dict[str, Any]) -> Dict[str, Any]:
    desc = (r.get("description") or "").strip()
    excerpt = desc[:120] if desc else "—"
    return {
        "id": r["id"],
        "kind": r["kind"],
        "title": r.get("publish_title") or r.get("title") or "بدون عنوان",
        "city": r.get("city_label") or "",
        "neighborhood": r.get("neighborhood_label") or "",
        "price_label": r.get("price_label") or "توافقی",
        "excerpt": excerpt,
    }


class RequirementCreateBody(BaseModel):
    kind: str
    publish_title: str
    city_label: str = ""
    neighborhood_label: str = ""
    property_type_id: Optional[str] = None
    property_type_label: Optional[str] = None
    min_area: Optional[float] = None
    total_price: Optional[float] = None
    build_year: Optional[float] = None
    renovated: Optional[bool] = None
    rooms: Optional[str] = None
    amenities: Optional[Dict[str, Any]] = None
    description: Optional[str] = None

    @field_validator("kind")
    @classmethod
    def _kind_ok(cls, v: str) -> str:
        if v not in ("buy", "rent", "barter"):
            raise ValueError("invalid_kind")
        return v


@app.post("/requirements", status_code=201)
def requirements_create(
    body: RequirementCreateBody, user_id: str = Depends(_require_session_user)
) -> Dict[str, Any]:
    price_label = "توافقی"
    if body.total_price is not None:
        price_label = f"{body.total_price:,.0f} تومان"
    row: Dict[str, Any] = {
        "id": _next_requirement_id(),
        "user_id": user_id,
        "kind": body.kind,
        "status": "QUEUED",
        "queue_message": QUEUE_MESSAGE_FA,
        "publish_title": body.publish_title.strip(),
        "city_label": body.city_label.strip(),
        "neighborhood_label": body.neighborhood_label.strip(),
        "price_label": price_label,
        "description": (body.description or "").strip(),
        "property_type_id": body.property_type_id,
        "property_type_label": body.property_type_label,
        "min_area": body.min_area,
        "total_price": body.total_price,
        "build_year": body.build_year,
        "renovated": body.renovated,
        "rooms": body.rooms,
        "amenities": body.amenities or {},
    }
    requirements_store.append(row)
    return {
        "id": row["id"],
        "kind": row["kind"],
        "status": row["status"],
        "queue_message": row["queue_message"],
        "publish_title": row["publish_title"],
    }


@app.get("/requirements/{requirement_id}")
def requirements_get(requirement_id: str) -> Dict[str, Any]:
    for r in _all_market_rows():
        if r["id"] == requirement_id:
            return {
                "id": r["id"],
                "kind": r["kind"],
                "status": r.get("status", "QUEUED"),
                "queue_message": r.get("queue_message", QUEUE_MESSAGE_FA),
                "publish_title": r.get("publish_title", ""),
                "city_label": r.get("city_label"),
                "neighborhood_label": r.get("neighborhood_label"),
                "description": r.get("description"),
                "payload": {
                    "property_type_label": r.get("property_type_label"),
                    "min_area": r.get("min_area"),
                    "total_price": r.get("total_price"),
                },
            }
    raise HTTPException(status_code=404, detail="not_found")


@app.get("/market/feed")
def market_feed(
    kind: Optional[str] = Query(None),
    city: Optional[str] = Query(None),
    q: Optional[str] = Query(None),
) -> Dict[str, Any]:
    rows: List[Dict[str, Any]] = []
    for r in _all_market_rows():
        if kind and r.get("kind") != kind:
            continue
        if city and (r.get("city_label") or "") != city:
            continue
        it = _row_to_feed_item(r)
        if q:
            blob = f"{it['title']} {it['excerpt']} {it['neighborhood']}".lower()
            if q.lower() not in blob:
                continue
        rows.append(it)
    return {"items": rows}


@app.get("/admin/ads/wanted/properties")
def admin_ads_wanted_properties() -> Dict[str, Any]:
    out: List[Dict[str, Any]] = []
    for r in _all_market_rows():
        if r.get("kind") in ("buy", "rent"):
            out.append({**r, "feed": _row_to_feed_item(r)})
    return {"items": out, "total": len(out)}


@app.get("/admin/ads/swaps")
def admin_ads_swaps() -> Dict[str, Any]:
    out = [r for r in _all_market_rows() if r.get("kind") == "barter"]
    return {
        "items": [{**r, "feed": _row_to_feed_item(r)} for r in out],
        "total": len(out),
    }


# --- Admin enterprise: roles, audit, activity, metrics, notifications ---


class RoleCreateBody(BaseModel):
    name: str
    description: Optional[str] = None
    permissions: List[str] = []


class RolePatchBody(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    permissions: Optional[List[str]] = None


class AuditCreateBody(BaseModel):
    action: str
    entity: str
    metadata: Optional[Dict[str, Any]] = None
    user_id: Optional[str] = None


@app.get("/admin/roles")
def admin_roles_list() -> List[Dict[str, Any]]:
    return list(ROLES)


@app.post("/admin/roles", status_code=201)
def admin_roles_create(body: RoleCreateBody) -> Dict[str, Any]:
    rid = f"role-{len(ROLES) + 1}"
    row = {
        "id": rid,
        "name": body.name,
        "description": body.description or "",
        "permissions": list(body.permissions),
    }
    ROLES.append(row)
    return row


@app.patch("/admin/roles/{role_id}")
def admin_roles_patch(role_id: str, body: RolePatchBody) -> Dict[str, Any]:
    for r in ROLES:
        if r["id"] == role_id:
            if body.name is not None:
                r["name"] = body.name
            if body.description is not None:
                r["description"] = body.description
            if body.permissions is not None:
                r["permissions"] = list(body.permissions)
            return r
    raise HTTPException(status_code=404, detail="role_not_found")


@app.post("/admin/audit", status_code=201)
def admin_audit_create(body: AuditCreateBody) -> Dict[str, Any]:
    uid = body.user_id or MOCK_USER["id"]
    return _audit_event(uid, body.action, body.entity, body.metadata)


@app.get("/admin/audit")
def admin_audit_list(skip: int = 0, limit: int = 50) -> Dict[str, Any]:
    if skip < 0:
        skip = 0
    if limit < 1 or limit > 200:
        limit = 50
    total = len(audit_logs)
    items = audit_logs[skip : skip + limit]
    return {"total": total, "items": items, "skip": skip, "limit": limit}


@app.post("/admin/auth/heartbeat")
def admin_auth_heartbeat() -> Dict[str, str]:
    return {"ok": "true"}


@app.get("/admin/staff/activity")
def admin_staff_activity(
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    user_id: Optional[str] = None,
) -> Dict[str, Any]:
    """تجمیع ساده رویداد به ازای کاربر و روز."""
    rows: List[Dict[str, Any]] = []
    for key, cnt in activity_by_user_day.items():
        parts = key.split(":", 1)
        if len(parts) != 2:
            continue
        uid, day = parts[0], parts[1]
        if user_id and uid != user_id:
            continue
        if from_date and day < from_date:
            continue
        if to_date and day > to_date:
            continue
        rows.append({"user_id": uid, "date": day, "event_count": cnt})
    rows.sort(key=lambda x: (x["date"], x["user_id"]), reverse=True)
    return {"items": rows, "total": len(rows)}


@app.get("/admin/sessions")
def admin_sessions_list(skip: int = 0, limit: int = 50) -> Dict[str, Any]:
    total = len(sessions_store)
    items = sessions_store[skip : skip + limit]
    return {"total": total, "items": items, "skip": skip, "limit": limit}


@app.get("/admin/metrics/summary")
def admin_metrics_summary() -> Dict[str, Any]:
    today = datetime.now(timezone.utc).date().isoformat()
    contracts_today = sum(
        1
        for c in contracts.values()
        if str(c.get("created_at", ""))[:10] == today
    )
    return {
        "contracts_total": len(contracts),
        "users_total": 1,
        "active_leads": 3,
        "contracts_today": contracts_today,
        "audit_events_total": len(audit_logs),
    }


@app.get("/admin/notifications")
def admin_notifications_list() -> Dict[str, Any]:
    return {"items": list(notifications_store), "total": len(notifications_store)}


# --- CRM ---

crm_leads: List[Dict[str, Any]] = [
    {
        "id": "crm-001",
        "full_name": "علی رضایی",
        "mobile": "09121111111",
        "need_type": "RENT",
        "status": "NEW",
        "notes": "دنبال آپارتمان ۲ خوابه در تهران",
        "assigned_to": None,
        "contract_id": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    },
    {
        "id": "crm-002",
        "full_name": "مریم احمدی",
        "mobile": "09122222222",
        "need_type": "BUY",
        "status": "CONTACTED",
        "notes": "بودجه ۵ میلیارد، منطقه ۵",
        "assigned_to": None,
        "contract_id": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    },
    {
        "id": "crm-003",
        "full_name": "حسن کریمی",
        "mobile": "09123333333",
        "need_type": "SELL",
        "status": "QUALIFIED",
        "notes": "آپارتمان ۸۰ متری در پونک",
        "assigned_to": None,
        "contract_id": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    },
]
crm_activities: Dict[str, List[Dict[str, Any]]] = {}
_crm_seq = 4


class CrmLeadCreateBody(BaseModel):
    full_name: str
    mobile: str
    need_type: str
    status: Optional[str] = "NEW"
    notes: Optional[str] = ""
    assigned_to: Optional[str] = None
    contract_id: Optional[str] = None


class CrmLeadPatchBody(BaseModel):
    full_name: Optional[str] = None
    mobile: Optional[str] = None
    need_type: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    assigned_to: Optional[str] = None
    contract_id: Optional[str] = None


class CrmActivityBody(BaseModel):
    lead_id: str
    type: str
    note: Optional[str] = ""
    user_id: Optional[str] = None


@app.get("/admin/crm/leads")
def crm_leads_list() -> List[Dict[str, Any]]:
    return list(crm_leads)


@app.get("/admin/crm/leads/{lead_id}")
def crm_lead_get(lead_id: str) -> Dict[str, Any]:
    row = next((l for l in crm_leads if l["id"] == lead_id), None)
    if not row:
        raise HTTPException(status_code=404, detail="not_found")
    return row


@app.post("/admin/crm/leads", status_code=201)
def crm_lead_create(body: CrmLeadCreateBody) -> Dict[str, Any]:
    global _crm_seq
    now = datetime.now(timezone.utc).isoformat()
    row = {
        "id": f"crm-{_crm_seq:03d}",
        "full_name": body.full_name,
        "mobile": body.mobile,
        "need_type": body.need_type,
        "status": body.status or "NEW",
        "notes": body.notes or "",
        "assigned_to": body.assigned_to,
        "contract_id": body.contract_id,
        "created_at": now,
        "updated_at": now,
    }
    _crm_seq += 1
    crm_leads.append(row)
    _audit_event(MOCK_USER["id"], "crm.lead.create", "lead", {"lead_id": row["id"]})
    return row


@app.patch("/admin/crm/leads/{lead_id}")
def crm_lead_patch(lead_id: str, body: CrmLeadPatchBody) -> Dict[str, Any]:
    row = next((l for l in crm_leads if l["id"] == lead_id), None)
    if not row:
        raise HTTPException(status_code=404, detail="not_found")
    patch = body.model_dump(exclude_none=True)
    row.update(patch)
    row["updated_at"] = datetime.now(timezone.utc).isoformat()
    _audit_event(MOCK_USER["id"], "crm.lead.update", "lead", {"lead_id": lead_id, **patch})
    return row


@app.get("/admin/crm/leads/{lead_id}/activities")
def crm_activities_list(lead_id: str) -> List[Dict[str, Any]]:
    return list(crm_activities.get(lead_id, []))


@app.post("/admin/crm/leads/{lead_id}/activities", status_code=201)
def crm_activity_create(lead_id: str, body: CrmActivityBody) -> Dict[str, Any]:
    row = next((l for l in crm_leads if l["id"] == lead_id), None)
    if not row:
        raise HTTPException(status_code=404, detail="not_found")
    act = {
        "id": f"act-{int(datetime.now(timezone.utc).timestamp() * 1000)}",
        "lead_id": lead_id,
        "type": body.type,
        "note": body.note or "",
        "user_id": body.user_id or MOCK_USER["id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    crm_activities.setdefault(lead_id, []).append(act)
    return act


# ---- Consultant platform (هم‌راستا با MSW consultantPlatformHandlers؛ برای consultant-ui + dev-mock-api) ----
CONSULTANT_TOKEN_PREFIX = "mock-consultant-"
consultant_profiles: Dict[str, Dict[str, Any]] = {}
consultant_applications_list: List[Dict[str, Any]] = []
consultant_leads_map: Dict[str, List[Dict[str, Any]]] = {}
_consultant_reg_seq = 1


def _consultant_seed() -> None:
    ts = datetime.now(timezone.utc).isoformat()
    consultant_profiles["cons-demo-001"] = {
        "id": "cons-demo-001",
        "full_name": "مشاور نمونه املاین",
        "mobile": "09121112233",
        "verification_tier": "VERIFIED",
        "application_status": "APPROVED",
        "credit_score": 82,
        "active_contracts_count": 4,
        "assigned_leads_count": 2,
    }
    consultant_applications_list.append(
        {
            "id": "cap-demo-001",
            "consultant_user_id": "cons-demo-001",
            "full_name": "مشاور نمونه املاین",
            "mobile": "09121112233",
            "national_code": "0012345678",
            "license_no": "نظام-۱۴۰۲-۰۰۱",
            "city": "تهران",
            "agency_name": "املاک نمونه",
            "status": "APPROVED",
            "reviewer_note": "تأیید اولیه",
            "submitted_at": ts,
            "updated_at": ts,
        }
    )
    consultant_leads_map["cons-demo-001"] = [
        {
            "id": "lead-c1",
            "title": "خرید آپارتمان ۱۲۰ متری",
            "city": "تهران",
            "stage": "تماس اولیه",
            "created_at": ts,
        },
        {
            "id": "lead-c2",
            "title": "اجاره دفتر کار",
            "city": "تهران",
            "stage": "بازدید",
            "created_at": ts,
        },
    ]


_consultant_seed()


def _consultant_id_from_auth(authorization: Optional[str]) -> Optional[str]:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    t = authorization[7:].strip()
    if not t.startswith(CONSULTANT_TOKEN_PREFIX):
        return None
    return t[len(CONSULTANT_TOKEN_PREFIX) :]


class ConsultantLoginBody(BaseModel):
    mobile: str


class ConsultantRegisterBody(BaseModel):
    full_name: str
    mobile: str
    national_code: str
    license_no: str
    city: str
    agency_name: Optional[str] = None


@app.post("/consultant/auth/login")
def consultant_auth_login(body: ConsultantLoginBody) -> Dict[str, Any]:
    if not (body.mobile or "").strip():
        raise HTTPException(status_code=422, detail="mobile_required")
    for p in consultant_profiles.values():
        if p.get("mobile") == body.mobile:
            token = f"{CONSULTANT_TOKEN_PREFIX}{p['id']}"
            return {"access_token": token, "user": p}
    raise HTTPException(status_code=404, detail="not_found")


@app.post("/consultant/auth/register")
def consultant_auth_register(body: ConsultantRegisterBody) -> Dict[str, Any]:
    global _consultant_reg_seq
    if not all([body.full_name, body.mobile, body.national_code, body.license_no, body.city]):
        raise HTTPException(status_code=422, detail="validation_error")
    uid = f"cons-reg-{_consultant_reg_seq}"
    _consultant_reg_seq += 1
    ts = datetime.now(timezone.utc).isoformat()
    consultant_profiles[uid] = {
        "id": uid,
        "full_name": body.full_name,
        "mobile": body.mobile,
        "verification_tier": "NONE",
        "application_status": "SUBMITTED",
        "credit_score": 0,
        "active_contracts_count": 0,
        "assigned_leads_count": 0,
    }
    app_id = f"cap-{uid}"
    consultant_applications_list.insert(
        0,
        {
            "id": app_id,
            "consultant_user_id": uid,
            "full_name": body.full_name,
            "mobile": body.mobile,
            "national_code": body.national_code,
            "license_no": body.license_no,
            "city": body.city,
            "agency_name": body.agency_name,
            "status": "SUBMITTED",
            "submitted_at": ts,
            "updated_at": ts,
        },
    )
    token = f"{CONSULTANT_TOKEN_PREFIX}{uid}"
    return {"access_token": token, "user": consultant_profiles[uid]}


@app.get("/consultant/me")
def consultant_me(
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> Dict[str, Any]:
    cid = _consultant_id_from_auth(authorization)
    if not cid:
        raise HTTPException(status_code=401, detail="unauthorized")
    p = consultant_profiles.get(cid)
    if not p:
        raise HTTPException(status_code=404, detail="not_found")
    return p


@app.get("/consultant/application")
def consultant_application_get(
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> Any:
    cid = _consultant_id_from_auth(authorization)
    if not cid:
        raise HTTPException(status_code=401, detail="unauthorized")
    row = next((a for a in consultant_applications_list if a.get("consultant_user_id") == cid), None)
    return row


@app.get("/consultant/dashboard/summary")
def consultant_dashboard_summary(
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> Dict[str, Any]:
    cid = _consultant_id_from_auth(authorization)
    if not cid:
        raise HTTPException(status_code=401, detail="unauthorized")
    p = consultant_profiles.get(cid)
    if not p:
        raise HTTPException(status_code=404, detail="not_found")
    tier = p.get("verification_tier")
    benefits = {
        "commission_boost_percent": 5 if tier == "PREMIUM" else (2 if tier == "VERIFIED" else 0),
        "crm_priority": tier != "NONE",
        "featured_listing_slots": 3 if tier == "PREMIUM" else (1 if tier == "VERIFIED" else 0),
    }
    next_steps: List[Dict[str, str]] = []
    if p.get("application_status") != "APPROVED":
        next_steps = [
            {"title": "تکمیل پرونده", "description": "مدارک و تأیید هویت توسط کارشناس املاین"}
        ]
    return {"profile": p, "benefits": benefits, "next_steps": next_steps}


@app.get("/consultant/leads")
def consultant_leads_list(
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> Dict[str, Any]:
    cid = _consultant_id_from_auth(authorization)
    if not cid:
        raise HTTPException(status_code=401, detail="unauthorized")
    items = list(consultant_leads_map.get(cid, []))
    return {"items": items, "total": len(items)}


from mock_extended import register_extended_routes

register_extended_routes(app)