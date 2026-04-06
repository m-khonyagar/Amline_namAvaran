from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.ids import parse_uuid
from app.db.session import get_db
from app.models.campaign import Campaign
from app.models.user import User
from app.schemas.campaign import ApplyCampaignRequest, CampaignOut

router = APIRouter()


def _to_out(c: Campaign) -> CampaignOut:
    return CampaignOut(
        id=str(c.id),
        name=c.name,
        type=c.type,
        discount_percent=c.discount_percent,
        start_date=c.start_date,
        end_date=c.end_date,
        status=c.status,
    )


@router.get("", response_model=list[CampaignOut])
def list_campaigns(_: User = Depends(get_current_user), db: Session = Depends(get_db)):
    items = db.query(Campaign).order_by(Campaign.start_date.desc()).all()
    return [_to_out(x) for x in items]


@router.post("/apply")
def apply_campaign(req: ApplyCampaignRequest, _: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # MVP: validate campaign exists, return discount. (No persistence yet)
    cid = parse_uuid(req.campaign_id)
    c = db.get(Campaign, cid)
    if not c:
        return {"ok": False, "reason": "campaign_not_found"}
    return {"ok": True, "discount_percent": c.discount_percent}
