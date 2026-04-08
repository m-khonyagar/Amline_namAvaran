#!/usr/bin/env python3
"""
Full staging deploy: local build → SFTP → /opt/apps/... → systemd (appsvc-*).

چیدمان چند‌اپ: infra/multi-app-server/

Env (required): DEPLOY_HOST, and either DEPLOY_PASSWORD or DEPLOY_SSH_KEY (path to private key)
Optional: DEPLOY_USER, DEPLOY_SSH_KEY_PASSPHRASE, SKIP_BUILD=1, STAGING_API_URL (پیش‌فرض api.amline.ir)
Optional: STAGING_SAME_ORIGIN_API=0 تا فرانت مستقیم به API بزند (پیش‌فرض 1: Caddy پروکسی /api و /financials)
Optional: STAGING_CADDY_STRIP_API_V1_PREFIX=0 اگر upstream همان مسیرهای /api/v1/... را می‌خواهد (پیش‌فرض 1: strip برای api.amline.ir)
Optional: STAGING_API_CONNECT_IP / STAGING_API_DISABLE_CONNECT_IP — dial مستقیم به IP برای api.amline.ir
Optional (Caddy HTTPS, default on): ENABLE_CADDY=0 to disable; CADDY_MARKETING_HOST,
  CADDY_ADMIN_HOST (defaults: staging.amline.ir, admin.staging.amline.ir)
  CADDY_TLS_INTERNAL=1 for self-signed only (default: public Let's Encrypt when DNS points here)
"""
from __future__ import annotations

import os
import shlex
import subprocess
import sys
import tarfile
import tempfile
import time
import urllib.error
import urllib.request
from pathlib import Path
from urllib.parse import urlparse

import paramiko

_SCRIPT_DIR = Path(__file__).resolve().parent


def _download_caddy_linux_tgz(dest_dir: Path) -> Path | None:
    """Download Caddy release on the deploy machine (e.g. Windows) when the server cannot reach GitHub."""
    cv = C.CADDY_RELEASE
    name = f"caddy_{cv}_linux_amd64.tar.gz"
    dest = dest_dir / name
    urls = [
        f"https://github.com/caddyserver/caddy/releases/download/v{cv}/{name}",
        f"https://ghfast.top/https://github.com/caddyserver/caddy/releases/download/v{cv}/{name}",
    ]
    for url in urls:
        try:
            req = urllib.request.Request(
                url,
                headers={"User-Agent": "AmlineDeploy/1.0"},
            )
            with urllib.request.urlopen(req, timeout=180) as resp:
                data = resp.read()
            if len(data) < 1_000_000:
                continue
            dest.write_bytes(data)
            return dest
        except (urllib.error.URLError, OSError, TimeoutError, ValueError):
            continue
    return None


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
    host = os.environ.get("LISTEN_HOST", "0.0.0.0")
    ThreadingHTTPServer((host, PORT), Handler).serve_forever()
'''


def _bash_single_quote(s: str) -> str:
    """Safe for MH='...' in bash (domains only)."""
    if "\n" in s or "\x00" in s:
        raise ValueError("host must be a single line")
    return s.replace("'", "'\"'\"'")


def _caddy_api_upstream(url: str) -> tuple[str, str, bool, str | None]:
    """(dial_url, Host header, use_tls, tls_server_name برای SNI وقتی dial به IP است)."""
    u = urlparse((url or "").strip())
    if u.scheme not in ("https", "http") or not u.netloc:
        raise ValueError(f"Invalid STAGING_API_URL for proxy: {url!r}")
    host_header = u.netloc
    use_tls = u.scheme == "https"
    connect_ip = os.environ.get("STAGING_API_CONNECT_IP", "").strip()
    if os.environ.get("STAGING_API_DISABLE_CONNECT_IP", "").strip().lower() in (
        "1",
        "true",
        "yes",
    ):
        connect_ip = ""
    if not connect_ip and host_header == "api.amline.ir" and use_tls:
        connect_ip = C.API_AMLINE_IR_TLS_DIAL_IPV4
    if connect_ip and use_tls:
        dial = f"https://{connect_ip}"
        return dial, host_header, True, host_header
    return f"{u.scheme}://{host_header}".rstrip("/"), host_header, use_tls, None


def remote_bootstrap_sh(
    *,
    enable_caddy: bool,
    marketing_host: str,
    admin_host: str,
    caddy_tls_internal: bool,
    api_reverse_proxy_url: str | None = None,
    caddy_strip_api_v1_prefix: bool = True,
) -> str:
    """Shell روی سرور: مهاجرت، README، registry، systemd، و در حالت Caddy پروکسی HTTPS."""
    m = C.PATH_AMLINE_STAGING_MARKETING
    a = C.PATH_AMLINE_STAGING_ADMIN_UI
    spa = C.PATH_SPA_STATIC_SERVER
    um = C.UNIT_AMLINE_STAGING_MARKETING
    ua = C.UNIT_AMLINE_STAGING_ADMIN_UI
    tgt = C.SYSTEMD_TARGET_STATIC
    leg_m = C.LEGACY_STAGING_SITE
    leg_a = C.LEGACY_STAGING_ADMIN
    imp = C.INTERNAL_MARKETING_PORT
    iap = C.INTERNAL_ADMIN_PORT
    lh = C.LISTEN_HOST_LOOPBACK
    caddyfile = C.PATH_CADDYFILE
    uc = C.UNIT_CADDY_APPS
    cv = C.CADDY_RELEASE

    mh_q = _bash_single_quote(marketing_host.strip())
    ah_q = _bash_single_quote(admin_host.strip())
    # یک local_certs سراسری؛ دو «tls internal» جدا باعث خطای automation policy در Caddy 2.8 می‌شود.
    caddy_preamble = (
        "{\n    local_certs\n}\n\n" if caddy_tls_internal else ""
    )

    legacy_disable = "\n".join(
        f"systemctl disable --now {u} 2>/dev/null || true" for u in C.LEGACY_UNITS
    )

    if enable_caddy:
        ports_reg = f"""cat > "{C.PATH_REGISTRY_PORTS_TXT}" << PORTSREG
# Sync with Git repo: infra/multi-app-server/PORT-REGISTRY.md
# Public: TLS on :443 (Caddy). Backends: loopback only.
# fields: app<TAB>env<TAB>role<TAB>port<TAB>unit
amline	staging	marketing-site	443 ({mh_q} -> 127.0.0.1:{imp})	{um}
amline	staging	admin-ui	443 ({ah_q} -> 127.0.0.1:{iap})	{ua}
# reserved legacy: port 3003 next-server — coordinate before reuse
PORTSREG"""
        unit_marketing = f"""cat > /etc/systemd/system/{um} << UNIT
[Unit]
Description=appsvc: amline staging marketing-site (static SPA, loopback)
PartOf={tgt}
After=network.target

[Service]
Type=simple
Environment=ROOT={m}
Environment=PORT={imp}
Environment=LISTEN_HOST={lh}
ExecStart=/usr/bin/python3 {spa}
Restart=always
RestartSec=3

[Install]
WantedBy={tgt}
UNIT"""
        unit_admin = f"""cat > /etc/systemd/system/{ua} << UNIT
[Unit]
Description=appsvc: amline staging admin-ui (static SPA, loopback)
PartOf={tgt}
After=network.target

[Service]
Type=simple
Environment=ROOT={a}
Environment=PORT={iap}
Environment=LISTEN_HOST={lh}
ExecStart=/usr/bin/python3 {spa}
Restart=always
RestartSec=3

[Install]
WantedBy={tgt}
UNIT"""
        gh = f"https://github.com/caddyserver/caddy/releases/download/v{cv}/caddy_{cv}_linux_amd64.tar.gz"
        mirrors = (
            gh,
            f"https://ghfast.top/{gh}",
            f"https://kgithub.com/caddyserver/caddy/releases/download/v{cv}/caddy_{cv}_linux_amd64.tar.gz",
        )
        urls_bash = " ".join(f'"{u}"' for u in mirrors)
        mh = marketing_host.strip()
        ah = admin_host.strip()
        if "\n" in mh or "\n" in ah or "\r" in mh or "\r" in ah:
            raise ValueError("marketing_host / admin_host must be single-line hostnames")
        marketing_block = f"{mh} {{\n    reverse_proxy 127.0.0.1:{imp}\n}}\n\n"
        if api_reverse_proxy_url:
            _ab, _ahn, _atls, _tls_sni = _caddy_api_upstream(api_reverse_proxy_url)
            _sni_block = (
                f"                tls_server_name {_tls_sni}\n" if (_atls and _tls_sni) else ""
            )
            _tls = (
                "            transport http {\n"
                "                tls\n"
                "                tls_insecure_skip_verify\n"
                f"{_sni_block}"
                "            }\n"
                if _atls
                else ""
            )
            _rp = (
                f"        reverse_proxy {_ab} {{\n"
                f"{_tls}"
                f"            header_up Host {_ahn}\n"
                "        }\n"
            )
            # فرانت فقط /api/v1/... می‌زند؛ api.amline.ir فعلی مسیرهای legacy (بدون /api/v1) دارد.
            if caddy_strip_api_v1_prefix:
                admin_block = (
                    f"{ah} {{\n"
                    "    @amline_apiv1 path_regexp ^/api/v1(?:/.*)?\n"
                    "    handle @amline_apiv1 {\n"
                    "        uri strip_prefix /api/v1\n"
                    f"{_rp}"
                    "    }\n"
                    "    @amline_api_other path_regexp ^/api(?:/.*)?\n"
                    "    handle @amline_api_other {\n"
                    f"{_rp}"
                    "    }\n"
                    "    @amline_fin path_regexp ^/financials(?:/.*)?\n"
                    "    handle @amline_fin {\n"
                    f"{_rp}"
                    "    }\n"
                    "    handle {\n"
                    f"        reverse_proxy 127.0.0.1:{iap}\n"
                    "    }\n"
                    "}\n"
                )
            else:
                admin_block = (
                    f"{ah} {{\n"
                    "    @amline_api path_regexp ^/api(?:/.*)?\n"
                    "    handle @amline_api {\n"
                    f"{_rp}"
                    "    }\n"
                    "    @amline_fin path_regexp ^/financials(?:/.*)?\n"
                    "    handle @amline_fin {\n"
                    f"{_rp}"
                    "    }\n"
                    "    handle {\n"
                    f"        reverse_proxy 127.0.0.1:{iap}\n"
                    "    }\n"
                    "}\n"
                )
        else:
            admin_block = f"{ah} {{\n    reverse_proxy 127.0.0.1:{iap}\n}}\n"

        caddy_file_body = f"{caddy_preamble}{marketing_block}{admin_block}"

        caddy_block = (
            f"""
systemctl disable --now caddy.service 2>/dev/null || true
CADDY_VER="{cv}"
if [ ! -x /usr/local/bin/caddy ]; then
  tmpd="$(mktemp -d)"
  if [ -f /tmp/caddy_bootstrap.tgz ] && [ -s /tmp/caddy_bootstrap.tgz ]; then
    mv /tmp/caddy_bootstrap.tgz "$tmpd/c.tgz"
  else
  ok=0
  for url in {urls_bash}; do
    if timeout 180 curl -fL --connect-timeout 20 --max-time 160 "$url" -o "$tmpd/c.tgz" 2>/dev/null && [ -s "$tmpd/c.tgz" ]; then
      ok=1
      break
    fi
    rm -f "$tmpd/c.tgz"
    if timeout 180 wget -q --timeout=120 -O "$tmpd/c.tgz" "$url" 2>/dev/null && [ -s "$tmpd/c.tgz" ]; then
      ok=1
      break
    fi
    rm -f "$tmpd/c.tgz"
  done
  if [ "$ok" != 1 ]; then
    echo "caddy download failed (all mirrors)" >&2
    exit 1
  fi
  fi
  tar -xzf "$tmpd/c.tgz" -C "$tmpd" caddy
  install -m 0755 "$tmpd/caddy" /usr/local/bin/caddy
  rm -rf "$tmpd"
fi

MH='{mh_q}'
AH='{ah_q}'
cat > "{caddyfile}" << 'CADDYEOF'
"""
            + caddy_file_body
            + f"""
CADDYEOF

cat > /etc/systemd/system/{uc} << 'CADDYUNIT'
[Unit]
Description=Caddy reverse proxy for Amline staging static apps (/opt/apps)
After=network.target appsvc-amline-staging-marketing.service appsvc-amline-staging-admin-ui.service
Requires=appsvc-amline-staging-marketing.service appsvc-amline-staging-admin-ui.service

[Service]
Type=simple
Environment=HOME=/root
Environment=XDG_CONFIG_HOME=/root/.config
ExecStart=/usr/local/bin/caddy run --config /opt/apps/_registry/Caddyfile
Restart=always
RestartSec=3

[Install]
WantedBy=multi-app-static.target
CADDYUNIT
systemctl daemon-reload
systemctl enable {uc}
systemctl restart {uc}
"""
        )
        ufw_block = """
if command -v ufw >/dev/null 2>&1 && ufw status 2>/dev/null | grep -q 'active'; then
  ufw allow 80/tcp comment 'caddy http' || true
  ufw allow 443/tcp comment 'caddy https' || true
fi
"""
        port_echo = (
            f'echo "SITE_PORT={imp}"\n'
            f'echo "ADMIN_PORT={iap}"\n'
            'echo "CADDY=1"\n'
            'echo "MARKETING_HOST=$MH"\n'
            'echo "ADMIN_HOST=$AH"'
        )
        if api_reverse_proxy_url:
            _base = api_reverse_proxy_url.rstrip("/")
            _p1 = _bash_single_quote(_base + "/api/v1/health")
            _p2 = _bash_single_quote(_base + "/contracts/list")
            port_echo += (
                f"\ncurl -sS -o /dev/null -w \"UPSTREAM_V1_HEALTH=%{{http_code}}\\n\" -m 25 "
                f"'{_p1}' || echo UPSTREAM_V1_HEALTH=curl_err"
                f"\ncurl -sS -o /dev/null -w \"UPSTREAM_CONTRACTS_ROOT=%{{http_code}}\\n\" -m 25 "
                f"'{_p2}' || echo UPSTREAM_CONTRACTS_ROOT=curl_err"
            )
    else:
        ports_reg = f"""cat > "{C.PATH_REGISTRY_PORTS_TXT}" << PORTSREG
# Sync with Git repo: infra/multi-app-server/PORT-REGISTRY.md
# fields: app<TAB>env<TAB>role<TAB>port<TAB>unit
amline	staging	marketing-site	$SITE_PORT	{um}
amline	staging	admin-ui	$ADMIN_PORT	{ua}
# reserved legacy: port 3003 next-server — coordinate before reuse
PORTSREG"""
        unit_marketing = f"""cat > /etc/systemd/system/{um} << UNIT
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
UNIT"""
        unit_admin = f"""cat > /etc/systemd/system/{ua} << UNIT
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
UNIT"""
        caddy_block = ""
        ufw_block = """
if command -v ufw >/dev/null 2>&1 && ufw status 2>/dev/null | grep -q 'active'; then
  ufw allow "$SITE_PORT/tcp" comment 'appsvc amline marketing' || true
  ufw allow "$ADMIN_PORT/tcp" comment 'appsvc amline admin-ui' || true
fi
"""
        port_echo = 'echo "SITE_PORT=$SITE_PORT"\necho "ADMIN_PORT=$ADMIN_PORT"\necho "CADDY=0"'

    dyn_ports = ""
    if not enable_caddy:
        dyn_ports = """if ss -ltn | grep -q ':80 '; then SITE_PORT=3080; else SITE_PORT=80; fi
if ss -ltn | grep -q ':8080 '; then ADMIN_PORT=3081; else ADMIN_PORT=8080; fi
"""

    tail_checks = (
        (
            f"for _w in $(seq 1 25); do systemctl is-active --quiet {uc} && break; sleep 2; done\n"
            f"systemctl is-active {uc}\n"
        )
        if enable_caddy
        else ""
    ) + f"{port_echo}\necho PYTHON_OK\n"

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
  _registry/   Port and ownership notes (ports.txt, Caddyfile if used)
  <app>/<env>/<role>/  Static or SPA build output

Human docs: Amline_namAvaran repo -> infra/multi-app-server/
README

{dyn_ports}
{ports_reg}

{unit_marketing}

{unit_admin}

systemctl daemon-reload
systemctl enable {um} {ua}
systemctl restart {um} {ua}
{caddy_block if enable_caddy else ""}
{ufw_block}

sleep 1
systemctl is-active {um}
systemctl is-active {ua}
{tail_checks}"""


def run_build() -> None:
    enable_caddy = os.environ.get("ENABLE_CADDY", "1").strip().lower() not in (
        "0",
        "false",
        "no",
    )
    same_origin_api = os.environ.get("STAGING_SAME_ORIGIN_API", "1").strip().lower() not in (
        "0",
        "false",
        "no",
    )
    api = os.environ.get("STAGING_API_URL", C.DEFAULT_STAGING_API_URL).strip()
    vite_api = (
        ""
        if (enable_caddy and same_origin_api)
        else api
    )
    env = os.environ.copy()
    env.update(
        {
            "VITE_API_URL": vite_api,
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
    if vite_api == "":
        print(
            "Running npm run build … (VITE_API_URL empty → /api via same host / Caddy)",
            flush=True,
        )
    else:
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
    key_path = os.environ.get("DEPLOY_SSH_KEY", "").strip()
    user = os.environ.get("DEPLOY_USER", "root").strip()

    if not host:
        print("Set DEPLOY_HOST", file=sys.stderr)
        sys.exit(2)
    if not password and not key_path:
        print(
            "Set DEPLOY_PASSWORD or DEPLOY_SSH_KEY (path to private key file)",
            file=sys.stderr,
        )
        sys.exit(2)

    if os.environ.get("SKIP_BUILD", "").strip() not in ("1", "true", "yes"):
        run_build()

    if not ADMIN_DIST.is_dir():
        print(f"Missing {ADMIN_DIST}", file=sys.stderr)
        sys.exit(1)

    has_site = SITE_OUT.is_dir()

    enable_caddy = os.environ.get("ENABLE_CADDY", "1").strip().lower() not in (
        "0",
        "false",
        "no",
    )
    marketing_host = os.environ.get(
        "CADDY_MARKETING_HOST", C.DEFAULT_CADDY_MARKETING_HOST
    ).strip()
    admin_host = os.environ.get(
        "CADDY_ADMIN_HOST", C.DEFAULT_CADDY_ADMIN_HOST
    ).strip()
    caddy_tls_internal = os.environ.get("CADDY_TLS_INTERNAL", "").strip().lower() in (
        "1",
        "true",
        "yes",
    )
    same_origin_api = os.environ.get("STAGING_SAME_ORIGIN_API", "1").strip().lower() not in (
        "0",
        "false",
        "no",
    )
    staging_api_url = os.environ.get("STAGING_API_URL", C.DEFAULT_STAGING_API_URL).strip()
    caddy_strip_api_v1 = os.environ.get(
        "STAGING_CADDY_STRIP_API_V1_PREFIX", "1"
    ).strip().lower() not in ("0", "false", "no")
    api_proxy = (
        staging_api_url
        if (enable_caddy and same_origin_api)
        else None
    )
    bootstrap = remote_bootstrap_sh(
        enable_caddy=enable_caddy,
        marketing_host=marketing_host,
        admin_host=admin_host,
        caddy_tls_internal=caddy_tls_internal,
        api_reverse_proxy_url=api_proxy,
        caddy_strip_api_v1_prefix=caddy_strip_api_v1,
    )

    with tempfile.TemporaryDirectory() as tmp:
        tmp_path = Path(tmp)
        admin_tar = tmp_path / "admin-ui-staging.tar.gz"
        with tarfile.open(admin_tar, "w:gz") as tf:
            tf.add(ADMIN_DIST, arcname=".", recursive=True)
        site_tar = tmp_path / "site-staging.tar.gz"
        if has_site:
            with tarfile.open(site_tar, "w:gz") as tf:
                tf.add(SITE_OUT, arcname=".", recursive=True)

        print(f"SSH connect {user}@{host} …", flush=True)
        client = paramiko.SSHClient()
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        connect_kw: dict = {
            "hostname": host,
            "username": user,
            "timeout": 120,
            "allow_agent": False,
            "look_for_keys": False,
        }
        if key_path:
            connect_kw["pkey"] = _load_deploy_private_key(key_path)
            if password:
                connect_kw["password"] = password
        else:
            connect_kw["password"] = password
        client.connect(**connect_kw)
        try:
            print("Uploading bundles and spa_static_server.py …", flush=True)
            sftp = client.open_sftp()
            with sftp.open("/tmp/spa_static_server.py", "w") as f:
                f.write(SPA_STATIC_SERVER.encode("utf-8"))
            sftp.put(str(admin_tar), "/tmp/admin-ui-staging.tar.gz")
            if has_site:
                sftp.put(str(site_tar), "/tmp/site-staging.tar.gz")
            if enable_caddy:
                print(
                    "Preparing Caddy tarball (local download if server cannot reach GitHub) …",
                    flush=True,
                )
                caddy_tgz = _download_caddy_linux_tgz(tmp_path)
                if caddy_tgz:
                    sftp.put(str(caddy_tgz), "/tmp/caddy_bootstrap.tgz")
                else:
                    print(
                        "Warning: local Caddy download failed; server will try mirrors.",
                        file=sys.stderr,
                        flush=True,
                    )
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

            print("Running remote bootstrap (systemd / optional Caddy) …", flush=True)
            _, stdout, stderr = client.exec_command(bootstrap)
            out = stdout.read().decode()
            err = stderr.read().decode()
            code = stdout.channel.recv_exit_status()
            combined = out + err
            if code != 0:
                print(combined, file=sys.stderr)
                sys.exit(code)
            if "PYTHON_OK" not in combined:
                print(combined, file=sys.stderr)
                sys.exit(1)

            site_port = "80"
            admin_port = "8080"
            caddy_on = False
            mh_out, ah_out = marketing_host, admin_host
            for line in combined.splitlines():
                if line.startswith("SITE_PORT="):
                    site_port = line.split("=", 1)[1].strip()
                if line.startswith("ADMIN_PORT="):
                    admin_port = line.split("=", 1)[1].strip()
                if line.strip() == "CADDY=1":
                    caddy_on = True
                if line.startswith("MARKETING_HOST="):
                    mh_out = line.split("=", 1)[1].strip()
                if line.startswith("ADMIN_HOST="):
                    ah_out = line.split("=", 1)[1].strip()

            time.sleep(20 if caddy_on else 10)
            if caddy_on:
                imp, iap = C.INTERNAL_MARKETING_PORT, C.INTERNAL_ADMIN_PORT
                if caddy_tls_internal:
                    # بدون -f تا 301/308 ریدایرکت به HTTPS هم پاس موفق باشد
                    smoke = (
                        f"ss -ltnp | grep -E ':443|:80|:{imp}|:{iap}' || true; "
                        f"export MH={shlex.quote(mh_out)} AH={shlex.quote(ah_out)}; "
                        "for attempt in $(seq 1 20); do "
                        f"python3 -c \"import urllib.request; urllib.request.urlopen('http://127.0.0.1:{imp}/',timeout=20); urllib.request.urlopen('http://127.0.0.1:{iap}/',timeout=20)\" "
                        '&& curl -sS --connect-timeout 15 --max-time 25 --resolve "${MH}:80:127.0.0.1" "http://${MH}/" -o /dev/null '
                        '&& curl -sS --connect-timeout 15 --max-time 25 --resolve "${AH}:80:127.0.0.1" "http://${AH}/" -o /dev/null '
                        "&& echo smoke_ok_internal && exit 0; "
                        "sleep 4; done; exit 1"
                    )
                else:
                    smoke = (
                        f"ss -ltnp | grep -E ':443|:{imp}|:{iap}' || true; "
                        f"export MH={shlex.quote(mh_out)} AH={shlex.quote(ah_out)}; "
                        "for attempt in 1 2 3 4 5 6 7 8; do "
                        'if curl -fsS --connect-timeout 10 --max-time 60 '
                        '--resolve "${MH}:443:127.0.0.1" "https://${MH}/" >/dev/null 2>&1 '
                        '&& curl -fsS --connect-timeout 10 --max-time 60 '
                        '--resolve "${AH}:443:127.0.0.1" "https://${AH}/" >/dev/null 2>&1; then '
                        "echo smoke_ok_le; exit 0; fi; "
                        "sleep 20; done; exit 1"
                    )
            else:
                smoke = (
                    f"ss -ltnp | grep -E ':{site_port} |:{admin_port} ' || true; "
                    "for i in 1 2 3 4 5; do "
                    f"python3 -c \"import urllib.request; "
                    f"a=urllib.request.urlopen('http://127.0.0.1:{site_port}/',timeout=20).status; "
                    f"b=urllib.request.urlopen('http://127.0.0.1:{admin_port}/',timeout=20).status; "
                    f"print('smoke_http',a,b)\" && exit 0; "
                    "sleep 2; done; exit 1"
                )
            _, stdout_sm, stderr_sm = client.exec_command(smoke)
            print(stdout_sm.read().decode(), flush=True)
            err_sm = stderr_sm.read().decode()
            if err_sm:
                print(err_sm, file=sys.stderr, flush=True)
            if stdout_sm.channel.recv_exit_status() != 0:
                print(out, file=sys.stderr, flush=True)
                diag = (
                    "set -e; systemctl is-active "
                    f"{C.UNIT_AMLINE_STAGING_MARKETING} || true; "
                    f"systemctl is-active {C.UNIT_AMLINE_STAGING_ADMIN_UI} || true; "
                    f"systemctl is-active {C.UNIT_CADDY_APPS} 2>/dev/null || true; "
                    "ss -ltnp | head -40; "
                    f"journalctl -u {C.UNIT_AMLINE_STAGING_MARKETING} -u "
                    f"{C.UNIT_AMLINE_STAGING_ADMIN_UI} -n 25 --no-pager 2>/dev/null || true"
                )
                _, sto, ste = client.exec_command(diag)
                print(sto.read().decode(), file=sys.stderr, flush=True)
                print(ste.read().decode(), file=sys.stderr, flush=True)
                print(
                    "Smoke test failed. journalctl -u "
                    f"{C.UNIT_AMLINE_STAGING_MARKETING} -u {C.UNIT_AMLINE_STAGING_ADMIN_UI}",
                    file=sys.stderr,
                )
                sys.exit(1)

            api = os.environ.get("STAGING_API_URL", C.DEFAULT_STAGING_API_URL)
            if caddy_on:
                tls_note = (
                    "tls internal (dev)"
                    if caddy_tls_internal
                    else "Let's Encrypt (needs DNS → this host)"
                )
                api_note = (
                    f"same-origin /api/* → {api} (Caddy)"
                    if same_origin_api
                    else f"direct VITE_API_URL → {api}"
                )
                print(
                    f"\nDone (Caddy on :443, backends loopback; {tls_note}).\n"
                    f"  Paths: {SITE_REMOTE} , {ADMIN_REMOTE}\n"
                    f"  Marketing: https://{mh_out}/\n"
                    f"  Admin UI:  https://{ah_out}/\n"
                    f"  Caddyfile: {C.PATH_CADDYFILE}  unit: {C.UNIT_CADDY_APPS}\n"
                    f"  API:       {api_note}\n"
                    f"  systemd:   systemctl status {C.UNIT_AMLINE_STAGING_MARKETING} "
                    f"{C.UNIT_AMLINE_STAGING_ADMIN_UI} {C.UNIT_CADDY_APPS}\n"
                    f"  Docs:      infra/multi-app-server/\n",
                    flush=True,
                )
            else:
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
