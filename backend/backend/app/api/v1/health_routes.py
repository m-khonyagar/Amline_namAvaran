from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import func, select, text
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.crm import CrmLead
from app.models.visit import Visit

router = APIRouter(tags=["health"])


@router.get("/health")
def health() -> dict:
    return {"status": "ok"}


@router.get("/health/live")
def health_live() -> dict:
    return {"status": "alive"}


@router.get("/health/ready")
def health_ready(db: Session = Depends(get_db)) -> dict:
    db.execute(text("SELECT 1"))
    return {"status": "ready", "database": "ok"}


@router.get("/health/metrics")
def health_metrics(db: Session = Depends(get_db)) -> dict:
    """Lightweight counters for ops dashboards (expand with Prometheus later)."""
    n_leads = int(db.scalar(select(func.count()).select_from(CrmLead)) or 0)
    n_visits = int(db.scalar(select(func.count()).select_from(Visit)) or 0)
    return {
        "crm_leads_total": n_leads,
        "visits_total": n_visits,
        "metrics_backend": "sqlalchemy_count",
    }
