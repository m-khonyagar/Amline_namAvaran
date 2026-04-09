# پیش‌نمایش لوکال: dev-mock-api روی 8080 + فرانت‌ها (بدون Docker).
# استفاده: از ریشهٔ مخزن  .\scripts\start-local-preview.ps1
#
# پیش‌نیاز یک‌بار در هر کلون (در صورت خطای Vite/Next یا missing CLI):
#   npm install -w amline-admin-ui
#   npm install -w amline-ui
#   npm install -w amline-site
#   cd consultant-ui; npm install
#
# توقف: بستن پنجره‌های باز شده یا Task Manager / Stop-Process روی node/python

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$mock = Join-Path $root "dev-mock-api"
if (-not (Test-Path (Join-Path $mock "main.py"))) {
  Write-Error "dev-mock-api not found"
}

Get-NetTCPConnection -LocalPort 8080 -ErrorAction SilentlyContinue |
  ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }

Write-Host "Starting dev-mock-api on :8080 ..."
Start-Process -FilePath "python" -ArgumentList "-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", "8080" -WorkingDirectory $mock -WindowStyle Minimized

Start-Sleep -Seconds 2

Write-Host "Starting admin-ui :3002, amline-ui :3000, site :3005, consultant-ui :3004 ..."
$starts = @(
  @{ Cmd = "npm run dev -w amline-admin-ui" },
  @{ Cmd = "npm run dev -w amline-ui" },
  @{ Cmd = "npm run dev -w amline-site" }
)
foreach ($s in $starts) {
  Start-Process -FilePath "powershell" -ArgumentList "-NoExit", "-Command", "cd `"$root`"; $($s.Cmd)" -WindowStyle Minimized
}
Start-Process -FilePath "powershell" -ArgumentList "-NoExit", "-Command", "cd `"$root\consultant-ui`"; npm run dev" -WindowStyle Minimized

Write-Host ""
Write-Host "URLs:"
Write-Host "  Mock API:   http://127.0.0.1:8080/docs"
Write-Host "  Admin:      http://localhost:3002/login  (ورود آزمایشی — فقط dev)"
Write-Host "  Amline app: http://localhost:3000"
Write-Host "  Site:       http://localhost:3005"
Write-Host "  Consultant: http://localhost:3004  (اگر اشغال بود، vite خطا می‌دهد — پورت دیگر را ببندید)"
