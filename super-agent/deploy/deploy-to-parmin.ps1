#Requires -Version 5.1
<#
.SYNOPSIS
  بستهٔ super-agent را به سرور می‌فرستد، باز می‌کند و با Docker بالا می‌آورد.

.DESCRIPTION
  از این ماشین (با شبکه‌ای که به سرور reach دارد) اجرا کنید. از این محیط Cursor معمولاً پورت ۲۲ timeout می‌شود.

.PARAMETER HostName
  آی‌پی یا نام میزبان (پیش‌فرض: 212.80.24.134)

.PARAMETER SshPort
  پورت SSH (پیش‌فرض: 22)

.PARAMETER KeyPath
  مسیر کلید خصوصی SSH (اختیاری؛ اگر خالی باشد از ssh-agent / تنظیمات پیش‌فرض استفاده می‌شود)

.NOTES
  قبل از اجرا در همین PowerShell:
    $env:OPENAI_API_KEY = "sk-..."
  اختیاری: $env:OPENAI_MODEL = "gpt-4o-mini"

  فایروال پارمین باید SSH و در صورت نیاز پورت 8080 را به IP شما باز کند.
#>
param(
    [string]$HostName = "212.80.24.134",
    [string]$User = "root",
    [int]$SshPort = 22,
    [string]$KeyPath = "",
    [string]$RemotePath = "/opt/super-agent",
    [string]$LocalSuperAgentRoot = ""
)

$ErrorActionPreference = "Stop"

if (-not $LocalSuperAgentRoot) {
    $LocalSuperAgentRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
}

if (-not (Get-Command ssh -ErrorAction SilentlyContinue) -or -not (Get-Command scp -ErrorAction SilentlyContinue)) {
    throw "OpenSSH Client لازم است (Windows: Optional Feature OpenSSH Client)."
}

if (-not (Get-Command tar -ErrorAction SilentlyContinue)) {
    throw "tar لازم است (Windows 10+ یا Git Bash)."
}

$keyEnv = $env:OPENAI_API_KEY
if (-not $keyEnv) {
    Write-Warning "OPENAI_API_KEY روی این شِل خالی است؛ کانتینر بالا می‌آید اما /ready خطا می‌دهد. حتماً بعداً در سرور فایل .env بسازید."
}

$SshOpts = @("-o", "StrictHostKeyChecking=accept-new", "-o", "ConnectTimeout=30", "-p", "$SshPort")
$ScpOpts = @("-P", "$SshPort", "-o", "StrictHostKeyChecking=accept-new", "-o", "ConnectTimeout=30")
if ($KeyPath) {
    $SshOpts = @("-i", $KeyPath) + $SshOpts
    $ScpOpts = @("-i", $KeyPath) + $ScpOpts
}

$Target = "${User}@${HostName}"
$bundle = Join-Path $env:TEMP "super-agent-parmin.tgz"
if (Test-Path $bundle) { Remove-Item $bundle -Force }

Write-Host "== ساخت آرشیو از $LocalSuperAgentRoot ==" -ForegroundColor Cyan
Push-Location $LocalSuperAgentRoot
try {
    tar -czf $bundle `
        --exclude='.venv' `
        --exclude='.git' `
        --exclude='__pycache__' `
        --exclude='*.pyc' `
        --exclude='memory/*.db' `
        --exclude='logs/*.log' `
        .
} finally { Pop-Location }

Write-Host "== اتصال SSH و ساخت دایرکتوری ==" -ForegroundColor Cyan
& ssh @SshOpts $Target "mkdir -p $RemotePath && chmod 700 $RemotePath"

Write-Host "== ارسال bundle ==" -ForegroundColor Cyan
& scp @ScpOpts $bundle "${Target}:${RemotePath}/bundle.tgz"

if ($keyEnv) {
    $envFile = Join-Path $env:TEMP "super-agent.env.remote"
    $model = if ($env:OPENAI_MODEL) { $env:OPENAI_MODEL } else { "gpt-4o-mini" }
    @(
        "OPENAI_API_KEY=$keyEnv"
        "OPENAI_MODEL=$model"
    ) | Set-Content -Path $envFile -Encoding utf8
    Write-Host "== ارسال .env (فقط کلید از همین شِل) ==" -ForegroundColor Cyan
    & scp @ScpOpts $envFile "${Target}:${RemotePath}/.env"
    Remove-Item $envFile -Force -ErrorAction SilentlyContinue
}

$remoteCmd = @"
set -euo pipefail
cd '$RemotePath'
tar -xzf bundle.tgz
chmod +x deploy/parmin-bootstrap.sh
if [ -f .env ]; then chmod 600 .env; fi
bash deploy/parmin-bootstrap.sh '$RemotePath'
"@

Write-Host "== اجرای bootstrap روی سرور ==" -ForegroundColor Cyan
& ssh @SshOpts $Target $remoteCmd

Write-Host ""
Write-Host "اگر موفق بود، در مرورگر (با باز بودن فایروال 8080):" -ForegroundColor Green
Write-Host "  http://${HostName}:8080/"
Write-Host ""
Write-Host "تست سریع از سرور: curl -s http://127.0.0.1:8080/health" -ForegroundColor DarkGray
