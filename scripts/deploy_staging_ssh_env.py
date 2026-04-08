#!/usr/bin/env python3
"""
Deploy admin-ui/dist and site/out to a staging server over SFTP + SSH.

Required environment variables (no secrets in repo):
  DEPLOY_HOST       e.g. 212.80.24.109
  DEPLOY_USER       e.g. root
  DEPLOY_PASSWORD   SSH password (use SSH keys in production)
  DEPLOY_SSH_KEY    path to private key (if set, used instead of password)

Optional:
  ADMIN_REMOTE  default from server_layout_constants ( /opt/apps/amline/staging/admin-ui )
  SITE_REMOTE   default marketing-site path ( /opt/apps/amline/staging/marketing-site )
  SKIP_SITE     set to "1" to deploy admin-ui only

Run from monorepo root after `npm run build`.
"""
from __future__ import annotations

import os
import sys
import tempfile
import tarfile
from pathlib import Path

import paramiko

_script_dir = Path(__file__).resolve().parent
if str(_script_dir) not in sys.path:
    sys.path.insert(0, str(_script_dir))
from server_layout_constants import (
    PATH_AMLINE_STAGING_ADMIN_UI,
    PATH_AMLINE_STAGING_MARKETING,
)


def main() -> None:
    repo = _script_dir.parent
    host = os.environ.get("DEPLOY_HOST", "").strip()
    user = os.environ.get("DEPLOY_USER", "root").strip()
    password = os.environ.get("DEPLOY_PASSWORD", "")
    key_path = os.environ.get("DEPLOY_SSH_KEY", "").strip()
    admin_remote = os.environ.get("ADMIN_REMOTE", PATH_AMLINE_STAGING_ADMIN_UI).strip()
    site_remote = os.environ.get("SITE_REMOTE", PATH_AMLINE_STAGING_MARKETING).strip()
    skip_site = os.environ.get("SKIP_SITE", "").strip() in ("1", "true", "yes")

    if not host or (not password and not (key_path and os.path.isfile(key_path))):
        print("Set DEPLOY_HOST and (DEPLOY_PASSWORD or DEPLOY_SSH_KEY)", file=sys.stderr)
        sys.exit(2)

    admin_dist = repo / "admin-ui" / "dist"
    if not admin_dist.is_dir():
        print(f"Missing {admin_dist} — run npm run build first", file=sys.stderr)
        sys.exit(1)

    site_out = repo / "site" / "out"
    has_site = site_out.is_dir() and not skip_site

    with tempfile.TemporaryDirectory() as tmp:
        tmp_path = Path(tmp)
        admin_tar = tmp_path / "admin-ui-staging.tar.gz"
        with tarfile.open(admin_tar, "w:gz") as tf:
            tf.add(admin_dist, arcname=".", recursive=True)

        site_tar = tmp_path / "site-staging.tar.gz"
        if has_site:
            with tarfile.open(site_tar, "w:gz") as tf:
                tf.add(site_out, arcname=".", recursive=True)

        client = paramiko.SSHClient()
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        connect_kw: dict = {
            "hostname": host,
            "username": user,
            "timeout": 60,
            "allow_agent": False,
            "look_for_keys": False,
        }
        if key_path and os.path.isfile(key_path):
            connect_kw["key_filename"] = key_path
        else:
            connect_kw["password"] = password
        client.connect(**connect_kw)
        try:
            sftp = client.open_sftp()
            sftp.put(str(admin_tar), "/tmp/admin-ui-staging.tar.gz")
            if has_site:
                sftp.put(str(site_tar), "/tmp/site-staging.tar.gz")
            sftp.close()

            cmds = [
                f"mkdir -p {admin_remote}",
                f"tar -xzf /tmp/admin-ui-staging.tar.gz -C {admin_remote}",
                "rm -f /tmp/admin-ui-staging.tar.gz",
            ]
            if has_site:
                cmds += [
                    f"mkdir -p {site_remote}",
                    f"tar -xzf /tmp/site-staging.tar.gz -C {site_remote}",
                    "rm -f /tmp/site-staging.tar.gz",
                ]
            script = "set -euo pipefail; " + "; ".join(cmds)
            stdin, stdout, stderr = client.exec_command(script)
            out = stdout.read().decode("utf-8", errors="replace")
            err = stderr.read().decode("utf-8", errors="replace")
            code = stdout.channel.recv_exit_status()
            if out:
                print(out, end="")
            if err:
                print(err, end="", file=sys.stderr)
            if code != 0:
                sys.exit(code)
            print(f"OK: admin -> {admin_remote}")
            if has_site:
                print(f"OK: site -> {site_remote}")
            elif skip_site:
                print("(site skipped)")
            else:
                print("(no site/out — admin only)")
        finally:
            client.close()


if __name__ == "__main__":
    main()
