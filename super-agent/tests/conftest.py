from __future__ import annotations

import importlib
from collections.abc import Generator
from pathlib import Path

import pytest
import yaml
from fastapi.testclient import TestClient


@pytest.fixture
def super_root() -> Path:
    return Path(__file__).resolve().parents[1]


@pytest.fixture
def api_client(tmp_path: Path, monkeypatch: pytest.MonkeyPatch, super_root: Path) -> Generator[TestClient, None, None]:
    monkeypatch.chdir(super_root)
    log_dir = tmp_path / "logs"
    log_dir.mkdir()
    cfg_path = tmp_path / "test-config.yaml"
    cfg_path.write_text(
        yaml.safe_dump(
            {
                "workflow": {"mode": "full"},
                "llm": {"provider": "ollama", "openai": {"model": "gpt-4o-mini"}},
                "paths": {
                    "memory_db": str(tmp_path / "tasks.db"),
                    "logs_dir": str(log_dir),
                },
                "logging": {"level": "WARNING"},
                "ollama": {"base_url": "http://127.0.0.1:9", "model": "noop"},
            },
            allow_unicode=True,
        ),
        encoding="utf-8",
    )
    monkeypatch.setenv("SUPER_AGENT_CONFIG", str(cfg_path))
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    import server as srv

    importlib.reload(srv)
    with TestClient(srv.app) as client:
        yield client
