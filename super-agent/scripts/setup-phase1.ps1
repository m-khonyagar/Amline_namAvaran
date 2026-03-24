#Requires -Version 5.1
<#
.SYNOPSIS
  Phase 1 — Foundation (Blueprint §10): Ollama, Python venv, deps, optional Open WebUI hint.

.NOTES
  Run from repo root:  powershell -ExecutionPolicy Bypass -File super-agent\scripts\setup-phase1.ps1
  Or from super-agent: powershell -ExecutionPolicy Bypass -File .\scripts\setup-phase1.ps1
#>

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

Write-Host "== Super-Agent Phase 1 setup (root: $Root) ==" -ForegroundColor Cyan

if (-not (Get-Command ollama -ErrorAction SilentlyContinue)) {
    Write-Host "Ollama not found in PATH. Install from https://ollama.com/download then re-run." -ForegroundColor Yellow
} else {
    $model = "qwen2:7b-instruct"
    Write-Host "Pulling Ollama model: $model (first run may take a while)..." -ForegroundColor Cyan
    ollama pull $model
}

if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    Write-Host "Python not found. Install Python 3.11+ from https://www.python.org/downloads/ and re-run." -ForegroundColor Red
    exit 1
}

$venv = Join-Path $Root ".venv"
if (-not (Test-Path $venv)) {
    python -m venv $venv
}
$pip = Join-Path $venv "Scripts\pip.exe"
$py = Join-Path $venv "Scripts\python.exe"
& $pip install -U pip
& $pip install -r (Join-Path $Root "requirements.txt")
& $pip install -r (Join-Path $Root "requirements-server.txt")

Write-Host ""
Write-Host "Done. Try:" -ForegroundColor Green
Write-Host "  cd `"$Root`""
Write-Host "  .\.venv\Scripts\python.exe main.py --goal `"سلام، یک نقشه راه کوتاه بده`""
Write-Host "  .\.venv\Scripts\python.exe -m uvicorn server:app --host 127.0.0.1 --port 8080"
Write-Host "  سپس مرورگر: http://127.0.0.1:8080/"
Write-Host "  `$env:OPENAI_API_KEY='...'   # برای حالت پیش‌فرض OpenAI در config/default.yaml"
Write-Host "  curl http://127.0.0.1:8080/health"
Write-Host "  curl http://127.0.0.1:8080/ready   # وضعیت OPENAI_API_KEY یا Ollama"
Write-Host ""
Write-Host "Open WebUI (optional, Docker):" -ForegroundColor DarkGray
Write-Host "  docker run -d -p 3000:8080 --add-host=host.docker.internal:host-gateway -v open-webui:/app/backend/data --name open-webui --restart always ghcr.io/open-webui/open-webui:main"
Write-Host "  Then set Ollama URL to http://host.docker.internal:11434 in Open WebUI settings."
