# ============================================================
# نصب و اجرای Codex - یک‌بار اجرا کنید (PowerShell به‌صورت Administrator)
# ============================================================
# راست‌کلیک روی این فایل > Run with PowerShell
# یا در PowerShell: Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force; & "e:\CTO\install-and-run-codex.ps1"
# ============================================================

$ErrorActionPreference = "Continue"

Write-Host "=== Codex: نصب و اجرا ===" -ForegroundColor Cyan

# 1) نصب از Microsoft Store
Write-Host "`n[1/3] جستجو و نصب Codex از Microsoft Store..." -ForegroundColor Yellow
try {
    $result = winget install --id 9PLM9XGG6VKS -e --source msstore --accept-package-agreements --accept-source-agreements 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "نصب Codex با موفقیت انجام شد." -ForegroundColor Green
    } else {
        # fallback: جستجو
        $search = winget search "Codex" 2>&1 | Out-String
        if ($search -match "OpenAI") {
            Write-Host "Codex در Store یافت شد. در حال نصب..." -ForegroundColor Yellow
            winget install --id 9PLM9XGG6VKS -e --source msstore --accept-package-agreements --accept-source-agreements
        } else {
            Write-Host "نصب خودکار ممکن نبود. لطفاً از Microsoft Store عبارت 'Codex' را جستجو و نصب کنید." -ForegroundColor Magenta
        }
    }
} catch {
    Write-Host "winget در دسترس نیست یا خطا رخ داد. نصب دستی از Microsoft Store (جستجو: Codex)." -ForegroundColor Magenta
}

# 2) اجرای Codex
Write-Host "`n[2/3] در حال اجرای Codex..." -ForegroundColor Yellow
Start-Sleep -Seconds 2
try {
    $pkg = Get-AppxPackage -Name "OpenAI.Codex" -ErrorAction SilentlyContinue
    if ($pkg) {
        Start-Process "explorer.exe" -ArgumentList "shell:AppsFolder\OpenAI.Codex_2p2nqsd0c76g0!App" -ErrorAction SilentlyContinue
        Write-Host "Codex اجرا شد." -ForegroundColor Green
    } else {
        Start-Process "Codex" -ErrorAction SilentlyContinue
        if (-not $?) { Write-Host "از منوی Start عبارت Codex را جستجو و برنامه را باز کنید." -ForegroundColor Magenta }
        else { Write-Host "Codex اجرا شد." -ForegroundColor Green }
    }
} catch {
    Start-Process "Codex" -ErrorAction SilentlyContinue
    Write-Host "از منوی Start عبارت 'Codex' را جستجو و برنامه را باز کنید." -ForegroundColor Magenta
}

# 3) باز کردن پوشه پروژه (برای کپی مسیر)
Write-Host "`n[3/3] پوشه پروژه: e:\CTO" -ForegroundColor Yellow
Write-Host "داخل Codex: Add project / Open folder و این مسیر را انتخاب کنید: e:\CTO" -ForegroundColor Gray

Write-Host "`n=== تمام. در Codex با حساب OpenAI وارد شوید و در صورت نیاز API key را فقط در خود برنامه وارد کنید. ===" -ForegroundColor Cyan
