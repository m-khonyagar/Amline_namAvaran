# اجرای سریع backend در محیط توسعه
# پیش‌نیاز: Python 3.11+، PostgreSQL و Redis در حال اجرا (یا docker-compose up -d postgres redis)

param(
    [string]$Port = "8080",
    [switch]$SkipMigrations
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# ساخت venv اگر وجود ندارد
if (-not (Test-Path "$ScriptDir\.venv")) {
    Write-Host "Creating virtual environment..." -ForegroundColor Cyan
    python -m venv "$ScriptDir\.venv"
}

# فعال‌سازی venv
& "$ScriptDir\.venv\Scripts\Activate.ps1"

# نصب وابستگی‌ها
Write-Host "Installing dependencies..." -ForegroundColor Cyan
pip install --quiet -r "$ScriptDir\requirements.txt"

# کپی .env اگر وجود ندارد
if (-not (Test-Path "$ScriptDir\.env")) {
    Copy-Item "$ScriptDir\.env.example" "$ScriptDir\.env"
    Write-Host ".env created from .env.example — please review values" -ForegroundColor Yellow
}

# اجرای migrations
if (-not $SkipMigrations) {
    Write-Host "Running migrations..." -ForegroundColor Cyan
    Set-Location $ScriptDir
    alembic upgrade head
}

# اجرای سرور
Write-Host "Starting backend on port $Port..." -ForegroundColor Green
uvicorn app.main:app --host 0.0.0.0 --port $Port --reload
