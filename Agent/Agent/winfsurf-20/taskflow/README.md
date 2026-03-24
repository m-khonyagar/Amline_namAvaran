# Agent Windsurf

Local-first task orchestration app with a FastAPI backend and a Tauri desktop UI.

## Backend

### Setup

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

### Run

```bash
cd backend
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8060
```

Health check:

`GET http://127.0.0.1:8060/health`

## Desktop app

```bash
cd TaskFlowDesktop
npm install
npm run build
```

For local development on Windows, the helper scripts in `TaskFlowDesktop\` can start the app:

- `start-dev-env.bat`: backend + browser-based shell
- `start-desktop-app.bat`: backend + Tauri desktop window
- `test-complete-app.bat`: smoke-test launcher with a manual checklist

## Desktop release

The desktop bundle now builds successfully and lives here after `npm run tauri build`:

- `TaskFlowDesktop\src-tauri\target\release\bundle\msi\Agent Windsurf_0.1.0_x64_en-US.msi`
- `TaskFlowDesktop\src-tauri\target\release\bundle\nsis\Agent Windsurf_0.1.0_x64-setup.exe`

The packaged app attempts to start the bundled backend automatically on launch.

Current release note:

- The backend sources are bundled with the app.
- A portable Python runtime is now bundled under the packaged backend resources so the desktop app no longer depends on a separately installed Python runtime in the common case.
- The launcher still contains a fallback to `python` / `py` if the bundled runtime is unavailable, which helps development and recovery scenarios.
- The packaged desktop app has passed the local smoke test in `TaskFlowDesktop\smoke-test-packaged-app.ps1`, including backend startup, task creation, task execution, and artifact retrieval.

### Release verification

The following checks have been run successfully on the current release candidate:

- `npm run build`
- `cargo check`
- `npm run tauri build`
- `python -m py_compile app\main.py app\schemas.py launcher.py build_portable_runtime.py`
- `TaskFlowDesktop\smoke-test-packaged-app.ps1`

The smoke test launches the packaged desktop executable from `src-tauri\target\release\taskflowdesktop.exe`, waits for the bundled backend to become healthy, creates a task, runs it, and verifies task details through the live API.

## Release handoff

For final acceptance and handoff, use these documents:

- `RELEASE_CHECKLIST.md`
- `USER_GUIDE.md`
- `TaskFlowDesktop\verify-platform.ps1`
- `TaskFlowDesktop\smoke-test-packaged-app.ps1`

## Minimal API flow

1. `POST /tasks`
2. `POST /tasks/{task_id}/plan`
3. `POST /tasks/{task_id}/run`
4. `GET /tasks/{task_id}/events`
5. `GET /tasks/{task_id}/artifacts`
6. `WS /ws/tasks/{task_id}`
