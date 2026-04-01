#!/usr/bin/env bash
# اجرا روی سرور Parmin پس از آپلود بایگانی به /tmp/amline-src.tgz
set -euo pipefail
REMOTE_DIR="${REMOTE_DIR:-/opt/amline/Amline_namAvaran}"

echo "=== Docker ==="
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

echo "=== Extract ==="
if [[ ! -f /tmp/amline-src.tgz ]]; then
  echo "Missing /tmp/amline-src.tgz"
  exit 1
fi
rm -rf "${REMOTE_DIR}.new" "${REMOTE_DIR}.old"
mkdir -p "${REMOTE_DIR}.new"
tar xzf /tmp/amline-src.tgz -C "${REMOTE_DIR}.new"
if [[ -d "${REMOTE_DIR}" ]]; then
  mv "${REMOTE_DIR}" "${REMOTE_DIR}.old"
fi
mv "${REMOTE_DIR}.new" "${REMOTE_DIR}"
rm -rf "${REMOTE_DIR}.old"
rm -f /tmp/amline-src.tgz

echo "=== Compose ==="
cd "${REMOTE_DIR}"
if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "WARN: Created .env from .env.example — harden secrets for production."
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
echo "=== Health ==="
curl -sfS "http://127.0.0.1:8080/health" && echo " OK" || echo "FAIL /health"
code=$(curl -sS -o /tmp/login.json -w '%{http_code}' -X POST "http://127.0.0.1:8080/admin/login" \
  -H 'Content-Type: application/json' \
  -d '{"mobile":"09120000000","otp":"000000"}' || true)
echo "POST /admin/login HTTP ${code}"
head -c 200 /tmp/login.json 2>/dev/null || true
echo
