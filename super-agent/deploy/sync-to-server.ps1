#Requires -Version 5.1
param(
    [Parameter(Mandatory = $true)][string]$HostName,
    [string]$User = "root",
    [string]$RemotePath = "/opt/super-agent",
    [string]$KeyPath = "",
    [string]$LocalRoot = ""
)
$ErrorActionPreference = "Stop"
if (-not $LocalRoot) { $LocalRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path) }

$archive = Join-Path $env:TEMP "super-agent-deploy.tgz"
if (Test-Path $archive) { Remove-Item $archive -Force }

Push-Location $LocalRoot
try {
    if (-not (Get-Command tar -ErrorAction SilentlyContinue)) {
        throw "tar not found. Use Windows 10+ or install Git Bash tar."
    }
    tar -czf $archive `
        --exclude='.venv' `
        --exclude='.git' `
        --exclude='__pycache__' `
        --exclude='*.pyc' `
        --exclude='memory/*.db' `
        --exclude='logs/*.log' `
        .
} finally { Pop-Location }

$sshTarget = "${User}@${HostName}"
$dest = "${sshTarget}:${RemotePath}/bundle.tgz"
if ($KeyPath) {
    scp -i $KeyPath $archive $dest
} else {
    scp $archive $dest
}

Write-Host "On server (example):" -ForegroundColor Green
Write-Host "  mkdir -p $RemotePath && tar -xzf $RemotePath/bundle.tgz -C $RemotePath"
Write-Host "  chmod +x $RemotePath/deploy/parmin-bootstrap.sh && $RemotePath/deploy/parmin-bootstrap.sh $RemotePath"
Write-Host "Optional: SUPER_AGENT_MODEL=qwen2.5:7b-instruct $RemotePath/deploy/parmin-bootstrap.sh $RemotePath"
