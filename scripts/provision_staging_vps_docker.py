#!/usr/bin/env python3
"""
Provision staging VPS: apt (IPv4 + Arvan mirror), Docker, repo at /opt/amline/app,
.env, core compose (postgres, redis, minio, backend, pdf).

If GitHub is blocked from the server (common on some networks), the monorepo is
uploaded with `git archive` from this machine (no secrets in the tarball).

Python wheels are downloaded on the VPS with `pip download` (host network),
then Docker builds use `pip install --no-index` (no PyPI inside the build container).

Env (required): DEPLOY_HOST, and either DEPLOY_PASSWORD or DEPLOY_SSH_KEY (path to private key)
Optional: DEPLOY_USER (default root), DEPLOY_SSH_KEY_PASSPHRASE, AMLINE_REPO_ROOT (default: monorepo root)
"""
from __future__ import annotations

import os
import subprocess
import sys
import tempfile
from pathlib import Path

import paramiko

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT_DEFAULT = SCRIPT_DIR.parent

REMOTE_BOOTSTRAP = r'''set -euo pipefail
export DEBIAN_FRONTEND=noninteractive
STACK="/opt/amline/app"
MIRROR="http://mirror.arvancloud.ir/ubuntu"
HOSTS_TAG="# amline-staging-fixed-hosts (managed by provision_staging_vps_docker.py)"

echo "=== /etc/hosts fallbacks (when DNS is broken) ==="
if ! grep -qF "$HOSTS_TAG" /etc/hosts 2>/dev/null; then
  cat >> /etc/hosts <<HOSTS_EOF

$HOSTS_TAG
185.143.234.235 mirror.arvancloud.ir
185.143.233.235 docker.arvancloud.ir
140.82.121.4 github.com
140.82.121.3 api.github.com
140.82.121.10 codeload.github.com
104.18.43.178 auth.docker.io
44.217.169.79 registry-1.docker.io
101.6.15.130 pypi.tuna.tsinghua.edu.cn
151.101.192.223 files.pythonhosted.org
HOSTS_EOF
fi
if ! grep -qF 'docker.arvancloud.ir' /etc/hosts 2>/dev/null; then
  echo '185.143.233.235 docker.arvancloud.ir' >> /etc/hosts
fi

echo "=== apt: force IPv4 ==="
mkdir -p /etc/apt/apt.conf.d
printf '%s\n' 'Acquire::ForceIPv4 "true";' > /etc/apt/apt.conf.d/99force-ipv4

echo "=== apt: point to Arvan mirror (noble) ==="
shopt -s nullglob
for f in /etc/apt/sources.list.d/*.sources; do
  sed -i \
    -e 's|http://archive.ubuntu.com/ubuntu|'"$MIRROR"'|g' \
    -e 's|http://security.ubuntu.com/ubuntu|'"$MIRROR"'|g' \
    "$f" || true
done
for f in /etc/apt/sources.list.d/*.list; do
  sed -i \
    -e 's|http://archive.ubuntu.com/ubuntu|'"$MIRROR"'|g' \
    -e 's|http://security.ubuntu.com/ubuntu|'"$MIRROR"'|g' \
    "$f" || true
done
if [ -f /etc/apt/sources.list ]; then
  sed -i \
    -e 's|http://archive.ubuntu.com/ubuntu|'"$MIRROR"'|g' \
    -e 's|http://security.ubuntu.com/ubuntu|'"$MIRROR"'|g' \
    /etc/apt/sources.list || true
fi

echo "=== apt-get update ==="
apt-get clean || true
apt-get update -qq

echo "=== install docker + deps ==="
apt-get install -y docker.io docker-compose-v2 git curl ca-certificates openssl
systemctl enable --now docker
docker --version
docker compose version

echo "=== prepare stack dir ==="
mkdir -p /opt/amline
rm -rf /opt/amline/app
mkdir -p /opt/amline/app
'''

REMOTE_STACK = r'''set -euo pipefail
export DEBIAN_FRONTEND=noninteractive
STACK="/opt/amline/app"
cd "$STACK"

echo "=== extract uploaded tree (if present) ==="
if [ -f /tmp/amline-repo-src.tar.gz ]; then
  tar -xzf /tmp/amline-repo-src.tar.gz -C "$STACK"
  rm -f /tmp/amline-repo-src.tar.gz
  echo "Extracted local archive."
else
  echo "ERROR: missing /tmp/amline-repo-src.tar.gz"
  exit 1
fi

echo "=== pip download on server (wheels for offline Docker pip) ==="
apt-get install -y python3-pip python3-venv python3-full
cat > /tmp/amline-pip.conf <<'AMLPIPEOF'
[global]
index-url = https://pypi.tuna.tsinghua.edu.cn/simple
trusted-host = pypi.tuna.tsinghua.edu.cn
trusted-host = files.pythonhosted.org
AMLPIPEOF
export PIP_CONFIG_FILE=/tmp/amline-pip.conf
python3 -m venv /tmp/amline-pip-venv
/tmp/amline-pip-venv/bin/python -m pip install -q -U pip setuptools wheel
mkdir -p backend/backend/docker-build-wheelhouse pdf-generator/docker-build-wheelhouse
find backend/backend/docker-build-wheelhouse -mindepth 1 -delete 2>/dev/null || true
find pdf-generator/docker-build-wheelhouse -mindepth 1 -delete 2>/dev/null || true
/tmp/amline-pip-venv/bin/python -m pip download \
  -r backend/backend/requirements.txt \
  -r pdf-generator/requirements.txt \
  -d backend/backend/docker-build-wheelhouse
cp -a backend/backend/docker-build-wheelhouse/. pdf-generator/docker-build-wheelhouse/

echo "=== .env ==="
if [ ! -f .env ]; then
  J="$(openssl rand -hex 32)"
  PP="$(openssl rand -hex 16)"
  RP="$(openssl rand -hex 16)"
  MK="$(openssl rand -hex 16)"
  umask 077
  cat > .env <<ENVEOF
JWT_SECRET=${J}
SECRET_KEY=${J}
POSTGRES_USER=amline
POSTGRES_PASSWORD=${PP}
POSTGRES_DB=amline
REDIS_PASSWORD=${RP}
MINIO_ACCESS_KEY=amline
MINIO_SECRET_KEY=${MK}
AMLINE_OTP_MAGIC_ENABLED=1
KAVENEGAR_API_KEY=
AMLINE_PYTHON_BASE=docker.arvancloud.ir/library/python:3.12-slim-bookworm
AMLINE_OFFLINE_PIP=1
ENVEOF
  chmod 600 .env
  echo "Created .env"
else
  grep -q '^AMLINE_OTP_MAGIC_ENABLED=' .env || printf '\nAMLINE_OTP_MAGIC_ENABLED=1\n' >> .env
  grep -q '^AMLINE_PYTHON_BASE=' .env || printf '\nAMLINE_PYTHON_BASE=docker.arvancloud.ir/library/python:3.12-slim-bookworm\n' >> .env
  grep -q '^AMLINE_OFFLINE_PIP=' .env || printf '\nAMLINE_OFFLINE_PIP=1\n' >> .env
  echo "Kept existing .env"
fi

echo "=== Docker daemon: Arvan mirror for Hub pulls (postgres/redis/minio) ==="
mkdir -p /etc/docker
printf '%s\n' '{' '  "registry-mirrors": ["https://docker.arvancloud.ir"]' '}' > /etc/docker/daemon.json
systemctl restart docker
sleep 5

echo "=== compose: images + build ==="
docker compose pull postgres redis minio
# Long builds: log to file so a dropped SSH client does not cancel docker build
docker compose build backend pdf-generator db-init minio-init 2>&1 | tee /tmp/amline-compose-build.log

echo "=== up infra ==="
docker compose up -d postgres redis minio
for i in $(seq 1 90); do
  if docker compose exec -T postgres pg_isready -U amline >/dev/null 2>&1; then
    echo "postgres ready"
    break
  fi
  sleep 2
done

echo "=== minio-init + db-init ==="
docker compose run --rm minio-init
docker compose run --rm db-init

echo "=== backend + pdf ==="
docker compose up -d backend pdf-generator

for i in $(seq 1 50); do
  if curl -sf http://127.0.0.1:8080/health >/dev/null 2>&1; then
    echo "backend OK :8080"
    curl -sS http://127.0.0.1:8080/health | head -c 240 || true
    echo
    break
  fi
  echo "wait backend ($i/50)..."
  sleep 3
done

docker compose ps
'''


def _load_deploy_private_key(path: str) -> paramiko.PKey:
    expanded = os.path.expanduser(path.strip())
    if not expanded or not os.path.isfile(expanded):
        raise FileNotFoundError(f"SSH private key not found: {path}")
    pp = os.environ.get("DEPLOY_SSH_KEY_PASSPHRASE") or None
    for key_cls in (
        paramiko.Ed25519Key,
        paramiko.RSAKey,
        paramiko.ECDSAKey,
    ):
        try:
            return key_cls.from_private_key_file(expanded, password=pp)
        except paramiko.SSHException:
            continue
    raise paramiko.SSHException(f"Unsupported or invalid private key: {expanded}")


def _run_remote(
    client: paramiko.SSHClient, script: str, timeout: int = 3600
) -> int:
    # Windows CRLF breaks bash backslash-continuation in embedded REMOTE_* scripts
    script = script.replace("\r\n", "\n")
    stdin, stdout, stderr = client.exec_command(script, timeout=timeout)
    for line in iter(stdout.readline, ""):
        if isinstance(line, bytes):
            line = line.decode("utf-8", errors="replace")
        sys.stdout.write(line)
        sys.stdout.flush()
    err_b = stderr.read()
    err = (
        err_b.decode("utf-8", errors="replace")
        if isinstance(err_b, bytes)
        else str(err_b)
    )
    if err.strip():
        print(err, file=sys.stderr)
    return stdout.channel.recv_exit_status()


def _upload_repo_archive(client: paramiko.SSHClient, repo_root: Path) -> None:
    with tempfile.NamedTemporaryFile(suffix=".tar.gz", delete=False) as tmp:
        tmp_path = tmp.name
    try:
        subprocess.run(
            [
                "git",
                "-C",
                str(repo_root),
                "archive",
                "--format=tar.gz",
                "-o",
                tmp_path,
                "HEAD",
            ],
            check=True,
        )
        sftp = client.open_sftp()
        try:
            sftp.put(tmp_path, "/tmp/amline-repo-src.tar.gz")
        finally:
            sftp.close()
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    if hasattr(sys.stderr, "reconfigure"):
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    host = os.environ.get("DEPLOY_HOST", "").strip()
    user = os.environ.get("DEPLOY_USER", "root").strip()
    password = os.environ.get("DEPLOY_PASSWORD", "")
    key_path = os.environ.get("DEPLOY_SSH_KEY", "").strip()
    key_file = os.path.expanduser(key_path) if key_path else ""
    repo_root = Path(
        os.environ.get("AMLINE_REPO_ROOT", str(REPO_ROOT_DEFAULT))
    ).resolve()
    if not host or (not password and not (key_file and os.path.isfile(key_file))):
        print(
            "Set DEPLOY_HOST and (DEPLOY_PASSWORD or DEPLOY_SSH_KEY)",
            file=sys.stderr,
        )
        return 2
    if not (repo_root / "docker-compose.yml").is_file():
        print(f"Invalid AMLINE_REPO_ROOT: {repo_root}", file=sys.stderr)
        return 2

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    connect_kw: dict = {
        "hostname": host,
        "username": user,
        "timeout": 120,
        "allow_agent": False,
        "look_for_keys": False,
    }
    if key_file and os.path.isfile(key_file):
        connect_kw["pkey"] = _load_deploy_private_key(key_path)
    else:
        connect_kw["password"] = password
    client.connect(**connect_kw)
    transport = client.get_transport()
    if transport:
        transport.set_keepalive(30)
    try:
        code = _run_remote(client, REMOTE_BOOTSTRAP, timeout=1800)
        if code != 0:
            return code
        print(f"=== git archive from {repo_root} -> SFTP ===", flush=True)
        _upload_repo_archive(client, repo_root)
        return _run_remote(client, REMOTE_STACK, timeout=3600)
    finally:
        client.close()


if __name__ == "__main__":
    raise SystemExit(main())
