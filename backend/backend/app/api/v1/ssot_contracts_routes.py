"""SSOT Contract Domain — endpoints under /contracts (Step 2).

مسیرهای جدید (DB-backed):
  POST   /contracts              → ایجاد پیش‌نویس
  PATCH  /contracts/{id}         → به‌روزرسانی پیش‌نویس
  POST   /contracts/{id}/finalize → تبدیل پیش‌نویس به قرارداد نهایی
  GET    /contracts              → لیست قراردادها (با رعایت visibility)
  POST   /contracts/{id}/invite  → دعوت طرف قرارداد
  POST   /contracts/{id}/sign    → تأیید OTP و امضا (با حمایت از legacy flow)

قوانین OTP:
  - انقضا: ۵ دقیقه
  - حداکثر تلاش: ۳ بار
  - قفل: ۱۵ دقیقه پس از ۳ تلاش ناموفق
"""
from __future__ import annotations

import datetime as dt
import hashlib
import random
import secrets
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_optional_current_user
from app.db.session import get_db
from app.models.consultant_profile import ConsultantProfile
from app.models.ssot_contract import (
    ContractPartyRole,
    ContractVisibility,
    SignatureStatus,
    SsotContract,
    SsotContractDraft,
    SsotContractParty,
    SsotContractStatus,
    SsotSignature,
)
from app.models.user import User
from app.schemas.v1.ssot_contract import (
    ContractListOut,
    ContractOut,
    DraftCreateBody,
    DraftOut,
    DraftUpdateBody,
    FinalizeBody,
    InviteBody,
    PartyOut,
    SignOut,
)

router = APIRouter(tags=["ssot-contracts"])

_OTP_EXPIRE_MINUTES = 5
_OTP_MAX_ATTEMPTS = 3
_OTP_LOCK_MINUTES = 15


# ─────────────────────── Combined sign body ──────────────────────


class _SignAnyBody(BaseModel):
    """بدنه‌ای که هم SSOT (otp_code) و هم legacy (party_id) را می‌پذیرد."""

    model_config = ConfigDict(extra="allow")

    # SSOT fields
    otp_code: Optional[str] = None
    party_id: Optional[str] = None
    # legacy fields (ignored for SSOT contracts)
    signer_id: Optional[object] = None
    user_id: Optional[object] = None
    sign_type: Optional[str] = None


# ─────────────────────────── helpers ─────────────────────────────


def _draft_out(d: SsotContractDraft) -> DraftOut:
    return DraftOut(
        id=str(d.id),
        contract_id=str(d.contract_id) if d.contract_id else None,
        user_id=str(d.user_id),
        step=d.step,
        data=d.data or {},
        version=d.version,
        expires_at=d.expires_at,
        created_at=d.created_at,
        updated_at=d.updated_at,
    )


def _contract_out(c: SsotContract) -> ContractOut:
    return ContractOut(
        id=str(c.id),
        contract_number=c.contract_number,
        status=c.status,
        visibility=c.visibility,
        creator_id=str(c.creator_id),
        advisor_id=str(c.advisor_id) if c.advisor_id else None,
        tracking_code=c.tracking_code,
        created_at=c.created_at,
        updated_at=c.updated_at,
    )


def _party_out(p: SsotContractParty) -> PartyOut:
    return PartyOut(
        id=str(p.id),
        contract_id=str(p.contract_id),
        user_id=str(p.user_id),
        role=p.role,
        signature_status=p.signature_status,
        invited_at=p.invited_at,
        signed_at=p.signed_at,
    )


def _get_draft_or_404(draft_id: str, db: Session) -> SsotContractDraft:
    try:
        did = uuid.UUID(draft_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="invalid_draft_id")
    d = db.get(SsotContractDraft, did)
    if not d:
        raise HTTPException(status_code=404, detail="draft_not_found")
    return d


def _get_contract_or_404(contract_id: str, db: Session) -> SsotContract:
    try:
        cid = uuid.UUID(contract_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="invalid_contract_id")
    c = db.get(SsotContract, cid)
    if not c:
        raise HTTPException(status_code=404, detail="contract_not_found")
    return c


def _generate_otp() -> str:
    return f"{random.randint(0, 999999):06d}"


def _signature_hash(otp: str, party_id: str) -> str:
    return hashlib.sha256(f"{otp}:{party_id}:{secrets.token_hex(8)}".encode()).hexdigest()


# ─────────────────── Visibility query helper ─────────────────────


def _visibility_filter(query, user: User, db: Session):
    """فیلتر قراردادها بر اساس visibility و نقش کاربر.

    قوانین:
      people_only → فقط creator + parties
      shared      → کاربران دعوت‌شده (در contract_parties)
      team        → تیم مشاور (مشاوران با advisor_id یکسان)
      public      → همه مشاوران (role=Agent/Admin/Moderator یا پروفایل مشاور)
    """
    from sqlalchemy import or_, and_

    user_role = user.role.value if hasattr(user.role, "value") else str(user.role)
    is_advisor = user_role in ("Agent", "Admin", "Moderator")

    # بررسی وجود پروفایل مشاور
    consultant = (
        db.query(ConsultantProfile)
        .filter(ConsultantProfile.user_id == str(user.id))
        .first()
    )
    has_consultant_profile = consultant is not None

    # subquery: قراردادهایی که user در آن‌ها طرف است
    party_subq = select(SsotContractParty.contract_id).where(
        SsotContractParty.user_id == user.id
    )

    conditions = []

    # ۱) people_only: creator یا طرف قرارداد
    conditions.append(
        and_(
            SsotContract.visibility == ContractVisibility.people_only.value,
            or_(
                SsotContract.creator_id == user.id,
                SsotContract.id.in_(party_subq),
            ),
        )
    )

    # ۲) shared: دعوت‌شده (در parties)
    conditions.append(
        and_(
            SsotContract.visibility == ContractVisibility.shared.value,
            SsotContract.id.in_(party_subq),
        )
    )

    # ۳) team: مشاور همان تیم
    # TODO: اگر مدل تیم مشاور پیاده‌سازی شود، فیلتر دقیق‌تری اضافه کنید.
    # در حال حاضر: کسانی که advisor_id آن‌ها با مشاور قرارداد یکسان است.
    if is_advisor or has_consultant_profile:
        conditions.append(
            and_(
                SsotContract.visibility == ContractVisibility.team.value,
                SsotContract.advisor_id == user.id,
            )
        )

    # ۴) public: همه مشاوران
    if is_advisor or has_consultant_profile:
        conditions.append(
            SsotContract.visibility == ContractVisibility.public.value
        )

    return query.filter(or_(*conditions))


# ─────────────────────────── Endpoints ───────────────────────────


@router.post("/contracts", response_model=DraftOut, status_code=201, tags=["ssot-contracts"])
def create_draft(
    body: DraftCreateBody,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """POST /contracts → ایجاد پیش‌نویس قرارداد جدید."""
    # اعتبارسنجی visibility
    valid_vis = {v.value for v in ContractVisibility}
    if body.visibility not in valid_vis:
        raise HTTPException(
            status_code=422,
            detail=f"visibility باید یکی از {sorted(valid_vis)} باشد",
        )

    # اعتبارسنجی advisor_id
    advisor_uuid: uuid.UUID | None = None
    if body.advisor_id:
        try:
            advisor_uuid = uuid.UUID(body.advisor_id)
        except ValueError:
            raise HTTPException(status_code=422, detail="invalid_advisor_id")
        advisor = db.get(User, advisor_uuid)
        if not advisor:
            raise HTTPException(status_code=404, detail="advisor_not_found")

    draft = SsotContractDraft(
        user_id=user.id,
        step=body.step,
        data={**body.data, "_visibility": body.visibility, "_advisor_id": body.advisor_id},
        version=1,
        expires_at=dt.datetime.now(dt.timezone.utc) + dt.timedelta(days=7),
    )
    db.add(draft)
    db.commit()
    db.refresh(draft)
    return _draft_out(draft)


@router.patch("/contracts/{draft_id}", response_model=DraftOut, tags=["ssot-contracts"])
def update_draft(
    draft_id: str,
    body: DraftUpdateBody,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """PATCH /contracts/{id} → به‌روزرسانی پیش‌نویس."""
    d = _get_draft_or_404(draft_id, db)

    if d.user_id != user.id:
        raise HTTPException(status_code=403, detail="forbidden")

    # بررسی انقضا
    now = dt.datetime.now(dt.timezone.utc)
    if d.expires_at.replace(tzinfo=dt.timezone.utc) < now:
        raise HTTPException(status_code=410, detail="draft_expired")

    if body.step is not None:
        d.step = body.step

    merged_data = dict(d.data or {})
    if body.data is not None:
        merged_data.update(body.data)
    if body.visibility is not None:
        valid_vis = {v.value for v in ContractVisibility}
        if body.visibility not in valid_vis:
            raise HTTPException(
                status_code=422,
                detail=f"visibility باید یکی از {sorted(valid_vis)} باشد",
            )
        merged_data["_visibility"] = body.visibility
    if body.advisor_id is not None:
        merged_data["_advisor_id"] = body.advisor_id

    d.data = merged_data
    d.version = (d.version or 1) + 1
    d.updated_at = now
    db.commit()
    db.refresh(d)
    return _draft_out(d)


@router.post(
    "/contracts/{draft_id}/finalize",
    response_model=ContractOut,
    status_code=201,
    tags=["ssot-contracts"],
)
def finalize_draft(
    draft_id: str,
    body: FinalizeBody,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """POST /contracts/{id}/finalize → تبدیل پیش‌نویس به قرارداد نهایی."""
    d = _get_draft_or_404(draft_id, db)

    if d.user_id != user.id:
        raise HTTPException(status_code=403, detail="forbidden")

    now = dt.datetime.now(dt.timezone.utc)
    if d.expires_at.replace(tzinfo=dt.timezone.utc) < now:
        raise HTTPException(status_code=410, detail="draft_expired")

    if d.contract_id is not None:
        raise HTTPException(status_code=409, detail="draft_already_finalized")

    data = d.data or {}
    visibility = data.get("_visibility", ContractVisibility.people_only.value)
    advisor_id_str = data.get("_advisor_id")
    advisor_uuid: uuid.UUID | None = None
    if advisor_id_str:
        try:
            advisor_uuid = uuid.UUID(advisor_id_str)
        except ValueError:
            advisor_uuid = None

    # ایجاد قرارداد نهایی
    contract = SsotContract(
        contract_number=body.contract_number or f"AMC-{secrets.token_hex(6).upper()}",
        status=SsotContractStatus.active.value,
        visibility=visibility,
        creator_id=user.id,
        advisor_id=advisor_uuid,
        tracking_code=secrets.token_hex(16),
    )
    db.add(contract)
    db.flush()

    # ارتباط پیش‌نویس به قرارداد
    d.contract_id = contract.id
    d.updated_at = now

    # اضافه کردن سازنده به عنوان طرف creator
    creator_party = SsotContractParty(
        contract_id=contract.id,
        user_id=user.id,
        role=ContractPartyRole.creator.value,
        signature_status=SignatureStatus.pending.value,
        invited_at=now,
    )
    db.add(creator_party)
    db.commit()
    db.refresh(contract)
    return _contract_out(contract)


@router.get("/contracts", response_model=list[ContractListOut], tags=["ssot-contracts"])
def list_contracts(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """GET /contracts → لیست قراردادها با رعایت visibility."""
    q = db.query(SsotContract).order_by(SsotContract.created_at.desc())
    q = _visibility_filter(q, user, db)
    contracts = q.all()
    return [
        ContractListOut(
            id=str(c.id),
            contract_number=c.contract_number,
            status=c.status,
            visibility=c.visibility,
            creator_id=str(c.creator_id),
            tracking_code=c.tracking_code,
            created_at=c.created_at,
        )
        for c in contracts
    ]


@router.post(
    "/contracts/{contract_id}/invite",
    response_model=PartyOut,
    status_code=201,
    tags=["ssot-contracts"],
)
def invite_party(
    contract_id: str,
    body: InviteBody,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """POST /contracts/{id}/invite → دعوت طرف قرارداد."""
    c = _get_contract_or_404(contract_id, db)

    if c.creator_id != user.id:
        raise HTTPException(status_code=403, detail="only_creator_can_invite")

    # اعتبارسنجی نقش
    valid_roles = {r.value for r in ContractPartyRole}
    if body.role not in valid_roles:
        raise HTTPException(
            status_code=422,
            detail=f"role باید یکی از {sorted(valid_roles)} باشد",
        )

    try:
        invited_uuid = uuid.UUID(body.user_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="invalid_user_id")

    invited_user = db.get(User, invited_uuid)
    if not invited_user:
        raise HTTPException(status_code=404, detail="user_not_found")

    # بررسی تکراری نبودن
    existing = (
        db.query(SsotContractParty)
        .filter(
            SsotContractParty.contract_id == c.id,
            SsotContractParty.user_id == invited_uuid,
        )
        .first()
    )
    if existing:
        raise HTTPException(status_code=409, detail="user_already_invited")

    now = dt.datetime.now(dt.timezone.utc)
    party = SsotContractParty(
        contract_id=c.id,
        user_id=invited_uuid,
        role=body.role,
        signature_status=SignatureStatus.sent.value,
        invited_at=now,
    )
    db.add(party)
    db.commit()
    db.refresh(party)
    return _party_out(party)


@router.post(
    "/contracts/{contract_id}/sign",
    tags=["ssot-contracts"],
)
def sign_contract(
    contract_id: str,
    body: _SignAnyBody,
    request: Request,
    user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
):
    """POST /contracts/{id}/sign → تأیید OTP و امضای قرارداد SSOT.

    اگر contract_id در جدول ssot_contracts نباشد، درخواست به
    سرویس legacy ارجاع داده می‌شود تا یکپارچگی backward حفظ شود.

    قوانین OTP (فقط برای SSOT contracts):
      - انقضا ۵ دقیقه
      - حداکثر ۳ تلاش
      - قفل ۱۵ دقیقه پس از ۳ تلاش ناموفق
    """
    # بررسی SSOT
    ssot_contract: Optional[SsotContract] = None
    try:
        cid = uuid.UUID(contract_id)
        ssot_contract = db.get(SsotContract, cid)
    except ValueError:
        pass

    if ssot_contract is None:
        # ─── Legacy delegation ────────────────────────────────────
        from app.services.v1.signature_service import get_signature_service
        ip = request.client.host if request.client else None
        ua = request.headers.get("user-agent")
        result = get_signature_service().request_contract_sign(
            contract_id,
            party_id=body.party_id,
            mobile_override=None,
            client_ip=ip,
            user_agent=ua,
        )
        # legacy endpoint uses status_code=201
        return JSONResponse(status_code=201, content=result)

    # ─── SSOT sign flow ───────────────────────────────────────────
    if user is None:
        raise HTTPException(status_code=401, detail="missing_or_invalid_token")

    # پیدا کردن طرف قرارداد
    party_uuid: Optional[uuid.UUID] = None
    if body.party_id:
        try:
            party_uuid = uuid.UUID(body.party_id)
        except ValueError:
            raise HTTPException(status_code=422, detail="invalid_party_id")

    if party_uuid:
        party = (
            db.query(SsotContractParty)
            .filter(
                SsotContractParty.contract_id == ssot_contract.id,
                SsotContractParty.id == party_uuid,
            )
            .first()
        )
    else:
        party = (
            db.query(SsotContractParty)
            .filter(
                SsotContractParty.contract_id == ssot_contract.id,
                SsotContractParty.user_id == user.id,
            )
            .first()
        )

    if not party:
        raise HTTPException(status_code=404, detail="party_not_found")

    if party.user_id != user.id:
        raise HTTPException(status_code=403, detail="forbidden")

    if party.signature_status == SignatureStatus.signed.value:
        raise HTTPException(status_code=409, detail="already_signed")

    now = dt.datetime.now(dt.timezone.utc)

    # پیدا کردن یا ساختن رکورد امضا
    sig = (
        db.query(SsotSignature)
        .filter(SsotSignature.contract_party_id == party.id)
        .order_by(SsotSignature.created_at.desc())
        .first()
    )

    if sig is None:
        # هنوز OTP صادر نشده — صدور OTP جدید
        otp = _generate_otp()
        sig = SsotSignature(
            contract_party_id=party.id,
            otp_code=otp,
            otp_expires_at=now + dt.timedelta(minutes=_OTP_EXPIRE_MINUTES),
            attempts=0,
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
        )
        db.add(sig)
        db.commit()
        db.refresh(sig)
        return JSONResponse(
            status_code=202,
            content={
                "ok": True,
                "message": "otp_sent",
                "expires_in_seconds": _OTP_EXPIRE_MINUTES * 60,
            },
        )

    # بررسی قفل بودن
    if sig.locked_until:
        lu = sig.locked_until
        if lu.tzinfo is None:
            lu = lu.replace(tzinfo=dt.timezone.utc)
        if lu > now:
            remaining = int((lu - now).total_seconds())
            raise HTTPException(
                status_code=423,
                detail={"message": "locked", "retry_after_seconds": remaining},
            )

    # بررسی انقضای OTP
    otp_exp = sig.otp_expires_at
    if otp_exp:
        if otp_exp.tzinfo is None:
            otp_exp = otp_exp.replace(tzinfo=dt.timezone.utc)
        if otp_exp < now:
            raise HTTPException(status_code=410, detail="otp_expired")

    # تأیید OTP
    otp_code = (body.otp_code or "").strip()
    if sig.otp_code != otp_code:
        sig.attempts = (sig.attempts or 0) + 1
        if sig.attempts >= _OTP_MAX_ATTEMPTS:
            sig.locked_until = now + dt.timedelta(minutes=_OTP_LOCK_MINUTES)
        db.commit()
        remaining = _OTP_MAX_ATTEMPTS - sig.attempts
        raise HTTPException(
            status_code=400,
            detail={
                "message": "invalid_otp",
                "attempts_remaining": max(0, remaining),
            },
        )

    # OTP صحیح است — ثبت امضا
    ip = request.client.host if request.client else None
    ua = request.headers.get("user-agent")
    sig.signature_hash = _signature_hash(otp_code, str(party.id))
    sig.ip_address = ip
    sig.user_agent = ua
    sig.otp_code = None  # پاک کردن OTP پس از استفاده
    sig.locked_until = None

    party.signature_status = SignatureStatus.signed.value
    party.signed_at = now

    # بررسی اینکه همه طرف‌ها امضا کرده‌اند
    all_parties = (
        db.query(SsotContractParty)
        .filter(SsotContractParty.contract_id == ssot_contract.id)
        .all()
    )
    all_signed = all(
        p.signature_status == SignatureStatus.signed.value for p in all_parties
    )
    if all_signed:
        ssot_contract.status = SsotContractStatus.signed.value
        ssot_contract.updated_at = now

    db.commit()
    db.refresh(party)

    return SignOut(
        ok=True,
        party_id=str(party.id),
        signed_at=party.signed_at,
        contract_status=ssot_contract.status,
    )

