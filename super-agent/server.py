"""HTTP API for health checks and remote runs (Docker / Parmin / reverse proxy)."""

from __future__ import annotations

import contextlib
import logging
import os
import sys
from collections.abc import AsyncIterator
from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
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
    yield


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
