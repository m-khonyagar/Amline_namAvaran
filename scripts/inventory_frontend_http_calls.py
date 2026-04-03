#!/usr/bin/env python3
"""
Scan frontends for URL path literals (machine-readable inventory).

Usage:
  python scripts/inventory_frontend_http_calls.py
      → writes docs/generated/frontend-http-inventory.json

  python scripts/inventory_frontend_http_calls.py --check docs/generated/frontend-http-inventory.json
      → exit 1 if working tree would change the file (CI drift guard)

Paths are heuristics (string/backtick literals); dynamic construction is not traced.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT_DEFAULT = ROOT / "docs" / "generated" / "frontend-http-inventory.json"

SCAN_ROOTS = [
    ROOT / "amline-ui",
    ROOT / "admin-ui" / "src",
    ROOT / "site" / "app",
    ROOT / "site" / "components",
    ROOT / "site" / "landing",
    ROOT / "site" / "onboarding",
    ROOT / "site" / "utils",
    ROOT / "packages" / "amline-ui-core" / "src",
]

SKIP_DIR_NAMES = {
    "node_modules",
    "dist",
    ".next",
    "out",
    "coverage",
    "playwright-report",
    "test-results",
}

EXTS = {".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"}

# Quoted path starting with / (single, double, or backtick)
_QUOTED_PATH = re.compile(
    r"""['"`](/[a-zA-Z0-9_/\-.{}$:*?[\]\\]+)['"`]"""
)

# apiClient.get('/x') or axios.post("/x"
_PAREN_STRING = re.compile(
    r"""\(\s*['"`](/[a-zA-Z0-9_/\-.{}$:*]+)['"`]"""
)


def _classify(p: str) -> str:
    if p.startswith("/api/v1"):
        return "canonical_v1"
    if p.startswith("/api/"):
        return "legacy_api_prefix"
    if p.startswith(
        (
            "/contracts",
            "/admin",
            "/auth",
            "/files",
            "/financials",
            "/listings",
            "/provinces",
        )
    ):
        return "legacy_mount"
    if p.startswith("/"):
        return "other_slash"
    return "unknown"


def _iter_files() -> list[Path]:
    out: list[Path] = []
    for base in SCAN_ROOTS:
        if not base.is_dir():
            continue
        for p in base.rglob("*"):
            if not p.is_file():
                continue
            if p.suffix.lower() not in EXTS:
                continue
            parts = set(p.parts)
            if parts & SKIP_DIR_NAMES:
                continue
            out.append(p)
    return sorted(out)


def _scan_file(path: Path) -> list[dict]:
    rel = str(path.relative_to(ROOT)).replace("\\", "/")
    try:
        text = path.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return []
    hits: list[dict] = []
    for i, line in enumerate(text.splitlines(), 1):
        found: set[str] = set()
        for rx in (_QUOTED_PATH, _PAREN_STRING):
            for m in rx.finditer(line):
                raw = m.group(1)
                if "`" in raw or "\n" in raw:
                    continue
                if len(raw) < 2:
                    continue
                found.add(raw.split("?")[0].rstrip("/") or raw)
        for p in sorted(found):
            hits.append(
                {
                    "path": p,
                    "surface": _classify(p),
                    "file": rel,
                    "line": i,
                }
            )
    return hits


def build_inventory() -> dict:
    entries: list[dict] = []
    for f in _iter_files():
        entries.extend(_scan_file(f))
    # Dedupe same path+file+line
    seen: set[tuple] = set()
    uniq: list[dict] = []
    for e in entries:
        k = (e["path"], e["file"], e["line"])
        if k in seen:
            continue
        seen.add(k)
        uniq.append(e)
    uniq.sort(key=lambda x: (x["path"], x["file"], x["line"]))
    blob = json.dumps(uniq, sort_keys=True, ensure_ascii=False).encode()
    digest = hashlib.sha256(blob).hexdigest()[:16]
    return {
        "version": 1,
        "generator": "scripts/inventory_frontend_http_calls.py",
        "repo_root_hint": "Amline_namAvaran",
        "sha256_prefix": digest,
        "scan_roots": [str(p.relative_to(ROOT)).replace("\\", "/") for p in SCAN_ROOTS if p.is_dir()],
        "entry_count": len(uniq),
        "entries": uniq,
    }


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", type=Path, default=OUT_DEFAULT)
    ap.add_argument("--check", type=Path, help="Fail if different from generated inventory")
    args = ap.parse_args()
    data = build_inventory()
    serialized = json.dumps(data, indent=2, sort_keys=True, ensure_ascii=False) + "\n"
    if args.check:
        if not args.check.is_file():
            print(f"check file missing: {args.check}", file=sys.stderr)
            return 1
        existing = args.check.read_text(encoding="utf-8")
        if existing != serialized:
            print(
                "Drift: regenerate with "
                "`python scripts/inventory_frontend_http_calls.py` "
                f"and commit {args.check}",
                file=sys.stderr,
            )
            return 1
        return 0
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(serialized, encoding="utf-8")
    print(f"Wrote {args.out} ({data['entry_count']} entries, sha256_prefix={data['sha256_prefix']})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
