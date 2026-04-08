"""Unit tests for PSP REST clients (mocked httpx)."""
from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest

from app.adapters.psp.idpay import IdpayPspAdapter, verify_idpay_payment
from app.adapters.psp.mock import MockPspAdapter
from app.adapters.psp.nextpay import NextPayPspAdapter, verify_nextpay_payment
from app.adapters.psp.zarinpal import ZarinpalPspAdapter, verify_zarinpal_payment
from app.models.payment import PaymentIntent, PaymentIntentStatus


def _intent(iid: str = "11111111-1111-1111-1111-111111111111") -> PaymentIntent:
    return PaymentIntent(
        id=iid,
        user_id="u1",
        amount_cents=150_000,
        currency="IRR",
        idempotency_key="idem-test-psp-1",
        status=PaymentIntentStatus.PENDING,
    )


def test_mock_initiate_sets_token() -> None:
    ad = MockPspAdapter()
    repo = MagicMock()
    intent = _intent()
    url = ad.initiate_checkout(repo, intent, "https://cb.example/mock")
    assert intent.id in url
    assert "mock-psp.example" in url
    repo.set_psp_session.assert_called_once()


@patch("app.adapters.psp.zarinpal.httpx.post")
def test_zarinpal_initiate_success(mock_post: MagicMock) -> None:
    mock_post.return_value.raise_for_status = MagicMock()
    mock_post.return_value.json.return_value = {"Status": 100, "Authority": "AUTH-TEST-1"}
    ad = ZarinpalPspAdapter()
    repo = MagicMock()
    intent = _intent()
    with patch.dict("os.environ", {"ZARINPAL_MERCHANT_ID": "m1", "ZARINPAL_SANDBOX": "1"}):
        url = ad.initiate_checkout(repo, intent, "https://cb.example/zp")
    assert "StartPay/AUTH-TEST-1" in url
    repo.set_psp_session.assert_called_once_with(
        intent, provider="zarinpal", checkout_token="AUTH-TEST-1"
    )


@patch("app.adapters.psp.zarinpal.httpx.post")
def test_zarinpal_verify_success(mock_post: MagicMock) -> None:
    mock_post.return_value.raise_for_status = MagicMock()
    mock_post.return_value.json.return_value = {"Status": 100, "RefID": 999888}
    with patch.dict("os.environ", {"ZARINPAL_MERCHANT_ID": "m1", "ZARINPAL_SANDBOX": "1"}):
        r = verify_zarinpal_payment("AUTH-X", 150_000)
    assert r.success
    assert r.psp_reference == "999888"


@patch("app.adapters.psp.idpay.httpx.post")
def test_idpay_initiate_success(mock_post: MagicMock) -> None:
    mock_post.return_value.raise_for_status = MagicMock()
    mock_post.return_value.json.return_value = {
        "id": "pid-1",
        "link": "https://idpay.ir/p/ws/start/pid-1",
    }
    ad = IdpayPspAdapter()
    repo = MagicMock()
    intent = _intent()
    with patch.dict("os.environ", {"IDPAY_API_KEY": "k1", "IDPAY_SANDBOX": "1"}):
        url = ad.initiate_checkout(repo, intent, "https://cb.example/ip")
    assert url.endswith("/pid-1") or "pid-1" in url
    repo.set_psp_session.assert_called_once()


@patch("app.adapters.psp.idpay.httpx.post")
def test_idpay_verify_success(mock_post: MagicMock) -> None:
    mock_post.return_value.raise_for_status = MagicMock()
    mock_post.return_value.json.return_value = {"status": 100, "track_id": 55}
    with patch.dict("os.environ", {"IDPAY_API_KEY": "k1", "IDPAY_SANDBOX": "1"}):
        r = verify_idpay_payment("pid-1", "order-uuid")
    assert r.success
    assert r.psp_reference == "55"


@patch("app.adapters.psp.nextpay.httpx.post")
def test_nextpay_initiate_success(mock_post: MagicMock) -> None:
    tid = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
    mock_post.return_value.raise_for_status = MagicMock()
    mock_post.return_value.json.return_value = {"code": -1, "trans_id": tid}
    ad = NextPayPspAdapter()
    repo = MagicMock()
    intent = _intent()
    with patch.dict("os.environ", {"NEXTPAY_API_KEY": tid}):
        url = ad.initiate_checkout(repo, intent, "https://cb.example/nx")
    assert tid in url
    repo.set_psp_session.assert_called_once()


@patch("app.adapters.psp.nextpay.httpx.post")
def test_nextpay_verify_success(mock_post: MagicMock) -> None:
    tid = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
    mock_post.return_value.raise_for_status = MagicMock()
    mock_post.return_value.json.return_value = {"code": 0}
    with patch.dict("os.environ", {"NEXTPAY_API_KEY": tid}):
        r = verify_nextpay_payment(tid, "order-uuid", 150_000)
    assert r.success
    assert r.psp_reference == tid
