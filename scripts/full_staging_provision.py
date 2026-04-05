#!/usr/bin/env python3
"""
Full staging deploy: local build → SFTP static bundles → systemd + Python static SPA servers.

بدون apt/nginx: برای سرورهایی که به مخازن اوبونتو دسترسی ندارند.

Env (required):
  DEPLOY_HOST, DEPLOY_PASSWORD
Optional:
  DEPLOY_USER (default root)
  SKIP_BUILD=1
  STAGING_API_URL
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

REPO = Path(__file__).resolve().parent.parent
ADMIN_DIST = REPO / "admin-ui" / "dist"
SITE_OUT = REPO / "site" / "out"
ADMIN_REMOTE = "/opt/amline/staging/admin-ui"
SITE_REMOTE = "/opt/amline/staging/site"

# سرور تک‌ریسمه: SPA fallback + چندنخی
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

def remote_bootstrap_sh(site_remote: str, admin_remote: str) -> str:
    # heredoc بدون کوتیشن تا $SITE_PORT داخل فایل unit به عدد تبدیل شود
    return f"""set -euo pipefail
mkdir -p /opt/amline/staging
install -m 0755 /tmp/spa_static_server.py /opt/amline/staging/spa_static_server.py
rm -f /tmp/spa_static_server.py

if ss -ltn | grep -q ':80 '; then SITE_PORT=3080; else SITE_PORT=80; fi
if ss -ltn | grep -q ':8080 '; then ADMIN_PORT=3081; else ADMIN_PORT=8080; fi

cat > /etc/systemd/system/amline-staging-site.service << UNIT
[Unit]
Description=Amline staging marketing site (Python static SPA)
After=network.target

[Service]
Type=simple
Environment=ROOT={site_remote}
Environment=PORT=$SITE_PORT
ExecStart=/usr/bin/python3 /opt/amline/staging/spa_static_server.py
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
UNIT

cat > /etc/systemd/system/amline-staging-admin.service << UNIT
[Unit]
Description=Amline staging admin-ui (Python static SPA)
After=network.target

[Service]
Type=simple
Environment=ROOT={admin_remote}
Environment=PORT=$ADMIN_PORT
ExecStart=/usr/bin/python3 /opt/amline/staging/spa_static_server.py
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
UNIT

systemctl daemon-reload
systemctl enable amline-staging-site.service amline-staging-admin.service
systemctl restart amline-staging-site.service amline-staging-admin.service

if command -v ufw >/dev/null 2>&1 && ufw status 2>/dev/null | grep -q 'active'; then
  ufw allow "$SITE_PORT/tcp" comment 'amline staging site' || true
  ufw allow "$ADMIN_PORT/tcp" comment 'amline staging admin' || true
fi

sleep 1
systemctl is-active amline-staging-site.service
systemctl is-active amline-staging-admin.service
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

    bootstrap = remote_bootstrap_sh(SITE_REMOTE, ADMIN_REMOTE)

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
            out_smoke = stdout_sm.read().decode()
            err_smoke = stderr_sm.read().decode()
            print(out_smoke, flush=True)
            if err_smoke:
                print(err_smoke, file=sys.stderr, flush=True)
            if stdout_sm.channel.recv_exit_status() != 0:
                print(
                    "Smoke test failed. Check: journalctl -u amline-staging-site -u amline-staging-admin",
                    file=sys.stderr,
                )
                sys.exit(1)

            api = os.environ.get(
                "STAGING_API_URL", "https://amline-backend-staging.darkube.app"
            )
            note_ports = (
                "If port 80 was busy, site uses 3080; if 8080 busy, admin uses 3081."
            )
            print(
                f"\nDone.\n"
                f"  Marketing site: http://{host}:{site_port}/\n"
                f"  Admin UI:       http://{host}:{admin_port}/\n"
                f"  {note_ports}\n"
                f"  API (baked in): {api}\n"
                f"  systemd:        systemctl status amline-staging-site amline-staging-admin\n",
                flush=True,
            )
        finally:
            client.close()


if __name__ == "__main__":
    main()
