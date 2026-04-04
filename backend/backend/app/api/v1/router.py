"""Aggregates all v1 HTTP routes (same paths as legacy dev-mock-api for dual-mount)."""

from fastapi import APIRouter

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
    notifications_routes,
    payment_routes,
    registry_routes,
    security_routes,
    visits_routes,
    wallet_routes,
)

platform_router = APIRouter()
platform_router.include_router(health_routes.router)
platform_router.include_router(auth_routes.router)
platform_router.include_router(contracts_routes.router)
platform_router.include_router(dispute_routes.router)
platform_router.include_router(misc_routes.router)
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
