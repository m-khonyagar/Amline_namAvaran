from __future__ import annotations

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.ids import parse_uuid
from app.core.security import decode_token
from app.db.session import get_db
from app.models.user import User

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    if creds is None:
        raise HTTPException(status_code=401, detail="missing_bearer_token")

    try:
        payload = decode_token(creds.credentials)
    except ValueError:
        raise HTTPException(status_code=401, detail="invalid_token")

    if payload.get("type") != "access":
        raise HTTPException(status_code=401, detail="invalid_token_type")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="invalid_token")

    try:
        uid = parse_uuid(user_id)
    except ValueError:
        raise HTTPException(status_code=401, detail="invalid_token")

    user = db.get(User, uid)
    if not user:
        raise HTTPException(status_code=401, detail="user_not_found")

    return user
