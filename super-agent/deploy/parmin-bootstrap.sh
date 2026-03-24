#!/usr/bin/env bash
# Deploy super-agent on the server (OpenAI by default). For Ollama sidecar: export SUPER_AGENT_LLM_PROVIDER=ollama then use compose profile.
set -euo pipefail

TARGET="${1:-/opt/super-agent}"
MODEL="${SUPER_AGENT_MODEL:-qwen2:7b-instruct}"
export SUPER_AGENT_MODEL="$MODEL"

if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
fi

systemctl enable --now docker 2>/dev/null || service docker start 2>/dev/null || true

cd "$TARGET"

docker compose down 2>/dev/null || true

if [ "${SUPER_AGENT_LLM_PROVIDER:-openai}" = "ollama" ]; then
  export SUPER_AGENT_LLM_PROVIDER=ollama
  export SUPER_AGENT_CONFIG="${SUPER_AGENT_CONFIG:-/app/config/docker.yaml}"
  docker compose --profile ollama pull ollama 2>/dev/null || true
  docker compose --profile ollama build --pull super-agent
  docker compose --profile ollama up -d
  echo "Pulling LLM into Ollama (first run is large): $MODEL"
  docker exec super-agent-ollama ollama pull "$MODEL" || true
else
  docker compose pull 2>/dev/null || true
  docker compose build --pull super-agent
  docker compose up -d
  echo "OpenAI mode: ensure OPENAI_API_KEY is set (e.g. in .env next to compose)."
fi

echo "Health:"
curl -fsS "http://127.0.0.1:8080/health" && echo
echo "Ready:"
curl -fsS "http://127.0.0.1:8080/ready" && echo || true

echo "Done. Restrict :8080 in firewall; set SUPER_AGENT_DEPLOY_TOKEN; use TLS in production."
