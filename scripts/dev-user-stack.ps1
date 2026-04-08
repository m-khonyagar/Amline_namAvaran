# بالا آوردن mock API (8080) و amline-ui (3000) در دو پنجرهٔ PowerShell جدا.
# اجرا از ریشهٔ ریپو: powershell -ExecutionPolicy Bypass -File .\scripts\dev-user-stack.ps1
$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
$mockRoot = Join-Path $repoRoot "dev-mock-api"
$uiRoot = Join-Path $repoRoot "amline-ui"

function Test-PortOpen([int]$Port) {
    try {
        $c = Test-NetConnection -ComputerName 127.0.0.1 -Port $Port -WarningAction SilentlyContinue
        return $c.TcpTestSucceeded
    } catch {
        return $false
    }
}

Write-Host "=== Amline dev: mock + پنل کاربر ===" -ForegroundColor Cyan
Write-Host "Repo: $repoRoot"

if (-not (Test-Path $mockRoot)) {
    Write-Error "dev-mock-api not found at $mockRoot"
}

if (-not (Test-PortOpen 8080)) {
    $py = Join-Path $mockRoot ".venv\Scripts\python.exe"
    if (Test-Path $py) {
        $mockInner = "Set-Location -LiteralPath '$mockRoot'; & '$py' -m uvicorn main:app --host 127.0.0.1 --port 8080 --reload"
    } else {
        $mockInner = "Set-Location -LiteralPath '$mockRoot'; python -m uvicorn main:app --host 127.0.0.1 --port 8080 --reload"
    }
    Write-Host "Starting dev-mock-api on http://127.0.0.1:8080 ..." -ForegroundColor Yellow
    Start-Process powershell -WorkingDirectory $repoRoot -ArgumentList @("-NoExit", "-Command", $mockInner)
    $deadline = (Get-Date).AddSeconds(25)
    while ((Get-Date) -lt $deadline) {
        Start-Sleep -Milliseconds 500
        if (Test-PortOpen 8080) { break }
    }
    if (-not (Test-PortOpen 8080)) {
        Write-Host "WARN: 8080 not responding yet; check the mock window for pip/venv errors." -ForegroundColor Red
    } else {
        Write-Host "OK: mock API listening on 8080" -ForegroundColor Green
    }
} else {
    Write-Host "Port 8080 already in use — assuming mock API is running." -ForegroundColor DarkYellow
}

if (Test-PortOpen 3000) {
    Write-Host "Port 3000 is in use. Start amline-ui manually on another port: cd amline-ui; npx next dev -p 3001" -ForegroundColor Red
} else {
    $uiInner = @"
`$env:NEXT_PUBLIC_DEV_PROXY_TARGET='http://127.0.0.1:8080'
`$env:NEXT_PUBLIC_API_BASE_URL='http://127.0.0.1:8080'
`$env:NEXT_PUBLIC_ENABLE_DEV_BYPASS='true'
Set-Location -LiteralPath '$uiRoot'
npm run dev
"@
    Write-Host "Starting amline-ui on http://localhost:3000 ..." -ForegroundColor Yellow
    Start-Process powershell -WorkingDirectory $repoRoot -ArgumentList @("-NoExit", "-Command", $uiInner)
}

Write-Host ""
Write-Host "باز کردن مرورگر: http://localhost:3000" -ForegroundColor Green
Write-Host "جزئیات: docs/LOCAL_DEV.md" -ForegroundColor DarkGray
