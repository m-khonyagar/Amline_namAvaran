"""In-memory stores migrated from dev-mock-api (bootstrap until Postgres)."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from app.core.errors import AmlineError

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
    crm_seq: int = 4

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
                "title": "قرارداد جدید ثبت شد",
                "body": "یک قرارداد در صف بررسی است.",
                "read": False,
                "created_at": _now_iso(),
            }
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


_store: Optional[MemoryStore] = None


def get_store() -> MemoryStore:
    global _store
    if _store is None:
        _store = MemoryStore()
    return _store
