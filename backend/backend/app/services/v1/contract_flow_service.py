"""سرویس جریان قرارداد (State Machine) — New Flow 0.1.3.

پس از هر عملیاتِ پیشرفت، ``next_step`` محاسبه و در پاسخ برگردانده می‌شود.
اعتبارسنجی گام با ``AMLINE_CONTRACT_STRICT_FLOW=1`` فعال می‌شود (پیش‌فرض: غیرفعال برای سازگاری با تست‌های امضا/شاهد بدون طی کامل ویزارد).
"""

from __future__ import annotations

import os
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from app.core.errors import AmlineError
from app.domain.contracts.ssot import (
    ContractLifecycleStatus,
    assert_transition_ok,
    lifecycle_status_to_product_v2,
    merge_external_refs,
    normalize_ssot_kind,
)
from app.repositories.memory.state import get_store
from app.services.v1.otp_service import get_otp_service
from app.schemas.v1.contract_flow import (
    CommissionCreateBody,
    CommissionDelegateRequestBody,
    CommissionDelegateVerifyBody,
    ContractExternalRefsPatchBody,
    ContractStartBody,
    ContractTermsPatchBody,
    LandlordSetBody,
    PartyPatchBody,
    SectionPatchBody,
    TenantSetBody,
)


def _default_party_row(
    party_id: str, party_type: str, ssot_role: str, c_json: dict[str, Any]
) -> dict[str, Any]:
    return {
        "id": party_id,
        "contract": c_json,
        "party_type": party_type,
        "ssot_role": ssot_role,
        "person_type": "NATURAL_PERSON",
        "signature_status": None,
        "signature_method": None,
        "agent_user_id": None,
    }


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
    return os.getenv("AMLINE_CONTRACT_STRICT_FLOW", "").strip().lower() in (
        "1",
        "true",
        "yes",
    )


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _party_mobile_from_contract(c: Dict[str, Any], party_id: str) -> str:
    parties = c.get("parties") or {}
    for lst in parties.values():
        if not isinstance(lst, list):
            continue
        for row in lst:
            if str(row.get("id")) != str(party_id):
                continue
            m = row.get("mobile")
            if m:
                return str(m)
            npd = row.get("natural_person_detail") or {}
            if isinstance(npd, dict) and npd.get("mobile"):
                return str(npd["mobile"])
            lpd = row.get("legal_person_detail") or {}
            if isinstance(lpd, dict):
                signers = lpd.get("signers") or []
                if signers and isinstance(signers[0], dict) and signers[0].get("mobile"):
                    return str(signers[0]["mobile"])
    raise AmlineError(
        "RESOURCE_NOT_FOUND",
        "طرف قرارداد یا شماره موبایل یافت نشد.",
        status_code=404,
        details={"entity": "party", "party_id": party_id},
    )


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
        eref = None
        if getattr(body, "external_refs", None) is not None:
            eref = body.external_refs.model_dump(exclude_none=False)
        refs = merge_external_refs(None, eref)
        c: Dict[str, Any] = {
            "id": cid,
            "type": ctype,
            "ssot_kind": normalize_ssot_kind(ctype),
            "status": ContractLifecycleStatus.DRAFT.value,
            "step": FlowStep.LANDLORD_INFORMATION,
            "parties": {},
            "created_at": now,
            "flow_version": "0.1.3",
            "external_refs": refs,
            "created_by": getattr(body, "created_by", None),
            "witnesses": [],
            "amendments": [],
            "payments": {},
            "terms": {},
            "commissions": [],
            "substate": None,
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
            "lifecycle_v2": lifecycle_status_to_product_v2(
                str(c.get("status", "")),
                substate=c.get("substate"),
            ),
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
        cur = c.get("status", ContractLifecycleStatus.DRAFT.value)
        assert_transition_ok(cur, ContractLifecycleStatus.REVOKED.value)
        c["status"] = ContractLifecycleStatus.REVOKED.value
        return {"ok": True}

    def create_landlord_party(self, contract_id: str) -> Dict[str, Any]:
        s = get_store()
        c = s.get_contract(contract_id)
        _require_step(c, FlowStep.LANDLORD_INFORMATION)
        party_id = f"party-landlord-{int(datetime.now().timestamp() * 1000)}"
        row = _default_party_row(
            party_id, "LANDLORD", "LANDLORD", s.contract_json(c)
        )
        landlords = c.setdefault("parties", {}).setdefault("landlords", [])
        landlords.append(row)
        out_row = {k: v for k, v in row.items() if k != "contract"}
        out_row["contract"] = s.contract_json(c)
        return out_row

    def patch_party(
        self, contract_id: str, party_id: str, body: PartyPatchBody
    ) -> Dict[str, Any]:
        s = get_store()
        c = s.get_contract(contract_id)
        patch = body.model_dump(exclude_none=True)
        found: Dict[str, Any] | None = None
        for _bucket, lst in (c.get("parties") or {}).items():
            if not isinstance(lst, list):
                continue
            for row in lst:
                if str(row.get("id")) == str(party_id):
                    found = row
                    break
            if found:
                break
        if found is not None:
            for k, v in patch.items():
                if k in (
                    "person_type",
                    "natural_person_detail",
                    "legal_person_detail",
                    "mobile",
                    "signature_status",
                    "signature_method",
                    "agent_user_id",
                ):
                    found[k] = v
        pt = found.get("party_type", "LANDLORD") if found else "LANDLORD"
        ptype = (
            found.get("person_type", "NATURAL_PERSON") if found else "NATURAL_PERSON"
        )
        out: Dict[str, Any] = {
            "id": party_id,
            "contract": s.contract_json(c),
            "party_type": pt,
            "person_type": ptype,
        }
        if found:
            for k in ("signature_status", "signature_method", "agent_user_id", "ssot_role"):
                if k in found:
                    out[k] = found[k]
        return out

    def landlord_set(self, contract_id: str, body: LandlordSetBody) -> Dict[str, Any]:
        s = get_store()
        c = s.get_contract(contract_id)
        _require_step(c, FlowStep.LANDLORD_INFORMATION)
        cur = c.get("status", ContractLifecycleStatus.DRAFT.value)
        if cur == ContractLifecycleStatus.DRAFT.value:
            assert_transition_ok(
                cur, ContractLifecycleStatus.IN_PROGRESS.value
            )
            c["status"] = ContractLifecycleStatus.IN_PROGRESS.value
        nxt = body.next_step or FlowStep.TENANT_INFORMATION
        c["step"] = nxt
        return {"next_step": nxt}

    def create_tenant_party(self, contract_id: str) -> Dict[str, Any]:
        s = get_store()
        c = s.get_contract(contract_id)
        _require_step(c, FlowStep.TENANT_INFORMATION)
        party_id = f"party-tenant-{int(datetime.now().timestamp() * 1000)}"
        row = _default_party_row(
            party_id, "TENANT", "TENANT", s.contract_json(c)
        )
        tenants = c.setdefault("parties", {}).setdefault("tenants", [])
        tenants.append(row)
        out_row = {k: v for k, v in row.items() if k != "contract"}
        out_row["contract"] = s.contract_json(c)
        return out_row

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
        parties = dict(c.get("parties") or {})
        for bucket, lst in list(parties.items()):
            if isinstance(lst, list):
                parties[bucket] = [
                    p for p in lst if str(p.get("id")) != str(party_id)
                ]
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
        cur = c.get("status", ContractLifecycleStatus.DRAFT.value)
        if cur in (
            ContractLifecycleStatus.DRAFT.value,
            ContractLifecycleStatus.IN_PROGRESS.value,
        ):
            assert_transition_ok(
                cur, ContractLifecycleStatus.PENDING_SIGNATURES.value
            )
            c["status"] = ContractLifecycleStatus.PENDING_SIGNATURES.value
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

    def patch_external_refs(
        self, contract_id: str, body: ContractExternalRefsPatchBody
    ) -> Dict[str, Any]:
        s = get_store()
        c = s.get_contract(contract_id)
        patch = body.model_dump(exclude_unset=True)
        c["external_refs"] = merge_external_refs(
            c.get("external_refs"), patch
        )
        return s.contract_json(c)

    def patch_terms(self, contract_id: str, body: ContractTermsPatchBody) -> Dict[str, Any]:
        s = get_store()
        c = s.get_contract(contract_id)
        c["terms"] = dict(body.terms or {})
        return s.contract_json(c)

    def add_commission(
        self, contract_id: str, body: CommissionCreateBody
    ) -> Dict[str, Any]:
        s = get_store()
        c = s.get_contract(contract_id)
        row = {
            "id": str(uuid.uuid4()),
            "contract_id": contract_id,
            "commission_type": body.commission_type,
            "paid_by": body.paid_by,
            "amount": body.amount,
            "status": body.status,
            "payment_method": body.payment_method,
            "created_at": _now_iso(),
        }
        c.setdefault("commissions", []).append(row)
        return row

    def list_commissions(self, contract_id: str) -> Dict[str, Any]:
        s = get_store()
        c = s.get_contract(contract_id)
        return {"items": list(c.get("commissions") or [])}

    def request_commission_delegate_pay(
        self,
        contract_id: str,
        commission_id: str,
        body: CommissionDelegateRequestBody,
        *,
        client_ip: Optional[str],
        user_agent: Optional[str],
    ) -> Dict[str, Any]:
        s = get_store()
        c = s.get_contract(contract_id)
        phone = _party_mobile_from_contract(c, body.party_id)
        return get_otp_service().create_and_send(
            phone=phone,
            contract_id=contract_id,
            party_id=body.party_id,
            purpose="commission_pay_delegate",
            request_ip=client_ip,
            request_user_agent=user_agent,
            salt=f"commission:{commission_id}",
        )

    def verify_commission_delegate_pay(
        self,
        contract_id: str,
        commission_id: str,
        body: CommissionDelegateVerifyBody,
        *,
        client_ip: Optional[str],
        user_agent: Optional[str],
    ) -> Dict[str, Any]:
        s = get_store()
        c = s.get_contract(contract_id)
        get_otp_service().verify(
            contract_id=contract_id,
            phone=body.mobile,
            purpose="commission_pay_delegate",
            otp=body.otp,
            challenge_id=body.challenge_id,
            verify_ip=client_ip,
            verify_user_agent=user_agent,
        )
        party_ids: set[str] = set()
        for lst in (c.get("parties") or {}).values():
            if not isinstance(lst, list):
                continue
            for p in lst:
                if isinstance(p, dict) and p.get("id") is not None:
                    party_ids.add(str(p["id"]))
        if str(body.party_id) not in party_ids:
            raise AmlineError(
                "VALIDATION_FAILED",
                "party_id با قرارداد مطابقت ندارد.",
                status_code=422,
            )
        found = False
        for row in c.get("commissions") or []:
            if isinstance(row, dict) and str(row.get("id")) == str(commission_id):
                row["status"] = "PAID"
                row["payment_method"] = "AGENT"
                row["paid_at"] = _now_iso()
                row["paid_for_party_id"] = body.party_id
                found = True
                break
        if not found:
            raise AmlineError(
                "RESOURCE_NOT_FOUND",
                "ردیف کمیسیون یافت نشد.",
                status_code=404,
                details={"entity": "commission"},
            )
        return {"ok": True, "commission_id": commission_id}


_svc: Optional[ContractFlowService] = None


def get_contract_flow_service() -> ContractFlowService:
    global _svc
    if _svc is None:
        _svc = ContractFlowService()
    return _svc
