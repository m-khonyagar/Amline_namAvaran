"""قرارداد — New Flow 0.1.3 (مسیرهای ``/contracts/...``)."""

from __future__ import annotations

from datetime import date as date_cls

from fastapi import APIRouter, BackgroundTasks, HTTPException, Request

from app.core.n8n_outbound import n8n_dispatch
from app.integrations.temporal_workflows import (
    schedule_contract_lifecycle_journey,
    schedule_contract_workflow,
)
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
from app.schemas.v1.signatures import (
    AdminAssistSignRequestBody,
    AdminAssistSignVerifyBody,
    AgentSignVerifyBody,
    LegacySendSignBody,
    SignRequestBody,
    SignVerifyBody,
    WitnessRequestBody,
    WitnessVerifyBody,
)
from app.services.v1.contract_flow_service import get_contract_flow_service
from app.services.v1.signature_service import SignatureMethod, get_signature_service

router = APIRouter(tags=["contracts"])
_flow = get_contract_flow_service()


def _client_meta(request: Request) -> tuple[str | None, str | None]:
    ip = request.client.host if request.client else None
    ua = request.headers.get("user-agent")
    return ip, ua


@router.get("/contracts/resolve-info")
def resolve_info() -> dict:
    return _flow.resolve_info()


@router.post("/contracts/start", status_code=201)
def contracts_start(body: ContractStartBody, background_tasks: BackgroundTasks) -> dict:
    out = _flow.start(body)
    cid = out["id"]
    ctype = out["type"]
    background_tasks.add_task(
        n8n_dispatch,
        "contract.started",
        {"contract_id": cid, "contract_type": ctype, "party_type": body.party_type},
    )
    background_tasks.add_task(
        schedule_contract_workflow,
        cid,
        {"contract_type": ctype, "party_type": body.party_type},
    )
    background_tasks.add_task(
        schedule_contract_lifecycle_journey,
        cid,
        {"contract_type": ctype, "party_type": body.party_type},
    )
    return out


@router.get("/contracts/list")
def contracts_list() -> list:
    return _flow.list_contracts()


@router.get("/contracts/{contract_id}")
def contracts_get(contract_id: str) -> dict:
    return _flow.get_contract(contract_id)


@router.get("/contracts/{contract_id}/status")
def contracts_status(contract_id: str) -> dict:
    return _flow.status(contract_id)


@router.get("/contracts/{contract_id}/commission/invoice")
def commission_invoice(contract_id: str) -> dict:
    return _flow.commission_invoice(contract_id)


@router.post("/contracts/{contract_id}/revoke")
def contracts_revoke(contract_id: str) -> dict:
    return _flow.revoke(contract_id)


@router.patch("/contracts/{contract_id}/external-refs")
def contracts_patch_external_refs(
    contract_id: str, body: ContractExternalRefsPatchBody
) -> dict:
    return _flow.patch_external_refs(contract_id, body)


@router.patch("/contracts/{contract_id}/terms")
def contracts_patch_terms(contract_id: str, body: ContractTermsPatchBody) -> dict:
    return _flow.patch_terms(contract_id, body)


@router.post("/contracts/{contract_id}/commissions", status_code=201)
def contracts_add_commission(
    contract_id: str, body: CommissionCreateBody
) -> dict:
    return _flow.add_commission(contract_id, body)


@router.get("/contracts/{contract_id}/commissions")
def contracts_list_commissions(contract_id: str) -> dict:
    return _flow.list_commissions(contract_id)


@router.post(
    "/contracts/{contract_id}/commissions/{commission_id}/delegate-pay/request",
    status_code=201,
)
def commission_delegate_pay_request(
    contract_id: str,
    commission_id: str,
    body: CommissionDelegateRequestBody,
    request: Request,
) -> dict:
    ip, ua = _client_meta(request)
    return _flow.request_commission_delegate_pay(
        contract_id,
        commission_id,
        body,
        client_ip=ip,
        user_agent=ua,
    )


@router.post(
    "/contracts/{contract_id}/commissions/{commission_id}/delegate-pay/verify",
)
def commission_delegate_pay_verify(
    contract_id: str,
    commission_id: str,
    body: CommissionDelegateVerifyBody,
    request: Request,
) -> dict:
    ip, ua = _client_meta(request)
    return _flow.verify_commission_delegate_pay(
        contract_id,
        commission_id,
        body,
        client_ip=ip,
        user_agent=ua,
    )


@router.post("/contracts/{contract_id}/party/landlord", status_code=201)
def party_landlord(contract_id: str) -> dict:
    return _flow.create_landlord_party(contract_id)


@router.patch("/contracts/{contract_id}/party/{party_id}")
def party_patch(contract_id: str, party_id: str, body: PartyPatchBody) -> dict:
    return _flow.patch_party(contract_id, party_id, body)


@router.post("/contracts/{contract_id}/party/landlord/set")
def landlord_set(contract_id: str, body: LandlordSetBody) -> dict:
    return _flow.landlord_set(contract_id, body)


@router.post("/contracts/{contract_id}/party/tenant", status_code=201)
def party_tenant(contract_id: str) -> dict:
    return _flow.create_tenant_party(contract_id)


@router.post("/contracts/{contract_id}/party/tenant/set")
def tenant_set(contract_id: str, body: TenantSetBody) -> dict:
    return _flow.tenant_set(contract_id, body)


@router.delete("/contracts/{contract_id}/party/{party_id}")
def party_delete(contract_id: str, party_id: str) -> dict:
    return _flow.delete_party(contract_id, party_id)


@router.post("/contracts/{contract_id}/home-info", status_code=201)
def home_info(contract_id: str, body: SectionPatchBody) -> dict:
    return _flow.set_home_info(contract_id, body)


@router.post("/contracts/{contract_id}/dating", status_code=201)
def dating(contract_id: str, body: SectionPatchBody) -> dict:
    extra = body.model_extra or {}
    sd = extra.get("start_date")
    ed = extra.get("end_date")
    if sd is not None and ed is not None:
        try:
            s = date_cls.fromisoformat(str(sd))
            e = date_cls.fromisoformat(str(ed))
        except ValueError as err:
            raise HTTPException(status_code=422, detail="invalid_dates") from err
        if e < s:
            raise HTTPException(status_code=422, detail="end_before_start")
    return _flow.set_dating(contract_id, body)


@router.post("/contracts/{contract_id}/mortgage", status_code=201)
def mortgage(contract_id: str, body: SectionPatchBody) -> dict:
    return _flow.set_mortgage(contract_id, body)


@router.post("/contracts/{contract_id}/renting", status_code=201)
def renting(contract_id: str, body: SectionPatchBody) -> dict:
    return _flow.set_renting(contract_id, body)


@router.post("/contracts/{contract_id}/sign/request", status_code=201)
def sign_request(
    contract_id: str,
    body: SignRequestBody,
    request: Request,
) -> dict:
    ip, ua = _client_meta(request)
    return get_signature_service().request_contract_sign(
        contract_id,
        party_id=body.party_id,
        mobile_override=body.mobile,
        client_ip=ip,
        user_agent=ua,
    )


@router.post("/contracts/{contract_id}/sign", status_code=201)
def sign(contract_id: str, body: LegacySendSignBody, request: Request) -> dict:
    ip, ua = _client_meta(request)
    return get_signature_service().request_contract_sign(
        contract_id,
        party_id=body.party_id,
        mobile_override=None,
        client_ip=ip,
        user_agent=ua,
    )


@router.post("/contracts/{contract_id}/sign/verify")
def sign_verify(
    contract_id: str,
    body: SignVerifyBody,
    request: Request,
) -> dict:
    ip, ua = _client_meta(request)
    method = SignatureMethod.SELF_OTP
    if body.signature_method:
        try:
            method = SignatureMethod(body.signature_method.strip().upper())
        except ValueError:
            method = SignatureMethod.SELF_OTP
    return get_signature_service().verify_contract_sign(
        contract_id,
        otp=body.otp,
        mobile=body.mobile,
        party_id=body.party_id,
        salt=body.salt,
        challenge_id=body.challenge_id,
        client_ip=ip,
        user_agent=ua,
        signature_method=method,
        agent_user_id=body.agent_user_id,
    )


@router.post("/contracts/{contract_id}/sign/agent/verify")
def sign_agent_verify(
    contract_id: str,
    body: AgentSignVerifyBody,
    request: Request,
) -> dict:
    ip, ua = _client_meta(request)
    return get_signature_service().sign_as_agent(
        contract_id,
        party_id=body.party_id,
        otp_code=body.otp,
        agent_user_id=body.agent_user_id,
        mobile=body.mobile,
        salt=body.salt,
        challenge_id=body.challenge_id,
        client_ip=ip,
        user_agent=ua,
    )


@router.post("/contracts/{contract_id}/sign/admin-assist/request", status_code=201)
def sign_admin_assist_request(
    contract_id: str,
    body: AdminAssistSignRequestBody,
    request: Request,
) -> dict:
    ip, ua = _client_meta(request)
    return get_signature_service().request_admin_assist_sign(
        contract_id,
        party_id=body.party_id,
        client_ip=ip,
        user_agent=ua,
    )


@router.post("/contracts/{contract_id}/sign/admin-assist/verify")
def sign_admin_assist_verify(
    contract_id: str,
    body: AdminAssistSignVerifyBody,
    request: Request,
) -> dict:
    ip, ua = _client_meta(request)
    return get_signature_service().verify_admin_assist_sign(
        contract_id,
        otp=body.otp,
        mobile=body.mobile,
        party_id=body.party_id,
        agent_user_id=body.agent_user_id,
        salt=body.salt,
        challenge_id=body.challenge_id,
        client_ip=ip,
        user_agent=ua,
    )


@router.post("/contracts/{contract_id}/sign/auto")
def sign_auto_apply(contract_id: str, request: Request) -> dict:
    ip, ua = _client_meta(request)
    return get_signature_service().apply_auto_sign_if_eligible(
        contract_id,
        client_ip=ip,
        user_agent=ua,
    )


@router.post("/contracts/{contract_id}/sign/set")
def sign_set(contract_id: str, body: SectionPatchBody) -> dict:
    return _flow.sign_set(contract_id, body)


@router.post("/contracts/{contract_id}/add-witness")
def add_witness(contract_id: str, body: SectionPatchBody) -> dict:
    return _flow.add_witness(contract_id, body)


@router.post("/contracts/{contract_id}/witness/request", status_code=201)
def witness_request(
    contract_id: str,
    body: WitnessRequestBody,
    request: Request,
) -> dict:
    ip, ua = _client_meta(request)
    return get_signature_service().request_witness(
        contract_id,
        mobile=body.mobile,
        national_code=body.national_code,
        witness_type=body.witness_type,
        witness_name=body.witness_name,
        client_ip=ip,
        user_agent=ua,
    )


@router.post("/contracts/{contract_id}/witness/send-otp", status_code=201)
def witness_send_otp(
    contract_id: str,
    body: WitnessRequestBody,
    request: Request,
) -> dict:
    ip, ua = _client_meta(request)
    return get_signature_service().request_witness(
        contract_id,
        mobile=body.mobile,
        national_code=body.national_code,
        witness_type=body.witness_type,
        witness_name=body.witness_name,
        client_ip=ip,
        user_agent=ua,
    )


@router.post("/contracts/{contract_id}/witness/verify")
def witness_verify(
    contract_id: str,
    body: WitnessVerifyBody,
    request: Request,
) -> dict:
    ip, ua = _client_meta(request)
    return get_signature_service().verify_witness(
        contract_id,
        otp=body.otp,
        mobile=body.mobile,
        national_code=body.national_code,
        salt=body.salt,
        witness_type=body.witness_type,
        challenge_id=body.challenge_id,
        client_ip=ip,
        user_agent=ua,
        next_step=body.next_step,
    )
