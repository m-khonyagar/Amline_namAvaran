# Run Amline dev mock API on http://127.0.0.1:8080
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot
if (-not (Test-Path ".\.venv\Scripts\python.exe")) {
  python -m venv .venv
}
& ".\.venv\Scripts\python.exe" -m pip install -q -r requirements.txt
Write-Host "Starting dev-mock-api on http://127.0.0.1:8080 (Ctrl+C to stop)"
& ".\.venv\Scripts\uvicorn.exe" main:app --host 127.0.0.1 --port 8080 --reload
