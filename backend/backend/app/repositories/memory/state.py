"""In-memory stores migrated from dev-mock-api (bootstrap until Postgres)."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Set

from app.core.errors import AmlineError
from app.domain.contracts.ssot import lifecycle_status_to_product_v2

FULL_ADMIN_PERMS = [
    "legal:read",
    "legal:write",
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
    "crm:read",
    "crm:write",
]


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _parties_for_api_response(parties: Any) -> Any:
    """Drop embedded ``contract`` snapshots on party rows to avoid JSON cycles."""

    if not isinstance(parties, dict):
        return parties
    out: Dict[str, Any] = {}
    for bucket, lst in parties.items():
        if isinstance(lst, list):
            clean: List[Dict[str, Any]] = []
            for p in lst:
                if isinstance(p, dict):
                    clean.append({k: v for k, v in p.items() if k != "contract"})
                else:
                    clean.append(p)  # type: ignore[arg-type]
            out[bucket] = clean
        else:
            out[bucket] = lst
    return out


@dataclass
class MemoryStore:
    roles: List[Dict[str, Any]] = field(default_factory=list)
    mock_user: Dict[str, Any] = field(default_factory=dict)
    audit_logs: List[Dict[str, Any]] = field(default_factory=list)
    notifications_store: List[Dict[str, Any]] = field(default_factory=list)
    sessions_store: List[Dict[str, Any]] = field(default_factory=list)
    activity_by_user_day: Dict[str, int] = field(default_factory=dict)
    audit_seq: int = 1
    contracts: Dict[str, Dict[str, Any]] = field(default_factory=dict)
    id_counter: int = 1
    crm_leads: List[Dict[str, Any]] = field(default_factory=list)
    crm_activities: Dict[str, List[Dict[str, Any]]] = field(default_factory=dict)
    crm_tasks_by_lead: Dict[str, List[Dict[str, Any]]] = field(default_factory=dict)
    crm_task_seq: int = 1
    crm_seq: int = 4
    notification_reads: Dict[str, Set[str]] = field(default_factory=dict)

    def __post_init__(self) -> None:
        self.roles = [
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
        self.mock_user = {
            "id": "mock-001",
            "mobile": "09120000000",
            "full_name": "Dev User",
            "role": "admin",
            "role_id": "role-admin",
            "permissions": list(FULL_ADMIN_PERMS),
        }
        self.notifications_store = [
            {
                "id": "n1",
                "type": "contract",
                "title": "قرارداد جدید ثبت شد",
                "body": "یک قرارداد در صف بررسی است.",
                "read": False,
                "created_at": _now_iso(),
            },
            {
                "id": "n2",
                "type": "legal",
                "title": "پرونده در صف حقوقی",
                "body": "یک مورد برای بررسی حقوقی در انتظار است.",
                "read": False,
                "created_at": _now_iso(),
            },
        ]
        self.crm_leads = [
            {
                "id": "crm-001",
                "full_name": "علی رضایی",
                "mobile": "09121111111",
                "need_type": "RENT",
                "status": "NEW",
                "notes": "دنبال آپارتمان ۲ خوابه در تهران",
                "assigned_to": None,
                "contract_id": None,
                "created_at": _now_iso(),
                "updated_at": _now_iso(),
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
                "created_at": _now_iso(),
                "updated_at": _now_iso(),
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
                "created_at": _now_iso(),
                "updated_at": _now_iso(),
            },
        ]

    def user_with_permissions(self) -> Dict[str, Any]:
        u = {**self.mock_user}
        rid = u.get("role_id")
        if rid:
            for r in self.roles:
                if r["id"] == rid:
                    u["permissions"] = list(r["permissions"])
                    break
        return u

    def audit_event(
        self,
        user_id: str,
        action: str,
        entity: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        ev = {
            "id": f"aud-{self.audit_seq}",
            "user_id": user_id,
            "action": action,
            "entity": entity,
            "metadata": metadata or {},
            "created_at": _now_iso(),
        }
        self.audit_seq += 1
        self.audit_logs.insert(0, ev)
        day = ev["created_at"][:10]
        key = f"{user_id}:{day}"
        self.activity_by_user_day[key] = self.activity_by_user_day.get(key, 0) + 1
        return ev

    def next_contract_id(self) -> str:
        cid = f"contract-{self.id_counter:03d}"
        self.id_counter += 1
        return cid

    def contract_json(self, c: Dict[str, Any]) -> Dict[str, Any]:
        out: Dict[str, Any] = {
            "id": c["id"],
            "type": c["type"],
            "status": c["status"],
            "step": c["step"],
            "parties": _parties_for_api_response(c.get("parties", {})),
            "is_owner": True,
            "key": "mock-key",
            "password": None,
            "created_at": c.get("created_at", _now_iso()),
        }
        if "ssot_kind" in c:
            out["ssot_kind"] = c["ssot_kind"]
        out["external_refs"] = c.get(
            "external_refs",
            {"khodnevis_id": None, "katib_id": None, "tracking_code": None},
        )
        out["created_by"] = c.get("created_by")
        out["witnesses"] = c.get("witnesses", [])
        out["amendments"] = c.get("amendments", [])
        out["payments"] = c.get("payments", {})
        for k in (
            "flow_version",
            "home_info",
            "dating_info",
            "mortgage_info",
            "renting_info",
            "signings",
            "signature_events",
            "witness",
        ):
            if k in c:
                out[k] = c[k]
        out["next_step"] = c.get("step")
        out["lifecycle_v2"] = lifecycle_status_to_product_v2(
            str(c.get("status", "")),
            substate=c.get("substate"),
        )
        if "terms" in c:
            out["terms"] = c["terms"]
        if "commissions" in c:
            out["commissions"] = c["commissions"]
        if c.get("substate") is not None:
            out["substate"] = c["substate"]
        return out

    def get_contract(self, cid: str) -> Dict[str, Any]:
        c = self.contracts.get(cid)
        if not c:
            raise AmlineError(
                "CONTRACT_NOT_FOUND",
                "قرارداد یافت نشد.",
                status_code=404,
                details={"contract_id": cid},
            )
        return c

    def list_notifications_for_user(
        self,
        user_id: str,
        *,
        unread_only: bool = False,
        limit: int = 50,
    ) -> tuple[List[Dict[str, Any]], int, int]:
        read_set = self.notification_reads.setdefault(user_id, set())
        ordered = list(reversed(self.notifications_store))
        items: List[Dict[str, Any]] = []
        for n in ordered:
            nid = str(n["id"])
            merged = {**n, "read": nid in read_set}
            if unread_only and merged["read"]:
                continue
            items.append(merged)
            if len(items) >= limit:
                break
        unread_count = sum(1 for n in self.notifications_store if str(n["id"]) not in read_set)
        return items, len(self.notifications_store), unread_count

    def mark_notification_read(self, user_id: str, nid: str) -> bool:
        ids = {str(n["id"]) for n in self.notifications_store}
        if nid not in ids:
            return False
        self.notification_reads.setdefault(user_id, set()).add(nid)
        return True

    def mark_all_notifications_read(self, user_id: str) -> None:
        rs = self.notification_reads.setdefault(user_id, set())
        for n in self.notifications_store:
            rs.add(str(n["id"]))

    def operations_pulse(self, user_id: str) -> Dict[str, Any]:
        """خلاصهٔ لحظه‌ای برای داشبورد عملیات / محصول (mock)."""
        read_set = self.notification_reads.setdefault(user_id, set())
        unread = sum(1 for n in self.notifications_store if str(n["id"]) not in read_set)

        crm_by_status: Dict[str, int] = {}
        terminal = {"LOST", "CONTRACTED"}
        open_leads = 0
        for lead in self.crm_leads:
            st = str(lead.get("status") or "UNKNOWN")
            crm_by_status[st] = crm_by_status.get(st, 0) + 1
            if st not in terminal:
                open_leads += 1

        legalish = 0
        for c in self.contracts.values():
            st = str(c.get("status", "")).upper()
            sub = str(c.get("substate") or "").upper()
            if "LEGAL" in sub or st in (
                "LEGAL_REVIEW",
                "PENDING_LEGAL",
                "AWAITING_LEGAL",
            ):
                legalish += 1

        cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
        audit_24h = 0
        for ev in self.audit_logs:
            raw = str(ev.get("created_at") or "")
            try:
                ts = raw.replace("Z", "+00:00")
                dt = datetime.fromisoformat(ts)
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
                if dt >= cutoff:
                    audit_24h += 1
            except (ValueError, TypeError):
                continue

        return {
            "unread_notifications": unread,
            "open_crm_leads": open_leads,
            "crm_by_status": crm_by_status,
            "contracts_flagged_legal": legalish,
            "audit_events_last_24h": audit_24h,
        }

    def append_notification(
        self,
        *,
        title: str,
        body: str = "",
        notif_type: str = "system",
    ) -> Dict[str, Any]:
        nid = f"n-{self.id_counter}"
        self.id_counter += 1
        row = {
            "id": nid,
            "type": notif_type,
            "title": title,
            "body": body,
            "read": False,
            "created_at": _now_iso(),
        }
        self.notifications_store.append(row)
        return row


_store: Optional[MemoryStore] = None


def get_store() -> MemoryStore:
    global _store
    if _store is None:
        _store = MemoryStore()
    return _store
