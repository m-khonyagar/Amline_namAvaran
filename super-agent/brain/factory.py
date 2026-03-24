"""Build LLM client from config + environment."""

from __future__ import annotations

import logging
import os
from typing import Any

from brain.ollama_client import OllamaClient
from brain.openai_client import OpenAIChatClient
from brain.protocol import LLMClient

log = logging.getLogger(__name__)


def build_llm(cfg: dict[str, Any], *, skip_brain: bool) -> LLMClient | None:
    if skip_brain:
        return None

    llm_block = cfg.get("llm") or {}
    provider = (
        os.environ.get("SUPER_AGENT_LLM_PROVIDER", "").strip()
        or str(llm_block.get("provider") or "openai").strip()
    ).lower()

    if provider == "openai":
        key = os.environ.get("OPENAI_API_KEY", "").strip()
        if not key:
            log.warning("llm.provider=openai but OPENAI_API_KEY is empty; using offline stubs.")
            return None
        oa = llm_block.get("openai") or {}
        model = (
            os.environ.get("OPENAI_MODEL", "").strip()
            or str(oa.get("model") or "gpt-4o-mini").strip()
        )
        base_url = (os.environ.get("OPENAI_BASE_URL", "").strip() or oa.get("base_url") or None) or None
        if isinstance(base_url, str):
            base_url = base_url.strip() or None
        return OpenAIChatClient(api_key=key, model=model, base_url=base_url)

    if provider == "ollama":
        oc = cfg.get("ollama") or {}
        base_url = str(oc.get("base_url") or "http://127.0.0.1:11434").rstrip("/")
        model = str(oc.get("model") or "qwen2:7b-instruct")
        return OllamaClient(base_url, model)

    log.warning("Unknown llm.provider=%r; using offline stubs.", provider)
    return None
