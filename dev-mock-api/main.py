"""Dev mock API for local frontend testing (no production use)."""
from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import Body, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="Amline Dev Mock API", version="0.1.0")

_MAGIC_MOBILE_RAW = (os.getenv("AMLINE_OTP_MAGIC_MOBILE") or "09107709601").strip()
_MAGIC_CODE = (os.getenv("AMLINE_OTP_MAGIC_CODE") or "11111").strip()


def _magic_feature_on() -> bool:
    """Dev mock: magic OTP on by default; set AMLINE_OTP_MAGIC_ENABLED=0 to disable."""
    raw = os.getenv("AMLINE_OTP_MAGIC_ENABLED")
    if raw is None or not str(raw).strip():
        return True
    return str(raw).strip().lower() not in ("0", "false", "no", "off")


def _norm_mobile(phone: str) -> str:
    d = "".join(c for c in (phone or "") if c.isdigit())
    if d.startswith("98") and len(d) >= 12:
        d = "0" + d[2:]
    if len(d) == 10 and d.startswith("9"):
        d = "0" + d
    return d


def _magic_norm() -> str:
    return _norm_mobile(_MAGIC_MOBILE_RAW)


def _is_magic_mobile(phone: str) -> bool:
    if not _magic_feature_on():
        return False
    return _norm_mobile(phone) == _magic_norm()


def _magic_otp_ok(phone: str, otp: str) -> bool:
    return _is_magic_mobile(phone) and (otp or "").strip() == _MAGIC_CODE


def _otp_debug_for_mobile(mobile: Optional[str]) -> str:
    return _MAGIC_CODE if mobile and _is_magic_mobile(mobile) else "424242"

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
        "http://localhost:3004",
        "http://localhost:3005",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://127.0.0.1:3002",
        "http://127.0.0.1:3004",
        "http://127.0.0.1:3005",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def api_v1_compat_rewrite(request, call_next):
    """
    Compatibility layer for frontends that call `/api/v1/*`.
    Dev mock endpoints are defined as `/*`, so we rewrite the incoming path.
    """
    path = request.scope.get("path") or ""
    if path.startswith("/api/v1/"):
        request.scope["path"] = path[len("/api/v1") :]
    elif path == "/api/v1":
        request.scope["path"] = "/"
    return await call_next(request)

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
    "mobile": "09120000000",
    "full_name": "Dev User",
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

# Used by mock_extended (consultant applications stubs)
consultant_applications_list: List[Dict[str, Any]] = []
consultant_profiles: Dict[str, Dict[str, Any]] = {}


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


def _next_id() -> str:
    global id_counter
    cid = f"contract-{id_counter:03d}"
    id_counter += 1
    return cid


def _contract_json(c: Dict[str, Any]) -> Dict[str, Any]:
    out: Dict[str, Any] = {
        "id": c["id"],
        "type": c["type"],
        "status": c["status"],
        "step": c["step"],
        "parties": c.get("parties", {}),
        "is_owner": True,
        "key": "mock-key",
        "password": None,
        "created_at": c.get("created_at", datetime.now(timezone.utc).isoformat()),
        "next_step": c.get("step"),
    }
    for k in (
        "flow_version",
        "home_info",
        "dating_info",
        "mortgage_info",
        "renting_info",
        "signings",
        "witness",
    ):
        if k in c:
            out[k] = c[k]
    return out


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
    return {"success": True, "message": "ok"}


class LoginBody(BaseModel):
    mobile: str
    otp: str


@app.post("/admin/login")
def admin_login(_body: LoginBody) -> Dict[str, Any]:
    if _is_magic_mobile(_body.mobile) and not _magic_otp_ok(_body.mobile, _body.otp):
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
        "parties": {},
        "created_at": now,
        "flow_version": "0.1.3",
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
        "status": c["status"],
        "step": c["step"],
        "contract_id": c["id"],
        "type": c["type"],
        "next_step": c["step"],
    }


@app.get("/contracts/{contract_id}/commission/invoice")
def commission_invoice(contract_id: str) -> Dict[str, Any]:
    c = _get(contract_id)
    return {
        "total_amount": 5_000_000,
        "landlord_share": 2_500_000,
        "tenant_share": 2_500_000,
        "invoice_id": f"inv-{c['id']}",
    }


class CommissionPayBody(BaseModel):
    model_config = {"extra": "ignore"}
    use_wallet_credit: bool = False


@app.post("/contracts/{contract_id}/commission/pay")
def commission_pay(
    contract_id: str,
    body: CommissionPayBody = Body(default_factory=CommissionPayBody),
) -> Dict[str, Any]:
    c = _get(contract_id)
    if c.get("status") != "PENDING_COMMISSION":
        raise HTTPException(status_code=400, detail="commission_not_pending")
    c["status"] = "DRAFT"
    return {"ok": True, "paid": True, "used_wallet": bool(body.use_wallet_credit)}


@app.post("/contracts/{contract_id}/revoke")
def contracts_revoke(contract_id: str) -> Dict[str, Any]:
    c = _get(contract_id)
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


class SectionPatchBody(BaseModel):
    next_step: Optional[str] = None
    payload: Optional[Dict[str, Any]] = None


class SignRequestMock(BaseModel):
    model_config = {"extra": "ignore"}
    mobile: Optional[str] = None
    party_id: Optional[str] = None


class WitnessRequestMock(BaseModel):
    model_config = {"extra": "ignore"}
    national_code: str = ""
    mobile: str = ""
    witness_type: Optional[str] = None
    witness_name: Optional[str] = None


class WitnessVerifyMock(BaseModel):
    model_config = {"extra": "ignore"}
    otp: str = ""
    mobile: str = ""
    national_code: str = ""
    salt: str = ""
    witness_type: Optional[str] = None
    next_step: Optional[str] = None


@app.post("/contracts/{contract_id}/party/landlord/set")
def landlord_set(contract_id: str, body: SetStepBody) -> Dict[str, Any]:
    c = _get(contract_id)
    nxt = body.next_step or "TENANT_INFORMATION"
    c["step"] = nxt
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
    c["step"] = nxt
    return {"next_step": nxt}


@app.delete("/contracts/{contract_id}/party/{party_id}")
def party_delete(contract_id: str, party_id: str) -> Dict[str, bool]:
    c = _get(contract_id)
    parties = c.get("parties") or {}
    for bucket in ("landlords", "tenants"):
        lst = parties.get(bucket) or []
        parties[bucket] = [p for p in lst if str(p.get("id")) != str(party_id)]
    c["parties"] = parties
    return {"ok": True}


@app.post("/contracts/{contract_id}/home-info", status_code=201)
def home_info(
    contract_id: str,
    body: SectionPatchBody = Body(default_factory=SectionPatchBody),
) -> Dict[str, Any]:
    c = _get(contract_id)
    if body.payload is not None:
        c["home_info"] = body.payload
    nxt = body.next_step or "DATING"
    c["step"] = nxt
    return {"next_step": nxt}


@app.post("/contracts/{contract_id}/dating", status_code=201)
def dating(
    contract_id: str,
    body: SectionPatchBody = Body(default_factory=SectionPatchBody),
) -> Dict[str, Any]:
    c = _get(contract_id)
    if body.payload is not None:
        c["dating_info"] = body.payload
    nxt = body.next_step or "MORTGAGE"
    c["step"] = nxt
    return {"next_step": nxt}


@app.post("/contracts/{contract_id}/mortgage", status_code=201)
def mortgage(
    contract_id: str,
    body: SectionPatchBody = Body(default_factory=SectionPatchBody),
) -> Dict[str, Any]:
    c = _get(contract_id)
    if c.get("step") != "MORTGAGE":
        raise HTTPException(
            status_code=422,
            detail={"code": "invalid_step_transition"},
        )
    if body.payload is not None:
        c["mortgage_info"] = body.payload
    nxt = body.next_step or (
        "SIGNING" if c["type"] == "BUYING_AND_SELLING" else "RENTING"
    )
    c["step"] = nxt
    return {"next_step": nxt}


@app.post("/contracts/{contract_id}/renting", status_code=201)
def renting(
    contract_id: str,
    body: SectionPatchBody = Body(default_factory=SectionPatchBody),
) -> Dict[str, Any]:
    c = _get(contract_id)
    if c["type"] == "BUYING_AND_SELLING":
        raise HTTPException(status_code=422, detail="renting_not_applicable_for_buy_sell")
    if body.payload is not None:
        c["renting_info"] = body.payload
    nxt = body.next_step or "SIGNING"
    c["step"] = nxt
    if c["type"] != "BUYING_AND_SELLING":
        c["status"] = "PENDING_COMMISSION"
    return {"next_step": nxt}


@app.post("/contracts/{contract_id}/sign/request", status_code=201)
def sign_request(
    contract_id: str,
    body: SignRequestMock = Body(default_factory=SignRequestMock),
) -> Dict[str, Any]:
    _get(contract_id)
    return {
        "ok": True,
        "challenge_id": "mock-challenge",
        "expires_in_seconds": 300,
        "masked_phone": "0912***0000",
        "debug_code": _otp_debug_for_mobile(body.mobile),
    }


@app.post("/contracts/{contract_id}/sign", status_code=201)
def sign(
    contract_id: str,
    body: SignRequestMock = Body(default_factory=SignRequestMock),
) -> Dict[str, Any]:
    c = _get(contract_id)
    if c.get("status") == "PENDING_COMMISSION":
        raise HTTPException(status_code=400, detail="commission_unpaid")
    return {
        "ok": True,
        "challenge_id": "mock-challenge",
        "expires_in_seconds": 300,
        "masked_phone": "0912***0000",
        "debug_code": _otp_debug_for_mobile(body.mobile),
    }


@app.post("/contracts/{contract_id}/sign/verify")
def sign_verify(_contract_id: str) -> Dict[str, Any]:
    return {"ok": True}


@app.post("/contracts/{contract_id}/sign/set")
def sign_set(
    contract_id: str,
    body: SectionPatchBody = Body(default_factory=SectionPatchBody),
) -> Dict[str, Any]:
    c = _get(contract_id)
    nxt = body.next_step or "WITNESS"
    c["step"] = nxt
    if body.payload is not None:
        rec = {
            "id": f"sign-mock-{int(datetime.now().timestamp() * 1000)}",
            "status": "SECTION_DONE",
            "payload": body.payload,
        }
        c.setdefault("signings", []).append(rec)
    return {"next_step": nxt}


@app.post("/contracts/{contract_id}/add-witness")
def add_witness(
    contract_id: str,
    body: SectionPatchBody = Body(default_factory=SectionPatchBody),
) -> Dict[str, Any]:
    c = _get(contract_id)
    nxt = body.next_step or "WITNESS"
    c["step"] = nxt
    return {"next_step": nxt}


@app.post("/contracts/{contract_id}/witness/send-otp", status_code=201)
def witness_send_otp(
    contract_id: str,
    body: WitnessRequestMock = Body(default_factory=WitnessRequestMock),
) -> Dict[str, Any]:
    _get(contract_id)
    return {
        "ok": True,
        "challenge_id": "mock-witness",
        "expires_in_seconds": 300,
        "masked_phone": (body.mobile or "")[:4] + "***" if body.mobile else "***",
        "debug_code": _MAGIC_CODE if _is_magic_mobile(body.mobile) else "131313",
    }


@app.post("/contracts/{contract_id}/witness/verify")
def witness_verify(
    contract_id: str,
    body: WitnessVerifyMock = Body(default_factory=WitnessVerifyMock),
) -> Dict[str, Any]:
    if _is_magic_mobile(body.mobile) and not _magic_otp_ok(body.mobile, body.otp):
        raise HTTPException(status_code=400, detail="invalid_or_expired_code")
    c = _get(contract_id)
    nxt = body.next_step or "FINISH"
    c["step"] = nxt
    c["status"] = "COMPLETED"
    c["witness"] = {
        "verified": True,
        "national_code": body.national_code,
        "witness_type": body.witness_type,
    }
    return {"ok": True, "next_step": nxt}


@app.post("/files/upload", status_code=201)
def files_upload() -> Dict[str, Any]:
    return {"id": "file-001", "url": None}


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
        "credit": 0,
        "user_id": "mock-001",
        "status": "ACTIVE",
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


from mock_extended import register_extended_routes

register_extended_routes(app)