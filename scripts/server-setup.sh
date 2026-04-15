#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────
# Amline — Server Preparation Script
# ──────────────────────────────────────────────────────────────
# Run this ONCE on a fresh Ubuntu/Debian server to prepare it
# for Amline deployment.
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/m-khonyagar/Amline_namAvaran/main/scripts/server-setup.sh | bash
#   # OR
#   scp scripts/server-setup.sh root@YOUR_SERVER:/tmp/ && ssh root@YOUR_SERVER 'bash /tmp/server-setup.sh'
#
# What it does:
#   1. Updates system packages
#   2. Installs Docker + Docker Compose v2
#   3. Configures UFW firewall
#   4. Installs Nginx reverse proxy
#   5. Installs Certbot for SSL/TLS
#   6. Creates application directory structure
#   7. Clones the repository
#   8. Generates .env from production template
# ──────────────────────────────────────────────────────────────
set -euo pipefail

# ── Colors ───────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log()  { echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $*"; }
ok()   { echo -e "${GREEN}[✓]${NC} $*"; }
warn() { echo -e "${YELLOW}[!]${NC} $*"; }
err()  { echo -e "${RED}[✗]${NC} $*" >&2; }

# ── Configuration ────────────────────────────────────────────
APP_DIR="${APP_DIR:-/opt/amline/app}"
REPO_URL="${REPO_URL:-https://github.com/m-khonyagar/Amline_namAvaran.git}"
BRANCH="${BRANCH:-main}"

# ── Check root ───────────────────────────────────────────────
if [ "$(id -u)" -ne 0 ]; then
  err "This script must be run as root"
  exit 1
fi

echo ""
log "════════════════════════════════════════════════"
log "  Amline — Server Preparation"
log "════════════════════════════════════════════════"
echo ""

# ── Step 1: System update ────────────────────────────────────
log "Step 1/7: Updating system packages..."
apt-get update -qq
apt-get upgrade -y -qq
apt-get install -y -qq \
  curl \
  wget \
  git \
  unzip \
  htop \
  net-tools \
  ca-certificates \
  gnupg \
  lsb-release \
  software-properties-common
ok "System packages updated"

# ── Step 2: Docker + Docker Compose ──────────────────────────
log "Step 2/7: Installing Docker..."
if command -v docker &>/dev/null; then
  ok "Docker already installed: $(docker --version)"
else
  curl -fsSL https://get.docker.com | sh
  ok "Docker installed: $(docker --version)"
fi

systemctl enable docker
systemctl start docker

# Verify Docker Compose v2
if docker compose version &>/dev/null; then
  ok "Docker Compose v2 available: $(docker compose version --short)"
else
  err "Docker Compose v2 not available. Installing plugin..."
  apt-get install -y docker-compose-plugin
  ok "Docker Compose v2 installed"
fi

# ── Step 3: Firewall (UFW) ──────────────────────────────────
log "Step 3/7: Configuring firewall..."
apt-get install -y -qq ufw

# Reset and configure
ufw --force reset
ufw default deny incoming
ufw default allow outgoing

# SSH (critical — never lock yourself out)
ufw allow 22/tcp comment 'SSH'

# HTTP/HTTPS for nginx
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'

# Enable firewall
ufw --force enable
ok "Firewall configured (SSH + HTTP + HTTPS)"
ufw status verbose

# ── Step 4: Nginx ────────────────────────────────────────────
log "Step 4/7: Installing Nginx..."
apt-get install -y -qq nginx
systemctl enable nginx
systemctl start nginx
ok "Nginx installed and running"

# ── Step 5: Certbot (SSL/TLS) ───────────────────────────────
log "Step 5/7: Installing Certbot..."
apt-get install -y -qq certbot python3-certbot-nginx
ok "Certbot installed — run 'certbot --nginx -d yourdomain.com' after DNS is configured"

# ── Step 6: Create app directory ─────────────────────────────
log "Step 6/7: Setting up application directory..."
mkdir -p "$(dirname "$APP_DIR")"

if [ -d "$APP_DIR/.git" ]; then
  warn "Repository already exists at $APP_DIR — pulling latest..."
  cd "$APP_DIR"
  git fetch origin
  git checkout "$BRANCH"
  git pull --ff-only origin "$BRANCH"
else
  log "Cloning repository..."
  git clone --branch "$BRANCH" "$REPO_URL" "$APP_DIR"
fi
ok "Repository ready at $APP_DIR"

# ── Step 7: Generate .env and nginx config ───────────────────
log "Step 7/7: Generating configuration files..."

cd "$APP_DIR"

# Generate .env if not exists
if [ ! -f .env ]; then
  cp .env.production.example .env

  # Auto-generate secrets
  JWT_SECRET=$(openssl rand -hex 32)
  SECRET_KEY=$(openssl rand -hex 32)
  PG_PASSWORD=$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 24)
  REDIS_PASSWORD=$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 24)
  MINIO_PASSWORD=$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 24)

  sed -i "s|REPLACE_WITH_OPENSSL_RAND_HEX_32|$JWT_SECRET|" .env
  # Handle both occurrences — JWT_SECRET and SECRET_KEY may have same placeholder
  sed -i "0,/REPLACE_WITH_OPENSSL_RAND_HEX_32/s|REPLACE_WITH_OPENSSL_RAND_HEX_32|$SECRET_KEY|" .env
  sed -i "s|POSTGRES_PASSWORD=REPLACE_WITH_STRONG_PASSWORD|POSTGRES_PASSWORD=$PG_PASSWORD|" .env
  sed -i "s|REDIS_PASSWORD=REPLACE_WITH_STRONG_PASSWORD|REDIS_PASSWORD=$REDIS_PASSWORD|" .env
  sed -i "s|MINIO_SECRET_KEY=REPLACE_WITH_STRONG_PASSWORD|MINIO_SECRET_KEY=$MINIO_PASSWORD|" .env

  ok ".env created with auto-generated secrets"
  warn "Review .env and set KAVENEGAR_API_KEY, CORS_ORIGINS, BOOTSTRAP_ADMIN_MOBILE"
else
  ok ".env already exists — skipping"
fi

# Deploy nginx config
if [ -f docker/nginx/amline.conf ]; then
  cp docker/nginx/amline.conf /etc/nginx/sites-available/amline
  ln -sf /etc/nginx/sites-available/amline /etc/nginx/sites-enabled/
  rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true

  if nginx -t 2>&1; then
    systemctl reload nginx
    ok "Nginx reverse proxy configured"
  else
    err "Nginx configuration test failed — check /etc/nginx/sites-available/amline"
  fi
fi

# ── Summary ──────────────────────────────────────────────────
echo ""
log "════════════════════════════════════════════════"
log "  Server Preparation Complete!"
log "════════════════════════════════════════════════"
echo ""
echo "  App directory:  $APP_DIR"
echo "  Docker:         $(docker --version 2>/dev/null || echo 'not found')"
echo "  Docker Compose: $(docker compose version --short 2>/dev/null || echo 'not found')"
echo "  Nginx:          $(nginx -v 2>&1 | head -1)"
echo "  Certbot:        $(certbot --version 2>&1 | head -1)"
echo "  Firewall:       $(ufw status | head -1)"
echo ""
log "Next steps:"
echo "  1. Review and edit .env:"
echo "     nano $APP_DIR/.env"
echo ""
echo "  2. Deploy the application:"
echo "     cd $APP_DIR && bash deploy-production.sh"
echo ""
echo "  3. Configure DNS A records pointing to this server's IP:"
echo "     api.amline.ir     → $(curl -sf ifconfig.me || echo 'YOUR_SERVER_IP')"
echo "     app.amline.ir     → same IP"
echo "     admin.amline.ir   → same IP"
echo "     amline.ir         → same IP"
echo "     consultant.amline.ir → same IP"
echo ""
echo "  4. After DNS propagation, enable HTTPS:"
echo "     certbot --nginx -d api.amline.ir -d app.amline.ir -d admin.amline.ir -d amline.ir -d consultant.amline.ir"
echo ""
