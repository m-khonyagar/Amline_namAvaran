#!/bin/bash
# Amline — Production Deploy Script
# اجرا روی سرور: bash deploy.sh
set -e

DEPLOY_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DEPLOY_DIR"

echo "==> Checking prerequisites..."

# بررسی Docker
if ! command -v docker &> /dev/null; then
  echo "ERROR: Docker not installed. Run: curl -fsSL https://get.docker.com | sh"
  exit 1
fi

# بررسی .env
if [ ! -f .env ]; then
  echo "ERROR: .env not found."
  echo "  Run: cp .env.production.example .env && nano .env"
  exit 1
fi

# بررسی مقادیر placeholder
if grep -q "REPLACE_WITH" .env; then
  echo "ERROR: .env still has placeholder values. Update these fields:"
  grep "REPLACE_WITH" .env | cut -d= -f1 | sed 's/^/  - /'
  exit 1
fi

# بررسی KAVENEGAR_API_KEY
KAVENEGAR_KEY=$(grep "^KAVENEGAR_API_KEY=" .env | cut -d= -f2)
if [ -z "$KAVENEGAR_KEY" ]; then
  echo "WARNING: KAVENEGAR_API_KEY is empty — OTP SMS will not be sent to users."
  echo "  Users won't be able to login in production without SMS."
  read -p "Continue anyway? (y/N): " confirm
  if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
    exit 1
  fi
fi

echo "==> Building services..."
docker compose build --no-cache backend admin-ui amline-ui consultant-ui pdf-generator

echo "==> Running database migrations..."
docker compose run --rm db-init

echo "==> Starting all services..."
docker compose up -d --remove-orphans

echo "==> Waiting for backend health..."
for i in $(seq 1 30); do
  if curl -sf http://localhost:8080/health > /dev/null 2>&1; then
    echo "  Backend is healthy."
    break
  fi
  echo "  Waiting... ($i/30)"
  sleep 3
done

echo "==> Waiting for pdf-generator health..."
for i in $(seq 1 15); do
  if curl -sf http://localhost:8001/health > /dev/null 2>&1; then
    echo "  PDF Generator is healthy."
    break
  fi
  sleep 2
done

echo "==> Cleaning up old images..."
docker image prune -f

echo ""
echo "✓ Deploy complete."
echo ""
docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
echo ""
echo "Services:"
echo "  Admin UI:      http://localhost:3002"
echo "  Amline UI:     http://localhost:3000"
echo "  Consultant UI: http://localhost:3004"
echo "  Backend API:   http://localhost:8080"
echo "  PDF Generator: http://localhost:8001"
