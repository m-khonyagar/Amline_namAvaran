#!/bin/bash
# Amline — Production Deploy Script
# اجرا روی سرور: bash deploy.sh
set -e

DEPLOY_DIR="/opt/amline/app"
cd "$DEPLOY_DIR"

echo "==> Checking .env..."
if [ ! -f .env ]; then
  echo "ERROR: .env not found. Copy .env.production.example to .env and fill in values."
  exit 1
fi

# بررسی JWT_SECRET پیش‌فرض
if grep -q "REPLACE_WITH_OPENSSL" .env; then
  echo "ERROR: JWT_SECRET or SECRET_KEY still has placeholder value. Update .env first."
  exit 1
fi

echo "==> Building services..."
docker compose build --no-cache backend admin-ui amline-ui consultant-ui

echo "==> Running database migrations..."
docker compose run --rm db-init

echo "==> Starting all services..."
docker compose up -d --remove-orphans

echo "==> Waiting for backend..."
for i in $(seq 1 30); do
  if curl -sf http://localhost:8080/health > /dev/null 2>&1; then
    echo "Backend healthy."
    break
  fi
  echo "  waiting... ($i/30)"
  sleep 3
done

echo "==> Cleaning up old images..."
docker image prune -f

echo ""
echo "✓ Deploy complete. Services:"
docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
