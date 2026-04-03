"""سرویس جریان قرارداد (State Machine) — New Flow 0.1.3.

پس از هر عملیاتِ پیشرفت، ``next_step`` محاسبه و در پاسخ برگردانده می‌شود.
اعتبارسنجی گام با ``AMLINE_CONTRACT_STRICT_FLOW=1`` فعال می‌شود (پیش‌فرض: غیرفعال برای سازگاری با تست‌های امضا/شاهد بدون طی کامل ویزارد).
"""
from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from app.core.errors import AmlineError
from app.repositories.memory.state import get_store
from app.schemas.v1.contract_flow import (
    ContractStartBody,
    LandlordSetBody,
    PartyPatchBody,
    SectionPatchBody,
    TenantSetBody,
)


class FlowStep:
    LANDLORD_INFORMATION = "LANDLORD_INFORMATION"
    TENANT_INFORMATION = "TENANT_INFORMATION"
    PLACE_INFORMATION = "PLACE_INFORMATION"
    DATING = "DATING"
    MORTGAGE = "MORTGAGE"
    RENTING = "RENTING"
    SIGNING = "SIGNING"
    WITNESS = "WITNESS"
    FINISH = "FINISH"


def _strict_flow() -> bool:
    return os.getenv("AMLINE_CONTRACT_STRICT_FLOW", "").strip().lower() in ("1", "true", "yes")


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _require_step(c: Dict[str, Any], *allowed: str) -> None:
    if not _strict_flow():
        return
    cur = c.get("step")
    if cur not in allowed:
        raise AmlineError(
            "FLOW_STEP_MISMATCH",
            "گام فعلی قرارداد با این درخواست سازگار نیست.",
            status_code=409,
            details={"allowed": list(allowed), "current": cur},
        )


def _default_next_after_mortgage(c: Dict[str, Any]) -> str:
    if c.get("type") == "BUYING_AND_SELLING":
        return FlowStep.SIGNING
    return FlowStep.RENTING


class ContractFlowService:
    """همگام با مسیرهای ``/contracts/...`` و حافظهٔ سراسری."""

    def resolve_info(self) -> Dict[str, str]:
        return {"result": "ok"}

    def start(self, body: ContractStartBody) -> Dict[str, Any]:
        if not body.party_type:
            raise AmlineError(
                "VALIDATION_FAILED",
                "نوع طرف قرارداد الزامی است.",
                status_code=422,
                details={"field": "party_type"},
            )
        s = get_store()
        ctype = body.contract_type or "PROPERTY_RENT"
        cid = s.next_contract_id()
        now = _now_iso()
        c: Dict[str, Any] = {
            "id": cid,
            "type": ctype,
            "status": "DRAFT",
            "step": FlowStep.LANDLORD_INFORMATION,
            "parties": {},
            "created_at": now,
            "flow_version": "0.1.3",
        }
        s.contracts[cid] = c
        return s.contract_json(c)

    def list_contracts(self) -> List[Dict[str, Any]]:
        s = get_store()
        return [s.contract_json(x) for x in s.contracts.values()]

    def get_contract(self, contract_id: str) -> Dict[str, Any]:
        s = get_store()
        return s.contract_json(s.get_contract(contract_id))

    def status(self, contract_id: str) -> Dict[str, Any]:
        s = get_store()
        c = s.get_contract(contract_id)
        step = c["step"]
        return {
            "status": c["status"],
            "step": step,
            "contract_id": c["id"],
            "type": c["type"],
            "next_step": step,
        }

    def commission_invoice(self, contract_id: str) -> Dict[str, Any]:
        s = get_store()
        c = s.get_contract(contract_id)
        return {
            "total_amount": 5_000_000,
            "landlord_share": 2_500_000,
            "tenant_share": 2_500_000,
            "invoice_id": f"inv-{c['id']}",
        }

    def revoke(self, contract_id: str) -> Dict[str, Any]:
        s = get_store()
        c = s.get_contract(contract_id)
        c["status"] = "REVOKED"
        return {"ok": True}

    def create_landlord_party(self, contract_id: str) -> Dict[str, Any]:
        s = get_store()
        c = s.get_contract(contract_id)
        _require_step(c, FlowStep.LANDLORD_INFORMATION)
        party_id = f"party-landlord-{int(datetime.now().timestamp() * 1000)}"
        row = {
            "id": party_id,
            "contract": s.contract_json(c),
            "party_type": "LANDLORD",
            "person_type": "NATURAL_PERSON",
        }
        landlords = c.setdefault("parties", {}).setdefault("landlords", [])
        landlords.append(row)
        return row

    def patch_party(self, contract_id: str, party_id: str, body: PartyPatchBody) -> Dict[str, Any]:
        s = get_store()
        c = s.get_contract(contract_id)
        patch = body.model_dump(exclude_none=True)
        found: Dict[str, Any] | None = None
        for bucket in ("landlords", "tenants"):
            for row in c.get("parties", {}).get(bucket) or []:
                if str(row.get("id")) == str(party_id):
                    found = row
                    break
            if found:
                break
        if found is not None:
            for k, v in patch.items():
                if k in ("person_type", "natural_person_detail", "legal_person_detail", "mobile"):
                    found[k] = v
        pt = found.get("party_type", "LANDLORD") if found else "LANDLORD"
        ptype = found.get("person_type", "NATURAL_PERSON") if found else "NATURAL_PERSON"
        return {
            "id": party_id,
            "contract": s.contract_json(c),
            "party_type": pt,
            "person_type": ptype,
        }

    def landlord_set(self, contract_id: str, body: LandlordSetBody) -> Dict[str, Any]:
        s = get_store()
        c = s.get_contract(contract_id)
        _require_step(c, FlowStep.LANDLORD_INFORMATION)
        nxt = body.next_step or FlowStep.TENANT_INFORMATION
        c["step"] = nxt
        return {"next_step": nxt}

    def create_tenant_party(self, contract_id: str) -> Dict[str, Any]:
        s = get_store()
        c = s.get_contract(contract_id)
        _require_step(c, FlowStep.TENANT_INFORMATION)
        party_id = f"party-tenant-{int(datetime.now().timestamp() * 1000)}"
        row = {
            "id": party_id,
            "contract": s.contract_json(c),
            "party_type": "TENANT",
            "person_type": "NATURAL_PERSON",
        }
        tenants = c.setdefault("parties", {}).setdefault("tenants", [])
        tenants.append(row)
        return row

    def tenant_set(self, contract_id: str, body: TenantSetBody) -> Dict[str, Any]:
        s = get_store()
        c = s.get_contract(contract_id)
        _require_step(c, FlowStep.TENANT_INFORMATION)
        nxt = body.next_step or FlowStep.PLACE_INFORMATION
        c["step"] = nxt
        return {"next_step": nxt}

    def delete_party(self, contract_id: str, party_id: str) -> Dict[str, Any]:
        s = get_store()
        c = s.get_contract(contract_id)
        parties = c.get("parties") or {}
        for bucket in ("landlords", "tenants"):
            lst = parties.get(bucket) or []
            parties[bucket] = [p for p in lst if str(p.get("id")) != str(party_id)]
        c["parties"] = parties
        return {"ok": True}

    def set_home_info(self, contract_id: str, body: SectionPatchBody) -> Dict[str, Any]:
        s = get_store()
        c = s.get_contract(contract_id)
        _require_step(c, FlowStep.PLACE_INFORMATION)
        if body.payload is not None:
            c["home_info"] = body.payload
        nxt = body.next_step or FlowStep.DATING
        c["step"] = nxt
        return {"next_step": nxt}

    def set_dating(self, contract_id: str, body: SectionPatchBody) -> Dict[str, Any]:
        s = get_store()
        c = s.get_contract(contract_id)
        _require_step(c, FlowStep.DATING)
        if body.payload is not None:
            c["dating_info"] = body.payload
        nxt = body.next_step or FlowStep.MORTGAGE
        c["step"] = nxt
        return {"next_step": nxt}

    def set_mortgage(self, contract_id: str, body: SectionPatchBody) -> Dict[str, Any]:
        s = get_store()
        c = s.get_contract(contract_id)
        _require_step(c, FlowStep.MORTGAGE)
        if body.payload is not None:
            c["mortgage_info"] = body.payload
        nxt = body.next_step or _default_next_after_mortgage(c)
        c["step"] = nxt
        return {"next_step": nxt}

    def set_renting(self, contract_id: str, body: SectionPatchBody) -> Dict[str, Any]:
        s = get_store()
        c = s.get_contract(contract_id)
        if c.get("type") == "BUYING_AND_SELLING":
            raise AmlineError(
                "FLOW_INVALID_OPERATION",
                "برای قرارداد خرید و فروش مرحلهٔ رهن اجاره اعمال نمی‌شود.",
                status_code=422,
                details={"contract_type": c.get("type")},
            )
        _require_step(c, FlowStep.RENTING)
        if body.payload is not None:
            c["renting_info"] = body.payload
        nxt = body.next_step or FlowStep.SIGNING
        c["step"] = nxt
        return {"next_step": nxt}

    def sign_set(self, contract_id: str, body: SectionPatchBody) -> Dict[str, Any]:
        s = get_store()
        c = s.get_contract(contract_id)
        _require_step(c, FlowStep.SIGNING)
        nxt = body.next_step or FlowStep.WITNESS
        c["step"] = nxt
        rec = {
            "id": f"sign-{int(datetime.now().timestamp() * 1000)}",
            "status": "SECTION_DONE",
            "at": _now_iso(),
        }
        if body.payload:
            rec["payload"] = body.payload
        c.setdefault("signings", []).append(rec)
        return {"next_step": nxt}

    def add_witness(self, contract_id: str, body: SectionPatchBody) -> Dict[str, Any]:
        s = get_store()
        c = s.get_contract(contract_id)
        _require_step(c, FlowStep.WITNESS, FlowStep.SIGNING)
        nxt = body.next_step or FlowStep.WITNESS
        c["step"] = nxt
        return {"next_step": nxt}


_svc: Optional[ContractFlowService] = None


def get_contract_flow_service() -> ContractFlowService:
    global _svc
    if _svc is None:
        _svc = ContractFlowService()
    return _svc
