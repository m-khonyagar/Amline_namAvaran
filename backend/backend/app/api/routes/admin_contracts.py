"""Admin contract management routes."""
from __future__ import annotations

import uuid
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.authz import require_admin
from app.db.session import get_db
from app.models.consultant_profile import ConsultantProfile
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
        "owner_id": c.owner_id,
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


def _profile_out(p: ConsultantProfile) -> Dict[str, Any]:
    return {
        "id": str(p.id),
        "user_id": p.user_id,
        "full_name": p.full_name,
        "mobile": p.mobile,
        "national_code": p.national_code,
        "license_no": p.license_no,
        "city": p.city,
        "agency_name": p.agency_name,
        "verification_tier": p.verification_tier,
        "application_status": p.application_status,
        "credit_score": p.credit_score,
        "active_contracts_count": p.active_contracts_count,
        "assigned_leads_count": p.assigned_leads_count,
        "created_at": p.created_at.isoformat(),
        "updated_at": p.updated_at.isoformat(),
    }


# ─────────────────────────── base clauses (Hamgit-aligned) ───────

_BASE_CONTRACT_CLAUSES: list[Dict[str, Any]] = [
    {
        "id": "bc-default-1",
        "kind": "default",
        "title": "بند عمومی — تعهدات طرفین",
        "body": (
            "طرفین متعهد می‌شوند مفاد این قرارداد و ضمائم آن را در تمام مدت اجرا رعایت نمایند."
        ),
    },
    {
        "id": "bc-guaranteed-1",
        "kind": "guaranteed",
        "title": "بند ضمانتی — تخلیه و جریمه",
        "body": (
            "در صورت تخلف از تعهدات مالی یا عدم تخلیه به‌موقع، طرف متخلف مسئول خسارات قانونی و قراردادی است."
        ),
    },
]


@router.get("/contracts/base-clauses")
def admin_base_clauses(_: User = Depends(require_admin)) -> Dict[str, Any]:
    """متن‌های پیش‌فرض بندهای قرارداد — نسخهٔ قابل‌گسترش (CMS/DB در فاز بعد)."""
    return {"items": list(_BASE_CONTRACT_CLAUSES), "total": len(_BASE_CONTRACT_CLAUSES)}


# ─────────────────────────── contracts ──────────────────────────

@router.get("/pr-contracts/list")
def admin_contracts_list(
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    items = db.query(WizardContract).order_by(WizardContract.created_at.desc()).all()
    return [_out(c) for c in items]


@router.post("/contracts/{contract_id}/revoke")
def admin_revoke(
    contract_id: str,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    c = _get_or_404(contract_id, db)
    c.status = "REVOKED"
    db.commit()
    return {"ok": True}


@router.post("/contracts/{contract_id}/approve")
def admin_approve(
    contract_id: str,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    c = _get_or_404(contract_id, db)
    c.status = "ACTIVE"
    db.commit()
    return {"ok": True}


@router.post("/contracts/{contract_id}/reject")
def admin_reject(
    contract_id: str,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    c = _get_or_404(contract_id, db)
    c.status = "REJECTED"
    db.commit()
    return {"ok": True}


# ─────────────────────────── consultant applications ────────────

class ApplicationPatchBody(BaseModel):
    application_status: Optional[str] = None
    verification_tier: Optional[str] = None


@router.get("/consultants/applications")
def consultant_applications_list(
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    profiles = db.query(ConsultantProfile).order_by(ConsultantProfile.created_at.desc()).all()
    return [_profile_out(p) for p in profiles]


@router.patch("/consultants/applications/{profile_id}")
def consultant_application_patch(
    profile_id: str,
    body: ApplicationPatchBody,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    try:
        pid = uuid.UUID(profile_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="invalid_profile_id")
    profile = db.get(ConsultantProfile, pid)
    if not profile:
        raise HTTPException(status_code=404, detail="not_found")
    if body.application_status is not None:
        profile.application_status = body.application_status
    if body.verification_tier is not None:
        profile.verification_tier = body.verification_tier
    db.commit()
    db.refresh(profile)
    return _profile_out(profile)
