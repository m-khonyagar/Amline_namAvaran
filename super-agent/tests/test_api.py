from __future__ import annotations

from fastapi.testclient import TestClient


def test_chat_ui_served(api_client: TestClient) -> None:
    r = api_client.get("/")
    assert r.status_code == 200
    assert "Super-Agent" in r.text
    assert "/ui-assets/app.js" in r.text


def test_health(api_client: TestClient) -> None:
    r = api_client.get("/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok"
    assert body["version"] == "2.1"


def test_run_skip_brain_returns_task_id(api_client: TestClient) -> None:
    r = api_client.post("/v1/run", json={"goal": "hello", "skip_brain": True})
    assert r.status_code == 200
    data = r.json()
    assert "task_id" in data
    assert data["workflow_mode"] == "full"
    assert data.get("llm", {}).get("active") is False
    assert len(data["messages"]) == 5


def test_trace_after_run(api_client: TestClient) -> None:
    r = api_client.post(
        "/v1/run",
        json={"goal": "trace me", "skip_brain": True, "workflow_mode": "plan_only"},
    )
    tid = r.json()["task_id"]
    tr = api_client.get(f"/v1/tasks/{tid}/trace")
    assert tr.status_code == 200
    body = tr.json()
    assert body["count"] >= 1
    assert body["events"][0]["payload"]["task_id"] == tid
