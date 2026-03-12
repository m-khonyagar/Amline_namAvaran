#!/bin/bash
set -e

# Get password from environment variable or prompt
PASS=${DEPLOY_PASSWORD:-''}
if [ -z "$PASS" ]; then
    echo "Error: DEPLOY_PASSWORD environment variable not set"
    echo "Usage: DEPLOY_PASSWORD='your_password' ./deploy-remote.sh"
    exit 1
fi

SERVER='root@212.80.24.109'
sshpass -p "$PASS" ssh -o StrictHostKeyChecking=no $SERVER 'bash -s' << 'REMOTE'
set -e
echo "=== Installing Docker if needed ==="
if ! command -v docker &>/dev/null; then
  apt-get update -qq && apt-get install -y docker.io docker-compose
  systemctl enable docker && systemctl start docker
fi
echo "=== Creating /opt/amline ==="
mkdir -p /opt/amline
echo "Docker ready. /opt/amline created."
REMOTE
