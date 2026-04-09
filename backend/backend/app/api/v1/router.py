"""Aggregates all v1 HTTP routes (same paths as legacy dev-mock-api for dual-mount)."""

from fastapi import APIRouter

from app.api.routes import (
    admin_auth as legacy_admin_auth,
    arbitrations as legacy_arbitrations,
    arbitration_summary as legacy_arbitration_summary,
    auth as legacy_auth_otp,
    contract_wizard as legacy_contract_wizard,
    contracts as legacy_contracts_v2,
    financials as legacy_financials,
    payments as legacy_payments,
    properties as legacy_properties,
    tenant_score as legacy_tenant_score,
    users as legacy_users,
    wallet as legacy_wallet,
)
from app.api.v1 import (
    admin_routes,
    auth_routes,
    contracts_routes,
    dispute_routes,
    crm_routes,
    crm_v1_routes,
    geo_routes,
    growth_ai_routes,
    growth_analytics_routes,
    growth_chat_routes,
    growth_mobile_routes,
    growth_public_routes,
    growth_rating_routes,
    growth_search_routes,
    health_routes,
    integrations_routes,
    launch_routes,
    legal_routes,
    listings_routes,
    media_routes,
    meta_routes,
    misc_routes,
    messaging_bots_routes,
    notifications_routes,
    payment_routes,
    registry_routes,
    security_routes,
    visits_routes,
    wallet_routes,
)

platform_router = APIRouter()
platform_router.include_router(health_routes.router)
# DB-backed /admin/login + /admin/otp/send (must precede auth_routes memory stubs)
platform_router.include_router(legacy_admin_auth.router, prefix="/admin", tags=["admin-auth"])
platform_router.include_router(auth_routes.router)
# DB-backed auth + domain routes (same as app.api.router legacy mount) for root /api/v1 parity tests
platform_router.include_router(legacy_auth_otp.router, prefix="/auth")
platform_router.include_router(legacy_users.router, prefix="/users")
platform_router.include_router(legacy_properties.router, prefix="/properties")
platform_router.include_router(legacy_contracts_v2.router, prefix="/contracts-v2")
platform_router.include_router(legacy_arbitrations.router, prefix="/arbitrations")
platform_router.include_router(legacy_arbitration_summary.router, prefix="/arbitrations")
platform_router.include_router(legacy_wallet.router, prefix="/wallet")
platform_router.include_router(legacy_payments.router, prefix="/payments")
platform_router.include_router(legacy_tenant_score.router, prefix="/tenant-score")
platform_router.include_router(legacy_financials.router, prefix="/financials")
# WizardContract flows (DB); prefix avoids clashing with SSOT /contracts/* on contracts_routes
platform_router.include_router(legacy_contract_wizard.router, prefix="/wizard", tags=["contract-wizard"])
platform_router.include_router(contracts_routes.router)
platform_router.include_router(dispute_routes.router)
platform_router.include_router(misc_routes.router)
platform_router.include_router(messaging_bots_routes.router)
platform_router.include_router(admin_routes.router)
platform_router.include_router(crm_routes.router)
platform_router.include_router(crm_v1_routes.router)
platform_router.include_router(visits_routes.router)
platform_router.include_router(wallet_routes.router)
platform_router.include_router(payment_routes.router)
platform_router.include_router(legal_routes.router)
platform_router.include_router(registry_routes.router)
platform_router.include_router(notifications_routes.router)
platform_router.include_router(geo_routes.router)
platform_router.include_router(launch_routes.router)
platform_router.include_router(security_routes.router)
platform_router.include_router(listings_routes.router)
platform_router.include_router(media_routes.router)
platform_router.include_router(meta_routes.router)
platform_router.include_router(growth_ai_routes.router)
platform_router.include_router(growth_chat_routes.router)
platform_router.include_router(growth_rating_routes.router)
platform_router.include_router(growth_mobile_routes.router)
platform_router.include_router(growth_search_routes.router)
platform_router.include_router(integrations_routes.router)
platform_router.include_router(growth_analytics_routes.router)
platform_router.include_router(growth_public_routes.router)
