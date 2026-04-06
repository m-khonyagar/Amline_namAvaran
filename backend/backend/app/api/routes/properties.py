from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.ids import parse_uuid
from app.db.session import get_db
from app.models.property import Property
from app.models.user import User
from app.schemas.property import PropertyCreate, PropertyOut

router = APIRouter()


def _to_out(p: Property) -> PropertyOut:
    return PropertyOut(
        id=str(p.id),
        owner_id=str(p.owner_id),
        city=p.city,
        address=p.address,
        area=float(p.area),
        rooms=p.rooms,
        year_built=p.year_built,
        property_type=p.property_type,
        created_at=p.created_at,
    )


@router.post("", response_model=PropertyOut)
def create_property(
    req: PropertyCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    p = Property(
        owner_id=user.id,
        city=req.city,
        address=req.address,
        area=req.area,
        rooms=req.rooms,
        year_built=req.year_built,
        property_type=req.property_type,
    )
    db.add(p)
    db.commit()
    db.refresh(p)
    return _to_out(p)


@router.get("", response_model=list[PropertyOut])
def list_properties(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    items = db.query(Property).filter(Property.owner_id == user.id).order_by(Property.created_at.desc()).all()
    return [_to_out(p) for p in items]


@router.get("/{property_id}", response_model=PropertyOut)
def get_property(property_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        pid = parse_uuid(property_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="invalid_property_id")

    p = db.get(Property, pid)
    if not p:
        raise HTTPException(status_code=404, detail="property_not_found")
    if p.owner_id != user.id:
        raise HTTPException(status_code=403, detail="forbidden")
    return _to_out(p)


@router.put("/{property_id}", response_model=PropertyOut)
def update_property(
    property_id: str,
    req: PropertyCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        pid = parse_uuid(property_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="invalid_property_id")

    p = db.get(Property, pid)
    if not p:
        raise HTTPException(status_code=404, detail="property_not_found")
    if p.owner_id != user.id:
        raise HTTPException(status_code=403, detail="forbidden")

    p.city = req.city
    p.address = req.address
    p.area = req.area
    p.rooms = req.rooms
    p.year_built = req.year_built
    p.property_type = req.property_type

    db.commit()
    db.refresh(p)
    return _to_out(p)


@router.delete("/{property_id}")
def delete_property(property_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        pid = parse_uuid(property_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="invalid_property_id")

    p = db.get(Property, pid)
    if not p:
        raise HTTPException(status_code=404, detail="property_not_found")
    if p.owner_id != user.id:
        raise HTTPException(status_code=403, detail="forbidden")

    db.delete(p)
    db.commit()
    return {"ok": True}
