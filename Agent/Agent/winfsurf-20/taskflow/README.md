# Agent Windsurf Amline

Personal AI Task Orchestration (local-first). No authentication.

## Backend (Phase 1)

### Setup

```bash
python -m venv .venv
.venv\\Scripts\\activate
pip install -r backend\\requirements.txt
```

### Run

```bash
uvicorn app.main:app --reload --port 8000
```

### Env

Set at least:
- `OPENAI_API_KEY`

Optional:
- `OPENAI_MODEL` (default: gpt-4o-mini)
- `OPENAI_BASE_URL`
- `TASKFLOW_DB_URL` (default: sqlite+aiosqlite:///./taskflow.db)
- `TASKFLOW_WORKSPACE_ROOT` (default: ../workspace, i.e. taskflow/workspace)
- `TASKFLOW_WORKDIR_ROOT` (optional override; default: {WORKSPACE_ROOT}/tasks)
- `TASKFLOW_ARTIFACTS_ROOT` (optional override; default: {WORKSPACE_ROOT})

### API quickstart

1) Create task

`POST http://localhost:8000/tasks`
```json
{ "goal": "Create a Python script that fetches weather data and saves to CSV" }
```

2) Generate plan

`POST http://localhost:8000/tasks/{task_id}/plan`

3) Run

`POST http://localhost:8000/tasks/{task_id}/run`

4) WebSocket events

`ws://localhost:8000/ws/tasks/{task_id}`
