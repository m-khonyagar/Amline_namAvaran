"""P2 Growth Layer — AI matching/pricing, chat, ratings, mobile, search, analytics, public SEO."""
from __future__ import annotations

import os

import pytest
from fastapi.testclient import TestClient

os.environ.setdefault("AMLINE_OTP_DEBUG", "1")

from app.main import app  # noqa: E402

HDR = {"X-User-Permissions": "*", "X-User-Id": "p2-test-user"}


@pytest.fixture
def client() -> TestClient:
    return TestClient(app, raise_server_exceptions=False)


def _create_public_listing(client: TestClient) -> str:
    r = client.post(
        "/api/v1/listings",
        json={
            "deal_type": "RENT",
            "visibility": "PUBLIC",
            "price_amount": "12000000",
            "currency": "IRR",
            "location_summary": "تهران، ونک",
            "title": "اجاره آپارتمان ونک",
            "description": "نزدیک مترو",
            "owner_id": "p2-test-user",
            "status": "published",
            "area_sqm": "85.5",
            "room_count": 2,
        },
    )
    assert r.status_code == 201, r.text
    return r.json()["id"]


def test_ai_requirement_matching_and_pricing(client: TestClient) -> None:
    lid = _create_public_listing(client)
    rq = client.post(
        "/api/v1/ai/requirements",
        json={
            "deal_type": "RENT",
            "budget_min": "10000000",
            "budget_max": "15000000",
            "location_keywords": "تهران, ونک",
            "title_hint": "آپارتمان",
        },
        headers=HDR,
    )
    assert rq.status_code == 201, rq.text
    req_id = rq.json()["id"]
    sg = client.get(
        f"/api/v1/ai/matching/requirements/{req_id}/suggestions",
        headers=HDR,
    )
    assert sg.status_code == 200
    items = sg.json()["items"]
    assert any(x["listing_id"] == lid for x in items)
    pr = client.get(f"/api/v1/ai/pricing/listings/{lid}/estimate", headers=HDR)
    assert pr.status_code == 200
    body = pr.json()
    assert body["listing_id"] == lid
    assert float(body["suggested_price"]) > 0


def test_chat_messages_and_websocket(client: TestClient) -> None:
    c = client.post(
        "/api/v1/chat/conversations",
        json={"title": "سرمایه‌گذار", "participant_user_ids": ["other-user"]},
        headers=HDR,
    )
    assert c.status_code == 201, c.text
    cid = c.json()["id"]
    m = client.post(
        f"/api/v1/chat/conversations/{cid}/messages",
        json={"body": "سلام"},
        headers=HDR,
    )
    assert m.status_code == 201, m.text
    lst = client.get(f"/api/v1/chat/conversations/{cid}/messages", headers=HDR)
    assert lst.status_code == 200
    assert lst.json()["total"] >= 1
    with client.websocket_connect(f"/api/v1/chat/ws/{cid}") as ws:
        ws.send_text("ping")


def test_ratings_aggregate(client: TestClient) -> None:
    lid = _create_public_listing(client)
    r1 = client.post(
        "/api/v1/ratings",
        json={
            "target_type": "LISTING",
            "target_id": lid,
            "rater_id": "rater-1",
            "stars": 5,
            "comment": "عالی",
        },
        headers=HDR,
    )
    assert r1.status_code == 201, r1.text
    s = client.get(
        "/api/v1/ratings/summary",
        params={"target_type": "LISTING", "target_id": lid},
        headers=HDR,
    )
    assert s.status_code == 200
    assert s.json()["count"] == 1
    assert s.json()["average_stars"] == 5.0


def test_mobile_meta_and_cursor(client: TestClient) -> None:
    _create_public_listing(client)
    meta = client.get("/api/v1/mobile/meta")
    assert meta.status_code == 200
    assert meta.json()["pagination_style"] == "cursor"
    page = client.get("/api/v1/mobile/listings", params={"limit": 5}, headers=HDR)
    assert page.status_code == 200
    assert "items" in page.json()


def test_search_listings_cached(client: TestClient) -> None:
    _create_public_listing(client)
    r = client.get(
        "/api/v1/search/listings",
        params={"q": "ونک"},
        headers=HDR,
    )
    assert r.status_code == 200
    assert r.json()["total"] >= 1
    assert r.headers.get("x-search-backend")


def test_analytics_ingest_and_summary(client: TestClient) -> None:
    e = client.post(
        "/api/v1/analytics/events",
        json={"event_name": "page_view", "user_id": "u1", "properties": {"path": "/x"}},
        headers=HDR,
    )
    assert e.status_code == 201, e.text
    s = client.get("/api/v1/analytics/summary", headers=HDR)
    assert s.status_code == 200
    names = {g["event_name"] for g in s.json()["groups"]}
    assert "page_view" in names


def test_public_feed_sitemap_meta(client: TestClient) -> None:
    lid = _create_public_listing(client)
    feed = client.get("/api/v1/public/listings/feed")
    assert feed.status_code == 200
    assert feed.json()["total"] >= 1
    sm = client.get("/api/v1/public/sitemap.xml")
    assert sm.status_code == 200
    assert b"urlset" in sm.content
    meta = client.get("/api/v1/public/meta/site")
    assert meta.status_code == 200
    assert "base_url" in meta.json()
    lm = client.get(f"/api/v1/public/listings/{lid}/meta")
    assert lm.status_code == 200
    assert lm.json()["listing_id"] == lid
