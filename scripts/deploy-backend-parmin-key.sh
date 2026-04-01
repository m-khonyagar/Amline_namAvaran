#!/usr/bin/env bash
# Deploy با SSH key (بدون sshpass) — Linux/macOS/Git Bash
set -euo pipefail
HOST="${PARMIN_HOST:-212.80.24.109}"
USER="${PARMIN_USER:-root}"
TARGET="${USER}@${HOST}"
KEY="${PARMIN_SSH_KEY:-${HOME}/.ssh/amline-deploy}"
if [[ ! -f "$KEY" ]]; then
  KEY="${HOME}/.ssh/id_ed25519"
fi
if [[ ! -f "$KEY" ]]; then
  KEY="${HOME}/.ssh/id_rsa"
fi
if [[ ! -f "$KEY" ]]; then
  echo "Set PARMIN_SSH_KEY to your private key path." >&2
  exit 1
fi

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP="$(mktemp -t amline-src-XXXXXX.tgz)"
REMOTE_SH="${ROOT}/scripts/parmin-server-deploy.sh"
SSH_OPTS=(-o StrictHostKeyChecking=accept-new -o IdentitiesOnly=yes -i "$KEY")

echo "=== tar ==="
tar czf "$TMP" \
  --exclude=.git --exclude=node_modules --exclude=dist \
  --exclude=.venv --exclude=__pycache__ --exclude=.cursor --exclude=site/out \
  -C "$ROOT" .

echo "=== scp ==="
scp "${SSH_OPTS[@]}" "$TMP" "${TARGET}:/tmp/amline-src.tgz"
scp "${SSH_OPTS[@]}" "$REMOTE_SH" "${TARGET}:/tmp/parmin-server-deploy.sh"

echo "=== ssh ==="
ssh "${SSH_OPTS[@]}" "$TARGET" 'chmod +x /tmp/parmin-server-deploy.sh && bash /tmp/parmin-server-deploy.sh && rm -f /tmp/parmin-server-deploy.sh'

rm -f "$TMP"
echo "=== Done ==="
