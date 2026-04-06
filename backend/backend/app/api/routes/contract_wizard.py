"""Wizard-style contract flow — mirrors dev-mock-api endpoints consumed by admin-ui/amline-ui."""
from __future__ import annotations

import datetime as dt
import uuid
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, field_validator
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.contract_wizard import WizardContract
from app.models.user import User

router = APIRouter()


# ─────────────────────────── helpers ────────────────────────────

def _out(c: WizardContract) -> Dict[str, Any]:
    return {
        "id": str(c.id),
        "type": c.contract_type,
        "status": c.status,
        "step": c.step,
        "parties": c.parties or {},
        "is_owner": True,
        "key": "key",
        "password": None,
        "created_at": c.created_at.isoformat(),
    }


def _get_or_404(contract_id: str, db: Session) -> WizardContract:
    try:
        cid = uuid.UUID(contract_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="invalid_contract_id")
    c = db.get(WizardContract, cid)
    if not c:
        raise HTTPException(status_code=404, detail="not_found")
    return c


# ─────────────────────────── DTOs ───────────────────────────────

class StartBody(BaseModel):
    contract_type: Optional[str] = "PROPERTY_RENT"
    party_type: Optional[str] = None


class SetStepBody(BaseModel):
    next_step: Optional[str] = None


class HomeInfoBody(BaseModel):
    postal_code: str
    area_m2: float
    property_use_type: str
    restroom_type: str
    heating_system_type: str
    cooling_system_type: str
    deed_image_file_ids: List[int] = []
    electricity_bill_id: Optional[int] = None
    next_step: Optional[str] = None


class DatingBody(BaseModel):
    start_date: str
    end_date: str
    delivery_date: Optional[str] = None
    next_step: Optional[str] = None


class PaymentStage(BaseModel):
    due_date: str
    payment_type: str  # CASH | CHEQUE | TRANSFER
    amount: int
    cheque_image_file_id: Optional[int] = None


class MortgageBody(BaseModel):
    total_amount: int
    stages: List[PaymentStage]
    next_step: Optional[str] = None


class RentingBody(BaseModel):
    monthly_rent_amount: int
    rent_due_day_of_month: int  # 1-31
    stages: List[PaymentStage]
    next_step: Optional[str] = None

    @field_validator("rent_due_day_of_month")
    @classmethod
    def validate_day(cls, v: int) -> int:
        if not 1 <= v <= 31:
            raise ValueError("rent_due_day_of_month must be between 1 and 31")
        return v


class SalePriceBody(BaseModel):
    total_price: int
    stages: List[PaymentStage]
    next_step: Optional[str] = None

    @field_validator("total_price")
    @classmethod
    def validate_positive(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("total_price must be positive")
        return v


class AddendumBody(BaseModel):
    subject: str
    content: str


# ─────────────────────────── start ──────────────────────────────

@router.post("/start", status_code=201)
def contracts_start(body: StartBody, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not body.party_type:
        raise HTTPException(status_code=422, detail="party_type is required")
    c = WizardContract(
        contract_type=body.contract_type or "PROPERTY_RENT",
        party_type=body.party_type,
        status="DRAFT",
        step="LANDLORD_INFORMATION",
        parties={},
        owner_id=str(user.id),
    )
    db.add(c)
    db.commit()
    db.refresh(c)
    return _out(c)


@router.get("/list")
def contracts_list(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    items = db.query(WizardContract).filter(WizardContract.owner_id == str(user.id)).order_by(WizardContract.created_at.desc()).all()
    return [_out(c) for c in items]


@router.get("/resolve-info")
def resolve_info(_: User = Depends(get_current_user)):
    return {"result": "ok"}


@router.get("/{contract_id}")
def contracts_get(contract_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    c = _get_or_404(contract_id, db)
    if c.owner_id != str(user.id):
        raise HTTPException(status_code=403, detail="forbidden")
    return _out(c)


@router.get("/{contract_id}/status")
def contracts_status(contract_id: str, _: User = Depends(get_current_user), db: Session = Depends(get_db)):
    c = _get_or_404(contract_id, db)
    return {"status": c.status, "step": c.step, "contract_id": str(c.id), "type": c.contract_type}


@router.get("/{contract_id}/commission/invoice")
def commission_invoice(contract_id: str, _: User = Depends(get_current_user), db: Session = Depends(get_db)):
    c = _get_or_404(contract_id, db)
    return {"total_amount": 5_000_000, "landlord_share": 2_500_000, "tenant_share": 2_500_000, "invoice_id": f"inv-{c.id}"}


@router.post("/{contract_id}/revoke")
def contracts_revoke(contract_id: str, _: User = Depends(get_current_user), db: Session = Depends(get_db)):
    c = _get_or_404(contract_id, db)
    if c.status in ("REVOKED", "COMPLETED"):
        raise HTTPException(status_code=400, detail="invalid_state_transition")
    c.status = "REVOKED"
    db.commit()
    return {"ok": True}


# ─────────────────────────── party steps ────────────────────────

@router.post("/{contract_id}/party/landlord", status_code=201)
def party_landlord(contract_id: str, _: User = Depends(get_current_user), db: Session = Depends(get_db)):
    c = _get_or_404(contract_id, db)
    party_id = f"party-landlord-{int(dt.datetime.now().timestamp() * 1000)}"
    parties = dict(c.parties or {})
    parties.setdefault("landlords", []).append({"id": party_id, "party_type": "LANDLORD", "person_type": "NATURAL_PERSON"})
    c.parties = parties
    db.commit()
    return {"id": party_id, "contract": _out(c), "party_type": "LANDLORD", "person_type": "NATURAL_PERSON"}


@router.post("/{contract_id}/party/landlord/set")
def landlord_set(contract_id: str, body: SetStepBody, _: User = Depends(get_current_user), db: Session = Depends(get_db)):
    c = _get_or_404(contract_id, db)
    c.step = body.next_step or "TENANT_INFORMATION"
    db.commit()
    return {"next_step": c.step}


@router.post("/{contract_id}/party/tenant", status_code=201)
def party_tenant(contract_id: str, _: User = Depends(get_current_user), db: Session = Depends(get_db)):
    c = _get_or_404(contract_id, db)
    party_id = f"party-tenant-{int(dt.datetime.now().timestamp() * 1000)}"
    parties = dict(c.parties or {})
    parties.setdefault("tenants", []).append({"id": party_id, "party_type": "TENANT", "person_type": "NATURAL_PERSON"})
    c.parties = parties
    db.commit()
    return {"id": party_id, "contract": _out(c), "party_type": "TENANT", "person_type": "NATURAL_PERSON"}


@router.post("/{contract_id}/party/tenant/set")
def tenant_set(contract_id: str, body: SetStepBody, _: User = Depends(get_current_user), db: Session = Depends(get_db)):
    c = _get_or_404(contract_id, db)
    c.step = body.next_step or "PLACE_INFORMATION"
    db.commit()
    return {"next_step": c.step}


@router.patch("/{contract_id}/party/{party_id}")
def party_patch(contract_id: str, party_id: str, _: User = Depends(get_current_user), db: Session = Depends(get_db)):
    c = _get_or_404(contract_id, db)
    return {"id": party_id, "contract": _out(c), "party_type": "LANDLORD", "person_type": "NATURAL_PERSON"}


@router.delete("/{contract_id}/party/{party_id}")
def party_delete(contract_id: str, party_id: str, _: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _get_or_404(contract_id, db)
    return {"ok": True}


# ─────────────────────────── property/date/financial steps ──────

@router.post("/{contract_id}/home-info", status_code=201)
def home_info(contract_id: str, body: HomeInfoBody, _: User = Depends(get_current_user), db: Session = Depends(get_db)):
    c = _get_or_404(contract_id, db)
    c.step = body.next_step or "DATING"
    db.commit()
    return {"next_step": c.step}


@router.post("/{contract_id}/dating", status_code=201)
def dating(contract_id: str, body: DatingBody, _: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        start = dt.date.fromisoformat(body.start_date)
        end = dt.date.fromisoformat(body.end_date)
    except ValueError:
        raise HTTPException(status_code=422, detail="invalid_date_format")
    if end <= start:
        raise HTTPException(status_code=422, detail="end_date_before_start_date")
    c = _get_or_404(contract_id, db)
    c.step = body.next_step or "MORTGAGE"
    db.commit()
    return {"next_step": c.step}


@router.post("/{contract_id}/mortgage", status_code=201)
def mortgage(contract_id: str, body: MortgageBody, _: User = Depends(get_current_user), db: Session = Depends(get_db)):
    stages_sum = sum(s.amount for s in body.stages)
    if stages_sum != body.total_amount:
        raise HTTPException(status_code=422, detail="stages_sum_mismatch")
    c = _get_or_404(contract_id, db)
    c.step = body.next_step or ("SIGNING" if c.contract_type == "BUYING_AND_SELLING" else "RENTING")
    db.commit()
    return {"next_step": c.step}


@router.post("/{contract_id}/renting", status_code=201)
def renting(contract_id: str, body: RentingBody, _: User = Depends(get_current_user), db: Session = Depends(get_db)):
    c = _get_or_404(contract_id, db)
    c.step = body.next_step or "SIGNING"
    db.commit()
    return {"next_step": c.step}


@router.post("/{contract_id}/sale-price", status_code=201)
def sale_price(contract_id: str, body: SalePriceBody, _: User = Depends(get_current_user), db: Session = Depends(get_db)):
    c = _get_or_404(contract_id, db)
    c.step = body.next_step or "SIGNING"
    db.commit()
    return {"next_step": c.step}


@router.post("/{contract_id}/commission/pay")
def commission_pay(contract_id: str, _: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _get_or_404(contract_id, db)
    return {"ok": True, "redirect_url": "/financials/bank/gateway", "used_wallet": False}


@router.post("/{contract_id}/addendum", status_code=201)
def addendum_create(contract_id: str, body: AddendumBody, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    c = _get_or_404(contract_id, db)
    if c.status in ("REVOKED", "REJECTED"):
        raise HTTPException(status_code=400, detail="addendum_not_allowed")
    addendum_id = str(uuid.uuid4())
    return {"id": addendum_id, "subject": body.subject, "status": "DRAFT"}


@router.get("/{contract_id}/addendums")
def addendums_list(contract_id: str, _: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _get_or_404(contract_id, db)
    return []


@router.post("/{contract_id}/addendum/sign/initiate")
def addendum_sign_initiate(contract_id: str, _: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _get_or_404(contract_id, db)
    return {"ok": True}


@router.get("/{contract_id}/pdf")
def contract_pdf(contract_id: str, _: User = Depends(get_current_user), db: Session = Depends(get_db)):
    c = _get_or_404(contract_id, db)
    if c.status == "DRAFT":
        raise HTTPException(status_code=400, detail="contract_not_ready")
    return {"url": None, "status": "PENDING"}


# ─────────────────────────── signing ────────────────────────────

@router.post("/{contract_id}/sign", status_code=201)
def sign(contract_id: str, _: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _get_or_404(contract_id, db)
    return {}


@router.post("/{contract_id}/sign/verify")
def sign_verify(contract_id: str, _: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _get_or_404(contract_id, db)
    return {"ok": True}


@router.post("/{contract_id}/sign/set")
def sign_set(contract_id: str, body: SetStepBody, _: User = Depends(get_current_user), db: Session = Depends(get_db)):
    c = _get_or_404(contract_id, db)
    c.step = body.next_step or "WITNESS"
    db.commit()
    return {"next_step": c.step}


@router.post("/{contract_id}/add-witness")
def add_witness(contract_id: str, body: SetStepBody, _: User = Depends(get_current_user), db: Session = Depends(get_db)):
    c = _get_or_404(contract_id, db)
    c.step = body.next_step or "WITNESS"
    db.commit()
    return {"next_step": c.step}


@router.post("/{contract_id}/witness/send-otp", status_code=201)
def witness_send_otp(contract_id: str, _: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _get_or_404(contract_id, db)
    return {}


@router.post("/{contract_id}/witness/verify")
def witness_verify(contract_id: str, body: SetStepBody, _: User = Depends(get_current_user), db: Session = Depends(get_db)):
    c = _get_or_404(contract_id, db)
    c.step = body.next_step or "FINISH"
    c.status = "COMPLETED"
    db.commit()
    return {"ok": True, "next_step": c.step}
