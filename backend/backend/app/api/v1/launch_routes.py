"""Post-launch: beta, onboarding, support, billing, KPIs, recommendations, ops ingest."""

from __future__ import annotations

import json
import os
from typing import List, Optional

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from starlette.responses import Response

from app.core.errors import AmlineError
from app.core.rbac_deps import require_permission
from app.db.session import get_db
from app.models.crm import CrmLead
from app.models.launch import SubscriptionPlan
from app.models.listing import Listing
from app.models.payment import PaymentIntent, PaymentIntentStatus
from app.models.visit import Visit
from app.repositories.listing_repository import ListingRepository
from app.repositories.v1.launch_repository import LaunchRepository
from app.repositories.v1.p1_repositories import AuditDbRepository
from app.schemas.v1.launch_v1 import (
    AgentKpiResponse,
    BetaAcceptBody,
    BetaInviteCreate,
    BetaInviteRead,
    BillingInvoiceRead,
    ClientErrorIngest,
    GamificationRead,
    I18nBundleResponse,
    InvoiceLineRead,
    ListingRecommendationsResponse,
    OnboardingEventCreate,
    OnboardingEventRead,
    OnboardingStatusResponse,
    OpsAlertingStatus,
    RecommendationItem,
    SubscribeBody,
    SubscriptionPlanRead,
    SupportMessageCreate,
    SupportMessageRead,
    SupportTicketCreate,
    SupportTicketPatch,
    SupportTicketRead,
    UserSubscriptionRead,
)
from app.services.v1.recommendation_cf import listing_recommendations_mixed

router = APIRouter(tags=["launch-platform"])


def _uid(request: Request) -> str:
    return request.headers.get("X-User-Id") or os.getenv(
        "AMLINE_AUDIT_USER_ID", "mock-001"
    )


def _ingest_allowed(request: Request) -> None:
    key = os.getenv("AMLINE_OPS_INGEST_KEY")
    if not key:
        return
    if request.headers.get("X-Ops-Ingest-Key") != key:
        raise AmlineError(
            "FORBIDDEN",
            "کلید ingest معتبر نیست.",
            status_code=403,
        )


# --- Beta ---
@router.post(
    "/admin/beta/invitations",
    response_model=BetaInviteRead,
    status_code=201,
    dependencies=[Depends(require_permission("roles:write"))],
)
def admin_create_beta_invite(
    body: BetaInviteCreate,
    request: Request,
    db: Session = Depends(get_db),
) -> BetaInviteRead:
    repo = LaunchRepository(db)
    raw, row = repo.create_beta_invitation(body.email, _uid(request), body.ttl_days)
    AuditDbRepository(db).write(
        user_id=_uid(request),
        action="beta.invite.create",
        entity="beta_invitation",
        metadata={"email": body.email, "invite_id": row.id},
    )
    db.commit()
    db.refresh(row)
    out = BetaInviteRead.model_validate(row)
    if os.getenv("AMLINE_BETA_RETURN_TOKEN", "1").lower() in ("1", "true", "yes"):
        out = out.model_copy(update={"token": raw})
    return out


@router.get(
    "/admin/beta/invitations",
    dependencies=[Depends(require_permission("roles:read"))],
)
def admin_list_beta_invites(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
) -> dict:
    repo = LaunchRepository(db)
    rows, total = repo.list_beta_invitations(skip, limit)
    return {
        "items": [BetaInviteRead.model_validate(r).model_dump() for r in rows],
        "total": total,
        "skip": skip,
        "limit": limit,
    }


@router.post("/beta/accept", status_code=204)
def beta_accept(body: BetaAcceptBody, db: Session = Depends(get_db)) -> Response:
    repo = LaunchRepository(db)
    row = repo.accept_beta_invitation(body.token, body.user_id)
    if not row:
        raise AmlineError(
            "RESOURCE_NOT_FOUND",
            "دعوت‌نامه نامعتبر یا منقضی است.",
            status_code=404,
            details={"entity": "beta_invitation"},
        )
    AuditDbRepository(db).write(
        user_id=body.user_id,
        action="beta.invite.accepted",
        entity="beta_invitation",
        metadata={"invite_id": row.id},
    )
    db.commit()
    return Response(status_code=204)


# --- Onboarding ---
@router.post(
    "/onboarding/events",
    response_model=OnboardingEventRead,
    status_code=201,
    dependencies=[Depends(require_permission("crm:write"))],
)
def onboarding_record_event(
    body: OnboardingEventCreate,
    request: Request,
    db: Session = Depends(get_db),
) -> OnboardingEventRead:
    uid = body.user_id or _uid(request)
    repo = LaunchRepository(db)
    row = repo.add_onboarding_event(uid, body.step, body.metadata)
    AuditDbRepository(db).write(
        user_id=_uid(request),
        action="onboarding.step",
        entity="user",
        metadata={"user_id": uid, "step": body.step},
    )
    db.commit()
    db.refresh(row)
    return OnboardingEventRead.model_validate(row)


@router.get(
    "/onboarding/status/{user_id}",
    response_model=OnboardingStatusResponse,
    dependencies=[Depends(require_permission("crm:read"))],
)
def onboarding_status(
    user_id: str, db: Session = Depends(get_db)
) -> OnboardingStatusResponse:
    repo = LaunchRepository(db)
    evs = repo.list_onboarding_events(user_id, limit=100)
    steps = [e.step for e in reversed(evs)]
    last = evs[0].step if evs else None
    return OnboardingStatusResponse(
        user_id=user_id,
        steps=steps,
        last_step=last,
        events=[OnboardingEventRead.model_validate(e) for e in evs],
    )


# --- Support ---
@router.post(
    "/support/tickets",
    response_model=SupportTicketRead,
    status_code=201,
    dependencies=[Depends(require_permission("crm:write"))],
)
def support_create_ticket(
    body: SupportTicketCreate,
    request: Request,
    db: Session = Depends(get_db),
) -> SupportTicketRead:
    repo = LaunchRepository(db)
    t = repo.create_ticket(_uid(request), body.subject, body.priority, body.body)
    db.commit()
    db.refresh(t)
    return SupportTicketRead.model_validate(t)


@router.get(
    "/support/tickets",
    dependencies=[Depends(require_permission("crm:read"))],
)
def support_list_tickets(
    request: Request,
    skip: int = Query(0, ge=0),
    limit: int = Query(30, ge=1, le=100),
    db: Session = Depends(get_db),
) -> dict:
    repo = LaunchRepository(db)
    rows, total = repo.list_tickets_for_user(_uid(request), skip, limit)
    return {
        "items": [SupportTicketRead.model_validate(r).model_dump() for r in rows],
        "total": total,
    }


@router.get(
    "/support/tickets/{ticket_id}/messages",
    dependencies=[Depends(require_permission("crm:read"))],
)
def support_list_messages(
    ticket_id: str,
    request: Request,
    db: Session = Depends(get_db),
) -> List[SupportMessageRead]:
    repo = LaunchRepository(db)
    t = repo.get_ticket(ticket_id)
    if not t or t.user_id != _uid(request):
        raise AmlineError("RESOURCE_NOT_FOUND", "تیکت یافت نشد.", status_code=404)
    return [SupportMessageRead.model_validate(m) for m in repo.list_messages(ticket_id)]


@router.post(
    "/support/tickets/{ticket_id}/messages",
    response_model=SupportMessageRead,
    status_code=201,
    dependencies=[Depends(require_permission("crm:write"))],
)
def support_add_message(
    ticket_id: str,
    body: SupportMessageCreate,
    request: Request,
    db: Session = Depends(get_db),
) -> SupportMessageRead:
    repo = LaunchRepository(db)
    t = repo.get_ticket(ticket_id)
    if not t or t.user_id != _uid(request):
        raise AmlineError("RESOURCE_NOT_FOUND", "تیکت یافت نشد.", status_code=404)
    m = repo.add_support_message(ticket_id, _uid(request), body.body)
    db.commit()
    db.refresh(m)
    return SupportMessageRead.model_validate(m)


@router.patch(
    "/admin/support/tickets/{ticket_id}",
    response_model=SupportTicketRead,
    dependencies=[Depends(require_permission("roles:write"))],
)
def admin_patch_ticket(
    ticket_id: str,
    body: SupportTicketPatch,
    request: Request,
    db: Session = Depends(get_db),
) -> SupportTicketRead:
    repo = LaunchRepository(db)
    t = repo.get_ticket(ticket_id)
    if not t:
        raise AmlineError("RESOURCE_NOT_FOUND", "تیکت یافت نشد.", status_code=404)
    t.status = body.status
    db.commit()
    db.refresh(t)
    AuditDbRepository(db).write(
        user_id=_uid(request),
        action="support.ticket.patch",
        entity="support_ticket",
        metadata={"ticket_id": ticket_id, "status": body.status},
    )
    db.commit()
    return SupportTicketRead.model_validate(t)


# --- Billing ---
@router.get(
    "/billing/plans",
    dependencies=[Depends(require_permission("listings:read"))],
)
def billing_plans(db: Session = Depends(get_db)) -> List[SubscriptionPlanRead]:
    repo = LaunchRepository(db)
    repo.seed_default_plans_if_empty()
    db.commit()
    return [SubscriptionPlanRead.model_validate(p) for p in repo.list_plans()]


@router.post(
    "/billing/subscribe",
    response_model=UserSubscriptionRead,
    status_code=201,
    dependencies=[Depends(require_permission("wallets:write"))],
)
def billing_subscribe(
    body: SubscribeBody,
    request: Request,
    db: Session = Depends(get_db),
) -> UserSubscriptionRead:
    repo = LaunchRepository(db)
    repo.seed_default_plans_if_empty()
    sub = repo.subscribe_user(_uid(request), body.plan_code)
    if not sub:
        raise AmlineError(
            "RESOURCE_NOT_FOUND",
            "پلن یافت نشد.",
            status_code=404,
            details={"plan_code": body.plan_code},
        )
    db.commit()
    db.refresh(sub)
    return UserSubscriptionRead.model_validate(sub)


@router.get(
    "/billing/me",
    response_model=UserSubscriptionRead | None,
    dependencies=[Depends(require_permission("wallets:read"))],
)
def billing_me(
    request: Request, db: Session = Depends(get_db)
) -> UserSubscriptionRead | None:
    repo = LaunchRepository(db)
    row = repo.get_user_subscription(_uid(request))
    return UserSubscriptionRead.model_validate(row) if row else None


@router.get(
    "/billing/invoice/latest",
    response_model=BillingInvoiceRead | None,
    dependencies=[Depends(require_permission("wallets:read"))],
)
def billing_invoice_latest(
    request: Request, db: Session = Depends(get_db)
) -> BillingInvoiceRead | None:
    repo = LaunchRepository(db)
    sub = repo.get_user_subscription(_uid(request))
    if not sub:
        return None
    plan = db.get(SubscriptionPlan, sub.plan_id)
    if not plan:
        return BillingInvoiceRead(
            subscription_id=sub.id,
            status=sub.status,
            lines=[],
            total_cents=0,
            period_end=sub.current_period_end,
        )
    line = InvoiceLineRead(description=plan.name_fa, amount_cents=plan.price_cents)
    return BillingInvoiceRead(
        subscription_id=sub.id,
        status=sub.status,
        lines=[line],
        total_cents=plan.price_cents,
        period_end=sub.current_period_end,
    )


# --- Dashboard ---
@router.get(
    "/dashboard/agent-kpis",
    response_model=AgentKpiResponse,
    dependencies=[Depends(require_permission("crm:read"))],
)
def agent_kpis(db: Session = Depends(get_db)) -> AgentKpiResponse:
    nv = int(db.scalar(select(func.count()).select_from(Visit)) or 0)
    nl = int(db.scalar(select(func.count()).select_from(CrmLead)) or 0)
    nlist = int(db.scalar(select(func.count()).select_from(Listing)) or 0)
    np = int(
        db.scalar(
            select(func.count())
            .select_from(PaymentIntent)
            .where(PaymentIntent.status == PaymentIntentStatus.COMPLETED)
        )
        or 0
    )
    return AgentKpiResponse(
        visits_total=nv,
        crm_leads_total=nl,
        listings_total=nlist,
        payments_completed_total=np,
    )


# --- Recommendations (rule stub) ---
@router.get(
    "/recommendations/listings",
    response_model=ListingRecommendationsResponse,
    dependencies=[Depends(require_permission("listings:read"))],
)
def listing_recommendations(
    request: Request,
    limit: int = Query(10, ge=1, le=50),
    for_user_id: Optional[str] = Query(
        None, description="برای فیلتر همکاری؛ پیش‌فرض از X-User-Id"
    ),
    db: Session = Depends(get_db),
) -> ListingRecommendationsResponse:
    uid = for_user_id or request.headers.get("X-User-Id")
    tuples = listing_recommendations_mixed(db, user_id=uid, limit=limit)
    items = [
        RecommendationItem(listing_id=lid, score=score, reason=reason)
        for lid, score, reason in tuples
    ]
    return ListingRecommendationsResponse(items=items)


# --- Ops / monitoring hooks ---
@router.post(
    "/ops/client-errors",
    status_code=201,
)
def ops_client_errors(
    body: ClientErrorIngest,
    request: Request,
    db: Session = Depends(get_db),
) -> dict:
    _ingest_allowed(request)
    repo = LaunchRepository(db)
    row = repo.record_client_error(
        message=body.message,
        stack=body.stack,
        url=body.url,
        user_id=body.user_id,
        fingerprint=body.fingerprint,
    )
    wh = os.getenv("AMLINE_ERROR_WEBHOOK_URL", "").strip()
    if wh:
        # Placeholder: production would POST async to Slack/PagerDuty
        AuditDbRepository(db).write(
            user_id="system",
            action="ops.client_error.webhook_placeholder",
            entity="client_error",
            metadata={"id": row.id, "webhook": wh[:48]},
        )
    db.commit()
    return {"id": row.id, "recorded": True}


@router.get("/ops/alerting/status", response_model=OpsAlertingStatus)
def ops_alerting_status() -> OpsAlertingStatus:
    return OpsAlertingStatus(
        prometheus_metrics_enabled=os.getenv("AMLINE_METRICS_ENABLED", "").lower()
        in ("1", "true", "yes"),
        client_error_ingest_key_configured=bool(os.getenv("AMLINE_OPS_INGEST_KEY")),
        error_webhook_configured=bool(os.getenv("AMLINE_ERROR_WEBHOOK_URL")),
    )


# --- i18n placeholders ---
@router.get("/i18n/bundle", response_model=I18nBundleResponse)
def i18n_bundle(locale: str = Query("fa")) -> I18nBundleResponse:
    loc = locale.lower()[:8]
    bundles = {
        "fa": {"app.title": "املاین", "cta.contact": "تماس با پشتیبانی"},
        "en": {"app.title": "Amline", "cta.contact": "Contact support"},
        "ar": {"app.title": "أملاين", "cta.contact": "اتصل بالدعم"},
    }
    return I18nBundleResponse(locale=loc, strings=bundles.get(loc, bundles["fa"]))


# --- Gamification stub ---
@router.get(
    "/gamification/me",
    response_model=GamificationRead,
    dependencies=[Depends(require_permission("crm:read"))],
)
def gamification_me(
    request: Request, db: Session = Depends(get_db)
) -> GamificationRead:
    repo = LaunchRepository(db)
    g = repo.get_or_create_gamification(_uid(request))
    db.commit()
    badges = []
    if g.badges_json:
        try:
            badges = json.loads(g.badges_json)
            if not isinstance(badges, list):
                badges = []
        except json.JSONDecodeError:
            badges = []
    return GamificationRead(
        user_id=g.user_id, points=g.points, level=g.level, badges=badges
    )
