"""Hamgit / wizard compatibility: `/financials/*` wallet + dev bank gateway."""
from __future__ import annotations

import datetime as dt
import secrets
import uuid
from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.authz import require_admin
from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.contract_wizard import WizardContract
from app.models.market_requirement import PromoCode
from app.models.user import User
from app.models.wallet import Wallet

router = APIRouter()

_GATEWAY_HTML = """<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>درگاه پرداخت (توسعه)</title></head>
<body style="font-family:Tahoma,sans-serif;max-width:520px;margin:2rem auto;padding:0 12px;">
<h1 style="font-size:1.25rem;">درگاه پرداخت (شبیه‌سازی)</h1>
<p style="line-height:1.6;color:#444;">این صفحه برای توسعه است. در production کاربر به درگاه بانک واقعی هدایت می‌شود.</p>
<p id="err" style="color:#b91c1c;min-height:1.25em"></p>
<button id="go" type="button" style="padding:10px 18px;cursor:pointer;">تأیید و ثبت پرداخت آزمایشی</button>
<p style="margin-top:1rem;"><button type="button" onclick="history.back()" style="padding:8px 14px;cursor:pointer;">بازگشت</button></p>
<script>
(function(){
  var params = new URLSearchParams(location.search);
  var cid = params.get('contract_id') || '';
  var uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  document.getElementById('go').onclick = async function() {
    var err = document.getElementById('err');
    err.textContent = '';
    if (!uuidRe.test(cid)) {
      err.textContent = 'شناسه قرارداد نامعتبر است؛ از مرحله کمیسیون دوباره «پرداخت» را بزنید.';
      return;
    }
    var row = document.cookie.split('; ').find(function(r) { return r.indexOf('access_token=') === 0; });
    var token = row ? decodeURIComponent(row.split('=').slice(1).join('=')) : '';
    if (!token) { err.textContent = 'توکن ورود یافت نشد.'; return; }
    var auth = token.indexOf('Bearer ') === 0 ? token : ('Bearer ' + token);
    var res = await fetch('/financials/bank/mock-verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': auth },
      body: JSON.stringify({ contract_id: cid })
    });
    if (!res.ok) {
      err.textContent = 'خطا: ' + res.status;
      try { err.textContent += ' — ' + (await res.text()); } catch (e) {}
      return;
    }
    history.back();
  };
})();
</script>
</body>
</html>
"""


@router.get("/wallets")
def financials_wallet_summary(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """Shape aligned with admin-ui `CommissionStep` / MSW (`id`, `credit`, `status`, `user_id`)."""
    w = db.query(Wallet).filter(Wallet.user_id == user.id).one_or_none()
    if w is None:
        return {
            "id": "wallet-pending",
            "credit": 0,
            "status": "ACTIVE",
            "user_id": str(user.id),
        }
    return {
        "id": str(w.id),
        "credit": float(w.balance or 0),
        "status": "ACTIVE",
        "user_id": str(user.id),
    }


@router.get("/bank/gateway", response_class=HTMLResponse)
def bank_gateway_dev() -> HTMLResponse:
    """SPA navigates here after `commission/pay`; HTML reads `contract_id` from query and calls mock-verify."""
    return HTMLResponse(content=_GATEWAY_HTML)


class MockBankVerifyBody(BaseModel):
    contract_id: str


@router.post("/bank/mock-verify")
def bank_mock_verify(
    body: MockBankVerifyBody,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """Marks wizard commission as paid (dev / test stand-in for bank callback)."""
    try:
        cid = uuid.UUID(body.contract_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="invalid_contract_id")
    c = db.get(WizardContract, cid)
    if not c:
        raise HTTPException(status_code=404, detail="not_found")
    if c.owner_id != str(user.id):
        raise HTTPException(status_code=403, detail="forbidden")
    c.commission_paid_at = dt.datetime.now(dt.timezone.utc)
    db.commit()
    return {"ok": True}


# ── Hamgit-aligned promos (ذخیره در PostgreSQL) ─────────────────


class PromoGenerateBody(BaseModel):
    discount_type: str = "PERCENTAGE"
    discount_value: float = 10.0
    note: str | None = None


class PromoBulkBody(BaseModel):
    count: int = 1
    discount_type: str = "PERCENTAGE"
    discount_value: float = 5.0


@router.get("/promos")
def promos_list(
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    items = db.query(PromoCode).order_by(PromoCode.created_at.desc()).all()
    return {
        "items": [
            {
                "id": str(p.id),
                "code": p.code,
                "discount_type": p.discount_type,
                "discount_value": float(p.discount_value),
                "active": p.active,
                "note": p.note,
                "created_at": p.created_at.isoformat(),
            }
            for p in items
        ],
        "total": len(items),
    }


@router.post("/promos/generate")
def promos_generate(
    body: PromoGenerateBody,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    code = f"AML-{secrets.token_hex(4).upper()}"
    p = PromoCode(
        code=code,
        discount_type=body.discount_type,
        discount_value=body.discount_value,
        note=body.note,
    )
    db.add(p)
    db.commit()
    db.refresh(p)
    return {"ok": True, "code": code, "discount_type": p.discount_type, "id": str(p.id)}


@router.post("/promos/bulk-generate")
def promos_bulk_generate(
    body: PromoBulkBody,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    if body.count < 1 or body.count > 500:
        raise HTTPException(status_code=422, detail="invalid_count")
    for _ in range(body.count):
        code = f"AML-{secrets.token_hex(4).upper()}"
        db.add(
            PromoCode(
                code=code,
                discount_type=body.discount_type,
                discount_value=body.discount_value,
            )
        )
    db.commit()
    return {"ok": True, "count": body.count}
