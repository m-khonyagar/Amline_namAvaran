# نقطهٔ ورود واحد برای تست پلتفرم اَملاین روی ویندوز (بدون Docker).
# mock روی 8080 + باز کردن «هاب محلی» در مرورگر (لینک به همهٔ پنل‌ها).
# اجرا از ریشهٔ ریپو:
#   powershell -ExecutionPolicy Bypass -File .\scripts\start-platform-local-hub.ps1
#
# پارامترها:
#   -WithUserUi    پنجرهٔ جدا برای amline-ui (پورت 3000) هم باز می‌شود
#   -WithAdminUi   پنجرهٔ جدا برای admin-ui (پورت 3002)
#   -WithConsultantUi پنجرهٔ جدا برای consultant-ui (پورت 3004)
$ErrorActionPreference = "Stop"

param(
    [switch]$WithUserUi,
    [switch]$WithAdminUi,
    [switch]$WithConsultantUi
)

$repoRoot = Split-Path -Parent $PSScriptRoot
$mockRoot = Join-Path $repoRoot "dev-mock-api"
$hubFile = Join-Path $repoRoot "local-dev-hub\index.html"

function Test-PortOpen([int]$Port) {
    try {
        $c = Test-NetConnection -ComputerName 127.0.0.1 -Port $Port -WarningAction SilentlyContinue
        return $c.TcpTestSucceeded
    } catch {
        return $false
    }
}

function Start-MockApi {
    $py = Join-Path $mockRoot ".venv\Scripts\python.exe"
    if (Test-Path $py) {
        $mockInner = "Set-Location -LiteralPath '$mockRoot'; & '$py' -m uvicorn main:app --host 127.0.0.1 --port 8080 --reload"
    } else {
        $mockInner = "Set-Location -LiteralPath '$mockRoot'; python -m uvicorn main:app --host 127.0.0.1 --port 8080 --reload"
    }
    Write-Host "Starting dev-mock-api on http://127.0.0.1:8080 ..." -ForegroundColor Yellow
    Start-Process powershell -WorkingDirectory $repoRoot -ArgumentList @("-NoExit", "-Command", $mockInner)
    $deadline = (Get-Date).AddSeconds(30)
    while ((Get-Date) -lt $deadline) {
        Start-Sleep -Milliseconds 500
        if (Test-PortOpen 8080) { return $true }
    }
    return (Test-PortOpen 8080)
}

Write-Host "=== اَملاین — هاب پلتفرم محلی ===" -ForegroundColor Cyan
Write-Host "Repo: $repoRoot`n"

if (-not (Test-Path $hubFile)) {
    Write-Error "Hub not found: $hubFile"
}

if (-not (Test-Path $mockRoot)) {
    Write-Error "dev-mock-api not found: $mockRoot"
}

if (-not (Test-PortOpen 8080)) {
    if (-not (Start-MockApi)) {
        Write-Host "خطا: پورت 8080 پاسخ نمی‌دهد. پنجرهٔ mock را بررسی کنید (venv / pip)." -ForegroundColor Red
        exit 1
    }
    Write-Host "OK: API ماک روی 8080" -ForegroundColor Green
} else {
    Write-Host "پورت 8080 در حال استفاده است — فرض: API یا بک‌اند از قبل اجراست." -ForegroundColor DarkYellow
}

if ($WithUserUi -and -not (Test-PortOpen 3000)) {
    $uiRoot = Join-Path $repoRoot "amline-ui"
    $cmd = @"
`$env:NEXT_PUBLIC_DEV_PROXY_TARGET='http://127.0.0.1:8080'
`$env:NEXT_PUBLIC_API_BASE_URL='http://127.0.0.1:8080'
`$env:NEXT_PUBLIC_ENABLE_DEV_BYPASS='true'
Set-Location -LiteralPath '$uiRoot'
npm run dev
"@
    Start-Process powershell -WorkingDirectory $repoRoot -ArgumentList @("-NoExit", "-Command", $cmd)
    Write-Host "در حال باز کردن amline-ui (3000)..." -ForegroundColor Yellow
}

if ($WithAdminUi -and -not (Test-PortOpen 3002)) {
    $adRoot = Join-Path $repoRoot "admin-ui"
    # پورت از vite.config (3002) — از «npm run dev -- --port» در PowerShell استفاده نکنید؛ vite آن را به‌اشتباه root می‌گیرد.
    $cmd = @"
Set-Location -LiteralPath '$adRoot'
`$env:VITE_USE_MSW='false'
`$env:VITE_DEV_PROXY_TARGET='http://127.0.0.1:8080'
`$env:VITE_ENABLE_DEV_BYPASS='true'
npm run dev
"@
    Start-Process powershell -WorkingDirectory $repoRoot -ArgumentList @("-NoExit", "-Command", $cmd)
    Write-Host "در حال باز کردن admin-ui (پورت در vite.config)..." -ForegroundColor Yellow
}

if ($WithConsultantUi -and -not (Test-PortOpen 3004)) {
    $coRoot = Join-Path $repoRoot "consultant-ui"
    $cmd = @"
Set-Location -LiteralPath '$coRoot'
`$env:VITE_USE_MSW='false'
`$env:VITE_DEV_PROXY_TARGET='http://127.0.0.1:8080'
npm run dev
"@
    Start-Process powershell -WorkingDirectory $repoRoot -ArgumentList @("-NoExit", "-Command", $cmd)
    Write-Host "در حال باز کردن consultant-ui (3004)..." -ForegroundColor Yellow
}

try {
    Invoke-RestMethod -Uri "http://127.0.0.1:8080/health" -TimeoutSec 3 | Out-Null
    Write-Host "سلامت API: OK" -ForegroundColor Green
} catch {
    Write-Host "سلامت API: در این لحظه پاسخ نداد (بعداً دوباره تلاش کنید)." -ForegroundColor Yellow
}

$hubUri = ([System.Uri]$hubFile).AbsoluteUri
Write-Host "`netabs/هاب: $hubUri" -ForegroundColor Green
Start-Process $hubUri

Write-Host "`nبرای فقط کاربر + mock از قبل: scripts\dev-user-stack.ps1" -ForegroundColor DarkGray
Write-Host "GitHub: https://github.com/m-khonyagar/Amline_namAvaran" -ForegroundColor DarkGray
