import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import admin_panel
from app.api.v1.router import platform_router
from app.core.errors import register_exception_handlers, register_request_id_middleware
from app.core.i18n_middleware import register_i18n
from app.core.ops import register_ops
from app.core.otel_setup import register_opentelemetry
from app.core.request_logging import register_request_logging

app = FastAPI(title="Amline API", version="1.0.0", docs_url="/docs", redoc_url="/redoc")

_cors = os.getenv("AMLINE_CORS_ORIGINS", "").strip()
_allow_origins = (
    [x.strip() for x in _cors.split(",") if x.strip()]
    if _cors
    else [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
        "http://localhost:3003",
        "http://localhost:3005",
        "http://localhost:3011",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://127.0.0.1:3002",
        "http://127.0.0.1:3003",
        "http://127.0.0.1:3005",
        "http://127.0.0.1:3011",
    ]
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_request_id_middleware(app)
register_i18n(app)
register_request_logging(app)
register_exception_handlers(app)
register_ops(app)
register_opentelemetry(app)

# Canonical API (Master Spec v3): /api/v1/*
app.include_router(platform_router, prefix="/api/v1")

# DB-backed admin CRM (leads, tasks, activities, stats). Must be registered before the
# root platform_router mount so `/admin/crm/*` hits SQLAlchemy, not the in-memory crm_routes.
app.include_router(admin_panel.router, prefix="/admin", tags=["admin-panel"])

# Legacy paths identical to dev-mock-api (frontend proxy unchanged until migration)
app.include_router(platform_router, prefix="")
