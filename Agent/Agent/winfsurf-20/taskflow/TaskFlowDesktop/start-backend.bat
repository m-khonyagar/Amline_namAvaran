@echo off
cd /d "%~dp0"
echo Starting Agent Windsurf backend...
cd ..\backend
if exist ".venv\Scripts\python.exe" (
  .venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8060
) else (
  python -m uvicorn app.main:app --host 127.0.0.1 --port 8060
)
