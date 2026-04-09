"""
Dump FastAPI OpenAPI JSON for contract review and TypeScript codegen.

Usage (from repository root):

  python backend/backend/scripts/export_openapi.py

Writes: docs/generated/openapi.json
"""

from __future__ import annotations

import json
import os
import sys
import warnings
from pathlib import Path

warnings.filterwarnings("ignore", category=UserWarning, module="fastapi.openapi.utils")

BACKEND_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = BACKEND_ROOT.parent.parent

sys.path.insert(0, str(BACKEND_ROOT))
os.chdir(BACKEND_ROOT)

from app.main import app  # noqa: E402

OUT = REPO_ROOT / "docs" / "generated" / "openapi.json"
OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps(app.openapi(), indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
print(f"Wrote {OUT}")
