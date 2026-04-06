"""HTTP API for health checks and remote runs (Docker / Parmin / reverse proxy)."""

from __future__ import annotations

import asyncio
import contextlib
import json
import logging
import os
import sqlite3
import sys
from collections.abc import AsyncIterator
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

ROOT = Path(__file__).resolve().parent
WEB_ROOT = ROOT / "ui" / "web"
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from brain.ollama_client import ollama_reachable  # noqa: E402
from memory.store import TaskStore  # noqa: E402
from orchestrator.pipeline import load_config  # noqa: E402
from runtime import merge_runtime_env, resolve_config_path, run_session, setup_logging  # noqa: E402

log = logging.getLogger(__name__)
_bearer = HTTPBearer(auto_error=False)
_stream_executor = ThreadPoolExecutor(max_workers=4, thread_name_prefix="sa_stream")
_POLL_INTERVAL_SECONDS = 0.35  # how often to check the DB for new pipeline events


def _max_event_id(db_path: Path) -> int:
    """Return current max row-id in task_events (0 if DB absent)."""
    if not db_path.is_file():
        return 0
    try:
        with sqlite3.connect(str(db_path)) as conn:
            row = conn.execute("SELECT COALESCE(MAX(id), 0) FROM task_events").fetchone()
            return int(row[0]) if row else 0
    except Exception:
        return 0


def _fetch_events_after(db_path: Path, since_id: int) -> list[dict]:
    """Fetch all task_events rows with id > since_id, in insert order."""
    if not db_path.is_file():
        return []
    try:
        with sqlite3.connect(str(db_path)) as conn:
            rows = conn.execute(
                "SELECT id, task_id, agent, action, status, payload_json, created_at "
                "FROM task_events WHERE id > ? ORDER BY id ASC",
                (since_id,),
            ).fetchall()
        result: list[dict] = []
        for row in rows:
            try:
                payload = json.loads(row[5]) if row[5] else {}
            except Exception:
                payload = {}
            result.append(
                {
                    "id": row[0],
                    "task_id": row[1],
                    "agent": row[2],
                    "action": row[3],
                    "status": row[4],
                    "output": payload.get("output", {}),
                    "error": payload.get("error"),
                    "created_at": row[6],
                }
            )
        return result
    except Exception:
        return []


class RunBody(BaseModel):
    goal: str = Field(default="سلام")
    skip_brain: bool = False
    workflow_mode: str | None = Field(default=None, description="full | plan_only")


def _check_auth(creds: HTTPAuthorizationCredentials | None) -> None:
    token = os.environ.get("SUPER_AGENT_DEPLOY_TOKEN", "").strip()
    if not token:
        return
    if creds is None or creds.credentials != token:
        raise HTTPException(status_code=401, detail="Unauthorized")


@contextlib.asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    cfg_path = resolve_config_path()
    cfg = merge_runtime_env(load_config(cfg_path))
    paths = cfg.get("paths", {})
    logs_dir = ROOT / paths.get("logs_dir", "logs")
    setup_logging(logs_dir, cfg.get("logging", {}).get("level", "INFO"), force=True)
    log.info("Super-Agent API starting (config=%s)", cfg_path)
    try:
        yield
    finally:
        _stream_executor.shutdown(wait=False)
        log.info("Super-Agent API shut down")


app = FastAPI(title="Super-Agent", version="2.1", lifespan=lifespan)

if WEB_ROOT.is_dir():
    app.mount("/ui-assets", StaticFiles(directory=str(WEB_ROOT)), name="ui_assets")

_cors = os.environ.get("SUPER_AGENT_CORS_ORIGINS", "").strip()
if _cors:
    origins = ["*"] if _cors == "*" else [o.strip() for o in _cors.split(",") if o.strip()]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


@app.get("/")
def chat_ui() -> FileResponse:
    """رابط ساده برای کاربر نهایی."""
    index = WEB_ROOT / "index.html"
    if not index.is_file():
        raise HTTPException(status_code=404, detail="UI not found")
    return FileResponse(index)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "version": "2.1"}


@app.get("/ready")
def ready() -> dict:
    """LLM backend readiness: OpenAI key or Ollama HTTP."""
    cfg_path = resolve_config_path()
    cfg = merge_runtime_env(load_config(cfg_path))
    llm = cfg.get("llm") or {}
    provider = str(llm.get("provider") or "openai").lower()
    if provider == "openai":
        oa = llm.get("openai") or {}
        model = str(oa.get("model") or "gpt-4o-mini")
        key_ok = bool(os.environ.get("OPENAI_API_KEY", "").strip())
        return {
            "provider": "openai",
            "api_key_configured": key_ok,
            "model": model,
            "ollama": None,
            "error": None if key_ok else "OPENAI_API_KEY missing",
        }
    base = (cfg.get("ollama") or {}).get("base_url", "http://127.0.0.1:11434")
    ok, err = ollama_reachable(str(base))
    return {"provider": "ollama", "ollama": ok, "base_url": base, "error": err, "api_key_configured": None}


@app.post("/v1/run")
def run_one(
    body: RunBody,
    creds: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> dict:
    _check_auth(creds)
    return run_session(
        goal=body.goal,
        skip_brain=body.skip_brain,
        workflow_mode=body.workflow_mode,
    )


@app.get("/v1/tasks/{task_id}/trace")
def task_trace(
    task_id: str,
    creds: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> dict:
    _check_auth(creds)
    cfg_path = resolve_config_path()
    cfg = merge_runtime_env(load_config(cfg_path))
    rel = (cfg.get("paths") or {}).get("memory_db", "memory/tasks.db")
    db_path = ROOT / rel
    events = TaskStore.read_trace(db_path, task_id)
    return {"task_id": task_id, "events": events, "count": len(events)}


@app.post("/v1/run/stream")
async def run_stream(
    body: RunBody,
    creds: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> StreamingResponse:
    """Stream pipeline events as Server-Sent Events while the agent runs."""
    _check_auth(creds)

    cfg_path = resolve_config_path()
    cfg = merge_runtime_env(load_config(cfg_path))
    rel = (cfg.get("paths") or {}).get("memory_db", "memory/tasks.db")
    db_path = ROOT / rel

    # Snapshot current max id so we only tail events from this run
    since_id = _max_event_id(db_path)

    loop = asyncio.get_running_loop()
    future: asyncio.Future = loop.run_in_executor(
        _stream_executor,
        lambda: run_session(
            goal=body.goal,
            skip_brain=body.skip_brain,
            workflow_mode=body.workflow_mode,
        ),
    )

    async def generate() -> AsyncIterator[str]:
        last_id = since_id
        try:
            while True:
                for ev in _fetch_events_after(db_path, last_id):
                    last_id = ev["id"]
                    yield f"data: {json.dumps(ev, ensure_ascii=False)}\n\n"

                if future.done():
                    # Drain any events written between last poll and completion
                    for ev in _fetch_events_after(db_path, last_id):
                        last_id = ev["id"]
                        yield f"data: {json.dumps(ev, ensure_ascii=False)}\n\n"
                    try:
                        result = future.result()
                        done_payload = {
                            "task_id": result.get("task_id", ""),
                            "llm": result.get("llm"),
                            "workflow_mode": result.get("workflow_mode"),
                        }
                    except Exception as exc:
                        yield (
                            f"event: error\n"
                            f"data: {json.dumps({'error': str(exc)}, ensure_ascii=False)}\n\n"
                        )
                        return
                    yield f"event: done\ndata: {json.dumps(done_payload, ensure_ascii=False)}\n\n"
                    return

                await asyncio.sleep(_POLL_INTERVAL_SECONDS)
        except asyncio.CancelledError:
            pass

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )
