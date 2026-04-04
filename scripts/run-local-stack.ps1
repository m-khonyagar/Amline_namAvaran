# اجرای بک‌اند املاین با Postgres محلی (Docker).
# پیش‌نیاز: pip install -r backend/backend/requirements.txt و pip install psycopg2-binary
# پورت Postgres را با `docker port amline-postgres` ببینید؛ پیش‌فرض زیر 5433 است.

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location "$root\backend\backend"

if (-not $env:DATABASE_URL) {
  $env:DATABASE_URL = "postgresql+psycopg2://postgres:postgres@127.0.0.1:5433/amline"
}
$env:AMLINE_OTP_DEBUG = "1"
$env:AMLINE_RBAC_ENFORCE = "0"

Write-Host "DATABASE_URL=$($env:DATABASE_URL)"
python -m uvicorn app.main:app --host 127.0.0.1 --port 8080 --reload
