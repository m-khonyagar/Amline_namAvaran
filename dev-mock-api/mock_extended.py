"""
مسیرهای تکمیلی dev-mock-api برای هم‌ترازی با admin-ui (بدون MSW).
با import تنبل به main به state مشترک (contracts، ROLES، notifications_store، …) دسترسی دارد.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import Body, FastAPI, HTTPException
from pydantic import BaseModel

import state


def _now() -> str:
    return state.now_iso()


def _seed_user_extras(uid: str) -> None:
    if state.user_timelines.get(uid):
        return
    ts = _now()
    state.user_timelines.setdefault(uid, []).append(
        {
            "id": "tl-1",
            "type": "CHAT",
            "title": "گفتگوی پشتیبانی",
            "detail": "درخواست راهنمایی برای قرارداد",
            "created_at": ts,
        }
    )
    state.user_payments.setdefault(uid, []).append(
        {
            "id": "pay-1",
            "amount": 500_000,
            "currency": "IRR",
            "status": "PAID",
            "description": "پرداخت کارمزد نمونه",
            "reference": "REF-001",
            "created_at": ts,
        }
    )
    state.user_ledgers.setdefault(uid, []).append(
        {
            "id": "led-1",
            "delta": 500_000,
            "balance_after": 500_000,
            "reason": "شارژ کیف",
            "created_at": ts,
        }
    )
    state.user_tickets.setdefault(uid, []).append(
        {
            "id": "tic-1",
            "subject": "درخواست پشتیبانی",
            "body": "متن نمونه تیکت",
            "status": "OPEN",
            "priority": "normal",
            "assigned_to_name": "پشتیبانی",
            "referred_to_name": None,
            "created_at": ts,
            "updated_at": ts,
        }
    )


def _detail_user(uid: str) -> Dict[str, Any]:
    import main as m

    base = dict(m.MOCK_USER)
    base.update(
        {
            "national_code": "0012345678",
            "email": "dev@example.com",
            "is_active": True,
            "created_at": base.get("created_at", _now()),
            "last_login": _now(),
            "verification_status": "VERIFIED",
            "verified_at": _now(),
            "verified_by_name": "سیستم",
            "verification_note": None,
            "wallet_balance": 500_000,
            "credit_limit": 2_000_000,
            "internal_notes": "",
            "tags": ["vip"],
            "address": "تهران",
            "birth_date": None,
            "gender": None,
            "source": "mock",
            "profile": {
                "avatar": None,
                "birth_date": None,
                "address": "تهران",
                "gender": None,
            },
        }
    )
    return base


class NotifPatchBody(BaseModel):
    read: bool


class AddendumBody(BaseModel):
    subject: str
    content: str


class UserPatchBody(BaseModel):
    full_name: Optional[str] = None
    internal_notes: Optional[str] = None
    tags: Optional[List[str]] = None
    is_active: Optional[bool] = None


class VerificationBody(BaseModel):
    status: str
    note: Optional[str] = None


class TicketCreateBody(BaseModel):
    subject: str
    body: str
    priority: Optional[str] = "normal"


class TicketPatchBody(BaseModel):
    status: Optional[str] = None


class BulkImportBody(BaseModel):
    mobiles: List[str]


class WsTaskCreate(BaseModel):
    title: str
    assignee_name: Optional[str] = None
    due_at: Optional[str] = None
    priority: Optional[str] = "medium"


class WsTaskPatch(BaseModel):
    status: Optional[str] = None


class WsFileCreate(BaseModel):
    title: str
    kind: Optional[str] = "upload"
    url: Optional[str] = None
    embed_url: Optional[str] = None
    created_by: Optional[str] = None


class ConsultantAppPatch(BaseModel):
    status: str
    reviewer_note: Optional[str] = None


def register_extended_routes(app: FastAPI) -> None:
    import main as m

    _seed_user_extras("mock-001")

    # --- Admin contract moderation ---
    @app.post("/admin/contracts/{contract_id}/approve")
    def admin_contract_approve(contract_id: str) -> Dict[str, Any]:
        c = m.contracts.get(contract_id)
        if not c:
            raise HTTPException(status_code=404, detail="not_found")
        c["status"] = "ACTIVE"
        return {"ok": True}

    @app.post("/admin/contracts/{contract_id}/reject")
    def admin_contract_reject(contract_id: str) -> Dict[str, Any]:
        c = m.contracts.get(contract_id)
        if not c:
            raise HTTPException(status_code=404, detail="not_found")
        c["status"] = "REJECTED"
        return {"ok": True}

    @app.post("/admin/contracts/{contract_id}/revoke")
    def admin_contract_revoke(contract_id: str) -> Dict[str, Any]:
        c = m.contracts.get(contract_id)
        if not c:
            raise HTTPException(status_code=404, detail="not_found")
        c["status"] = "REVOKED"
        return {"ok": True}

    # --- Addendum stubs (ویزارد ادمین) ---
    @app.post("/contracts/{contract_id}/addendum")
    def contract_addendum(
        contract_id: str, payload: AddendumBody = Body(...)
    ) -> Dict[str, Any]:
        c = m._get(contract_id)
        if c.get("status") in ("REVOKED", "REJECTED"):
            raise HTTPException(status_code=400, detail="addendum_not_allowed")
        aid = str(uuid.uuid4())
        row = {"id": aid, "subject": payload.subject, "status": "DRAFT", "content": payload.content}
        c.setdefault("addendums", []).append(row)
        return {"id": aid, "subject": payload.subject, "status": "DRAFT"}

    @app.post("/contracts/{contract_id}/addendum/sign/initiate")
    def contract_addendum_sign_initiate(contract_id: str) -> Dict[str, Any]:
        m._get(contract_id)
        return {"ok": True}

    # --- Users list (شکل UsersListResponse) ---
    @app.get("/admin/users")
    def admin_users_list(
        page: int = 1,
        limit: int = 20,
        search: Optional[str] = None,
        role: Optional[str] = None,
        verification_status: Optional[str] = None,
        is_active: Optional[str] = None,
    ) -> Dict[str, Any]:
        u = _detail_user("mock-001")
        item = {
            "id": u["id"],
            "mobile": u["mobile"],
            "full_name": u.get("full_name"),
            "role": u.get("role", "admin"),
            "created_at": u.get("created_at", _now()),
            "last_login": u.get("last_login"),
            "is_active": u.get("is_active", True),
            "verification_status": u.get("verification_status", "VERIFIED"),
            "wallet_balance": u.get("wallet_balance", 0),
            "tags": u.get("tags", []),
        }
        rows = [item]
        if search:
            s = search.lower()
            rows = [r for r in rows if s in r["mobile"].lower() or (r.get("full_name") or "").lower().find(s) >= 0]
        if role:
            rows = [r for r in rows if r["role"] == role]
        if verification_status:
            rows = [r for r in rows if (r.get("verification_status") or "") == verification_status]
        if is_active == "true":
            rows = [r for r in rows if r["is_active"]]
        elif is_active == "false":
            rows = [r for r in rows if not r["is_active"]]
        total = len(rows)
        return {"items": rows, "total": total, "page": page, "limit": limit}

    @app.get("/admin/users/{user_id}")
    def admin_user_detail(user_id: str) -> Dict[str, Any]:
        if user_id != "mock-001":
            raise HTTPException(status_code=404, detail="not_found")
        return _detail_user(user_id)

    @app.patch("/admin/users/{user_id}")
    def admin_user_patch(
        user_id: str, payload: UserPatchBody = Body(...)
    ) -> Dict[str, Any]:
        if user_id != "mock-001":
            raise HTTPException(status_code=404, detail="not_found")
        u = _detail_user(user_id)
        patch = payload.model_dump(exclude_none=True)
        u.update(patch)
        return u

    @app.post("/admin/users/{user_id}/verification")
    def admin_user_verification(
        user_id: str, payload: VerificationBody = Body(...)
    ) -> Dict[str, Any]:
        if user_id != "mock-001":
            raise HTTPException(status_code=404, detail="not_found")
        u = _detail_user(user_id)
        u["verification_status"] = payload.status
        u["verification_note"] = payload.note
        u["verified_at"] = _now()
        return u

    @app.get("/admin/users/{user_id}/timeline")
    def admin_user_timeline(user_id: str) -> Dict[str, Any]:
        return {"items": list(state.user_timelines.get(user_id, []))}

    @app.get("/admin/users/{user_id}/payments")
    def admin_user_payments(user_id: str) -> Dict[str, Any]:
        return {"items": list(state.user_payments.get(user_id, []))}

    @app.get("/admin/users/{user_id}/wallet/ledger")
    def admin_user_ledger(user_id: str) -> Dict[str, Any]:
        return {"items": list(state.user_ledgers.get(user_id, []))}

    @app.get("/admin/users/{user_id}/tickets")
    def admin_user_tickets(user_id: str) -> Dict[str, Any]:
        return {"items": list(state.user_tickets.get(user_id, []))}

    @app.post("/admin/users/{user_id}/tickets")
    def admin_user_ticket_create(
        user_id: str, payload: TicketCreateBody = Body(...)
    ) -> Dict[str, Any]:
        ts = _now()
        t = {
            "id": f"tic-{int(datetime.now(timezone.utc).timestamp() * 1000)}",
            "subject": payload.subject,
            "body": payload.body,
            "status": "OPEN",
            "priority": payload.priority or "normal",
            "assigned_to_name": None,
            "referred_to_name": None,
            "created_at": ts,
            "updated_at": ts,
        }
        state.user_tickets.setdefault(user_id, []).insert(0, t)
        return t

    @app.patch("/admin/users/{user_id}/tickets/{ticket_id}")
    def admin_user_ticket_patch(
        user_id: str, ticket_id: str, payload: TicketPatchBody = Body(...)
    ) -> Dict[str, Any]:
        for t in state.user_tickets.get(user_id, []):
            if t["id"] == ticket_id:
                if payload.status:
                    t["status"] = payload.status
                t["updated_at"] = _now()
                return t
        raise HTTPException(status_code=404, detail="not_found")

    @app.get("/admin/staff/options")
    def admin_staff_options() -> Dict[str, Any]:
        return {"items": list(state.staff_options)}

    @app.get("/admin/analytics/users-summary")
    def admin_analytics_users_summary() -> Dict[str, Any]:
        return {
            "new_registrations_30d": 1,
            "active_users_7d": 1,
            "chat_sessions_30d": 5,
            "voice_calls_30d": 3,
            "contracts_completed_30d": 2,
            "commissions_paid_30d": 1_000_000,
            "pending_verifications": 0,
            "open_tickets": 1,
            "total_users": 1,
        }

    @app.post("/admin/users/bulk-import")
    def admin_users_bulk_import(payload: BulkImportBody = Body(...)) -> Dict[str, Any]:
        n = len(payload.mobiles or [])
        return {"created": 0, "skipped": n, "total": n}

    # --- Notifications ---
    @app.patch("/admin/notifications/{notification_id}")
    def admin_notification_patch(
        notification_id: str, payload: NotifPatchBody = Body(...)
    ) -> Dict[str, Any]:
        for n in m.notifications_store:
            if n.get("id") == notification_id:
                n["read"] = payload.read
                return n
        raise HTTPException(status_code=404, detail="not_found")

    @app.post("/admin/notifications/read-all")
    def admin_notifications_read_all() -> Dict[str, Any]:
        for n in m.notifications_store:
            n["read"] = True
        return {"ok": True}

    # --- Roles DELETE ---
    @app.delete("/admin/roles/{role_id}")
    def admin_role_delete(role_id: str) -> Dict[str, Any]:
        if role_id in ("role-admin", "role-support", "role-supervisor"):
            raise HTTPException(status_code=400, detail="system_role")
        for i, r in enumerate(m.ROLES):
            if r["id"] == role_id:
                m.ROLES.pop(i)
                return {"ok": True}
        raise HTTPException(status_code=404, detail="not_found")

    # --- Ads & wallets (ادمین) ---
    @app.get("/admin/ads")
    def admin_ads_list() -> Dict[str, Any]:
        return {"items": list(state.ads), "total": len(state.ads)}

    def _wallets_admin_payload() -> Dict[str, Any]:
        return {
            "items": [
                {
                    "id": "wallet-mock-1",
                    "user_id": "mock-001",
                    "mobile": "09120000000",
                    "balance": 500_000,
                    "currency": "IRR",
                    "status": "ACTIVE",
                }
            ],
            "total": 1,
        }

    @app.get("/admin/wallets")
    def admin_wallets_list() -> Dict[str, Any]:
        return _wallets_admin_payload()

    # --- Hamgit-compatible financials (admin-ui قدیمی: wallet.js) ---
    @app.get("/admin/financials/wallets")
    def admin_financials_wallets_list() -> Dict[str, Any]:
        return _wallets_admin_payload()

    @app.post("/admin/financials/wallets/manual-charge")
    def admin_financials_wallet_manual_charge() -> Dict[str, Any]:
        return {"ok": True}

    @app.post("/admin/financials/wallets/bulk-manual-charge")
    def admin_financials_wallet_bulk_manual_charge() -> Dict[str, Any]:
        return {"ok": True}

    # --- PR contracts (سطح لیست؛ جزئیات بعداً با backend واقعی) ---
    @app.get("/admin/pr-contracts/list")
    def pr_contracts_list(
        page: int = 1,
        limit: int = 20,
    ) -> Dict[str, Any]:
        rows = list(state.pr_contracts)
        return {"items": rows, "total": len(rows), "page": page, "limit": limit}

    @app.get("/admin/pr-contracts/{contract_id}")
    def pr_contract_detail(contract_id: str) -> Dict[str, Any]:
        for c in state.pr_contracts:
            if c.get("id") == contract_id:
                return c
        raise HTTPException(status_code=404, detail="not_found")

    # --- Hamgit-aligned stubs (لیست خالی تا UI و هاب بدون 404) ---
    @app.get("/admin/settlements/users")
    def hamgit_settlements_users() -> Dict[str, Any]:
        return {"items": [], "total": 0}

    @app.patch("/admin/settlements")
    def hamgit_settlements_patch() -> Dict[str, Any]:
        return {"ok": True}

    @app.get("/admin/custom-invoices/users")
    def hamgit_custom_invoices_users() -> Dict[str, Any]:
        return {"items": [], "total": 0}

    @app.post("/admin/custom_payment_link")
    def hamgit_custom_payment_link() -> Dict[str, Any]:
        return {"ok": True, "link": "https://example.com/pay/mock"}

    @app.get("/admin/ads/properties")
    def hamgit_ads_properties() -> Dict[str, Any]:
        return {"items": [], "total": 0}

    @app.get("/admin/ads/visit-requests")
    def hamgit_ads_visit_requests() -> Dict[str, Any]:
        return {"items": [], "total": 0}

    @app.get("/admin/ads/wanted/properties")
    def hamgit_wanted_properties() -> Dict[str, Any]:
        return {"items": [], "total": 0}

    @app.get("/admin/ads/swaps")
    def hamgit_swaps() -> Dict[str, Any]:
        return {"items": [], "total": 0}

    @app.get("/admin/contracts/base-clauses")
    def hamgit_base_clauses() -> Dict[str, Any]:
        return {"items": [], "total": 0}

    @app.get("/financials/promos")
    def hamgit_promos_list() -> Dict[str, Any]:
        return {"items": [], "total": 0}

    @app.post("/financials/promos/generate")
    def hamgit_promos_generate() -> Dict[str, Any]:
        return {"ok": True, "code": "MOCK-PROMO", "discount_type": "PERCENTAGE"}

    @app.post("/financials/promos/bulk-generate")
    def hamgit_promos_bulk() -> Dict[str, Any]:
        return {"ok": True, "count": 0}

    # --- Workspace ---
    def _ws_seed() -> None:
        if state.workspace_tasks:
            return
        ts = _now()
        state.workspace_tasks.extend(
            [
                {
                    "id": "wt-1",
                    "title": "پیگیری قراردادهای در انتظار تأیید ادمین",
                    "assignee_name": "کاربر آزمایشی",
                    "status": "DOING",
                    "due_at": ts,
                    "created_at": ts,
                    "priority": "high",
                },
                {
                    "id": "wt-2",
                    "title": "به‌روزرسانی لیست لیدهای CRM",
                    "assignee_name": "پشتیبانی",
                    "status": "TODO",
                    "due_at": None,
                    "created_at": ts,
                    "priority": "medium",
                },
            ]
        )
        state.workspace_presence.extend(
            [
                {
                    "user_id": "mock-001",
                    "full_name": "کاربر آزمایشی",
                    "status": "online",
                    "last_seen_at": ts,
                }
            ]
        )
        state.workspace_files.append(
            {
                "id": "wf-1",
                "title": "نمونه — سند گوگل",
                "kind": "upload",
                "url": None,
                "embed_url": None,
                "created_at": ts,
                "created_by": "سیستم",
            }
        )

    _ws_seed()

    @app.get("/admin/workspace/tasks")
    def ws_tasks_get() -> Dict[str, Any]:
        return {"items": list(state.workspace_tasks), "total": len(state.workspace_tasks)}

    @app.post("/admin/workspace/tasks", status_code=201)
    def ws_tasks_post(payload: WsTaskCreate = Body(...)) -> Dict[str, Any]:
        if not (payload.title or "").strip():
            raise HTTPException(status_code=422, detail="title_required")
        ts = _now()
        row = {
            "id": f"wt-{int(datetime.now(timezone.utc).timestamp() * 1000)}",
            "title": payload.title.strip(),
            "assignee_name": (payload.assignee_name or "تعیین‌نشده").strip(),
            "status": "TODO",
            "due_at": payload.due_at,
            "created_at": ts,
            "priority": payload.priority or "medium",
        }
        state.workspace_tasks.insert(0, row)
        return row

    @app.patch("/admin/workspace/tasks/{task_id}")
    def ws_tasks_patch(task_id: str, payload: WsTaskPatch = Body(...)) -> Dict[str, Any]:
        for t in state.workspace_tasks:
            if t["id"] == task_id:
                if payload.status:
                    t["status"] = payload.status
                return t
        raise HTTPException(status_code=404, detail="not_found")

    @app.get("/admin/workspace/presence")
    def ws_presence() -> Dict[str, Any]:
        return {"items": list(state.workspace_presence), "total": len(state.workspace_presence)}

    @app.get("/admin/workspace/files")
    def ws_files_get() -> Dict[str, Any]:
        return {"items": list(state.workspace_files), "total": len(state.workspace_files)}

    @app.post("/admin/workspace/files", status_code=201)
    def ws_files_post(payload: WsFileCreate = Body(...)) -> Dict[str, Any]:
        if not (payload.title or "").strip():
            raise HTTPException(status_code=422, detail="title_required")
        ts = _now()
        row = {
            "id": f"wf-{int(datetime.now(timezone.utc).timestamp() * 1000)}",
            "title": payload.title.strip(),
            "kind": payload.kind or "upload",
            "url": payload.url,
            "embed_url": payload.embed_url,
            "created_at": ts,
            "created_by": (payload.created_by or "شما").strip(),
        }
        state.workspace_files.insert(0, row)
        return row

    @app.delete("/admin/workspace/files/{file_id}")
    def ws_files_delete(file_id: str) -> Dict[str, Any]:
        for i, f in enumerate(state.workspace_files):
            if f["id"] == file_id:
                state.workspace_files.pop(i)
                return {"ok": True}
        raise HTTPException(status_code=404, detail="not_found")

    # --- Admin consultant applications (همان لیست consultant_applications_list) ---
    @app.get("/admin/consultants/applications")
    def admin_consultant_applications(
        status: Optional[str] = None,
    ) -> Dict[str, Any]:
        rows = list(m.consultant_applications_list)
        if status:
            rows = [r for r in rows if (r.get("status") or "") == status]
        return {"items": rows, "total": len(rows)}

    @app.patch("/admin/consultants/applications/{application_id}")
    def admin_consultant_app_patch(
        application_id: str, payload: ConsultantAppPatch = Body(...)
    ) -> Dict[str, Any]:
        for r in m.consultant_applications_list:
            if r.get("id") == application_id:
                r["status"] = payload.status
                if payload.reviewer_note is not None:
                    r["reviewer_note"] = payload.reviewer_note
                r["updated_at"] = _now()
                uid = r.get("consultant_user_id")
                if uid and uid in m.consultant_profiles:
                    p = m.consultant_profiles[uid]
                    if payload.status == "APPROVED":
                        p["application_status"] = "APPROVED"
                        p["verification_tier"] = "VERIFIED"
                return r
        raise HTTPException(status_code=404, detail="not_found")
