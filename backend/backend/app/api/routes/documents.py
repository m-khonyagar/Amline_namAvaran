from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.ids import parse_uuid
from app.db.session import get_db
from app.models.contract import Contract
from app.models.contract_signature import ContractSignature
from app.models.document import Document
from app.models.property import Property
from app.models.user import User
from app.schemas.document import DocumentOut, PresignResponse
from app.services.documents import (
    html_to_pdf,
    local_write,
    new_doc_key,
    presign_get_url,
    render_contract_html,
    store_document_bytes,
)

router = APIRouter()


def _to_out(d: Document) -> DocumentOut:
    return DocumentOut(
        id=str(d.id),
        contract_id=str(d.contract_id),
        html_s3_key=d.html_s3_key,
        pdf_s3_key=d.pdf_s3_key,
        html_local_path=d.html_local_path,
        pdf_local_path=d.pdf_local_path,
        created_at=d.created_at,
    )


def _can_view(user: User, c: Contract) -> bool:
    return user.id in {c.owner_id, c.tenant_id}


def _safe_local(path_str: str | None) -> Path | None:
    if not path_str:
        return None
    try:
        p = Path(path_str)
        if not p.exists() or not p.is_file():
            return None
        return p
    except Exception:
        return None


@router.get("/contracts/{contract_id}", response_model=list[DocumentOut])
def list_contract_documents(contract_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        cid = parse_uuid(contract_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="invalid_contract_id")

    c = db.get(Contract, cid)
    if not c:
        raise HTTPException(status_code=404, detail="contract_not_found")
    if not _can_view(user, c):
        raise HTTPException(status_code=403, detail="forbidden")

    items = db.query(Document).filter(Document.contract_id == cid).order_by(Document.created_at.desc()).all()
    return [_to_out(d) for d in items]


@router.post("/contracts/{contract_id}/generate", response_model=DocumentOut)
def generate_for_contract(
    contract_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        cid = parse_uuid(contract_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="invalid_contract_id")

    c = db.get(Contract, cid)
    if not c:
        raise HTTPException(status_code=404, detail="contract_not_found")

    if not _can_view(user, c):
        raise HTTPException(status_code=403, detail="forbidden")

    owner = db.get(User, c.owner_id)
    tenant = db.get(User, c.tenant_id)
    prop = db.get(Property, c.property_id)

    sig_owner = (
        db.query(ContractSignature)
        .filter(ContractSignature.contract_id == c.id, ContractSignature.user_id == c.owner_id)
        .order_by(ContractSignature.signed_at.desc())
        .first()
    )
    sig_tenant = (
        db.query(ContractSignature)
        .filter(ContractSignature.contract_id == c.id, ContractSignature.user_id == c.tenant_id)
        .order_by(ContractSignature.signed_at.desc())
        .first()
    )

    ctx = {
        "contract_id": str(c.id),
        "tracking_code": c.tracking_code,
        "contract_type": c.contract_type,
        "start_date": str(c.start_date),
        "end_date": str(c.end_date),
        "rent_amount": float(c.rent_amount),
        "deposit_amount": float(c.deposit_amount),
        "created_at": c.created_at.isoformat() if c.created_at else "",

        "owner_name": (owner.name if owner and owner.name else (owner.mobile if owner else str(c.owner_id))),
        "owner_mobile": (owner.mobile if owner else None),
        "tenant_name": (tenant.name if tenant and tenant.name else (tenant.mobile if tenant else str(c.tenant_id))),
        "tenant_mobile": (tenant.mobile if tenant else None),

        "property_city": (prop.city if prop else None),
        "property_address": (prop.address if prop else None),
        "property_area": float(prop.area) if prop else None,
        "property_rooms": int(prop.rooms) if prop else None,
        "property_type": (prop.property_type if prop else None),

        "owner_signed": "بله" if sig_owner else "خیر",
        "tenant_signed": "بله" if sig_tenant else "خیر",
        "owner_signed_at": (sig_owner.signed_at.isoformat() if sig_owner else None),
        "tenant_signed_at": (sig_tenant.signed_at.isoformat() if sig_tenant else None),
    }

    html = render_contract_html(ctx)

    doc = Document(contract_id=c.id)
    db.add(doc)
    db.flush()

    html_key = new_doc_key(contract_id=str(c.id), ext="html")
    pdf_key = new_doc_key(contract_id=str(c.id), ext="pdf")

    html_bytes = html.encode("utf-8")

    try:
        store_document_bytes(key=html_key, data=html_bytes, content_type="text/html; charset=utf-8")
        doc.html_s3_key = html_key
    except Exception:
        doc.html_local_path = local_write(filename=f"{doc.id}.html", data=html_bytes)

    pdf_bytes = html_to_pdf(html)
    if pdf_bytes is not None:
        try:
            store_document_bytes(key=pdf_key, data=pdf_bytes, content_type="application/pdf")
            doc.pdf_s3_key = pdf_key
        except Exception:
            doc.pdf_local_path = local_write(filename=f"{doc.id}.pdf", data=pdf_bytes)

    db.commit()
    db.refresh(doc)
    return _to_out(doc)


@router.get("/{document_id}", response_model=DocumentOut)
def get_document(document_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        did = parse_uuid(document_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="invalid_document_id")

    d = db.get(Document, did)
    if not d:
        raise HTTPException(status_code=404, detail="document_not_found")

    c = db.get(Contract, d.contract_id)
    if not c or not _can_view(user, c):
        raise HTTPException(status_code=403, detail="forbidden")

    return _to_out(d)


@router.get("/{document_id}/presign/html", response_model=PresignResponse)
def presign_html(document_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        did = parse_uuid(document_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="invalid_document_id")

    d = db.get(Document, did)
    if not d or not d.html_s3_key:
        raise HTTPException(status_code=404, detail="document_not_found")

    c = db.get(Contract, d.contract_id)
    if not c or not _can_view(user, c):
        raise HTTPException(status_code=403, detail="forbidden")

    url = presign_get_url(key=d.html_s3_key, expires_in_seconds=3600)
    return PresignResponse(url=url, expires_in_seconds=3600)


@router.get("/{document_id}/presign/pdf", response_model=PresignResponse)
def presign_pdf(document_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        did = parse_uuid(document_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="invalid_document_id")

    d = db.get(Document, did)
    if not d or not d.pdf_s3_key:
        raise HTTPException(status_code=404, detail="document_not_found")

    c = db.get(Contract, d.contract_id)
    if not c or not _can_view(user, c):
        raise HTTPException(status_code=403, detail="forbidden")

    url = presign_get_url(key=d.pdf_s3_key, expires_in_seconds=3600)
    return PresignResponse(url=url, expires_in_seconds=3600)


@router.get("/{document_id}/download/html")
def download_html(document_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        did = parse_uuid(document_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="invalid_document_id")

    d = db.get(Document, did)
    if not d:
        raise HTTPException(status_code=404, detail="document_not_found")

    c = db.get(Contract, d.contract_id)
    if not c or not _can_view(user, c):
        raise HTTPException(status_code=403, detail="forbidden")

    p = _safe_local(d.html_local_path)
    if not p:
        raise HTTPException(status_code=404, detail="html_not_available")

    return FileResponse(path=str(p), media_type="text/html")


@router.get("/{document_id}/download/pdf")
def download_pdf(document_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        did = parse_uuid(document_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="invalid_document_id")

    d = db.get(Document, did)
    if not d:
        raise HTTPException(status_code=404, detail="document_not_found")

    c = db.get(Contract, d.contract_id)
    if not c or not _can_view(user, c):
        raise HTTPException(status_code=403, detail="forbidden")

    p = _safe_local(d.pdf_local_path)
    if not p:
        raise HTTPException(status_code=404, detail="pdf_not_available")

    return FileResponse(path=str(p), media_type="application/pdf", filename=f"contract-{c.tracking_code}.pdf")
