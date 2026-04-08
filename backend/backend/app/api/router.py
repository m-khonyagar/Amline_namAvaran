from __future__ import annotations

from fastapi import APIRouter, Depends

from app.api.deps import get_current_user
from app.api.routes import (
    admin,
    admin_auth,
    admin_contracts,
    admin_panel,
    analytics,
    arbitration_summary,
    arbitrations,
    auth,
    campaigns,
    consultant,
    contract_wizard,
    contracts,
    documents,
    financials,
    notifications,
    payments,
    properties,
    referrals,
    requirements_market,
    tenant_score,
    users,
    wallet,
)
from app.models.user import User

api_router = APIRouter()

# ── original routes ──────────────────────────────────────────────
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(properties.router, prefix="/properties", tags=["properties"])
# original property-based contracts moved to /contracts-v2 to avoid conflict with wizard
api_router.include_router(contracts.router, prefix="/contracts-v2", tags=["contracts-v2"])
api_router.include_router(payments.router, prefix="/payments", tags=["payments"])
api_router.include_router(wallet.router, prefix="/wallet", tags=["wallet"])
api_router.include_router(financials.router, prefix="/financials", tags=["financials"])
api_router.include_router(referrals.router, prefix="/referrals", tags=["referrals"])
api_router.include_router(campaigns.router, prefix="/campaigns", tags=["campaigns"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["notifications"])
api_router.include_router(documents.router, prefix="/documents", tags=["documents"])
api_router.include_router(tenant_score.router, prefix="/tenant-score", tags=["tenant-score"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
api_router.include_router(arbitrations.router, prefix="/arbitrations", tags=["arbitrations"])
api_router.include_router(arbitration_summary.router, prefix="/arbitrations", tags=["arbitrations"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])

# ── wizard contract flow ─────────────────────────────────────────
# /contracts/start, /contracts/list, /contracts/{id}/...
api_router.include_router(contract_wizard.router, prefix="/contracts", tags=["wizard"])

# ── admin panel auth ─────────────────────────────────────────────
# /admin/otp/send, /admin/login
api_router.include_router(admin_auth.router, prefix="/admin", tags=["admin-auth"])

# ── admin panel endpoints ────────────────────────────────────────
# /admin/roles, /admin/audit, /admin/crm/leads, /admin/metrics/summary, ...
api_router.include_router(admin_panel.router, prefix="/admin", tags=["admin-panel"])

# ── admin contract management ────────────────────────────────────
# /admin/pr-contracts/list, /admin/contracts/{id}/revoke, /admin/consultants/applications, ...
api_router.include_router(admin_contracts.router, prefix="/admin", tags=["admin-contracts"])

# ── consultant routes ────────────────────────────────────────────
# /consultant/auth/register, /consultant/auth/login, /consultant/me, ...
api_router.include_router(consultant.router, prefix="/consultant", tags=["consultant"])

# ── نیازمندی کاربر + بازار (Hamgit-style) ───────────────────────
api_router.include_router(requirements_market.router, prefix="/requirements", tags=["requirements"])
api_router.include_router(requirements_market.market_router, prefix="/market", tags=["market"])
api_router.include_router(
    requirements_market.admin_ads_router,
    prefix="/admin",
    tags=["admin-ads-hamgit"],
)

# ── /auth/me — consumed by both admin-ui and amline-ui ──────────
@api_router.get("/auth/me", tags=["auth"])
def auth_me_root(user: User = Depends(get_current_user)):
    """Shortcut: GET /auth/me — delegates to admin_panel.auth_me logic."""
    from app.api.routes.admin_panel import ROLE_PERMISSIONS, _user_permissions
    role_val = user.role.value if hasattr(user.role, "value") else str(user.role)
    return {
        "id": str(user.id),
        "mobile": user.mobile,
        "full_name": user.name,
        "role": role_val,
        "role_id": f"role-{role_val.lower()}",
        "permissions": _user_permissions(user),
    }
