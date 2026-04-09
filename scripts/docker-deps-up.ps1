# Postgres + Redis + MinIO (همان پورت‌های docker-compose.yml روی localhost).
# پیش‌نیاز: Docker Desktop روشن باشد.
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

docker compose up -d postgres redis minio
Write-Host "Waiting for Postgres/MinIO..."
$deadline = (Get-Date).AddMinutes(2)
while ((Get-Date) -lt $deadline) {
  docker compose exec -T postgres pg_isready -U amline 2>$null | Out-Null
  if ($LASTEXITCODE -eq 0) { break }
  Start-Sleep -Seconds 2
}
docker compose up minio-init db-init
Write-Host "Infra ready. Postgres :5432, Redis :6379, MinIO :9000"
