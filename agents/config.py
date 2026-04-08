"""Configuration for the Self-Improving AI Agent system.

Supports multiple free-tier LLM providers with automatic fallback:
  1. Ollama  — local LLM (Mistral / Llama)
  2. HuggingFace Inference API  — free serverless inference
  3. OpenRouter  — aggregated free models
  4. Claude API  — free tier via Anthropic
"""

from __future__ import annotations

import json
import logging
import os
from pathlib import Path
from typing import Any

import yaml
from pydantic import BaseModel, Field

log = logging.getLogger(__name__)

_ROOT = Path(__file__).parent.parent
_AI_CONFIG_DIR = _ROOT / "ai_config"


class LLMProviderConfig(BaseModel):
    provider: str = "ollama"
    model: str = "mistral"
    base_url: str = "http://localhost:11434"
    api_key: str = ""
    timeout: int = 120
    max_retries: int = 3


class GitHubConfig(BaseModel):
    token: str = ""
    repo: str = ""
    base_branch: str = "main"
    auto_merge: bool = False  # always False — merge requires human approval


class AgentConfig(BaseModel):
    """Top-level configuration assembled from env vars and ai_config files."""

    llm: LLMProviderConfig = Field(default_factory=LLMProviderConfig)
    github: GitHubConfig = Field(default_factory=GitHubConfig)
    log_level: str = "INFO"
    # Ignored by MainOrchestrator: REVIEW and TEST always run sequentially (stable workspace).
    parallel: bool = True
    workspace_dir: str = "/tmp/agent_workspace"

    # Fallback provider chain (tried in order when primary fails)
    fallback_providers: list[str] = Field(
        default_factory=lambda: ["ollama", "huggingface", "openrouter"]
    )

    @classmethod
    def from_env(cls) -> "AgentConfig":
        """Build config from environment variables and ai_config files."""
        cfg = cls()

        # --- LLM provider ---
        provider = os.environ.get("AGENT_LLM_PROVIDER", "ollama").lower()
        model = os.environ.get("AGENT_LLM_MODEL", _default_model(provider))
        base_url = os.environ.get("AGENT_LLM_BASE_URL", _default_base_url(provider))
        api_key = (
            os.environ.get("AGENT_LLM_API_KEY", "")
            or os.environ.get("HF_API_TOKEN", "")
            or os.environ.get("OPENROUTER_API_KEY", "")
            or os.environ.get("ANTHROPIC_API_KEY", "")
        )
        cfg.llm = LLMProviderConfig(
            provider=provider,
            model=model,
            base_url=base_url,
            api_key=api_key,
        )

        # --- GitHub ---
        cfg.github = GitHubConfig(
            token=os.environ.get("GITHUB_TOKEN", ""),
            repo=os.environ.get("GITHUB_REPOSITORY", ""),
            base_branch=os.environ.get("AGENT_BASE_BRANCH", "main"),
            auto_merge=False,
        )

        # --- General ---
        cfg.log_level = os.environ.get("AGENT_LOG_LEVEL", "INFO").upper()
        cfg.parallel = os.environ.get("AGENT_PARALLEL", "true").lower() == "true"
        cfg.workspace_dir = os.environ.get("AGENT_WORKSPACE_DIR", "/tmp/agent_workspace")

        return cfg

    def llm_headers(self) -> dict[str, str]:
        """Return HTTP headers required by the active LLM provider."""
        headers: dict[str, str] = {"Content-Type": "application/json"}
        if self.llm.api_key:
            if self.llm.provider == "openrouter":
                headers["Authorization"] = f"Bearer {self.llm.api_key}"
                headers["HTTP-Referer"] = "https://github.com/m-khonyagar/Amline_namAvaran"
            elif self.llm.provider in ("huggingface", "claude", "anthropic"):
                headers["Authorization"] = f"Bearer {self.llm.api_key}"
        return headers

    def as_dict(self) -> dict[str, Any]:
        return self.model_dump()


# ── helpers ────────────────────────────────────────────────────────────────


def _default_model(provider: str) -> str:
    return {
        "ollama": "mistral",
        "huggingface": "mistralai/Mixtral-8x7B-Instruct-v0.1",
        "openrouter": "mistralai/mistral-7b-instruct:free",
        "claude": "claude-3-haiku-20240307",
        "anthropic": "claude-3-haiku-20240307",
    }.get(provider, "mistral")


def _default_base_url(provider: str) -> str:
    return {
        "ollama": "http://localhost:11434",
        "huggingface": "https://api-inference.huggingface.co/models",
        "openrouter": "https://openrouter.ai/api/v1",
        "claude": "https://api.anthropic.com/v1",
        "anthropic": "https://api.anthropic.com/v1",
    }.get(provider, "http://localhost:11434")


def load_crew_config() -> dict[str, Any]:
    path = _AI_CONFIG_DIR / "crew_config.yaml"
    if path.exists():
        with path.open() as f:
            return yaml.safe_load(f) or {}
    return {}


def load_autogen_config() -> dict[str, Any]:
    path = _AI_CONFIG_DIR / "autogen_config.json"
    if path.exists():
        return json.loads(path.read_text())
    return {}


def load_langgraph_config() -> dict[str, Any]:
    path = _AI_CONFIG_DIR / "langgraph_config.json"
    if path.exists():
        return json.loads(path.read_text())
    return {}
