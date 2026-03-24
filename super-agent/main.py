"""
Super-Agent V2.1 — Phase 1 entrypoint (local, offline-first).

Run from this directory:
  .\\.venv\\Scripts\\python.exe main.py --goal \"هدف شما به فارسی\"
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from runtime import resolve_config_path, run_session  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(description="Persian Super-Agent Phase 1 demo")
    parser.add_argument("--goal", default="یک پروژه کوچک پایتون برای مدیریت وظایف بساز", help="هدف / درخواست")
    parser.add_argument("--config", default=None, help="مسیر فایل YAML پیکربندی")
    parser.add_argument("--demo-command", default=None, help="اجرای یک دستور whitelist‌شده (سطح medium)")
    parser.add_argument("--skip-brain", action="store_true", help="بدون تماس به Ollama (فقط planner و لاگ SQLite)")
    parser.add_argument("--plan-only", action="store_true", help="فقط فاز برنامه‌ریزی (بدون research/code/test/execute)")
    args = parser.parse_args()

    cfg_path = Path(args.config) if args.config else resolve_config_path()
    if args.config:
        os.environ["SUPER_AGENT_CONFIG"] = str(cfg_path)

    wf = "plan_only" if args.plan_only else None
    result = run_session(
        goal=args.goal,
        skip_brain=args.skip_brain,
        demo_command=args.demo_command,
        config_path=cfg_path if args.config else None,
        workflow_mode=wf,
    )
    if result.get("command_result"):
        cr = result["command_result"]
        print("returncode:", cr["returncode"])
        print(cr["stdout"])
        if cr.get("stderr"):
            print(cr["stderr"], file=sys.stderr)
    print(
        json.dumps(
            {"meta": {"task_id": result.get("task_id"), "workflow_mode": result.get("workflow_mode")}},
            ensure_ascii=False,
        )
    )
    for m in result["messages"]:
        print(json.dumps(m, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
