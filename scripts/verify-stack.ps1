# Amline: one-shot checks - backend health, Docker, pytest, admin-ui vitest.
# Run: powershell -ExecutionPolicy Bypass -File .\scripts\verify-stack.ps1
$ErrorActionPreference = "Continue"
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

Write-Host "=== Amline verify-stack (repo: $repoRoot) ===" -ForegroundColor Cyan

$testsOk = $true

Write-Host "`n[1] GET http://127.0.0.1:8080/health" -ForegroundColor Yellow
try {
    $h = Invoke-RestMethod -Uri "http://127.0.0.1:8080/health" -TimeoutSec 5
    Write-Host "  OK: $($h | ConvertTo-Json -Compress)" -ForegroundColor Green
} catch {
    Write-Host "  SKIP/FAIL: $_" -ForegroundColor DarkYellow
}

Write-Host "`n[2a] Redis 6379 (optional for running API with real Redis)" -ForegroundColor Yellow
try {
    $tcp = Test-NetConnection -ComputerName 127.0.0.1 -Port 6379 -WarningAction SilentlyContinue
    if ($tcp.TcpTestSucceeded) {
        Write-Host "  OK: something is listening on 6379" -ForegroundColor Green
    } else {
        $rs = "C:\Program Files\Redis\redis-server.exe"
        $rc = "C:\Program Files\Redis\redis.windows.conf"
        if ((Test-Path $rs) -and (Test-Path $rc) -and -not (Get-Process redis-server -ErrorAction SilentlyContinue)) {
            Start-Process -FilePath $rs -ArgumentList "`"$rc`"" -WindowStyle Hidden
            Start-Sleep -Seconds 2
        }
        $tcp2 = Test-NetConnection -ComputerName 127.0.0.1 -Port 6379 -WarningAction SilentlyContinue
        if ($tcp2.TcpTestSucceeded) {
            Write-Host "  OK: started redis-server on 6379" -ForegroundColor Green
        } else {
            Write-Host "  INFO: no Redis on 6379 (tests use fakeredis; API may still need Redis)" -ForegroundColor DarkGray
        }
    }
} catch {
    Write-Host "  INFO: Redis check skipped" -ForegroundColor DarkGray
}

Write-Host "`n[2b] Docker daemon" -ForegroundColor Yellow
$dockerOk = $false
try {
    docker ps 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) { $dockerOk = $true }
} catch { }
if ($dockerOk) {
    Write-Host "  OK: docker ps works" -ForegroundColor Green
    Write-Host "  Tip: docker compose up -d postgres redis minio backend db-init minio-init" -ForegroundColor DarkGray
} else {
    Write-Host "  WARN: Docker not running (optional for local tests)." -ForegroundColor Red
    Write-Host "  Docker Desktop needs a healthy WSL2 backend. After first WSL install, reboot Windows once." -ForegroundColor Red
    Write-Host "  Then start Docker Desktop. Or run: winget install Microsoft.WSL; wsl --install -d Ubuntu" -ForegroundColor White
    Write-Host "  Docs: https://aka.ms/wslinstall" -ForegroundColor DarkGray
}

Write-Host "`n[3] Backend pytest" -ForegroundColor Yellow
$be = Join-Path $repoRoot "backend\backend"
$py = Join-Path $be ".venv\Scripts\python.exe"
if (-not (Test-Path $py)) {
    Write-Host "  SKIP: no .venv at $be" -ForegroundColor DarkYellow
    $testsOk = $false
} else {
    Push-Location $be
    & $py -m pytest tests\ -q --tb=no
    if ($LASTEXITCODE -ne 0) { $testsOk = $false }
    Pop-Location
}

Write-Host "`n[4] admin-ui vitest (full)" -ForegroundColor Yellow
$aui = Join-Path $repoRoot "admin-ui"
if (-not (Test-Path (Join-Path $aui "node_modules"))) {
    Write-Host "  SKIP: run npm install in admin-ui" -ForegroundColor DarkYellow
} else {
    Push-Location $aui
    & npx.cmd vitest run
    if ($LASTEXITCODE -ne 0) { $testsOk = $false }
    Pop-Location
}

$doneColor = if ($testsOk) { "Green" } else { "Yellow" }
Write-Host ""
Write-Host "=== Done. Tests OK: $testsOk (Docker warning does not fail this script) ===" -ForegroundColor $doneColor
if ($testsOk) { exit 0 } else { exit 1 }
