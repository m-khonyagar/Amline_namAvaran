# اجرای بک‌اند روی لوکال با Postgres/Redis/MinIO که از docker-compose روی پورت‌های پیش‌فرض بالا آمده‌اند.
# ۱) یک بار: .\scripts\docker-deps-up.ps1   (یا docker compose up -d postgres redis minio && ...)
# ۲) pip install -r backend/backend/requirements.txt  (+ psycopg2-binary اگر لازم شد)
# Admin UI (Vite): از ریشه: npm run dev:admin  → http://localhost:3002  (پروکسی به API روی 8080)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location "$root\backend\backend"

if (-not $env:DATABASE_URL) {
  $env:DATABASE_URL = "postgresql+psycopg2://amline:amline_secret@127.0.0.1:5432/amline"
}
if (-not $env:AMLINE_REDIS_URL) {
  $env:AMLINE_REDIS_URL = "redis://:amline_redis_secret@127.0.0.1:6379/0"
}
if (-not $env:AMLINE_JWT_SECRET) {
  $env:AMLINE_JWT_SECRET = "local-dev-jwt-secret-minimum-32-characters!!"
}
if (-not $env:AMLINE_S3_ENDPOINT_URL) {
  $env:AMLINE_S3_ENDPOINT_URL = "http://127.0.0.1:9000"
}
if (-not $env:AMLINE_S3_ACCESS_KEY) { $env:AMLINE_S3_ACCESS_KEY = "amline" }
if (-not $env:AMLINE_S3_SECRET_KEY) { $env:AMLINE_S3_SECRET_KEY = "amline_minio_secret" }
if (-not $env:AMLINE_S3_BUCKET) { $env:AMLINE_S3_BUCKET = "amline-docs" }

$env:AMLINE_OTP_DEBUG = "1"
$env:AMLINE_RBAC_ENFORCE = "0"
$env:AMLINE_OTP_MAGIC_ENABLED = "1"

Write-Host "DATABASE_URL=$($env:DATABASE_URL)"
Write-Host "AMLINE_REDIS_URL=$($env:AMLINE_REDIS_URL)"
python -m uvicorn app.main:app --host 127.0.0.1 --port 8080 --reload
