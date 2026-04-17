"""تست‌های واحد برای SSOT Contract Domain (Step 2).

تست‌ها شامل:
  - ایجاد پیش‌نویس (POST /contracts)
  - به‌روزرسانی پیش‌نویس (PATCH /contracts/{id})
  - نهایی‌سازی پیش‌نویس (POST /contracts/{id}/finalize)
  - لیست قراردادها (GET /contracts)
  - دعوت طرف قرارداد (POST /contracts/{id}/invite)
  - امضای قرارداد با OTP (POST /contracts/{id}/sign)
  - قوانین OTP: انقضا، حداکثر تلاش، قفل
"""
from __future__ import annotations

import datetime as dt
import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.db.session import get_db, SessionLocal
from app.api.deps import get_current_user, get_optional_current_user
from app.models.user import User, UserRole
from app.models.ssot_contract import (
    SsotContract,
    SsotContractDraft,
    SsotContractParty,
    SsotSignature,
    ContractVisibility,
    SignatureStatus,
    SsotContractStatus,
)


# ─────────────────────────── fixtures ────────────────────────────


def _make_user(db: Session, role: str = "User") -> User:
    u = User(
        mobile=f"+9891{uuid.uuid4().hex[:8]}",
        role=role,
    )
    db.add(u)
    db.commit()
    db.refresh(u)
    return u


@pytest.fixture
def db():
    s = SessionLocal()
    try:
        yield s
    finally:
        s.close()


@pytest.fixture
def creator(db):
    return _make_user(db)


@pytest.fixture
def other_user(db):
    return _make_user(db)


def _auth_override(user: User):
    def _dep():
        return user
    return _dep


@pytest.fixture
def client_as(creator):
    app.dependency_overrides[get_current_user] = _auth_override(creator)
    app.dependency_overrides[get_optional_current_user] = _auth_override(creator)
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.pop(get_current_user, None)
    app.dependency_overrides.pop(get_optional_current_user, None)


# ─────────────────────────── POST /contracts ─────────────────────


def test_create_draft_success(client_as):
    resp = client_as.post(
        "/api/v1/contracts",
        json={"visibility": "people_only", "step": "init", "data": {"title": "test"}},
    )
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["step"] == "init"
    assert body["version"] == 1
    assert body["contract_id"] is None
    assert "expires_at" in body


def test_create_draft_invalid_visibility(client_as):
    resp = client_as.post(
        "/api/v1/contracts",
        json={"visibility": "invalid_vis", "step": "init"},
    )
    assert resp.status_code == 422


def test_create_draft_invalid_advisor_id(client_as):
    resp = client_as.post(
        "/api/v1/contracts",
        json={"visibility": "people_only", "advisor_id": "not-a-uuid"},
    )
    assert resp.status_code == 422


def test_create_draft_advisor_not_found(client_as):
    resp = client_as.post(
        "/api/v1/contracts",
        json={"visibility": "people_only", "advisor_id": str(uuid.uuid4())},
    )
    assert resp.status_code == 404


# ─────────────────────────── PATCH /contracts/{id} ───────────────


def test_update_draft_success(client_as, db, creator):
    # ابتدا ایجاد
    resp = client_as.post(
        "/api/v1/contracts",
        json={"visibility": "people_only", "step": "step1"},
    )
    assert resp.status_code == 201
    draft_id = resp.json()["id"]

    # به‌روزرسانی
    resp2 = client_as.patch(
        f"/api/v1/contracts/{draft_id}",
        json={"step": "step2", "data": {"foo": "bar"}},
    )
    assert resp2.status_code == 200, resp2.text
    body = resp2.json()
    assert body["step"] == "step2"
    assert body["version"] == 2


def test_update_draft_forbidden(client_as, db, other_user):
    # ایجاد با user اول
    resp = client_as.post(
        "/api/v1/contracts",
        json={"visibility": "people_only"},
    )
    draft_id = resp.json()["id"]

    # تلاش به‌روزرسانی با user دیگر
    app.dependency_overrides[get_current_user] = _auth_override(other_user)
    with TestClient(app) as c2:
        resp2 = c2.patch(f"/api/v1/contracts/{draft_id}", json={"step": "hack"})
    assert resp2.status_code == 403
    app.dependency_overrides[get_current_user] = _auth_override(client_as.app.dependency_overrides.get(get_current_user, lambda: None)())


def test_update_draft_not_found(client_as):
    resp = client_as.patch(
        f"/api/v1/contracts/{uuid.uuid4()}",
        json={"step": "x"},
    )
    assert resp.status_code == 404


# ─────────────────────────── POST /contracts/{id}/finalize ────────


def test_finalize_draft_success(client_as, db, creator):
    # ایجاد
    resp = client_as.post(
        "/api/v1/contracts",
        json={"visibility": "shared", "step": "final"},
    )
    assert resp.status_code == 201
    draft_id = resp.json()["id"]

    # نهایی‌سازی
    resp2 = client_as.post(f"/api/v1/contracts/{draft_id}/finalize", json={})
    assert resp2.status_code == 201, resp2.text
    body = resp2.json()
    assert body["visibility"] == "shared"
    assert body["status"] == "active"
    assert "tracking_code" in body
    assert body["contract_number"] is not None


def test_finalize_draft_already_finalized(client_as, db, creator):
    resp = client_as.post(
        "/api/v1/contracts",
        json={"visibility": "people_only"},
    )
    draft_id = resp.json()["id"]

    client_as.post(f"/api/v1/contracts/{draft_id}/finalize", json={})
    # بار دوم باید ۴۰۹ بگیرد
    resp2 = client_as.post(f"/api/v1/contracts/{draft_id}/finalize", json={})
    assert resp2.status_code == 409


def test_finalize_custom_contract_number(client_as):
    resp = client_as.post(
        "/api/v1/contracts",
        json={"visibility": "people_only"},
    )
    draft_id = resp.json()["id"]
    resp2 = client_as.post(
        f"/api/v1/contracts/{draft_id}/finalize",
        json={"contract_number": "MY-CONTRACT-001"},
    )
    assert resp2.status_code == 201
    assert resp2.json()["contract_number"] == "MY-CONTRACT-001"


# ─────────────────────────── GET /contracts ──────────────────────


def test_list_contracts_only_own(client_as, db, creator, other_user):
    # ایجاد + نهایی با creator
    r1 = client_as.post("/api/v1/contracts", json={"visibility": "people_only"})
    client_as.post(f"/api/v1/contracts/{r1.json()['id']}/finalize", json={})

    # list با creator باید قرارداد خود را ببیند
    resp = client_as.get("/api/v1/contracts")
    assert resp.status_code == 200
    ids = [c["id"] for c in resp.json()]
    # قرارداد نهایی‌شده باید در لیست باشد
    assert len(ids) >= 1


def test_list_contracts_other_user_people_only(db, creator, other_user):
    """کاربر دیگر نباید قرارداد people_only را ببیند."""
    # creator یک قرارداد می‌سازد
    app.dependency_overrides[get_current_user] = _auth_override(creator)
    with TestClient(app) as c1:
        r1 = c1.post("/api/v1/contracts", json={"visibility": "people_only"})
        c1.post(f"/api/v1/contracts/{r1.json()['id']}/finalize", json={})

    # other_user لیست می‌کند — نباید قرارداد creator را ببیند
    app.dependency_overrides[get_current_user] = _auth_override(other_user)
    with TestClient(app) as c2:
        resp = c2.get("/api/v1/contracts")
    app.dependency_overrides.pop(get_current_user, None)

    assert resp.status_code == 200
    # قرارداد creator نباید در لیست other_user باشد
    contract_id = r1.json()["id"]
    ids = [c["id"] for c in resp.json()]
    assert contract_id not in ids


# ─────────────────────────── POST /contracts/{id}/invite ──────────


def test_invite_party_success(client_as, db, creator, other_user):
    r1 = client_as.post("/api/v1/contracts", json={"visibility": "shared"})
    fin = client_as.post(f"/api/v1/contracts/{r1.json()['id']}/finalize", json={})
    contract_id = fin.json()["id"]

    resp = client_as.post(
        f"/api/v1/contracts/{contract_id}/invite",
        json={"user_id": str(other_user.id), "role": "principal"},
    )
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["role"] == "principal"
    assert body["signature_status"] == "sent"


def test_invite_party_duplicate(client_as, db, creator, other_user):
    r1 = client_as.post("/api/v1/contracts", json={"visibility": "shared"})
    fin = client_as.post(f"/api/v1/contracts/{r1.json()['id']}/finalize", json={})
    contract_id = fin.json()["id"]

    client_as.post(
        f"/api/v1/contracts/{contract_id}/invite",
        json={"user_id": str(other_user.id), "role": "principal"},
    )
    # دوباره
    resp2 = client_as.post(
        f"/api/v1/contracts/{contract_id}/invite",
        json={"user_id": str(other_user.id), "role": "witness"},
    )
    assert resp2.status_code == 409


def test_invite_party_invalid_role(client_as, db, creator, other_user):
    r1 = client_as.post("/api/v1/contracts", json={"visibility": "shared"})
    fin = client_as.post(f"/api/v1/contracts/{r1.json()['id']}/finalize", json={})
    contract_id = fin.json()["id"]

    resp = client_as.post(
        f"/api/v1/contracts/{contract_id}/invite",
        json={"user_id": str(other_user.id), "role": "invalid_role"},
    )
    assert resp.status_code == 422


def test_invite_party_user_not_found(client_as, db, creator):
    r1 = client_as.post("/api/v1/contracts", json={"visibility": "shared"})
    fin = client_as.post(f"/api/v1/contracts/{r1.json()['id']}/finalize", json={})
    contract_id = fin.json()["id"]

    resp = client_as.post(
        f"/api/v1/contracts/{contract_id}/invite",
        json={"user_id": str(uuid.uuid4()), "role": "principal"},
    )
    assert resp.status_code == 404


def test_invite_only_creator_can_invite(db, creator, other_user):
    """فقط creator می‌تواند دعوت کند."""
    app.dependency_overrides[get_current_user] = _auth_override(creator)
    with TestClient(app) as c1:
        r1 = c1.post("/api/v1/contracts", json={"visibility": "shared"})
        fin = c1.post(f"/api/v1/contracts/{r1.json()['id']}/finalize", json={})
    contract_id = fin.json()["id"]

    # other_user تلاش دعوت
    third = _make_user(SessionLocal())
    app.dependency_overrides[get_current_user] = _auth_override(other_user)
    with TestClient(app) as c2:
        resp = c2.post(
            f"/api/v1/contracts/{contract_id}/invite",
            json={"user_id": str(third.id), "role": "principal"},
        )
    app.dependency_overrides.pop(get_current_user, None)
    assert resp.status_code == 403


# ─────────────────────────── POST /contracts/{id}/sign ────────────


def test_sign_no_sig_returns_202(client_as, db, creator):
    """اگر OTP صادر نشده باشد، ۲۰۲ برمی‌گرداند و OTP صادر می‌کند."""
    r1 = client_as.post("/api/v1/contracts", json={"visibility": "people_only"})
    fin = client_as.post(f"/api/v1/contracts/{r1.json()['id']}/finalize", json={})
    contract_id = fin.json()["id"]

    resp = client_as.post(
        f"/api/v1/contracts/{contract_id}/sign",
        json={"otp_code": "000000"},
    )
    assert resp.status_code == 202
    body = resp.json()
    assert body.get("message") == "otp_sent" or body.get("ok") is True


def test_sign_invalid_otp(client_as, db, creator):
    """OTP نادرست باید ۴۰۰ برگرداند."""
    r1 = client_as.post("/api/v1/contracts", json={"visibility": "people_only"})
    fin = client_as.post(f"/api/v1/contracts/{r1.json()['id']}/finalize", json={})
    contract_id = fin.json()["id"]

    # اول OTP صادر می‌شود
    client_as.post(f"/api/v1/contracts/{contract_id}/sign", json={"otp_code": "000000"})

    # OTP غلط
    resp = client_as.post(
        f"/api/v1/contracts/{contract_id}/sign",
        json={"otp_code": "999999"},
    )
    assert resp.status_code == 400
    detail = resp.json().get("detail", "")
    assert "invalid_otp" in str(detail)


def test_sign_lock_after_max_attempts(client_as, db, creator):
    """پس از ۳ تلاش ناموفق، حساب قفل می‌شود."""
    r1 = client_as.post("/api/v1/contracts", json={"visibility": "people_only"})
    fin = client_as.post(f"/api/v1/contracts/{r1.json()['id']}/finalize", json={})
    contract_id = fin.json()["id"]

    # صدور OTP
    client_as.post(f"/api/v1/contracts/{contract_id}/sign", json={"otp_code": "000000"})

    # ۳ بار تلاش اشتباه
    for _ in range(3):
        r = client_as.post(
            f"/api/v1/contracts/{contract_id}/sign",
            json={"otp_code": "999999"},
        )

    # باید قفل شده باشد
    final_resp = client_as.post(
        f"/api/v1/contracts/{contract_id}/sign",
        json={"otp_code": "999999"},
    )
    assert final_resp.status_code == 423
    detail = final_resp.json().get("detail", "")
    assert "locked" in str(detail)


def test_sign_correct_otp(client_as, db, creator):
    """امضای موفق با OTP صحیح."""
    r1 = client_as.post("/api/v1/contracts", json={"visibility": "people_only"})
    fin = client_as.post(f"/api/v1/contracts/{r1.json()['id']}/finalize", json={})
    contract_id = fin.json()["id"]

    # صدور OTP (۲۰۲)
    client_as.post(f"/api/v1/contracts/{contract_id}/sign", json={"otp_code": "000000"})

    # خواندن OTP از DB
    s = SessionLocal()
    try:
        party = (
            s.query(SsotContractParty)
            .filter(SsotContractParty.contract_id == uuid.UUID(contract_id))
            .first()
        )
        sig = (
            s.query(SsotSignature)
            .filter(SsotSignature.contract_party_id == party.id)
            .first()
        )
        real_otp = sig.otp_code
    finally:
        s.close()

    assert real_otp is not None

    resp = client_as.post(
        f"/api/v1/contracts/{contract_id}/sign",
        json={"otp_code": real_otp},
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["ok"] is True
    assert body["contract_status"] in ("signed", "active")


def test_sign_otp_expiry(client_as, db, creator):
    """OTP منقضی‌شده باید ۴۱۰ برگرداند."""
    r1 = client_as.post("/api/v1/contracts", json={"visibility": "people_only"})
    fin = client_as.post(f"/api/v1/contracts/{r1.json()['id']}/finalize", json={})
    contract_id = fin.json()["id"]

    # صدور OTP
    client_as.post(f"/api/v1/contracts/{contract_id}/sign", json={"otp_code": "000000"})

    # دستکاری انقضا در DB
    s = SessionLocal()
    try:
        party = (
            s.query(SsotContractParty)
            .filter(SsotContractParty.contract_id == uuid.UUID(contract_id))
            .first()
        )
        sig = (
            s.query(SsotSignature)
            .filter(SsotSignature.contract_party_id == party.id)
            .first()
        )
        real_otp = sig.otp_code
        sig.otp_expires_at = dt.datetime.now(dt.timezone.utc) - dt.timedelta(minutes=10)
        s.commit()
    finally:
        s.close()

    resp = client_as.post(
        f"/api/v1/contracts/{contract_id}/sign",
        json={"otp_code": real_otp},
    )
    assert resp.status_code == 410
