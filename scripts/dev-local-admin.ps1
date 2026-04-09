# Local browser stack: dev-mock-api on :8080 (if not already up) + admin-ui on :3002.
# Run from repo root:
#   powershell -ExecutionPolicy Bypass -File .\scripts\dev-local-admin.ps1
# Or: npm run local:admin
#
# Stops: Ctrl+C (admin only). Mock keeps running if this script started it in another window — close that window or stop the python process.

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$mockOk = $false
try {
  $h = Invoke-RestMethod -Uri "http://127.0.0.1:8080/health" -TimeoutSec 2
  if ($h.status -eq "ok") { $mockOk = $true }
} catch { }

if (-not $mockOk) {
  $mockDir = Join-Path $root "dev-mock-api"
  if (-not (Test-Path (Join-Path $mockDir "main.py"))) {
    Write-Error "dev-mock-api not found at $mockDir"
  }
  Write-Host "Starting dev-mock-api on http://127.0.0.1:8080 (new window)..." -ForegroundColor Cyan
  Start-Process -FilePath "python" -ArgumentList "-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", "8080" `
    -WorkingDirectory $mockDir -WindowStyle Normal
  Start-Sleep -Seconds 3
  try {
    $h2 = Invoke-RestMethod -Uri "http://127.0.0.1:8080/health" -TimeoutSec 5
    if ($h2.status -ne "ok") { throw "bad health" }
  } catch {
    Write-Error "Mock API did not become healthy on :8080. If port is busy, free 8080 or stop the other process."
  }
} else {
  Write-Host "Using existing API on http://127.0.0.1:8080 (health ok)." -ForegroundColor Green
}

Write-Host "ensure-ui-core..." -ForegroundColor Cyan
npm run ensure-ui-core
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ""
Write-Host "Admin UI: http://localhost:3002/login" -ForegroundColor Yellow
Write-Host "Mock docs: http://127.0.0.1:8080/docs" -ForegroundColor DarkGray
Write-Host "Dev bypass + proxy are loaded from admin-ui/.env.development" -ForegroundColor DarkGray
Write-Host ""

npm run dev -w amline-admin-ui
