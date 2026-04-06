from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.ids import parse_uuid
from app.db.session import get_db
from app.models.user import User
from app.schemas.user import UserLookupOut, UserMe, UserUpdate

router = APIRouter()


def _to_me(u: User) -> UserMe:
    return UserMe(
        id=str(u.id),
        mobile=u.mobile,
        national_code=u.national_code,
        name=u.name,
        role=str(u.role.value if hasattr(u.role, "value") else u.role),
        tenant_score=u.tenant_score,
        referral_code=u.referral_code,
        created_at=u.created_at,
    )


@router.get("/me", response_model=UserMe)
def me(user: User = Depends(get_current_user)):
    return _to_me(user)


@router.put("/profile", response_model=UserMe)
def update_profile(
    patch: UserUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    db_user = db.get(User, user.id)
    if not db_user:
        raise HTTPException(status_code=404, detail="user_not_found")

    if patch.national_code is not None:
        db_user.national_code = patch.national_code
    if patch.name is not None:
        db_user.name = patch.name

    db.commit()
    db.refresh(db_user)
    return _to_me(db_user)


@router.get("/{user_id}", response_model=UserMe)
def get_user(user_id: str, _: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        uid = parse_uuid(user_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="invalid_user_id")

    u = db.get(User, uid)
    if not u:
        raise HTTPException(status_code=404, detail="user_not_found")
    return _to_me(u)
@router.get("/lookup", response_model=UserLookupOut)
def lookup_by_mobile(mobile: str, _: User = Depends(get_current_user), db: Session = Depends(get_db)):
    m = (mobile or "").strip()
    # MVP-safe validation: expect Iranian mobile like 09XXXXXXXXX
    if len(m) != 11 or (not m.isdigit()) or (not m.startswith("09")):
        raise HTTPException(status_code=422, detail="invalid_mobile")

    u = db.query(User).filter(User.mobile == m).one_or_none()
    if not u:
        raise HTTPException(status_code=404, detail="user_not_found")

    return UserLookupOut(id=str(u.id), mobile=u.mobile, name=u.name)

