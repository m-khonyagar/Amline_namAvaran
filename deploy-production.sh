#!/usr/bin/env bash
# ──────────────────────────────────────────────────
# Amline — Unified Production Deployment Script
# ──────────────────────────────────────────────────
# Usage:
#   ./deploy-production.sh              # Deploy all core services
#   ./deploy-production.sh --with-integrations  # + Monitoring, n8n, etc.
#   ./deploy-production.sh --build      # Force rebuild all images
#
# Prerequisites:
#   1. Docker & Docker Compose v2 installed
#   2. .env file configured (copy from .env.production.example)
#   3. Ports 80/443 available for reverse proxy
# ──────────────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# ── Colors ───────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log()  { echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $*"; }
ok()   { echo -e "${GREEN}[✓]${NC} $*"; }
warn() { echo -e "${YELLOW}[!]${NC} $*"; }
err()  { echo -e "${RED}[✗]${NC} $*" >&2; }

# ── Parse arguments ──────────────────────────────
WITH_INTEGRATIONS=false
FORCE_BUILD=false
for arg in "$@"; do
  case "$arg" in
    --with-integrations) WITH_INTEGRATIONS=true ;;
    --build) FORCE_BUILD=true ;;
    --help|-h)
      echo "Usage: $0 [--with-integrations] [--build]"
      echo "  --with-integrations  Include monitoring, n8n, Metabase, etc."
      echo "  --build              Force rebuild of all Docker images"
      exit 0
      ;;
    *) err "Unknown argument: $arg"; exit 1 ;;
  esac
done

# ── Pre-flight checks ───────────────────────────
log "Running pre-flight checks..."

# Check Docker
if ! command -v docker &>/dev/null; then
  err "Docker is not installed. Please install Docker first."
  exit 1
fi

# Check Docker Compose (v2)
if ! docker compose version &>/dev/null; then
  err "Docker Compose v2 is not available. Please install Docker Compose v2."
  exit 1
fi

# Check .env file
if [ ! -f .env ]; then
  err ".env file not found!"
  echo ""
  echo "Please create .env from the production example:"
  echo "  cp .env.production.example .env"
  echo "  # Then edit .env and fill in real values"
  exit 1
fi

# Validate critical env vars
source .env 2>/dev/null || true
if [ "${JWT_SECRET:-}" = "REPLACE_WITH_OPENSSL_RAND_HEX_32" ] || [ -z "${JWT_SECRET:-}" ]; then
  err "JWT_SECRET is not set! Generate with: openssl rand -hex 32"
  exit 1
fi
if [ "${SECRET_KEY:-}" = "REPLACE_WITH_OPENSSL_RAND_HEX_32" ] || [ -z "${SECRET_KEY:-}" ]; then
  err "SECRET_KEY is not set! Generate with: openssl rand -hex 32"
  exit 1
fi
if [ "${POSTGRES_PASSWORD:-}" = "REPLACE_WITH_STRONG_PASSWORD" ] || [ -z "${POSTGRES_PASSWORD:-}" ]; then
  err "POSTGRES_PASSWORD is not set!"
  exit 1
fi

ok "Pre-flight checks passed"

# ── Build compose command ────────────────────────
COMPOSE_CMD="docker compose -f docker-compose.yml -f docker-compose.prod.yml"
BUILD_ARG=""

if [ "$FORCE_BUILD" = true ]; then
  BUILD_ARG="--build"
fi

PROFILES=""
if [ "$WITH_INTEGRATIONS" = true ]; then
  PROFILES="--profile integrations"
fi

# ── Step 1: Pull base images ────────────────────
log "Pulling base images..."
$COMPOSE_CMD $PROFILES pull --ignore-buildable 2>/dev/null || true
ok "Base images updated"

# ── Step 2: Build application images ────────────
log "Building application images..."
$COMPOSE_CMD $PROFILES build $BUILD_ARG
ok "Images built successfully"

# ── Step 3: Run database migrations ─────────────
log "Starting infrastructure (postgres, redis, minio)..."
$COMPOSE_CMD up -d postgres redis minio
sleep 5

log "Running database migrations..."
$COMPOSE_CMD run --rm db-init
ok "Database migrations complete"

log "Initializing MinIO buckets..."
$COMPOSE_CMD run --rm minio-init
ok "MinIO buckets initialized"

# ── Step 4: Start all services ──────────────────
log "Starting all services..."
$COMPOSE_CMD $PROFILES up -d
ok "All services started"

# ── Step 5: Deploy nginx config ─────────────────
if [ -f docker/nginx/amline.conf ] && command -v nginx &>/dev/null; then
  log "Deploying Nginx reverse proxy configuration..."
  cp docker/nginx/amline.conf /etc/nginx/sites-available/amline
  ln -sf /etc/nginx/sites-available/amline /etc/nginx/sites-enabled/
  rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true
  if nginx -t 2>&1; then
    systemctl reload nginx
    ok "Nginx reverse proxy configured"
  else
    warn "Nginx config test failed — check docker/nginx/amline.conf"
  fi
elif [ -f docker/nginx/amline.conf ]; then
  warn "Nginx not installed — skipping reverse proxy setup"
  echo "  Install with: apt-get install -y nginx && bash $0"
fi

# ── Step 6: Health check ────────────────────────
log "Waiting for services to become healthy (60s timeout)..."
TIMEOUT=60
ELAPSED=0
while [ $ELAPSED -lt $TIMEOUT ]; do
  NOT_READY=$(docker compose -f docker-compose.yml -f docker-compose.prod.yml ps --format json 2>/dev/null | grep -cE '"starting"|"unhealthy"' || true)
  if [ "$NOT_READY" = "0" ]; then
    break
  fi
  sleep 5
  ELAPSED=$((ELAPSED + 5))
  echo -n "."
done
echo ""

# ── Final status ────────────────────────────────
echo ""
log "════════════════════════════════════════════════"
log "  Amline Platform — Deployment Status"
log "════════════════════════════════════════════════"
echo ""
$COMPOSE_CMD ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
echo ""

# Check for any unhealthy services
FAILED=$($COMPOSE_CMD ps --format json 2>/dev/null | grep -c '"unhealthy"' || true)
if [ "$FAILED" != "0" ]; then
  warn "Some services are unhealthy. Check logs with:"
  echo "  docker compose -f docker-compose.yml -f docker-compose.prod.yml logs <service-name>"
else
  ok "All services are running!"
fi

echo ""
log "Service URLs:"
echo "  ├── Admin Panel:     http://localhost:3002"
echo "  ├── User App:        http://localhost:3000"
echo "  ├── Marketing Site:  http://localhost:3001"
echo "  ├── Consultant:      http://localhost:3004"
echo "  ├── SEO Dashboard:   http://localhost:3003"
echo "  ├── Backend API:     http://localhost:8080"
echo "  └── PDF Generator:   http://localhost:8001"
if [ "$WITH_INTEGRATIONS" = true ]; then
  echo ""
  echo "  Integration Services:"
  echo "  ├── Grafana:         http://localhost:3010"
  echo "  ├── Prometheus:      http://localhost:9090"
  echo "  ├── n8n:             http://localhost:5678"
  echo "  ├── Metabase:        http://localhost:3005"
  echo "  └── MeiliSearch:     http://localhost:7700"
fi
echo ""
ok "Deployment complete! 🚀"
