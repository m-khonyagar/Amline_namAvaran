"""Consultant-facing routes: auth, profile, dashboard, leads, application."""
from __future__ import annotations

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.consultant_profile import ConsultantProfile
from app.models.crm import CrmLead
from app.models.user import User, UserRole
from app.services import auth_tokens
from app.services.otp import generate_code, store_otp, verify_otp

router = APIRouter()


# ─────────────────────────── helpers ────────────────────────────

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


# ─────────────────────────── auth ───────────────────────────────

class RegisterBody(BaseModel):
    full_name: str
    mobile: str
    national_code: str
    license_no: str
    city: str
    agency_name: Optional[str] = None


class LoginBody(BaseModel):
    mobile: str
    otp: Optional[str] = None


@router.post("/auth/register", status_code=201)
def consultant_register(body: RegisterBody, db: Session = Depends(get_db)):
    existing = db.query(ConsultantProfile).filter(ConsultantProfile.mobile == body.mobile).first()
    if existing:
        raise HTTPException(status_code=400, detail="mobile_already_registered")

    # Create or find user
    user = db.query(User).filter(User.mobile == body.mobile).first()
    if not user:
        user = User(mobile=body.mobile, name=body.full_name)
        db.add(user)
        db.flush()

    profile = ConsultantProfile(
        user_id=str(user.id),
        full_name=body.full_name,
        mobile=body.mobile,
        national_code=body.national_code,
        license_no=body.license_no,
        city=body.city,
        agency_name=body.agency_name,
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return _profile_out(profile)


@router.post("/auth/login")
def consultant_login(body: LoginBody, db: Session = Depends(get_db)):
    profile = db.query(ConsultantProfile).filter(ConsultantProfile.mobile == body.mobile).first()
    if not profile:
        raise HTTPException(status_code=404, detail="consultant_not_found")

    user = db.query(User).filter(User.mobile == body.mobile).first()
    if not user:
        raise HTTPException(status_code=404, detail="user_not_found")

    pair = auth_tokens.issue_tokens(str(user.id))
    return {
        "access_token": pair.access_token,
        "refresh_token": pair.refresh_token,
        "user": {"id": str(user.id), "mobile": user.mobile, "full_name": user.name},
    }


# ─────────────────────────── profile ────────────────────────────

@router.get("/me")
def consultant_me(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    profile = db.query(ConsultantProfile).filter(ConsultantProfile.user_id == str(user.id)).first()
    if not profile:
        raise HTTPException(status_code=404, detail="consultant_not_found")
    return _profile_out(profile)


@router.get("/dashboard/summary")
def consultant_dashboard(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    profile = db.query(ConsultantProfile).filter(ConsultantProfile.user_id == str(user.id)).first()
    if not profile:
        raise HTTPException(status_code=404, detail="consultant_not_found")
    return {
        "profile": _profile_out(profile),
        "benefits": [],
        "next_steps": [],
    }


@router.get("/leads")
def consultant_leads(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    leads = db.query(CrmLead).filter(CrmLead.assigned_to == str(user.id)).all()
    return [
        {
            "id": str(l.id),
            "full_name": l.full_name,
            "mobile": l.mobile,
            "need_type": l.need_type,
            "status": l.status,
            "notes": l.notes,
            "created_at": l.created_at.isoformat(),
        }
        for l in leads
    ]


@router.get("/application")
def consultant_application(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    profile = db.query(ConsultantProfile).filter(ConsultantProfile.user_id == str(user.id)).first()
    if not profile:
        raise HTTPException(status_code=404, detail="consultant_not_found")
    return {
        "application_status": profile.application_status,
        "verification_tier": profile.verification_tier,
        "submitted_at": profile.created_at.isoformat(),
    }
