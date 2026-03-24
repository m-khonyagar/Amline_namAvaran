# Agent Windsurf Release Checklist

This checklist is the final acceptance gate for the current release candidate.

## Build

- Backend virtual environment exists in `backend\.venv`.
- `backend\requirements.txt` is installed successfully.
- `TaskFlowDesktop\node_modules` is installed successfully.
- `npm run build` passes in `TaskFlowDesktop`.
- `cargo check` passes in `TaskFlowDesktop\src-tauri`.
- `python -m py_compile` passes for the backend runtime files.
- `backend\build_portable_runtime.py` completes successfully.
- `npm run tauri build` produces both installer outputs.

## Backend verification

Run:

```powershell
powershell -ExecutionPolicy Bypass -File TaskFlowDesktop\verify-platform.ps1
```

Expected result:

- `status = ok`
- A workflow completes successfully.
- At least one task artifact is produced.
- Assistant tools include `workflow_task`, `gmail`, `file_share`, `powershell`, `notification`, `telegram`, `bale`.
- Notifications are enabled and the test notification returns `ok = true`.
- The improvement loop produces at least one lesson.
- Computer control produces a screenshot file.

## Packaged app verification

Run:

```powershell
powershell -ExecutionPolicy Bypass -File TaskFlowDesktop\smoke-test-packaged-app.ps1
```

Expected result:

- `status = ok`
- The packaged app launches its bundled backend automatically.
- Assistant tools are available inside the packaged backend.
- Notifications are enabled in the packaged app.
- The improvement loop is enabled in the packaged app.
- The Bale connector can be saved in the packaged backend.

## Manual UX spot-check

- Launch the packaged desktop app.
- Open `Tasks`, create a new task, and confirm it appears in `Task Detail`.
- Open `Chat`, create a `chat` session, and confirm tools can be assigned.
- Save Gmail, Telegram, or Bale connector settings and confirm the status badge changes.
- Trigger a test desktop notification from the chat workspace.
- Open `Files` and confirm markdown artifacts render cleanly.
- Open `Computer` and confirm session start, terminal command, and screenshot work.
- Confirm `Task Detail` renders summaries and outputs with formatted markdown.

## Installer outputs

Current release artifacts:

- `TaskFlowDesktop\src-tauri\target\release\bundle\msi\Agent Windsurf_0.1.0_x64_en-US.msi`
- `TaskFlowDesktop\src-tauri\target\release\bundle\nsis\Agent Windsurf_0.1.0_x64-setup.exe`

## Known constraints

- Admin UAC execution depends on the target Windows environment and should be validated on a real end-user machine.
- Live Telegram and Bale bot control require real bot credentials.
- Live Gmail sending requires a valid Gmail app password.
