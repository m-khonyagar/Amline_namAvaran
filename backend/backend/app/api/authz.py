from __future__ import annotations

from fastapi import Depends, HTTPException

from app.api.deps import get_current_user
from app.models.user import User, UserRole


def require_roles(*roles: UserRole):
    def _dep(user: User = Depends(get_current_user)) -> User:
        allowed = {r.value for r in roles}
        role_value = user.role.value if hasattr(user.role, "value") else str(user.role)
        if role_value not in allowed:
            raise HTTPException(status_code=403, detail="forbidden")
        return user

    return _dep


require_admin = require_roles(UserRole.admin)
require_admin_or_moderator = require_roles(UserRole.admin, UserRole.moderator)
