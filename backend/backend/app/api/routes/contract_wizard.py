"""Wizard-style contract flow — mirrors dev-mock-api endpoints consumed by admin-ui/amline-ui."""
from __future__ import annotations

import datetime as dt
import uuid
from decimal import Decimal
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, field_validator
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.core.config import settings
from app.domain.commission_discount import invoice_with_optional_discount
from app.domain.commission_service import PRContractCommissionService
from app.domain.contract_enums import ContractStatus, PartyType, ProvinceType
from app.domain.pr_contract_step_manager import PRContractStepManager
from app.domain.wizard_step_machine import (
    InvalidStepTransitionError,
    assert_valid_transition,
    mortgage_default_next,
)
from app.models.contract_wizard import WizardContract
from app.models.user import User
from app.services.pdf_client import request_contract_pdf
from app.services.wallet_ledger import apply_delta, lock_wallet

router = APIRouter()

_step_manager = PRContractStepManager()
_commission_svc = PRContractCommissionService()

_WIZARD_STATUS_NO_COMMISSION_OVERLAY = frozenset({"REVOKED", "COMPLETED", "REJECTED"})


def _apply_step(c: WizardContract, new_step: str) -> str:
    try:
        assert_valid_transition(c.step, new_step, c.contract_type)
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
    c.step = new_step
    return new_step


# ─────────────────────────── helpers ────────────────────────────

def _effective_contract_status(c: WizardContract) -> str:
    """در مرحلهٔ امضا تا قبل از پرداخت کمیسیون، برای UI و polling همان PENDING_COMMISSION برگردان."""
    raw = c.status or "DRAFT"
    if raw in _WIZARD_STATUS_NO_COMMISSION_OVERLAY:
        return raw
    if c.step == "SIGNING" and c.commission_paid_at is None:
        return "PENDING_COMMISSION"
    return raw


def _require_commission_paid_for_signing(c: WizardContract) -> None:
    if c.step == "SIGNING" and c.commission_paid_at is None:
        raise HTTPException(status_code=400, detail="commission_required")


def _out(c: WizardContract) -> Dict[str, Any]:
    return {
        "id": str(c.id),
        "type": c.contract_type,
        "status": _effective_contract_status(c),
        "step": c.step,
        "party_type": c.party_type,
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


def _require_owner(c: WizardContract, user: User) -> None:
    """Only the wizard owner may read or mutate contract state (IDOR guard)."""
    if c.owner_id != str(user.id):
        raise HTTPException(status_code=403, detail="forbidden")


def _merge_parties(c: WizardContract, updates: Dict[str, Any]) -> None:
    p = dict(c.parties or {})
    p.update(updates)
    c.parties = p


def _commission_invoice_dict(c: WizardContract) -> Dict[str, Any]:
    """فاکتور کمیسیون به ریال (هم‌خوان با admin-ui که مبالغ را بر ۱۰ برای تومان تقسیم می‌کند)."""
    parties = c.parties or {}
    province = ProvinceType.TEHRAN
    ct = c.contract_type or "PROPERTY_RENT"
    if ct == "BUYING_AND_SELLING":
        sale_rial = int(parties.get("sale_price", 0) or 0)
        if sale_rial > 0:
            inv = _commission_svc.calculate_sale_invoice(sale_rial // 10, province)
            return {k: int(v) * 10 for k, v in inv.items()}
    rent_rial = int(parties.get("rent_amount", 0) or 0)
    dep_rial = int(parties.get("deposit_amount", 0) or 0)
    if rent_rial > 0 or dep_rial > 0:
        inv = _commission_svc.calculate_invoice(rent_rial // 10, dep_rial // 10, province)
        return {k: int(v) * 10 for k, v in inv.items()}
    return {
        "commission": 5_000_000,
        "tax": 500_000,
        "tracking_code_fee": 50_000,
        "total_amount": 5_550_000,
        "landlord_share": 2_775_000,
        "tenant_share": 2_775_000,
    }


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
    rent_due_day_of_month: Optional[int] = None  # 1-31; None allowed (e.g. sale bridge)
    stages: List[PaymentStage]
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
    def validate_positive(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("total_price must be positive")
        return v


class AddendumBody(BaseModel):
    subject: str
    content: str


class CommissionPayBody(BaseModel):
    use_wallet_credit: bool = False
    use_all_wallet_credits: bool = False
    wallet_credits: Optional[int] = None
    discount_code: Optional[str] = None


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
    _require_owner(c, user)
    return _out(c)


@router.get("/{contract_id}/status")
def contracts_status(contract_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    c = _get_or_404(contract_id, db)
    _require_owner(c, user)
    # محاسبه state واقعی از domain step manager
    completed_steps = (c.parties or {}).get("completed_steps", [])
    try:
        owner_party = PartyType(c.party_type or "LANDLORD")
        contract_status = ContractStatus(c.status or "DRAFT")
        domain_state = _step_manager.get_contract_state(
            completed_steps=completed_steps,
            status=contract_status,
            owner_party_type=owner_party,
        )
        state_value = domain_state.value
    except (ValueError, Exception):
        state_value = c.status or "DRAFT"
    return {
        "status": _effective_contract_status(c),
        "step": c.step,
        "contract_id": str(c.id),
        "type": c.contract_type,
        "state": state_value,
    }


@router.get("/{contract_id}/commission/invoice")
def commission_invoice(
    contract_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    discount_code: Optional[str] = Query(None, description="Optional promotional code (percent off gross total)"),
):
    c = _get_or_404(contract_id, db)
    _require_owner(c, user)
    base = _commission_invoice_dict(c)
    try:
        invoice = invoice_with_optional_discount(
            base,
            settings.commission_discount_codes,
            discount_code,
            reject_invalid=bool(discount_code and discount_code.strip()),
        )
    except ValueError:
        raise HTTPException(
            status_code=422,
            detail={"code": "invalid_discount_code", "hint": "کد تخفیف معتبر نیست"},
        )
    paid = c.commission_paid_at is not None
    return {
        **invoice,
        "invoice_id": f"inv-{c.id}",
        "commission_paid": paid,
        "commission_paid_at": c.commission_paid_at.isoformat() if c.commission_paid_at else None,
    }


@router.post("/{contract_id}/revoke")
def contracts_revoke(contract_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    c = _get_or_404(contract_id, db)
    _require_owner(c, user)
    if c.status in ("REVOKED", "COMPLETED"):
        raise HTTPException(status_code=400, detail="invalid_state_transition")
    c.status = "REVOKED"
    db.commit()
    return {"ok": True}


# ─────────────────────────── party steps ────────────────────────

@router.post("/{contract_id}/party/landlord", status_code=201)
def party_landlord(contract_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    c = _get_or_404(contract_id, db)
    _require_owner(c, user)
    party_id = f"party-landlord-{int(dt.datetime.now().timestamp() * 1000)}"
    parties = dict(c.parties or {})
    parties.setdefault("landlords", []).append({"id": party_id, "party_type": "LANDLORD", "person_type": "NATURAL_PERSON"})
    c.parties = parties
    db.commit()
    return {"id": party_id, "contract": _out(c), "party_type": "LANDLORD", "person_type": "NATURAL_PERSON"}


@router.post("/{contract_id}/party/landlord/set")
def landlord_set(contract_id: str, body: SetStepBody, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    c = _get_or_404(contract_id, db)
    _require_owner(c, user)
    nxt = body.next_step or "TENANT_INFORMATION"
    _apply_step(c, nxt)
    db.commit()
    return {"next_step": c.step}


@router.post("/{contract_id}/party/tenant", status_code=201)
def party_tenant(contract_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    c = _get_or_404(contract_id, db)
    _require_owner(c, user)
    party_id = f"party-tenant-{int(dt.datetime.now().timestamp() * 1000)}"
    parties = dict(c.parties or {})
    parties.setdefault("tenants", []).append({"id": party_id, "party_type": "TENANT", "person_type": "NATURAL_PERSON"})
    c.parties = parties
    db.commit()
    return {"id": party_id, "contract": _out(c), "party_type": "TENANT", "person_type": "NATURAL_PERSON"}


@router.post("/{contract_id}/party/tenant/set")
def tenant_set(contract_id: str, body: SetStepBody, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    c = _get_or_404(contract_id, db)
    _require_owner(c, user)
    nxt = body.next_step or "PLACE_INFORMATION"
    _apply_step(c, nxt)
    db.commit()
    return {"next_step": c.step}


@router.patch("/{contract_id}/party/{party_id}")
def party_patch(contract_id: str, party_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    c = _get_or_404(contract_id, db)
    _require_owner(c, user)
    return {"id": party_id, "contract": _out(c), "party_type": "LANDLORD", "person_type": "NATURAL_PERSON"}


@router.delete("/{contract_id}/party/{party_id}")
def party_delete(contract_id: str, party_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    c = _get_or_404(contract_id, db)
    _require_owner(c, user)
    return {"ok": True}


# ─────────────────────────── property/date/financial steps ──────

@router.post("/{contract_id}/home-info", status_code=201)
def home_info(contract_id: str, body: HomeInfoBody, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    c = _get_or_404(contract_id, db)
    _require_owner(c, user)
    nxt = body.next_step or "DATING"
    _apply_step(c, nxt)
    _merge_parties(
        c,
        {
            "postal_code": body.postal_code,
            "area_m2": body.area_m2,
            "property_use_type": body.property_use_type,
        },
    )
    db.commit()
    return {"next_step": c.step}


@router.post("/{contract_id}/dating", status_code=201)
def dating(contract_id: str, body: DatingBody, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        start = dt.date.fromisoformat(body.start_date)
        end = dt.date.fromisoformat(body.end_date)
    except ValueError:
        raise HTTPException(status_code=422, detail="invalid_date_format")
    if end <= start:
        raise HTTPException(status_code=422, detail="end_date_before_start_date")
    c = _get_or_404(contract_id, db)
    _require_owner(c, user)
    nxt = body.next_step or "MORTGAGE"
    _apply_step(c, nxt)
    upd: Dict[str, Any] = {
        "lease_start_date": body.start_date,
        "lease_end_date": body.end_date,
    }
    if body.delivery_date:
        upd["delivery_date"] = body.delivery_date
    _merge_parties(c, upd)
    db.commit()
    return {"next_step": c.step}


@router.post("/{contract_id}/mortgage", status_code=201)
def mortgage(contract_id: str, body: MortgageBody, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    stages_sum = sum(s.amount for s in body.stages)
    if stages_sum != body.total_amount:
        raise HTTPException(status_code=422, detail="stages_sum_mismatch")
    c = _get_or_404(contract_id, db)
    _require_owner(c, user)
    if (c.contract_type or "") == "BUYING_AND_SELLING":
        raise HTTPException(
            status_code=422,
            detail={"code": "use_sale_price_endpoint", "hint": "برای قرارداد خرید و فروش از POST /sale-price استفاده کنید"},
        )
    nxt = body.next_step or mortgage_default_next(c.contract_type)
    _apply_step(c, nxt)
    _merge_parties(
        c,
        {
            "deposit_amount": body.total_amount,
            "mortgage_payment_stages": [s.model_dump() for s in body.stages],
        },
    )
    db.commit()
    return {"next_step": c.step}


@router.post("/{contract_id}/renting", status_code=201)
def renting(contract_id: str, body: RentingBody, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    c = _get_or_404(contract_id, db)
    _require_owner(c, user)
    nxt = body.next_step or "SIGNING"
    _apply_step(c, nxt)
    if (c.contract_type or "") == "PROPERTY_RENT":
        upd: Dict[str, Any] = {
            "rent_amount": body.monthly_rent_amount,
            "rent_payment_stages": [s.model_dump() for s in body.stages],
        }
        if body.rent_due_day_of_month is not None:
            upd["rent_due_day_of_month"] = body.rent_due_day_of_month
        _merge_parties(c, upd)
    db.commit()
    return {"next_step": c.step}


@router.post("/{contract_id}/sale-price", status_code=201)
def sale_price(contract_id: str, body: SalePriceBody, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    c = _get_or_404(contract_id, db)
    _require_owner(c, user)
    if (c.contract_type or "") != "BUYING_AND_SELLING":
        raise HTTPException(
            status_code=422,
            detail={"code": "sale_price_contract_type", "hint": "این endpoint فقط برای نوع BUYING_AND_SELLING است"},
        )
    if body.stages:
        stages_sum = sum(s.amount for s in body.stages)
        if stages_sum != body.total_price:
            raise HTTPException(status_code=422, detail="stages_sum_mismatch")
    nxt = body.next_step or "SIGNING"
    _apply_step(c, nxt)
    _merge_parties(
        c,
        {
            "sale_price": body.total_price,
            "sale_payment_stages": [s.model_dump() for s in body.stages],
        },
    )
    db.commit()
    return {"next_step": c.step}


@router.post("/{contract_id}/commission/pay")
def commission_pay(
    contract_id: str,
    body: CommissionPayBody,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    c = _get_or_404(contract_id, db)
    _require_owner(c, user)
    if c.commission_paid_at is not None:
        return {"ok": True, "redirect_url": "/", "used_wallet": False, "already_paid": True}

    base = _commission_invoice_dict(c)
    try:
        invoice = invoice_with_optional_discount(
            base,
            settings.commission_discount_codes,
            body.discount_code,
            reject_invalid=bool(body.discount_code and str(body.discount_code).strip()),
        )
    except ValueError:
        raise HTTPException(
            status_code=422,
            detail={"code": "invalid_discount_code", "hint": "کد تخفیف معتبر نیست"},
        )
    commission_total = Decimal(str(invoice["total_amount"]))

    want_wallet = body.use_wallet_credit or body.use_all_wallet_credits
    if want_wallet:
        w = lock_wallet(db, user_id=user.id)
        bal = Decimal(str(w.balance or 0))
        if bal >= commission_total:
            apply_delta(
                db,
                user_id=user.id,
                delta=-commission_total,
                type="wizard_commission",
                reference_id=str(c.id),
            )
            c.commission_paid_at = dt.datetime.now(dt.timezone.utc)
            db.commit()
            return {"ok": True, "redirect_url": "/", "used_wallet": True}
    return {
        "ok": True,
        "redirect_url": f"/financials/bank/gateway?contract_id={contract_id}",
        "used_wallet": False,
    }


@router.post("/{contract_id}/addendum", status_code=201)
def addendum_create(contract_id: str, body: AddendumBody, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    c = _get_or_404(contract_id, db)
    _require_owner(c, user)
    if c.status in ("REVOKED", "REJECTED"):
        raise HTTPException(status_code=400, detail="addendum_not_allowed")
    addendum_id = str(uuid.uuid4())
    return {"id": addendum_id, "subject": body.subject, "status": "DRAFT"}


@router.get("/{contract_id}/addendums")
def addendums_list(contract_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    c = _get_or_404(contract_id, db)
    _require_owner(c, user)
    return []


@router.post("/{contract_id}/addendum/sign/initiate")
def addendum_sign_initiate(contract_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    c = _get_or_404(contract_id, db)
    _require_owner(c, user)
    return {"ok": True}


@router.get("/{contract_id}/pdf")
async def contract_pdf(contract_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    c = _get_or_404(contract_id, db)
    _require_owner(c, user)
    if c.status == "DRAFT":
        raise HTTPException(status_code=400, detail="contract_not_ready")
    parties = c.parties or {}
    pdf_url = parties.get("pdf_url")
    if pdf_url:
        return {"url": pdf_url, "status": "READY"}
    # درخواست تولید PDF از سرویس pdf-generator
    pdf_url = await request_contract_pdf(str(c.id), c.contract_type or "PROPERTY_RENT", parties)
    if pdf_url:
        # ذخیره URL در parties برای دفعات بعد
        updated_parties = dict(parties)
        updated_parties["pdf_url"] = pdf_url
        c.parties = updated_parties
        db.commit()
        return {"url": pdf_url, "status": "READY"}
    return {"url": None, "status": "PENDING", "contract_id": str(c.id)}


# ─────────────────────────── signing ────────────────────────────

@router.post("/{contract_id}/sign", status_code=201)
def sign(contract_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    c = _get_or_404(contract_id, db)
    _require_owner(c, user)
    _require_commission_paid_for_signing(c)
    return {}


@router.post("/{contract_id}/sign/verify")
def sign_verify(contract_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    c = _get_or_404(contract_id, db)
    _require_owner(c, user)
    _require_commission_paid_for_signing(c)
    return {"ok": True}


@router.post("/{contract_id}/sign/set")
def sign_set(contract_id: str, body: SetStepBody, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    c = _get_or_404(contract_id, db)
    _require_owner(c, user)
    _require_commission_paid_for_signing(c)
    nxt = body.next_step or "WITNESS"
    _apply_step(c, nxt)
    db.commit()
    return {"next_step": c.step}


@router.post("/{contract_id}/add-witness")
def add_witness(contract_id: str, body: SetStepBody, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    c = _get_or_404(contract_id, db)
    _require_owner(c, user)
    nxt = body.next_step or "WITNESS"
    _apply_step(c, nxt)
    db.commit()
    return {"next_step": c.step}


@router.post("/{contract_id}/witness/send-otp", status_code=201)
def witness_send_otp(contract_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    c = _get_or_404(contract_id, db)
    _require_owner(c, user)
    return {}


@router.post("/{contract_id}/witness/verify")
def witness_verify(contract_id: str, body: SetStepBody, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    c = _get_or_404(contract_id, db)
    _require_owner(c, user)
    nxt = body.next_step or "FINISH"
    _apply_step(c, nxt)
    c.status = "COMPLETED"
    db.commit()
    return {"ok": True, "next_step": c.step}
