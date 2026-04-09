# بالا آوردن استک لوکال املاین با Docker Compose (ریشهٔ مخزن).
# پیش‌نیاز: Docker Desktop روشن و در حال اجرا.
# سرویس‌های پیش‌فرض (بدون profile): postgres, redis, minio, backend, pdf-generator,
# admin-ui, amline-ui, site, seo-dashboard, db-init, minio-init

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

if (-not (Test-Path "$root\.env")) {
    Copy-Item "$root\.env.example" "$root\.env"
    Write-Host "Created .env from .env.example — set JWT_SECRET and other secrets for real use."
}

docker version | Out-Null
docker compose up -d --build
docker compose ps

Write-Host ""
Write-Host "Default URLs:"
Write-Host "  API (backend):  http://localhost:8080"
Write-Host "  Health:         http://localhost:8080/health"
Write-Host "  Admin UI:       http://localhost:3002"
Write-Host "  Amline UI:      http://localhost:3000"
Write-Host "  Marketing site: http://localhost:3001"
Write-Host "  PDF generator:  http://localhost:8001"
Write-Host ""
Write-Host "Logs: docker compose logs -f backend"
Write-Host "Stop: docker compose down"
