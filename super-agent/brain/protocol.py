"""Shared LLM surface for Ollama, OpenAI, or other backends."""

from __future__ import annotations

from typing import Protocol


class LLMClient(Protocol):
    def generate(
        self,
        prompt: str,
        *,
        system: str | None = None,
        temperature: float = 0.2,
        timeout_sec: float = 120.0,
    ) -> str: ...
