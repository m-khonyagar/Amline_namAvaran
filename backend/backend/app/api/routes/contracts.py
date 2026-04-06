from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.ids import parse_uuid
from app.db.session import get_db
from app.models.contract import Contract, ContractStatus
from app.models.contract_signature import ContractSignature
from app.models.property import Property
from app.models.user import User
from app.schemas.contract import ContractCreate, ContractOut, SignRequest

router = APIRouter()


def _to_out(c: Contract) -> ContractOut:
    return ContractOut(
        id=str(c.id),
        property_id=str(c.property_id),
        owner_id=str(c.owner_id),
        tenant_id=str(c.tenant_id),
        contract_type=c.contract_type,
        deposit_amount=float(c.deposit_amount),
        rent_amount=float(c.rent_amount),
        start_date=c.start_date,
        end_date=c.end_date,
        status=str(c.status.value if hasattr(c.status, "value") else c.status),
        tracking_code=c.tracking_code,
        created_at=c.created_at,
    )


def _can_view(user: User, c: Contract) -> bool:
    return user.id in {c.owner_id, c.tenant_id}


@router.post("", response_model=ContractOut)
def create_contract(
    req: ContractCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        prop_id = parse_uuid(req.property_id)
        tenant_id = parse_uuid(req.tenant_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="invalid_ids")

    prop = db.get(Property, prop_id)
    if not prop:
        raise HTTPException(status_code=404, detail="property_not_found")
    if prop.owner_id != user.id:
        raise HTTPException(status_code=403, detail="only_owner_can_create_contract")

    tenant = db.get(User, tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="tenant_not_found")

    c = Contract(
        property_id=prop_id,
        owner_id=user.id,
        tenant_id=tenant_id,
        contract_type=req.contract_type,
        deposit_amount=req.deposit_amount,
        rent_amount=req.rent_amount,
        start_date=req.start_date,
        end_date=req.end_date,
        status=ContractStatus.draft,
    )
    db.add(c)
    db.commit()
    db.refresh(c)
    return _to_out(c)


@router.get("", response_model=list[ContractOut])
def list_contracts(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    items = (
        db.query(Contract)
        .filter((Contract.owner_id == user.id) | (Contract.tenant_id == user.id))
        .order_by(Contract.created_at.desc())
        .all()
    )
    return [_to_out(c) for c in items]


@router.get("/{contract_id}", response_model=ContractOut)
def get_contract(contract_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        cid = parse_uuid(contract_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="invalid_contract_id")

    c = db.get(Contract, cid)
    if not c:
        raise HTTPException(status_code=404, detail="contract_not_found")
    if not _can_view(user, c):
        raise HTTPException(status_code=403, detail="forbidden")
    return _to_out(c)


@router.post("/{contract_id}/sign", response_model=ContractOut)
def sign_contract(
    contract_id: str,
    req: SignRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        cid = parse_uuid(contract_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="invalid_contract_id")

    c = db.get(Contract, cid)
    if not c:
        raise HTTPException(status_code=404, detail="contract_not_found")
    if not _can_view(user, c):
        raise HTTPException(status_code=403, detail="forbidden")

    existing = (
        db.query(ContractSignature)
        .filter(ContractSignature.contract_id == c.id, ContractSignature.user_id == user.id)
        .one_or_none()
    )
    if existing:
        raise HTTPException(status_code=400, detail="already_signed")

    sig = ContractSignature(contract_id=c.id, user_id=user.id, signature_method=req.signature_method)
    db.add(sig)

    # If both parties have signed, mark as signed.
    db.flush()
    signer_ids = {
        s.user_id
        for s in db.query(ContractSignature).filter(ContractSignature.contract_id == c.id).all()
    }
    if c.owner_id in signer_ids and c.tenant_id in signer_ids:
        c.status = ContractStatus.signed

    db.commit()
    db.refresh(c)
    return _to_out(c)


@router.post("/{contract_id}/invite")
def invite_stub(contract_id: str, _: User = Depends(get_current_user)):
    return {"ok": True, "contract_id": contract_id}


@router.post("/{contract_id}/terminate")
def terminate_contract(contract_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        cid = parse_uuid(contract_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="invalid_contract_id")

    c = db.get(Contract, cid)
    if not c:
        raise HTTPException(status_code=404, detail="contract_not_found")
    if c.owner_id != user.id:
        raise HTTPException(status_code=403, detail="only_owner_can_terminate")

    c.status = ContractStatus.terminated
    db.commit()
    return {"ok": True}
