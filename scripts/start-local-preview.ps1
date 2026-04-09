# پیش‌نمایش لوکال: dev-mock-api روی 8080 + فرانت‌ها (بدون Docker).
# استفاده: از ریشهٔ مخزن  .\scripts\start-local-preview.ps1
#
# پیش‌نیاز یک‌بار در هر کلون:
#   npm ci
# (بیلد ui-core اگر لازم باشد با `npm run ensure-ui-core` انجام می‌شود؛ dev:* از ریشه خودشان ensure دارند)
#
# پیش‌نیاز در صورت خطای Vite/Next یا missing CLI (همان پکیج):
#   npm install -w amline-admin-ui
#   npm install -w amline-ui
#   npm install -w amline-site
#
# توقف: بستن پنجره‌های باز شده یا Task Manager / Stop-Process روی node/python

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$mock = Join-Path $root "dev-mock-api"
if (-not (Test-Path (Join-Path $mock "main.py"))) {
  Write-Error "dev-mock-api not found"
}

function Stop-ListenersOnPort {
  param([int[]]$Ports)
  foreach ($p in $Ports) {
    Get-NetTCPConnection -LocalPort $p -ErrorAction SilentlyContinue |
      ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
  }
}

# mock 8080، ادمین 3002، اپ کاربر 3000، مشاور 3004، سایت 3005
Stop-ListenersOnPort -Ports @(8080, 3000, 3002, 3004, 3005)

npm run ensure-ui-core
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Starting dev-mock-api on :8080 ..."
Start-Process -FilePath "python" -ArgumentList "-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", "8080" -WorkingDirectory $mock -WindowStyle Minimized

Start-Sleep -Seconds 2

Write-Host "Starting admin-ui :3002, amline-ui :3000, site :3005, consultant-ui :3004 ..."
$starts = @(
  @{ Cmd = "npm run dev -w amline-admin-ui" },
  @{ Cmd = "npm run dev -w amline-ui" },
  @{ Cmd = "npm run dev -w amline-site" },
  @{ Cmd = "npm run dev -w amline-consultant-ui" }
)
foreach ($s in $starts) {
  Start-Process -FilePath "powershell" -ArgumentList "-NoExit", "-Command", "cd `"$root`"; $($s.Cmd)" -WindowStyle Minimized
}

Write-Host ""
Write-Host "URLs:"
Write-Host "  Mock API:   http://127.0.0.1:8080/docs"
Write-Host "  Admin:      http://localhost:3002/login  (ورود آزمایشی — فقط dev)"
Write-Host "  Amline app: http://localhost:3000"
Write-Host "  Site:       http://localhost:3005"
Write-Host "  Consultant: http://localhost:3004  (strictPort — اگر اشغال بود، پورت را آزاد کنید)"
