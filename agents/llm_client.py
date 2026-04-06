"""Shared LLM client with multi-provider support and automatic fallback.

Providers (tried in order until one succeeds):
  1. Ollama  — local, completely free
  2. HuggingFace Inference API  — free serverless
  3. OpenRouter  — free-tier aggregated models
  4. Claude / Anthropic  — free tier
"""

from __future__ import annotations

import json
import logging
from typing import Any

import httpx

from agents.config import AgentConfig

log = logging.getLogger(__name__)

_TIMEOUT = 120  # seconds — generous for slow local Ollama / remote HuggingFace calls
_OFFLINE_REPLY = (
    '{"steps": ["Analyse", "Implement", "Test", "Review", "PR"], '
    '"estimated_files": [], "branch_name": "agent/offline-stub"}'
)


class LLMClient:
    """Thin HTTP wrapper around multiple LLM providers with fallback."""

    def __init__(self, config: AgentConfig) -> None:
        self.config = config

    def chat(self, *, system: str, user: str) -> str:
        """Send a chat completion request; try fallback providers on failure."""
        providers = [self.config.llm.provider] + [
            p
            for p in self.config.fallback_providers
            if p != self.config.llm.provider
        ]

        for provider in providers:
            try:
                reply = self._call(provider, system=system, user=user)
                if reply:
                    return reply
            except Exception as exc:  # noqa: BLE001
                log.warning("LLMClient: provider '%s' failed: %s", provider, exc)

        log.warning("LLMClient: all providers failed; returning offline stub.")
        return _OFFLINE_REPLY

    # ── provider implementations ─────────────────────────────────────────

    def _call(self, provider: str, *, system: str, user: str) -> str:
        if provider == "ollama":
            return self._ollama(system=system, user=user)
        if provider == "huggingface":
            return self._huggingface(system=system, user=user)
        if provider == "openrouter":
            return self._openrouter(system=system, user=user)
        if provider in ("claude", "anthropic"):
            return self._claude(system=system, user=user)
        raise ValueError(f"Unknown provider: {provider}")

    def _ollama(self, *, system: str, user: str) -> str:
        url = f"{self.config.llm.base_url.rstrip('/')}/api/chat"
        payload: dict[str, Any] = {
            "model": self.config.llm.model,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            "stream": False,
        }
        resp = httpx.post(url, json=payload, timeout=_TIMEOUT)
        resp.raise_for_status()
        data = resp.json()
        return data.get("message", {}).get("content", "")

    def _huggingface(self, *, system: str, user: str) -> str:
        model = self.config.llm.model
        url = f"{self.config.llm.base_url.rstrip('/')}/{model}"
        prompt = f"<s>[INST] {system}\n\n{user} [/INST]"
        payload = {
            "inputs": prompt,
            "parameters": {"max_new_tokens": 1024, "return_full_text": False},
        }
        headers = self.config.llm_headers()
        resp = httpx.post(url, json=payload, headers=headers, timeout=_TIMEOUT)
        resp.raise_for_status()
        data = resp.json()
        if isinstance(data, list) and data:
            return data[0].get("generated_text", "")
        return ""

    def _openrouter(self, *, system: str, user: str) -> str:
        url = "https://openrouter.ai/api/v1/chat/completions"
        payload: dict[str, Any] = {
            "model": self.config.llm.model,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
        }
        headers = self.config.llm_headers()
        resp = httpx.post(url, json=payload, headers=headers, timeout=_TIMEOUT)
        resp.raise_for_status()
        data = resp.json()
        return data["choices"][0]["message"]["content"]

    def _claude(self, *, system: str, user: str) -> str:
        url = "https://api.anthropic.com/v1/messages"
        payload: dict[str, Any] = {
            "model": self.config.llm.model,
            "max_tokens": 1024,
            "system": system,
            "messages": [{"role": "user", "content": user}],
        }
        headers = {
            "x-api-key": self.config.llm.api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        }
        resp = httpx.post(url, json=payload, headers=headers, timeout=_TIMEOUT)
        resp.raise_for_status()
        data = resp.json()
        return data["content"][0]["text"]
