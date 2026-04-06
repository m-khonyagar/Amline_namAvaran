from __future__ import annotations

import datetime as dt
from typing import Any

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.api.authz import require_admin_or_moderator
from app.api.deps import get_current_user
from app.core.ids import parse_uuid
from app.db.session import get_db
from app.models.arbitration import Arbitration, ArbitrationStatus
from app.models.arbitration_attachment import ArbitrationAttachment
from app.models.arbitration_message import ArbitrationMessage
from app.models.contract import Contract
from app.models.user import User
from app.schemas.arbitration import ArbitrationCreate, ArbitrationOut, ArbitrationResolve
from app.schemas.arbitration_workflow import (
    ArbitrationAttachmentOut,
    ArbitrationMessageCreate,
    ArbitrationMessageOut,
)
from app.schemas.document import PresignResponse
from app.services.documents import local_write, presign_get_url, store_document_bytes
from app.services.notifications_emit import notify_user

router = APIRouter()


def _to_out(a: Arbitration) -> ArbitrationOut:
    return ArbitrationOut(
        id=str(a.id),
        contract_id=str(a.contract_id),
        claimant_id=str(a.claimant_id),
        respondent_id=str(a.respondent_id),
        reason=a.reason,
        description=a.description,
        status=str(a.status.value if hasattr(a.status, "value") else a.status),
        created_at=a.created_at,
        resolved_at=a.resolved_at,
        resolver_id=str(a.resolver_id) if a.resolver_id else None,
        resolution=a.resolution,
    )


def _msg_out(m: ArbitrationMessage) -> ArbitrationMessageOut:
    return ArbitrationMessageOut(
        id=str(m.id),
        arbitration_id=str(m.arbitration_id),
        author_id=str(m.author_id),
        body=m.body,
        created_at=m.created_at,
    )


def _att_out(a: ArbitrationAttachment) -> ArbitrationAttachmentOut:
    return ArbitrationAttachmentOut(
        id=str(a.id),
        arbitration_id=str(a.arbitration_id),
        uploader_id=str(a.uploader_id),
        filename=a.filename,
        content_type=a.content_type,
        size_bytes=int(a.size_bytes or 0),
        created_at=a.created_at,
    )


def _is_staff(user: User) -> bool:
    role_value = user.role.value if hasattr(user.role, "value") else str(user.role)
    return role_value in {"Admin", "Moderator"}


def _can_view(user: User, a: Arbitration) -> bool:
    if _is_staff(user):
        return True
    return user.id in {a.claimant_id, a.respondent_id}


def _can_participate(user: User, a: Arbitration) -> bool:
    # Staff can always participate; parties can participate until closed.
    if _is_staff(user):
        return True
    if user.id not in {a.claimant_id, a.respondent_id}:
        return False
    if a.status in {ArbitrationStatus.resolved, ArbitrationStatus.rejected}:
        return False
    return True


def _validate_transition(current: ArbitrationStatus, new: ArbitrationStatus) -> None:
    if current in {ArbitrationStatus.resolved, ArbitrationStatus.rejected}:
        raise HTTPException(status_code=400, detail="arbitration_closed")

    if new == current:
        return

    allowed: dict[ArbitrationStatus, set[ArbitrationStatus]] = {
        ArbitrationStatus.open: {ArbitrationStatus.under_review, ArbitrationStatus.resolved, ArbitrationStatus.rejected},
        ArbitrationStatus.under_review: {ArbitrationStatus.resolved, ArbitrationStatus.rejected},
    }

    if new not in allowed.get(current, set()):
        raise HTTPException(status_code=400, detail="invalid_status_transition")


@router.post("", response_model=ArbitrationOut)
def create_arbitration(
    req: ArbitrationCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        cid = parse_uuid(req.contract_id)
        rid = parse_uuid(req.respondent_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="invalid_ids")

    c = db.get(Contract, cid)
    if not c:
        raise HTTPException(status_code=404, detail="contract_not_found")

    # Only contract parties can create arbitration.
    if user.id not in {c.owner_id, c.tenant_id}:
        raise HTTPException(status_code=403, detail="forbidden")

    if rid not in {c.owner_id, c.tenant_id} or rid == user.id:
        raise HTTPException(status_code=422, detail="invalid_respondent")

    a = Arbitration(
        contract_id=c.id,
        claimant_id=user.id,
        respondent_id=rid,
        reason=req.reason,
        description=req.description,
        status=ArbitrationStatus.open,
    )
    db.add(a)
    db.flush()

    # Notify respondent.
    notify_user(db, user_id=rid, type="arbitration_created")

    db.commit()
    db.refresh(a)
    return _to_out(a)


@router.get("", response_model=list[ArbitrationOut])
def list_arbitrations(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    q = db.query(Arbitration).order_by(Arbitration.created_at.desc())

    if not _is_staff(user):
        q = q.filter((Arbitration.claimant_id == user.id) | (Arbitration.respondent_id == user.id))

    return [_to_out(x) for x in q.all()]


@router.get("/{arbitration_id}", response_model=ArbitrationOut)
def get_arbitration(arbitration_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        aid = parse_uuid(arbitration_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="invalid_arbitration_id")

    a = db.get(Arbitration, aid)
    if not a:
        raise HTTPException(status_code=404, detail="arbitration_not_found")

    if not _can_view(user, a):
        raise HTTPException(status_code=403, detail="forbidden")

    return _to_out(a)


@router.post("/{arbitration_id}/resolve", response_model=ArbitrationOut)
def resolve_arbitration(
    arbitration_id: str,
    req: ArbitrationResolve,
    resolver: User = Depends(require_admin_or_moderator),
    db: Session = Depends(get_db),
):
    try:
        aid = parse_uuid(arbitration_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="invalid_arbitration_id")

    a = db.get(Arbitration, aid)
    if not a:
        raise HTTPException(status_code=404, detail="arbitration_not_found")

    try:
        st = ArbitrationStatus(req.status)
    except Exception:
        raise HTTPException(status_code=422, detail="invalid_status")

    _validate_transition(a.status, st)

    a.status = st
    a.resolution = req.resolution
    a.resolver_id = resolver.id

    if st in {ArbitrationStatus.resolved, ArbitrationStatus.rejected}:
        a.resolved_at = dt.datetime.now(dt.timezone.utc)

    # Notify both parties.
    notify_user(db, user_id=a.claimant_id, type="arbitration_status_changed")
    notify_user(db, user_id=a.respondent_id, type="arbitration_status_changed")

    db.commit()
    db.refresh(a)
    return _to_out(a)


@router.get("/{arbitration_id}/messages", response_model=list[ArbitrationMessageOut])
def list_messages(arbitration_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        aid = parse_uuid(arbitration_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="invalid_arbitration_id")

    a = db.get(Arbitration, aid)
    if not a:
        raise HTTPException(status_code=404, detail="arbitration_not_found")

    if not _can_view(user, a):
        raise HTTPException(status_code=403, detail="forbidden")

    items = (
        db.query(ArbitrationMessage)
        .filter(ArbitrationMessage.arbitration_id == a.id)
        .order_by(ArbitrationMessage.created_at.asc())
        .all()
    )
    return [_msg_out(m) for m in items]


@router.post("/{arbitration_id}/messages", response_model=ArbitrationMessageOut)
def post_message(
    arbitration_id: str,
    req: ArbitrationMessageCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not req.body or len(req.body.strip()) < 1:
        raise HTTPException(status_code=422, detail="empty_body")

    try:
        aid = parse_uuid(arbitration_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="invalid_arbitration_id")

    a = db.get(Arbitration, aid)
    if not a:
        raise HTTPException(status_code=404, detail="arbitration_not_found")

    if not _can_participate(user, a):
        raise HTTPException(status_code=403, detail="forbidden")

    m = ArbitrationMessage(arbitration_id=a.id, author_id=user.id, body=req.body.strip())
    db.add(m)
    db.flush()

    # Notify the other party.
    if user.id == a.claimant_id:
        notify_user(db, user_id=a.respondent_id, type="arbitration_message_posted")
    elif user.id == a.respondent_id:
        notify_user(db, user_id=a.claimant_id, type="arbitration_message_posted")

    db.commit()
    db.refresh(m)
    return _msg_out(m)


@router.get("/{arbitration_id}/attachments", response_model=list[ArbitrationAttachmentOut])
def list_attachments(arbitration_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        aid = parse_uuid(arbitration_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="invalid_arbitration_id")

    a = db.get(Arbitration, aid)
    if not a:
        raise HTTPException(status_code=404, detail="arbitration_not_found")

    if not _can_view(user, a):
        raise HTTPException(status_code=403, detail="forbidden")

    items = (
        db.query(ArbitrationAttachment)
        .filter(ArbitrationAttachment.arbitration_id == a.id)
        .order_by(ArbitrationAttachment.created_at.desc())
        .all()
    )
    return [_att_out(x) for x in items]


@router.post("/{arbitration_id}/attachments", response_model=ArbitrationAttachmentOut)
def upload_attachment(
    arbitration_id: str,
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        aid = parse_uuid(arbitration_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="invalid_arbitration_id")

    a = db.get(Arbitration, aid)
    if not a:
        raise HTTPException(status_code=404, detail="arbitration_not_found")

    if not _can_participate(user, a):
        raise HTTPException(status_code=403, detail="forbidden")

    data = file.file.read()
    size = len(data)
    if size <= 0:
        raise HTTPException(status_code=422, detail="empty_file")
    if size > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="file_too_large")

    content_type = file.content_type or "application/octet-stream"
    filename = file.filename or "attachment"

    att = ArbitrationAttachment(
        arbitration_id=a.id,
        uploader_id=user.id,
        filename=filename,
        content_type=content_type,
        size_bytes=size,
    )
    db.add(att)
    db.flush()

    key = f"arbitrations/{a.id}/attachments/{att.id}/{filename}"

    try:
        store_document_bytes(key=key, data=data, content_type=content_type)
        att.s3_key = key
    except Exception:
        att.local_path = local_write(filename=f"arbitration-{a.id}-{att.id}", data=data)

    # Notify the other party.
    if user.id == a.claimant_id:
        notify_user(db, user_id=a.respondent_id, type="arbitration_attachment_added")
    elif user.id == a.respondent_id:
        notify_user(db, user_id=a.claimant_id, type="arbitration_attachment_added")

    db.commit()
    db.refresh(att)
    return _att_out(att)


@router.get("/{arbitration_id}/attachments/{attachment_id}/presign", response_model=PresignResponse)
def presign_attachment(
    arbitration_id: str,
    attachment_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        aid = parse_uuid(arbitration_id)
        att_id = parse_uuid(attachment_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="invalid_ids")

    a = db.get(Arbitration, aid)
    if not a:
        raise HTTPException(status_code=404, detail="arbitration_not_found")

    if not _can_view(user, a):
        raise HTTPException(status_code=403, detail="forbidden")

    att = db.get(ArbitrationAttachment, att_id)
    if not att or att.arbitration_id != a.id or not att.s3_key:
        raise HTTPException(status_code=404, detail="attachment_not_found")

    url = presign_get_url(key=att.s3_key, expires_in_seconds=3600)
    return PresignResponse(url=url, expires_in_seconds=3600)


@router.get("/{arbitration_id}/attachments/{attachment_id}/download")
def download_attachment(
    arbitration_id: str,
    attachment_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        aid = parse_uuid(arbitration_id)
        att_id = parse_uuid(attachment_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="invalid_ids")

    a = db.get(Arbitration, aid)
    if not a:
        raise HTTPException(status_code=404, detail="arbitration_not_found")

    if not _can_view(user, a):
        raise HTTPException(status_code=403, detail="forbidden")

    att = db.get(ArbitrationAttachment, att_id)
    if not att or att.arbitration_id != a.id or not att.local_path:
        raise HTTPException(status_code=404, detail="attachment_not_found")

    return FileResponse(att.local_path, media_type=att.content_type, filename=att.filename)
