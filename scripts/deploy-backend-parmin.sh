#!/usr/bin/env bash
# Deploy backend stack (postgres, redis, minio, backend) to Parmin VPS via SSH + password.
# Prerequisites (local): sshpass, ssh, tar OR rsync. Use Git Bash or WSL on Windows.
#
# Usage:
#   export DEPLOY_PASSWORD='...'   # root password from Parmin panel (never commit)
#   ./scripts/deploy-backend-parmin.sh
#
# Optional:
#   export PARMIN_HOST=212.80.24.109
#   export PARMIN_USER=root
#   export PARMIN_REMOTE_DIR=/opt/amline/Amline_namAvaran

set -euo pipefail

PASS="${DEPLOY_PASSWORD:-}"
if [[ -z "$PASS" ]]; then
  echo "Error: set DEPLOY_PASSWORD to the server root password (Parmin → Access tab)."
  echo "  export DEPLOY_PASSWORD='...'"
  exit 1
fi

if ! command -v sshpass &>/dev/null; then
  echo "Error: sshpass not found. Install: apt install sshpass  |  brew install sshpass  |  Git Bash: use WSL"
  exit 1
fi

export SSHPASS="$PASS"

HOST="${PARMIN_HOST:-212.80.24.109}"
USER="${PARMIN_USER:-root}"
REMOTE_DIR="${PARMIN_REMOTE_DIR:-/opt/amline/Amline_namAvaran}"
SERVER="${USER}@${HOST}"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

SSH=(sshpass -e ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null)

echo "=== Ensuring Docker on server ==="
"${SSH[@]}" "$SERVER" 'bash -s' <<'REMOTE_BOOT'
set -euo pipefail
if ! command -v docker &>/dev/null; then
  apt-get update -qq
  DEBIAN_FRONTEND=noninteractive apt-get install -y -qq docker.io docker-compose-plugin ca-certificates curl
  systemctl enable docker
  systemctl start docker
fi
if ! docker compose version &>/dev/null; then
  apt-get update -qq
  DEBIAN_FRONTEND=noninteractive apt-get install -y -qq docker-compose-plugin
fi
mkdir -p /opt/amline
REMOTE_BOOT

echo "=== Syncing repository to ${SERVER}:${REMOTE_DIR} ==="
"${SSH[@]}" "$SERVER" "mkdir -p '${REMOTE_DIR}'"

sync_rsync() {
  rsync -az \
    --delete \
    --exclude '.git/' \
    --exclude 'node_modules/' \
    --exclude '**/node_modules/' \
    --exclude 'dist/' \
    --exclude '.venv/' \
    --exclude '__pycache__/' \
    --exclude '*.pyc' \
    --exclude '.cursor/' \
    --exclude 'site/out/' \
    -e 'sshpass -e ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null' \
    ./ "${SERVER}:${REMOTE_DIR}/"
}

sync_tar() {
  tar czf - \
    --exclude='.git' \
    --exclude='node_modules' \
    --exclude='dist' \
    --exclude='.venv' \
    --exclude='__pycache__' \
    --exclude='.cursor' \
    --exclude='site/out' \
    -C "$ROOT" . \
    | "${SSH[@]}" "$SERVER" "rm -rf '${REMOTE_DIR}.new' && mkdir -p '${REMOTE_DIR}.new' && tar xzf - -C '${REMOTE_DIR}.new' && rm -rf '${REMOTE_DIR}.old' && if [[ -d '${REMOTE_DIR}' ]]; then mv '${REMOTE_DIR}' '${REMOTE_DIR}.old'; fi && mv '${REMOTE_DIR}.new' '${REMOTE_DIR}' && rm -rf '${REMOTE_DIR}.old'"
}

if command -v rsync &>/dev/null; then
  sync_rsync
else
  echo "(rsync not found; using tar over ssh)"
  sync_tar
fi

echo "=== docker compose up (postgres redis minio backend) ==="
"${SSH[@]}" "$SERVER" env REMOTE_DIR="$REMOTE_DIR" bash -s <<'REMOTE_COMPOSE'
set -euo pipefail
cd "$REMOTE_DIR"
if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "WARN: Created .env from .env.example — set JWT_SECRET and DB passwords before production traffic."
fi
export COMPOSE_DOCKER_CLI_BUILD=1
export DOCKER_BUILDKIT=1
if docker compose version &>/dev/null; then
  DC=(docker compose)
else
  DC=(docker-compose)
fi
"${DC[@]}" -f docker-compose.yml up -d --build postgres redis minio backend
"${DC[@]}" -f docker-compose.yml ps
echo "=== Health (host 8080) ==="
curl -sfS "http://127.0.0.1:8080/health" && echo " OK" || echo "FAIL /health"
echo "=== POST /admin/login (expect not 405) ==="
code=$(curl -sS -o /tmp/login.json -w '%{http_code}' -X POST "http://127.0.0.1:8080/admin/login" \
  -H 'Content-Type: application/json' \
  -d '{"mobile":"09120000000","otp":"000000"}' || true)
echo "HTTP $code"
head -c 200 /tmp/login.json 2>/dev/null || true
echo
REMOTE_COMPOSE

echo "=== Done. If api.amline.ir still hits old API, update nginx proxy_pass to 127.0.0.1:8080 (see docs/DEPLOY_BACKEND_PARMIN.md). ==="
