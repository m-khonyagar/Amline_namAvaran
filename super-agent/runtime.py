"""Shared runtime for CLI and HTTP server (deploy-friendly)."""

from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent

from brain.factory import build_llm  # noqa: E402
from memory.store import TaskStore  # noqa: E402
from orchestrator.pipeline import load_config, run_pipeline  # noqa: E402
from orchestrator.workflow import WorkflowMode  # noqa: E402
from tools.command_runner import CommandRunner  # noqa: E402

_logging_ready = False


def setup_logging(logs_dir: Path, level: str, *, force: bool = False) -> None:
    """Configure root logging once per process (safe under FastAPI multi-request)."""
    global _logging_ready
    if _logging_ready and not force:
        return
    logs_dir.mkdir(parents=True, exist_ok=True)
    log_file = logs_dir / "super-agent.log"
    fmt = "%(asctime)s | %(levelname)s | %(name)s | %(message)s"
    root = logging.getLogger()
    if force or not _logging_ready:
        root.handlers.clear()
    root.setLevel(getattr(logging, level.upper(), logging.INFO))
    fh = logging.FileHandler(log_file, encoding="utf-8")
    fh.setFormatter(logging.Formatter(fmt))
    sh = logging.StreamHandler()
    sh.setFormatter(logging.Formatter(fmt))
    root.addHandler(fh)
    root.addHandler(sh)
    _logging_ready = True


def resolve_config_path(explicit: Path | None = None) -> Path:
    if explicit is not None:
        return explicit
    env = os.environ.get("SUPER_AGENT_CONFIG")
    if env:
        return Path(env)
    return ROOT / "config" / "default.yaml"


def merge_ollama_from_env(cfg: dict[str, Any]) -> dict[str, Any]:
    base = (os.environ.get("SUPER_AGENT_OLLAMA_BASE") or os.environ.get("OLLAMA_BASE_URL") or "").strip()
    model = (os.environ.get("SUPER_AGENT_MODEL") or "").strip()
    ollama = dict(cfg.get("ollama") or {})
    if base:
        ollama["base_url"] = base.rstrip("/")
    if model:
        ollama["model"] = model
    cfg = dict(cfg)
    cfg["ollama"] = ollama
    return cfg


def merge_llm_from_env(cfg: dict[str, Any]) -> dict[str, Any]:
    cfg = dict(cfg)
    llm = dict(cfg.get("llm") or {})
    env_p = os.environ.get("SUPER_AGENT_LLM_PROVIDER", "").strip()
    if env_p:
        llm["provider"] = env_p
    oa = dict(llm.get("openai") or {})
    if os.environ.get("OPENAI_MODEL", "").strip():
        oa["model"] = os.environ["OPENAI_MODEL"].strip()
    bu = os.environ.get("OPENAI_BASE_URL", "").strip()
    if bu:
        oa["base_url"] = bu
    llm["openai"] = oa
    cfg["llm"] = llm
    return cfg


def merge_amline_from_env(cfg: dict[str, Any]) -> dict[str, Any]:
    cfg = dict(cfg)
    base = (os.environ.get("AMLINE_API_BASE_URL") or "").strip()
    if base:
        amline = dict(cfg.get("amline") or {})
        amline["api_base_url"] = base.rstrip("/")
        cfg["amline"] = amline
    return cfg


def merge_runtime_env(cfg: dict[str, Any]) -> dict[str, Any]:
    return merge_amline_from_env(merge_llm_from_env(merge_ollama_from_env(cfg)))


def run_session(
    *,
    goal: str,
    skip_brain: bool = False,
    demo_command: str | None = None,
    config_path: Path | None = None,
    workflow_mode: str | None = None,
) -> dict[str, Any]:
    """Run one flow; returns serializable result. Closes DB after run."""
    cfg_path = resolve_config_path(config_path)
    cfg = merge_runtime_env(load_config(cfg_path))

    paths = cfg.get("paths", {})
    logs_dir = ROOT / paths.get("logs_dir", "logs")
    setup_logging(logs_dir, cfg.get("logging", {}).get("level", "INFO"))

    db_rel = paths.get("memory_db", "memory/tasks.db")
    store = TaskStore(ROOT / db_rel)

    llm = build_llm(cfg, skip_brain=skip_brain)

    command_result: dict[str, Any] | None = None
    sec = cfg.get("security", {})
    tier = sec.get("command_tier", "low")
    if demo_command and tier in ("medium", "high"):
        runner = CommandRunner(whitelist=sec.get("command_whitelist", []), cwd=ROOT)
        res = runner.run(demo_command)
        command_result = {"returncode": res.returncode, "stdout": res.stdout, "stderr": res.stderr}

    wf_cfg = cfg.get("workflow") or {}
    raw_mode = (workflow_mode or wf_cfg.get("mode") or "full").strip().lower()
    mode: WorkflowMode = "plan_only" if raw_mode == "plan_only" else "full"

    llm_meta = {
        "provider": str((cfg.get("llm") or {}).get("provider") or "openai").lower(),
        "active": llm is not None,
    }
    if llm_meta["provider"] == "openai":
        llm_meta["model"] = str(((cfg.get("llm") or {}).get("openai") or {}).get("model") or "gpt-4o-mini")

    try:
        msgs = run_pipeline(store=store, goal=goal, llm=llm, mode=mode)
        out = [m.model_dump() for m in msgs]
        tid = msgs[0].task_id if msgs else None
    finally:
        store.close()

    return {
        "task_id": tid,
        "workflow_mode": mode,
        "llm": llm_meta,
        "messages": out,
        "command_result": command_result,
    }
