#!/usr/bin/env python3
"""
Parmin Cloud: login via API and open noVNC / console URL for a server.

Secrets only from environment (never commit). See docs/PARMIN_API_CONSOLE.md.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import webbrowser
from typing import Any, Iterable, Optional

try:
    import requests
except ImportError:
    print("Missing dependency: pip install -r scripts/requirements-parmin.txt", file=sys.stderr)
    raise SystemExit(2) from None

DEFAULT_API_BASE = "https://api.parmin.cloud/api_v1.0"
# Same public line as docs/PARMIN_CONSOLE_SSH_KEY.md (private key must never be committed).
_FALLBACK_DEPLOY_PUBKEY = (
    "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIIQT36X9V7Pzs8zJeEwH8Ch7KRAB5jGUFyl0XSaEad1p amline-deploy"
)
# `/auth/password` matches the live Parmin panel API (mobile + password JSON).
# Other entries are fallbacks if the provider changes routing.
DEFAULT_LOGIN_PATHS = (
    "/auth/password",
    "/user/login",
    "/login",
    "/auth/login",
    "/users/login",
    "/account/login",
)


def _truthy(name: str, default: bool = False) -> bool:
    v = os.environ.get(name, "").strip().lower()
    if not v:
        return default
    return v in ("1", "true", "yes", "on")


def _debug(msg: str) -> None:
    if _truthy("PARMIN_DEBUG"):
        print(msg, file=sys.stderr)


def _get(d: Any, *keys: str) -> Optional[Any]:
    cur: Any = d
    for k in keys:
        if not isinstance(cur, dict):
            return None
        cur = cur.get(k)
    return cur


def extract_token(payload: dict[str, Any]) -> Optional[str]:
    at = payload.get("access_token")
    if isinstance(at, dict):
        v = at.get("token")
        if isinstance(v, str) and v.strip():
            return v.strip()
    for path in (
        ("token",),
        ("access_token",),  # sometimes a bare JWT string
        ("accessToken",),
        ("data", "token"),
        ("data", "access_token"),
        ("result", "token"),
        ("auth", "token"),
    ):
        v = _get(payload, *path)
        if isinstance(v, str) and v.strip():
            return v.strip()
    return None


def resolve_bootstrap_pubkey() -> str:
    """Public key line for authorized_keys bootstrap (file, env, or doc default)."""
    path = os.environ.get("PARMIN_BOOTSTRAP_PUBKEY_FILE", "").strip()
    candidates = [path] if path else []
    home = os.path.expanduser("~")
    candidates.extend(
        [
            os.path.join(home, ".ssh", "amline_deploy.pub"),
            os.path.join(home, ".ssh", "amline-deploy.pub"),
        ]
    )
    for p in candidates:
        if not p or not os.path.isfile(p):
            continue
        with open(p, encoding="utf-8", errors="replace") as f:
            first = f.readline().strip()
        if first.startswith("ssh-"):
            return first
    inline = os.environ.get("PARMIN_BOOTSTRAP_PUBKEY", "").strip()
    if inline.startswith("ssh-"):
        return inline.splitlines()[0].strip()
    return _FALLBACK_DEPLOY_PUBKEY


def bootstrap_oneliner(pubkey_line: str) -> str:
    if "'" in pubkey_line:
        pubkey_line = pubkey_line.replace("'", "'\"'\"'")
    return (
        "mkdir -p /root/.ssh && echo '" + pubkey_line + "' >> /root/.ssh/authorized_keys && "
        "chmod 700 /root/.ssh && chmod 600 /root/.ssh/authorized_keys && echo OK"
    )


def extract_console_url(payload: dict[str, Any]) -> Optional[str]:
    for path in (
        ("url",),
        ("console_url",),
        ("consoleUrl",),
        ("novnc_url",),
        ("novncUrl",),
        ("vnc_url",),
        ("vncUrl",),
        ("data", "url"),
        ("data", "console_url"),
        ("data", "novnc_url"),
        ("result", "url"),
    ):
        v = _get(payload, *path)
        if isinstance(v, str) and v.strip().startswith(("http://", "https://")):
            return v.strip()
    return None


def login(
    session: requests.Session,
    base: str,
    paths: Iterable[str],
    username: str,
    password: str,
    need_otp: bool,
    username_field: str,
    password_field: str,
) -> str:
    body: dict[str, Any] = {username_field: username, password_field: password}
    if _truthy("PARMIN_INCLUDE_NEED_OTP", default=False) or need_otp:
        body["need_otp"] = need_otp
    custom = os.environ.get("PARMIN_LOGIN_PATH", "").strip()
    to_try = [custom] if custom else list(paths)

    last_err: Optional[str] = None
    for path in to_try:
        if not path.startswith("/"):
            path = "/" + path
        url = base.rstrip("/") + path
        _debug(f"POST {url} (body keys: {list(body.keys())})")
        r = session.post(url, json=body, timeout=60)
        _debug(f"  -> {r.status_code}")
        if r.status_code == 404:
            last_err = f"{url} -> 404"
            continue
        try:
            data = r.json()
        except json.JSONDecodeError:
            raise SystemExit(f"Login: non-JSON response ({r.status_code}) from {url}:\n{r.text[:500]}") from None

        if r.status_code not in (200, 201):
            detail = data.get("detail", data.get("message", data))
            raise SystemExit(f"Login failed ({r.status_code}) at {url}: {detail}")

        token = extract_token(data)
        if not token:
            if _truthy("PARMIN_DEBUG"):
                print(json.dumps(data, indent=2)[:2000], file=sys.stderr)
            raise SystemExit(
                f"Login succeeded but no token found in JSON. Set PARMIN_DEBUG=1 to inspect. "
                f"If the API uses another field, extend extract_token() or open an issue."
            )
        return token

    raise SystemExit(
        "Login: all candidate paths returned 404. Set PARMIN_LOGIN_PATH to the path "
        f"you see in browser DevTools (relative to API base). Last: {last_err}"
    )


def create_console(session: requests.Session, base: str, server_id: str) -> str:
    path = os.environ.get("PARMIN_CONSOLE_PATH", "").strip() or f"/servers/{server_id}/create-console"
    if not path.startswith("/"):
        path = "/" + path
    url = base.rstrip("/") + path.replace("{id}", server_id).replace("{server_id}", server_id)

    _debug(f"POST {url}")
    r = session.post(url, json={}, timeout=60)
    _debug(f"  -> {r.status_code}")

    try:
        data = r.json()
    except json.JSONDecodeError:
        raise SystemExit(f"create-console: non-JSON ({r.status_code}):\n{r.text[:800]}") from None

    if r.status_code not in (200, 201):
        detail = data.get("detail", data.get("message", data))
        raise SystemExit(f"create-console failed ({r.status_code}): {detail}")

    console_url = extract_console_url(data)
    if not console_url:
        if _truthy("PARMIN_DEBUG"):
            print(json.dumps(data, indent=2)[:2000], file=sys.stderr)
        raise SystemExit(
            "create-console: no URL field recognized. Set PARMIN_DEBUG=1 to inspect JSON "
            "and adjust extract_console_url() if needed."
        )
    return console_url


def main() -> None:
    p = argparse.ArgumentParser(description="Parmin API: obtain short-lived console/VNC URL.")
    p.add_argument("--server-id", help="Override PARMIN_SERVER_ID")
    p.add_argument(
        "--open-browser",
        action="store_true",
        help="Open the URL in the default browser (or set PARMIN_OPEN_BROWSER=1)",
    )
    p.add_argument(
        "--print-bootstrap-cmd",
        action="store_true",
        help="After the console URL, print the one-line bash for authorized_keys (stderr); or set PARMIN_PRINT_BOOTSTRAP_CMD=1",
    )
    p.add_argument(
        "--bootstrap-cmd-only",
        action="store_true",
        help="Print only the authorized_keys one-liner to stdout (no API); uses PARMIN_BOOTSTRAP_PUBKEY_FILE or ~/.ssh/*.pub",
    )
    args = p.parse_args()

    if args.bootstrap_cmd_only:
        print(bootstrap_oneliner(resolve_bootstrap_pubkey()))
        return

    base = os.environ.get("PARMIN_API_BASE", DEFAULT_API_BASE).strip().rstrip("/")
    user = (os.environ.get("PARMIN_USERNAME") or os.environ.get("PARMIN_EMAIL") or "").strip()
    password = (os.environ.get("PARMIN_PASSWORD") or "").strip()
    server_id = (args.server_id or os.environ.get("PARMIN_SERVER_ID") or "").strip()

    if not user or not password:
        raise SystemExit("Set PARMIN_USERNAME (or PARMIN_EMAIL) and PARMIN_PASSWORD in the environment.")
    if not server_id:
        raise SystemExit("Set PARMIN_SERVER_ID or pass --server-id.")

    need_otp = _truthy("PARMIN_NEED_OTP", default=False)
    # Parmin panel uses JSON field `mobile` for the account identifier.
    username_field = os.environ.get("PARMIN_USERNAME_FIELD", "mobile").strip() or "mobile"
    password_field = os.environ.get("PARMIN_PASSWORD_FIELD", "password").strip() or "password"

    open_browser = args.open_browser or _truthy("PARMIN_OPEN_BROWSER")
    print_bootstrap = args.print_bootstrap_cmd or _truthy("PARMIN_PRINT_BOOTSTRAP_CMD")

    session = requests.Session()
    session.headers.update(
        {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "User-Agent": "parmin_open_console/1.0 (requests)",
        }
    )

    token = login(
        session,
        base,
        DEFAULT_LOGIN_PATHS,
        user,
        password,
        need_otp,
        username_field,
        password_field,
    )
    auth_style = os.environ.get("PARMIN_AUTH_HEADER", "Bearer").strip() or "Bearer"
    if auth_style.lower() != "none":
        session.headers["Authorization"] = f"{auth_style} {token}"

    url = create_console(session, base, server_id)
    print(url)
    print(
        "\nNote: console sessions are usually short-lived; open the link promptly.",
        file=sys.stderr,
    )
    if print_bootstrap:
        pk = resolve_bootstrap_pubkey()
        cmd = bootstrap_oneliner(pk)
        print(
            "\nPaste this single line into the Parmin console shell, then Enter (expect OK):\n",
            file=sys.stderr,
        )
        print(cmd, file=sys.stderr)
    if open_browser:
        webbrowser.open(url)


if __name__ == "__main__":
    main()
