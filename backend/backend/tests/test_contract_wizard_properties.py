"""Property-based tests for Contract Wizard Backend.

Uses Hypothesis to verify universal properties across many inputs.
Tag format: # Feature: contract-wizard-backend, Property N: <description>
"""
from __future__ import annotations

import io
import uuid

import pytest
from fastapi.testclient import TestClient
from hypothesis import given, settings
from hypothesis import strategies as st

from app.main import app


# ─────────────────────────── shared helpers ──────────────────────────────────

def _wizard_advance_to_dating(client: TestClient, headers: dict, contract_id: str) -> None:
    """Happy path through landlord → tenant → place so `step` becomes DATING."""
    r = client.post(
        f"/contracts/{contract_id}/party/landlord/set",
        json={"next_step": "TENANT_INFORMATION"},
        headers=headers,
    )
    assert r.status_code == 200, r.text
    r = client.post(
        f"/contracts/{contract_id}/party/tenant/set",
        json={"next_step": "PLACE_INFORMATION"},
        headers=headers,
    )
    assert r.status_code == 200, r.text
    r = client.post(
        f"/contracts/{contract_id}/home-info",
        json={
            "postal_code": "1234567890",
            "area_m2": 100.0,
            "property_use_type": "RESIDENTIAL",
            "restroom_type": "WC",
            "heating_system_type": "CENTRAL",
            "cooling_system_type": "SPLIT",
        },
        headers=headers,
    )
    assert r.status_code == 201, r.text


def _wizard_advance_to_mortgage(client: TestClient, headers: dict, contract_id: str) -> None:
    """Continue through dating (valid) so `step` becomes MORTGAGE."""
    _wizard_advance_to_dating(client, headers, contract_id)
    r = client.post(
        f"/contracts/{contract_id}/dating",
        json={
            "start_date": "2025-01-01",
            "end_date": "2027-01-01",
            "delivery_date": "2025-02-01",
        },
        headers=headers,
    )
    assert r.status_code == 201, r.text


def _register_and_login(client: TestClient) -> dict:
    """Register a new user via OTP flow and return auth headers."""
    mobile = "09" + uuid.uuid4().hex[:9]
    r = client.post("/auth/send-otp", json={"mobile": mobile})
    assert r.status_code == 200
    code = r.json().get("dev_code")
    r = client.post("/auth/verify-otp", json={"mobile": mobile, "code": code})
    assert r.status_code == 200
    token = r.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


# ─────────────────────────── Property 12 ─────────────────────────────────────

# Feature: contract-wizard-backend, Property 12: id عددی فایل آپلودشده
# Validates: Requirements 20.1, 20.4

_p12_client: TestClient | None = None


def _get_p12_client() -> TestClient:
    global _p12_client
    if _p12_client is None:
        _p12_client = TestClient(app)
        _p12_client.__enter__()
    return _p12_client


@given(
    file_content=st.binary(min_size=1, max_size=1024),
    file_type=st.sampled_from(["image/jpeg", "image/png", "application/pdf"]),
)
@settings(max_examples=10)
def test_file_upload_id_is_integer(file_content: bytes, file_type: str) -> None:
    """For every file uploaded via POST /files/upload, the `id` field must be an integer."""
    client = _get_p12_client()
    extension_map = {
        "image/jpeg": "test.jpg",
        "image/png": "test.png",
        "application/pdf": "test.pdf",
    }
    filename = extension_map[file_type]
    response = client.post(
        "/files/upload",
        files={"file": (filename, io.BytesIO(file_content), file_type)},
    )
    assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.text}"
    data = response.json()
    assert "id" in data, f"Response missing 'id' field: {data}"
    assert isinstance(data["id"], int), (
        f"Expected 'id' to be int, got {type(data['id']).__name__}: {data['id']!r}"
    )


# ─────────────────────────── Property 3 ──────────────────────────────────────

# Feature: contract-wizard-backend, Property 3: اعتبارسنجی تاریخ‌گذاری
# Validates: Requirements 4.2

from datetime import date, timedelta

# Shared client and auth headers for Property 3 — created once to avoid 100 startup cycles
_p3_client: TestClient | None = None
_p3_headers: dict | None = None
_p3_contract_id: str | None = None


def _get_p3_fixtures():
    global _p3_client, _p3_headers, _p3_contract_id
    if _p3_client is None:
        _p3_client = TestClient(app)
        _p3_client.__enter__()
        _p3_headers = _register_and_login(_p3_client)
        r = _p3_client.post(
            "/contracts/start",
            json={"contract_type": "PROPERTY_RENT", "party_type": "LANDLORD"},
            headers=_p3_headers,
        )
        assert r.status_code == 201, f"Failed to create contract: {r.text}"
        _p3_contract_id = r.json()["id"]
        _wizard_advance_to_dating(_p3_client, _p3_headers, _p3_contract_id)
    return _p3_client, _p3_headers, _p3_contract_id


@given(
    start=st.dates(min_value=date(2020, 1, 1), max_value=date(2030, 12, 31)),
    delta=st.integers(min_value=1, max_value=3650),
)
@settings(max_examples=10, deadline=None)
def test_dating_end_before_start_rejected(start: date, delta: int) -> None:
    """For any pair of dates where end_date < start_date, POST /contracts/{id}/dating must return 422."""
    end = start - timedelta(days=delta)
    client, headers, contract_id = _get_p3_fixtures()
    # POST dating with end < start — must return 422
    r = client.post(
        f"/contracts/{contract_id}/dating",
        json={"start_date": str(start), "end_date": str(end)},
        headers=headers,
    )
    assert r.status_code == 422, (
        f"Expected 422 for start={start}, end={end}, got {r.status_code}: {r.text}"
    )


# ─────────────────────────── Property 4 ──────────────────────────────────────

# Feature: contract-wizard-backend, Property 4: اعتبارسنجی جمع مبالغ ودیعه
# Validates: Requirements 5.4

from hypothesis import assume

_p4_client: TestClient | None = None
_p4_headers: dict | None = None
_p4_contract_id: str | None = None


def _get_p4_fixtures():
    global _p4_client, _p4_headers, _p4_contract_id
    if _p4_client is None:
        _p4_client = TestClient(app)
        _p4_client.__enter__()
        _p4_headers = _register_and_login(_p4_client)
        r = _p4_client.post(
            "/contracts/start",
            json={"contract_type": "PROPERTY_RENT", "party_type": "LANDLORD"},
            headers=_p4_headers,
        )
        assert r.status_code == 201, f"Failed to create contract: {r.text}"
        _p4_contract_id = r.json()["id"]
        _wizard_advance_to_mortgage(_p4_client, _p4_headers, _p4_contract_id)
    return _p4_client, _p4_headers, _p4_contract_id


@given(
    total=st.integers(min_value=1_000_000, max_value=1_000_000_000),
    stage_amounts=st.lists(
        st.integers(min_value=100_000, max_value=500_000_000),
        min_size=1,
        max_size=5,
    ),
)
@settings(max_examples=10, deadline=None)
def test_mortgage_stages_sum_mismatch(total: int, stage_amounts: list) -> None:
    """For any POST /contracts/{id}/mortgage where sum(stages.amount) != total_amount, response must be 422.

    **Validates: Requirements 5.4**
    """
    assume(sum(stage_amounts) != total)
    client, headers, contract_id = _get_p4_fixtures()
    stages = [
        {"payment_type": "CASH", "due_date": "2025-01-01", "amount": amount}
        for amount in stage_amounts
    ]
    r = client.post(
        f"/contracts/{contract_id}/mortgage",
        json={"total_amount": total, "stages": stages},
        headers=headers,
    )
    assert r.status_code == 422, (
        f"Expected 422 for total={total}, stage_amounts={stage_amounts} (sum={sum(stage_amounts)}), "
        f"got {r.status_code}: {r.text}"
    )


# ─────────────────────────── Property 8 ──────────────────────────────────────

# Feature: contract-wizard-backend, Property 8: انتقال وضعیت نامعتبر در فسخ
# Validates: Requirements 14.2


_p8_client: TestClient | None = None
_p8_headers: dict | None = None


def _get_p8_client():
    global _p8_client, _p8_headers
    if _p8_client is None:
        _p8_client = TestClient(app)
        _p8_client.__enter__()
        _p8_headers = _register_and_login(_p8_client)
    return _p8_client, _p8_headers


def _force_status(contract_id: str, status: str) -> None:
    from app.db.session import get_db as _get_db
    from app.models.contract_wizard import WizardContract as _WC
    import uuid as _uuid
    db = next(_get_db())
    try:
        c = db.get(_WC, _uuid.UUID(contract_id))
        c.status = status
        db.commit()
    finally:
        db.close()


@given(terminal_status=st.sampled_from(["REVOKED", "COMPLETED"]))
@settings(max_examples=10, deadline=None)
def test_revoke_invalid_state_transition(terminal_status: str) -> None:
    """For any contract already in REVOKED or COMPLETED status,
    POST /contracts/{id}/revoke must return 400 with detail 'invalid_state_transition'.

    **Validates: Requirements 14.2**
    """
    client, headers = _get_p8_client()

    r = client.post(
        "/contracts/start",
        json={"contract_type": "PROPERTY_RENT", "party_type": "LANDLORD"},
        headers=headers,
    )
    assert r.status_code == 201, f"Failed to create contract: {r.text}"
    contract_id = r.json()["id"]

    _force_status(contract_id, terminal_status)

    r = client.post(f"/contracts/{contract_id}/revoke", headers=headers)
    assert r.status_code == 400, (
        f"Expected 400 for terminal_status={terminal_status}, "
        f"got {r.status_code}: {r.text}"
    )
    assert r.json()["detail"] == "invalid_state_transition", (
        f"Expected detail='invalid_state_transition', got: {r.json()}"
    )


# ─────────────────────────── Property 13 ─────────────────────────────────────

# Feature: contract-wizard-backend, Property 13: کنترل دسترسی مالکیت قرارداد
# Validates: Requirements 21.2

_p13_client: TestClient | None = None
_p13_headers_a: dict | None = None  # owner
_p13_headers_b: dict | None = None  # non-owner
_p13_contract_ids: list[str] = []   # pre-created contracts owned by user_a


def _get_p13_fixtures():
    global _p13_client, _p13_headers_a, _p13_headers_b, _p13_contract_ids
    if _p13_client is None:
        _p13_client = TestClient(app)
        _p13_client.__enter__()
        _p13_headers_a = _register_and_login(_p13_client)
        _p13_headers_b = _register_and_login(_p13_client)
        # Pre-create 10 contracts owned by user_a so each example just picks one
        for _ in range(10):
            r = _p13_client.post(
                "/contracts/start",
                json={"contract_type": "PROPERTY_RENT", "party_type": "LANDLORD"},
                headers=_p13_headers_a,
            )
            assert r.status_code == 201
            _p13_contract_ids.append(r.json()["id"])
    return _p13_client, _p13_headers_b, _p13_contract_ids


@given(idx=st.integers(min_value=0, max_value=9))
@settings(max_examples=10, deadline=None)
def test_ownership_access_control(idx: int) -> None:
    """For any user who is NOT the owner of a contract, GET /contracts/{id} must return 403.

    **Validates: Requirements 21.2**
    """
    client, headers_b, contract_ids = _get_p13_fixtures()
    contract_id = contract_ids[idx]

    r = client.get(f"/contracts/{contract_id}", headers=headers_b)
    assert r.status_code == 403, (
        f"Expected 403 for non-owner access (idx={idx}), "
        f"got {r.status_code}: {r.text}"
    )


@given(idx=st.integers(min_value=0, max_value=9))
@settings(max_examples=10, deadline=None)
def test_non_owner_cannot_read_status_or_mutate_wizard(idx: int) -> None:
    """Non-owner must get 403 on status and on state-changing wizard routes (IDOR)."""
    client, headers_b, contract_ids = _get_p13_fixtures()
    contract_id = contract_ids[idx]

    r_status = client.get(f"/contracts/{contract_id}/status", headers=headers_b)
    assert r_status.status_code == 403, r_status.text

    r_mut = client.post(
        f"/contracts/{contract_id}/party/landlord/set",
        json={"next_step": "TENANT_INFORMATION"},
        headers=headers_b,
    )
    assert r_mut.status_code == 403, r_mut.text


# ─────────────────────────── Property 5 ──────────────────────────────────────

# Feature: contract-wizard-backend, Property 5: sale-price برای BUYING_AND_SELLING
# Validates: Requirements 7.2

_p5_client: TestClient | None = None
_p5_headers: dict | None = None


def _get_p5_client_and_headers():
    global _p5_client, _p5_headers
    if _p5_client is None:
        _p5_client = TestClient(app)
        _p5_client.__enter__()
        _p5_headers = _register_and_login(_p5_client)
    return _p5_client, _p5_headers


@given(total_price=st.integers(min_value=1, max_value=1_000_000_000))
@settings(max_examples=10, deadline=None)
def test_sale_price_returns_next_step(total_price: int) -> None:
    """For any BUYING_AND_SELLING contract and any positive total_price,
    POST /contracts/{id}/sale-price must return a response containing next_step.

    **Validates: Requirements 7.2**
    """
    client, headers = _get_p5_client_and_headers()
    r = client.post(
        "/contracts/start",
        json={"contract_type": "BUYING_AND_SELLING", "party_type": "LANDLORD"},
        headers=headers,
    )
    assert r.status_code == 201, r.text
    contract_id = r.json()["id"]
    _wizard_advance_to_mortgage(client, headers, contract_id)
    r = client.post(
        f"/contracts/{contract_id}/sale-price",
        json={"total_price": total_price, "stages": []},
        headers=headers,
    )
    assert r.status_code == 201, (
        f"Expected 201 for total_price={total_price}, got {r.status_code}: {r.text}"
    )
    data = r.json()
    assert "next_step" in data, (
        f"Response missing 'next_step' field for total_price={total_price}: {data}"
    )


# ─────────────────────────── Property 6 ──────────────────────────────────────

# Feature: contract-wizard-backend, Property 6: پرداخت کارمزد redirect_url
# Validates: Requirements 10.2

_p6_client: TestClient | None = None
_p6_headers: dict | None = None
_p6_contract_id: str | None = None


def _get_p6_fixtures():
    global _p6_client, _p6_headers, _p6_contract_id
    if _p6_client is None:
        _p6_client = TestClient(app)
        _p6_client.__enter__()
        _p6_headers = _register_and_login(_p6_client)
        r = _p6_client.post(
            "/contracts/start",
            json={"contract_type": "PROPERTY_RENT", "party_type": "LANDLORD"},
            headers=_p6_headers,
        )
        assert r.status_code == 201, f"Failed to create contract: {r.text}"
        _p6_contract_id = r.json()["id"]
    return _p6_client, _p6_headers, _p6_contract_id


@given(use_wallet_credit=st.booleans())
@settings(max_examples=10, deadline=None)
def test_commission_pay_returns_redirect_url(use_wallet_credit: bool) -> None:
    """For any valid contract, POST /contracts/{id}/commission/pay must return a response containing redirect_url.

    **Validates: Requirements 10.2**
    """
    client, headers, contract_id = _get_p6_fixtures()
    r = client.post(
        f"/contracts/{contract_id}/commission/pay",
        json={"use_wallet_credit": use_wallet_credit},
        headers=headers,
    )
    assert r.status_code == 200, (
        f"Expected 200 for use_wallet_credit={use_wallet_credit}, got {r.status_code}: {r.text}"
    )
    data = r.json()
    assert "redirect_url" in data, (
        f"Response missing 'redirect_url' field for use_wallet_credit={use_wallet_credit}: {data}"
    )


# ─────────────────────────── Property 7 ──────────────────────────────────────

# Feature: contract-wizard-backend, Property 7: ایجاد الحاقیه فقط برای قراردادهای فعال
# Validates: Requirements 13.3

_p7_client: TestClient | None = None
_p7_headers: dict | None = None


def _get_p7_client():
    global _p7_client, _p7_headers
    if _p7_client is None:
        _p7_client = TestClient(app)
        _p7_client.__enter__()
        _p7_headers = _register_and_login(_p7_client)
    return _p7_client, _p7_headers


@given(terminal_status=st.sampled_from(["REVOKED", "REJECTED"]))
@settings(max_examples=10, deadline=None)
def test_addendum_not_allowed_for_terminal_status(terminal_status: str) -> None:
    """For any contract in REVOKED or REJECTED status,
    POST /contracts/{id}/addendum must return 400.

    **Validates: Requirements 13.3**
    """
    client, headers = _get_p7_client()

    r = client.post(
        "/contracts/start",
        json={"contract_type": "PROPERTY_RENT", "party_type": "LANDLORD"},
        headers=headers,
    )
    assert r.status_code == 201, f"Failed to create contract: {r.text}"
    contract_id = r.json()["id"]

    _force_status(contract_id, terminal_status)

    r = client.post(
        f"/contracts/{contract_id}/addendum",
        json={"subject": "test subject", "content": "test content"},
        headers=headers,
    )
    assert r.status_code == 400, (
        f"Expected 400 for terminal_status={terminal_status}, "
        f"got {r.status_code}: {r.text}"
    )


# ─────────────────────────── Property 10 ─────────────────────────────────────

# Feature: contract-wizard-backend, Property 10: ورود مشاور
# Validates: Requirements 19.1

_p10_client: TestClient | None = None


def _get_p10_client() -> TestClient:
    global _p10_client
    if _p10_client is None:
        _p10_client = TestClient(app)
        _p10_client.__enter__()
    return _p10_client


def _register_consultant(client: TestClient, mobile: str) -> None:
    """Register a consultant with the given mobile number."""
    national_code = mobile[-10:]  # use last 10 digits as national_code
    r = client.post(
        "/consultant/auth/register",
        json={
            "full_name": f"مشاور {mobile}",
            "mobile": mobile,
            "national_code": national_code,
            "license_no": f"LIC-{mobile}",
            "city": "تهران",
            "agency_name": None,
        },
    )
    if r.status_code == 201:
        return
    if r.status_code == 400 and r.json().get("detail") == "mobile_already_registered":
        return
    assert r.status_code == 201, f"Failed to register consultant with mobile={mobile}: {r.text}"


@given(
    suffix=st.text(
        alphabet=st.characters(whitelist_categories=("Nd",)),
        min_size=9,
        max_size=9,
    )
)
@settings(max_examples=10, deadline=None)
def test_consultant_login_returns_access_token(suffix: str) -> None:
    """For any mobile number registered in the system,
    POST /consultant/auth/login must return access_token and user info.

    **Validates: Requirements 19.1**
    """
    client = _get_p10_client()
    mobile = "09" + suffix  # 11-digit mobile starting with 09

    # Register the consultant first so the mobile is in the system
    _register_consultant(client, mobile)

    # Now login with the registered mobile
    r = client.post(
        "/consultant/auth/login",
        json={"mobile": mobile},
    )
    assert r.status_code == 200, (
        f"Expected 200 for mobile={mobile}, got {r.status_code}: {r.text}"
    )
    data = r.json()
    assert "access_token" in data, (
        f"Response missing 'access_token' field for mobile={mobile}: {data}"
    )
    assert "user" in data, (
        f"Response missing 'user' field for mobile={mobile}: {data}"
    )
    user_info = data["user"]
    assert "id" in user_info, f"user info missing 'id': {user_info}"
    assert "mobile" in user_info, f"user info missing 'mobile': {user_info}"


# ─────────────────────────── Property 11 ─────────────────────────────────────

# Feature: contract-wizard-backend, Property 11: ساختار داشبورد مشاور
# Validates: Requirements 19.4

_p11_client: TestClient | None = None
_p11_token: str | None = None


def _get_p11_client() -> tuple[TestClient, str]:
    global _p11_client, _p11_token
    if _p11_client is None:
        _p11_client = TestClient(app)
        _p11_client.__enter__()
        # Register a consultant and login once
        mobile = "09" + uuid.uuid4().hex[:9]
        national_code = mobile[-10:]
        r = _p11_client.post(
            "/consultant/auth/register",
            json={
                "full_name": f"مشاور {mobile}",
                "mobile": mobile,
                "national_code": national_code,
                "license_no": f"LIC-{mobile}",
                "city": "تهران",
                "agency_name": None,
            },
        )
        assert r.status_code == 201, f"Failed to register consultant: {r.text}"
        r = _p11_client.post(
            "/consultant/auth/login",
            json={"mobile": mobile},
        )
        assert r.status_code == 200, f"Failed to login consultant: {r.text}"
        _p11_token = r.json()["access_token"]
    return _p11_client, _p11_token


@given(dummy=st.just(None))
@settings(max_examples=10, deadline=None)
def test_consultant_dashboard_summary_structure(dummy: None) -> None:
    """For any consultant with a valid token,
    GET /consultant/dashboard/summary must return a response containing
    the fields 'profile', 'benefits', and 'next_steps'.

    **Validates: Requirements 19.4**
    """
    client, token = _get_p11_client()
    headers = {"Authorization": f"Bearer {token}"}
    r = client.get("/consultant/dashboard/summary", headers=headers)
    assert r.status_code == 200, (
        f"Expected 200, got {r.status_code}: {r.text}"
    )
    data = r.json()
    assert "profile" in data, f"Response missing 'profile' field: {data}"
    assert "benefits" in data, f"Response missing 'benefits' field: {data}"
    assert "next_steps" in data, f"Response missing 'next_steps' field: {data}"


# ─────────────────────────── Property 9 ──────────────────────────────────────

# Feature: contract-wizard-backend, Property 9: لیست قراردادها برای ادمین
# Validates: Requirements 17.5

_p9_client: TestClient | None = None


def _get_p9_client() -> TestClient:
    global _p9_client
    if _p9_client is None:
        _p9_client = TestClient(app)
        _p9_client.__enter__()
    return _p9_client


def _register_and_login_as_admin(client: TestClient) -> dict:
    """Register a new user via OTP flow, promote to admin, and return auth headers."""
    from app.db.session import get_db as _get_db
    from app.models.user import User as _User, UserRole as _UserRole
    from app.services import auth_tokens as _auth_tokens

    mobile = "09" + uuid.uuid4().hex[:9]
    r = client.post("/auth/send-otp", json={"mobile": mobile})
    assert r.status_code == 200
    code = r.json().get("dev_code")
    r = client.post("/auth/verify-otp", json={"mobile": mobile, "code": code})
    assert r.status_code == 200

    # Promote user to admin directly in DB
    db = next(_get_db())
    try:
        user = db.query(_User).filter(_User.mobile == mobile).one()
        user.role = _UserRole.admin
        db.commit()
        user_id = str(user.id)
    finally:
        db.close()

    # Issue a fresh token so the JWT reflects the updated role
    pair = _auth_tokens.issue_tokens(user_id)
    return {"Authorization": f"Bearer {pair.access_token}"}


@given(num_extra_users=st.integers(min_value=1, max_value=3))
@settings(max_examples=10, deadline=None)
def test_admin_contracts_list_returns_all_contracts(num_extra_users: int) -> None:
    """For any set of contracts belonging to multiple different users,
    GET /admin/pr-contracts/list returns ALL contracts (not just the current user's).

    **Validates: Requirements 17.5**
    """
    # Feature: contract-wizard-backend, Property 9: لیست قراردادها برای ادمین
    client = _get_p9_client()

    # Create an admin user
    admin_headers = _register_and_login_as_admin(client)

    # Create contracts for multiple different regular users
    created_contract_ids: list[str] = []
    for _ in range(num_extra_users):
        user_headers = _register_and_login(client)
        r = client.post(
            "/contracts/start",
            json={"contract_type": "PROPERTY_RENT", "party_type": "LANDLORD"},
            headers=user_headers,
        )
        assert r.status_code == 201, f"Failed to create contract: {r.text}"
        created_contract_ids.append(r.json()["id"])

    # Call GET /admin/pr-contracts/list with admin token
    r = client.get("/admin/pr-contracts/list", headers=admin_headers)
    assert r.status_code == 200, (
        f"Expected 200 from admin list endpoint, got {r.status_code}: {r.text}"
    )

    data = r.json()
    assert isinstance(data, list), (
        f"Expected response to be a list, got {type(data).__name__}: {data}"
    )

    # Assert response contains contracts from multiple users (total count >= contracts created)
    returned_ids = {item["id"] for item in data}
    assert len(data) >= len(created_contract_ids), (
        f"Expected at least {len(created_contract_ids)} contracts in admin list, "
        f"got {len(data)}"
    )
    for cid in created_contract_ids:
        assert cid in returned_ids, (
            f"Contract {cid} created by a regular user was not returned in admin list. "
            f"Returned IDs: {returned_ids}"
        )


# ─────────────────────────── Property 1 ──────────────────────────────────────

# Feature: contract-wizard-backend, Property 1: ساختار پاسخ start
# Validates: Requirements 1.1, 1.4

_p1_client: TestClient | None = None
_p1_headers: dict | None = None


def _get_p1_client():
    global _p1_client, _p1_headers
    if _p1_client is None:
        _p1_client = TestClient(app)
        _p1_client.__enter__()
        _p1_headers = _register_and_login(_p1_client)
    return _p1_client, _p1_headers


@given(
    contract_type=st.sampled_from(["PROPERTY_RENT", "BUYING_AND_SELLING"]),
    party_type=st.sampled_from(["LANDLORD", "TENANT"]),
)
@settings(max_examples=10, deadline=None)
def test_start_response_structure(contract_type: str, party_type: str) -> None:
    """For any valid POST /contracts/start with any contract_type and party_type,
    the response must contain all required fields and status must equal 'DRAFT'.

    **Validates: Requirements 1.1, 1.4**
    """
    client, headers = _get_p1_client()
    r = client.post(
        "/contracts/start",
        json={"contract_type": contract_type, "party_type": party_type},
        headers=headers,
    )
    assert r.status_code == 201, (
        f"Expected 201 for contract_type={contract_type}, party_type={party_type}, "
        f"got {r.status_code}: {r.text}"
    )
    data = r.json()
    required_fields = ["id", "type", "status", "step", "parties", "is_owner", "key", "created_at"]
    for field in required_fields:
        assert field in data, (
            f"Response missing '{field}' field for contract_type={contract_type}, "
            f"party_type={party_type}: {data}"
        )
    assert data["status"] == "DRAFT", (
        f"Expected status='DRAFT' for contract_type={contract_type}, "
        f"party_type={party_type}, got status={data['status']!r}"
    )


# ─────────────────────────── Property 2 ──────────────────────────────────────

# Feature: contract-wizard-backend, Property 2: توالی مراحل BUYING_AND_SELLING
# Validates: Requirements 1.5, 6.3

_p2_client: TestClient | None = None
_p2_headers: dict | None = None


def _get_p2_client():
    global _p2_client, _p2_headers
    if _p2_client is None:
        _p2_client = TestClient(app)
        _p2_client.__enter__()
        _p2_headers = _register_and_login(_p2_client)
    return _p2_client, _p2_headers


@given(dummy=st.just(None))
@settings(max_examples=10, deadline=None)
def test_buying_and_selling_mortgage_next_step_is_signing(dummy: None) -> None:
    """For any BUYING_AND_SELLING contract, after POST /contracts/{id}/sale-price,
    the next_step must be 'SIGNING' (خرید و فروش از مسیر sale-price، نه mortgage).

    **Validates: Requirements 1.5, 6.3**
    """
    client, headers = _get_p2_client()

    # Create a fresh BUYING_AND_SELLING contract for each example
    r = client.post(
        "/contracts/start",
        json={"contract_type": "BUYING_AND_SELLING", "party_type": "LANDLORD"},
        headers=headers,
    )
    assert r.status_code == 201, f"Failed to create BUYING_AND_SELLING contract: {r.text}"
    contract_id = r.json()["id"]
    _wizard_advance_to_mortgage(client, headers, contract_id)

    total_amount = 1_000_000
    stages = [
        {"payment_type": "CASH", "due_date": "2025-06-01", "amount": total_amount}
    ]
    r = client.post(
        f"/contracts/{contract_id}/sale-price",
        json={"total_price": total_amount, "stages": stages},
        headers=headers,
    )
    assert r.status_code == 201, (
        f"Expected 201 from sale-price endpoint, got {r.status_code}: {r.text}"
    )
    data = r.json()
    assert "next_step" in data, f"Response missing 'next_step' field: {data}"
    assert data["next_step"] == "SIGNING", (
        f"Expected next_step='SIGNING' for BUYING_AND_SELLING contract, "
        f"got next_step={data['next_step']!r}. "
        f"RENTING step must NOT appear for BUYING_AND_SELLING contracts."
    )
    assert data["next_step"] != "RENTING", (
        f"next_step must not be 'RENTING' for BUYING_AND_SELLING contracts, "
        f"got: {data['next_step']!r}"
    )
