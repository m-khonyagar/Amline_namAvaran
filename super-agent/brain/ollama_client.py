"""Local LLM via Ollama HTTP API (Blueprint §3.1–3.2)."""

from __future__ import annotations

import logging
from typing import Any

import httpx

log = logging.getLogger(__name__)


def ollama_reachable(base_url: str, *, timeout_sec: float = 3.0) -> tuple[bool, str | None]:
    """Return (ok, error_message) using Ollama GET /api/tags."""
    base = base_url.rstrip("/")
    url = f"{base}/api/tags"
    try:
        with httpx.Client(timeout=timeout_sec) as client:
            r = client.get(url)
            r.raise_for_status()
    except Exception as exc:  # noqa: BLE001
        return False, str(exc)
    return True, None


class OllamaClient:
    def __init__(self, base_url: str, model: str) -> None:
        self._base = base_url.rstrip("/")
        self._model = model

    def generate(
        self,
        prompt: str,
        *,
        system: str | None = None,
        temperature: float = 0.2,
        timeout_sec: float = 120.0,
    ) -> str:
        payload: dict[str, Any] = {
            "model": self._model,
            "prompt": prompt,
            "stream": False,
            "options": {"temperature": temperature},
        }
        if system:
            payload["system"] = system
        url = f"{self._base}/api/generate"
        log.debug("Ollama POST %s model=%s", url, self._model)
        with httpx.Client(timeout=timeout_sec) as client:
            r = client.post(url, json=payload)
            r.raise_for_status()
            data = r.json()
        return (data.get("response") or "").strip()
