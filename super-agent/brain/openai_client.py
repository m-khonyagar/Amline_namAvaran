"""OpenAI Chat Completions (API key) — primary cloud brain."""

from __future__ import annotations

import logging
from typing import Any

from openai import OpenAI

log = logging.getLogger(__name__)


class OpenAIChatClient:
    def __init__(self, *, api_key: str, model: str, base_url: str | None = None) -> None:
        self._model = model
        kw: dict[str, Any] = {"api_key": api_key}
        if base_url:
            kw["base_url"] = base_url.rstrip("/")
        self._client = OpenAI(**kw)

    def generate(
        self,
        prompt: str,
        *,
        system: str | None = None,
        temperature: float = 0.2,
        timeout_sec: float = 120.0,
    ) -> str:
        messages: list[dict[str, str]] = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})
        log.debug("OpenAI chat.completions model=%s", self._model)
        r = self._client.chat.completions.create(
            model=self._model,
            messages=messages,
            temperature=temperature,
            timeout=timeout_sec,
        )
        msg = r.choices[0].message
        return (msg.content or "").strip()
