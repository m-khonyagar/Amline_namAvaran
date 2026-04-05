#!/usr/bin/env python3
"""
Full staging deploy: local build → SFTP → /opt/apps/... → systemd (appsvc-*).

چیدمان چند‌اپ: infra/multi-app-server/

Env (required): DEPLOY_HOST, DEPLOY_PASSWORD
Optional: DEPLOY_USER, SKIP_BUILD=1, STAGING_API_URL
"""
from __future__ import annotations

import os
import subprocess
import sys
import tarfile
import tempfile
import time
from pathlib import Path

import paramiko

_SCRIPT_DIR = Path(__file__).resolve().parent
if str(_SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPT_DIR))
import server_layout_constants as C

REPO = _SCRIPT_DIR.parent
ADMIN_DIST = REPO / "admin-ui" / "dist"
SITE_OUT = REPO / "site" / "out"

SITE_REMOTE = C.PATH_AMLINE_STAGING_MARKETING
ADMIN_REMOTE = C.PATH_AMLINE_STAGING_ADMIN_UI

SPA_STATIC_SERVER = r'''#!/usr/bin/env python3
import os
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler

ROOT = os.environ["ROOT"]
PORT = int(os.environ["PORT"])


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def do_GET(self):
        full = self.translate_path(self.path)
        if self.path != "/" and not os.path.exists(full):
            self.path = "/index.html"
        return super().do_GET()

    def log_message(self, *args):
        pass


if __name__ == "__main__":
    ThreadingHTTPServer(("0.0.0.0", PORT), Handler).serve_forever()
'''


def remote_bootstrap_sh() -> str:
    """Shell روی سرور: مهاجرت، README، registry، systemd جدید، خاموش کردن واحدهای قدیمی."""
    m = C.PATH_AMLINE_STAGING_MARKETING
    a = C.PATH_AMLINE_STAGING_ADMIN_UI
    spa = C.PATH_SPA_STATIC_SERVER
    um = C.UNIT_AMLINE_STAGING_MARKETING
    ua = C.UNIT_AMLINE_STAGING_ADMIN_UI
    tgt = C.SYSTEMD_TARGET_STATIC
    leg_m = C.LEGACY_STAGING_SITE
    leg_a = C.LEGACY_STAGING_ADMIN

    legacy_disable = "\n".join(
        f"systemctl disable --now {u} 2>/dev/null || true" for u in C.LEGACY_UNITS
    )

    return f"""set -euo pipefail
mkdir -p "{C.PATH_SHARED_DIR}" "{C.PATH_REGISTRY_DIR}" "{m}" "{a}"
install -m 0755 /tmp/spa_static_server.py "{spa}"
rm -f /tmp/spa_static_server.py

# مهاجرت یک‌باره از چیدمان قدیمی /opt/amline/staging (اگر هدف خالی باشد)
migrate_if_empty() {{
  local src="$1" dest="$2"
  if [ -d "$src" ] && [ -n "$(ls -A "$src" 2>/dev/null)" ]; then
    if [ ! -f "$dest/index.html" ] && [ -z "$(ls -A "$dest" 2>/dev/null)" ]; then
      cp -a "$src"/. "$dest"/ || true
    fi
  fi
}}
migrate_if_empty "{leg_m}" "{m}"
migrate_if_empty "{leg_a}" "{a}"

{legacy_disable}
rm -f /etc/systemd/system/amline-staging-site.service /etc/systemd/system/amline-staging-admin.service

cat > /etc/systemd/system/{tgt} << 'TARGET'
[Unit]
Description=Target: static/SPA apps under /opt/apps (multi-app host)
TARGET
systemctl enable {tgt} 2>/dev/null || true

cat > "{C.PATH_APPS_README}" << 'README'
Multi-application root on this server: /opt/apps/
  _shared/     Shared tools (e.g. spa_static_server.py)
  _registry/   Port and ownership notes (ports.txt)
  <app>/<env>/<role>/  Static or SPA build output

Human docs: Amline_namAvaran repo -> infra/multi-app-server/
README

if ss -ltn | grep -q ':80 '; then SITE_PORT=3080; else SITE_PORT=80; fi
if ss -ltn | grep -q ':8080 '; then ADMIN_PORT=3081; else ADMIN_PORT=8080; fi

cat > "{C.PATH_REGISTRY_PORTS_TXT}" << PORTSREG
# Sync with Git repo: infra/multi-app-server/PORT-REGISTRY.md
# fields: app<TAB>env<TAB>role<TAB>port<TAB>unit
amline	staging	marketing-site	$SITE_PORT	{um}
amline	staging	admin-ui	$ADMIN_PORT	{ua}
# reserved legacy: port 3003 next-server — coordinate before reuse
PORTSREG

cat > /etc/systemd/system/{um} << UNIT
[Unit]
Description=appsvc: amline staging marketing-site (static SPA)
PartOf={tgt}
After=network.target

[Service]
Type=simple
Environment=ROOT={m}
Environment=PORT=$SITE_PORT
ExecStart=/usr/bin/python3 {spa}
Restart=always
RestartSec=3

[Install]
WantedBy={tgt}
UNIT

cat > /etc/systemd/system/{ua} << UNIT
[Unit]
Description=appsvc: amline staging admin-ui (static SPA)
PartOf={tgt}
After=network.target

[Service]
Type=simple
Environment=ROOT={a}
Environment=PORT=$ADMIN_PORT
ExecStart=/usr/bin/python3 {spa}
Restart=always
RestartSec=3

[Install]
WantedBy={tgt}
UNIT

systemctl daemon-reload
systemctl enable {um} {ua}
systemctl restart {um} {ua}

if command -v ufw >/dev/null 2>&1 && ufw status 2>/dev/null | grep -q 'active'; then
  ufw allow "$SITE_PORT/tcp" comment 'appsvc amline marketing' || true
  ufw allow "$ADMIN_PORT/tcp" comment 'appsvc amline admin-ui' || true
fi

sleep 1
systemctl is-active {um}
systemctl is-active {ua}
echo "SITE_PORT=$SITE_PORT"
echo "ADMIN_PORT=$ADMIN_PORT"
echo PYTHON_OK
"""


def run_build() -> None:
    api = os.environ.get(
        "STAGING_API_URL", "https://amline-backend-staging.darkube.app"
    )
    env = os.environ.copy()
    env.update(
        {
            "VITE_API_URL": api,
            "VITE_USE_MSW": "false",
            "VITE_ENABLE_DEV_BYPASS": "false",
            "VITE_USE_CRM_API": "true",
            "NEXT_PUBLIC_AMLINE_APP_URL": env.get(
                "NEXT_PUBLIC_AMLINE_APP_URL", "https://app.amline.ir"
            ),
            "NEXT_PUBLIC_SITE_URL": env.get(
                "NEXT_PUBLIC_SITE_URL", "https://amline.ir"
            ),
            "NEXT_PUBLIC_CONTACT_EMAIL": env.get(
                "NEXT_PUBLIC_CONTACT_EMAIL", "info@amline.ir"
            ),
        }
    )
    print("Running npm run build …", flush=True)
    r = subprocess.run(
        "npm run build",
        cwd=str(REPO),
        env=env,
        shell=True,
    )
    if r.returncode != 0:
        sys.exit(r.returncode)


def main() -> None:
    host = os.environ.get("DEPLOY_HOST", "").strip()
    password = os.environ.get("DEPLOY_PASSWORD", "")
    user = os.environ.get("DEPLOY_USER", "root").strip()

    if not host or not password:
        print("Set DEPLOY_HOST and DEPLOY_PASSWORD", file=sys.stderr)
        sys.exit(2)

    if os.environ.get("SKIP_BUILD", "").strip() not in ("1", "true", "yes"):
        run_build()

    if not ADMIN_DIST.is_dir():
        print(f"Missing {ADMIN_DIST}", file=sys.stderr)
        sys.exit(1)

    has_site = SITE_OUT.is_dir()
    bootstrap = remote_bootstrap_sh()

    with tempfile.TemporaryDirectory() as tmp:
        tmp_path = Path(tmp)
        admin_tar = tmp_path / "admin-ui-staging.tar.gz"
        with tarfile.open(admin_tar, "w:gz") as tf:
            tf.add(ADMIN_DIST, arcname=".", recursive=True)
        site_tar = tmp_path / "site-staging.tar.gz"
        if has_site:
            with tarfile.open(site_tar, "w:gz") as tf:
                tf.add(SITE_OUT, arcname=".", recursive=True)

        client = paramiko.SSHClient()
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        client.connect(
            hostname=host,
            username=user,
            password=password,
            timeout=120,
            allow_agent=False,
            look_for_keys=False,
        )
        try:
            sftp = client.open_sftp()
            with sftp.open("/tmp/spa_static_server.py", "w") as f:
                f.write(SPA_STATIC_SERVER.encode("utf-8"))
            sftp.put(str(admin_tar), "/tmp/admin-ui-staging.tar.gz")
            if has_site:
                sftp.put(str(site_tar), "/tmp/site-staging.tar.gz")
            sftp.close()

            extract = (
                f"set -euo pipefail; mkdir -p {ADMIN_REMOTE} {SITE_REMOTE}; "
                f"tar -xzf /tmp/admin-ui-staging.tar.gz -C {ADMIN_REMOTE}; "
                "rm -f /tmp/admin-ui-staging.tar.gz; "
            )
            if has_site:
                extract += (
                    f"tar -xzf /tmp/site-staging.tar.gz -C {SITE_REMOTE}; "
                    "rm -f /tmp/site-staging.tar.gz; "
                )
            _, stdout, stderr = client.exec_command(extract)
            if stdout.channel.recv_exit_status() != 0:
                print(stderr.read().decode(), file=sys.stderr)
                sys.exit(1)

            _, stdout, stderr = client.exec_command(bootstrap)
            out = stdout.read().decode()
            err = stderr.read().decode()
            code = stdout.channel.recv_exit_status()
            if code != 0:
                print(err + out, file=sys.stderr)
                sys.exit(code)
            if "PYTHON_OK" not in out:
                print(err + out, file=sys.stderr)
                sys.exit(1)

            site_port = "80"
            admin_port = "8080"
            for line in out.splitlines():
                if line.startswith("SITE_PORT="):
                    site_port = line.split("=", 1)[1].strip()
                if line.startswith("ADMIN_PORT="):
                    admin_port = line.split("=", 1)[1].strip()

            time.sleep(4)
            smoke = (
                f"ss -ltnp | grep -E ':{site_port} |:{admin_port} ' || true; "
                f"python3 -c \"import urllib.request; "
                f"a=urllib.request.urlopen('http://127.0.0.1:{site_port}/',timeout=20).status; "
                f"b=urllib.request.urlopen('http://127.0.0.1:{admin_port}/',timeout=20).status; "
                f"print('smoke_http',a,b)\""
            )
            _, stdout_sm, stderr_sm = client.exec_command(smoke)
            print(stdout_sm.read().decode(), flush=True)
            err_sm = stderr_sm.read().decode()
            if err_sm:
                print(err_sm, file=sys.stderr, flush=True)
            if stdout_sm.channel.recv_exit_status() != 0:
                print(
                    "Smoke test failed. journalctl -u "
                    f"{C.UNIT_AMLINE_STAGING_MARKETING} -u {C.UNIT_AMLINE_STAGING_ADMIN_UI}",
                    file=sys.stderr,
                )
                sys.exit(1)

            api = os.environ.get(
                "STAGING_API_URL", "https://amline-backend-staging.darkube.app"
            )
            print(
                f"\nDone.\n"
                f"  Paths: {SITE_REMOTE} , {ADMIN_REMOTE}\n"
                f"  Marketing: http://{host}:{site_port}/\n"
                f"  Admin UI:  http://{host}:{admin_port}/\n"
                f"  API build: {api}\n"
                f"  systemd:   systemctl status {C.UNIT_AMLINE_STAGING_MARKETING} "
                f"{C.UNIT_AMLINE_STAGING_ADMIN_UI}\n"
                f"  Docs:      infra/multi-app-server/\n",
                flush=True,
            )
        finally:
            client.close()


if __name__ == "__main__":
    main()
