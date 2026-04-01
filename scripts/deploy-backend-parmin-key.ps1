#Requires -Version 5.1
<#
.SYNOPSIS
  Deploy backend to Parmin using OpenSSH + private key (no password auth on server).

.PARAMETER IdentityFile
  Path to private key (e.g. the key pair for pubkey you added in /root/.ssh/authorized_keys).

.EXAMPLE
  cd Amline_namAvaran
  .\scripts\deploy-backend-parmin-key.ps1 -IdentityFile "$HOME\.ssh\amline-deploy"

.EXAMPLE
  $env:PARMIN_SSH_KEY = "$HOME\.ssh\amline-deploy"
  .\scripts\deploy-backend-parmin-key.ps1
#>
[CmdletBinding()]
param(
  [string]$IdentityFile = '',
  [string]$HostName = '',
  [string]$User = ''
)

$ErrorActionPreference = 'Stop'

$hostName = if ($HostName) { $HostName } elseif ($env:PARMIN_HOST) { $env:PARMIN_HOST } else { '212.80.24.109' }
$user = if ($User) { $User } elseif ($env:PARMIN_USER) { $env:PARMIN_USER } else { 'root' }
$target = "${user}@${hostName}"

$keyPath = $IdentityFile
if ([string]::IsNullOrWhiteSpace($keyPath)) { $keyPath = $env:PARMIN_SSH_KEY }
if ([string]::IsNullOrWhiteSpace($keyPath)) {
  $candidates = @(
    (Join-Path $HOME '.ssh\amline-deploy'),
    (Join-Path $HOME '.ssh\amline_deploy'),
    (Join-Path $HOME '.ssh\id_ed25519'),
    (Join-Path $HOME '.ssh\id_rsa')
  )
  foreach ($c in $candidates) {
    if (Test-Path -LiteralPath $c) { $keyPath = $c; break }
  }
}
if ([string]::IsNullOrWhiteSpace($keyPath) -or -not (Test-Path -LiteralPath $keyPath)) {
  Write-Error "Private key not found. Pass -IdentityFile or set PARMIN_SSH_KEY. Tried: ~/.ssh/amline-deploy, amline_deploy, id_ed25519, id_rsa"
}

$ssh = Get-Command ssh.exe -ErrorAction SilentlyContinue
$scp = Get-Command scp.exe -ErrorAction SilentlyContinue
if (-not $ssh -or -not $scp) {
  Write-Error "OpenSSH client not found. Settings → Apps → Optional features → OpenSSH Client."
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$tempTgz = Join-Path $env:TEMP "amline-src-$(Get-Date -Format 'yyyyMMddHHmmss').tgz"
$remoteScript = Join-Path $PSScriptRoot 'parmin-server-deploy.sh'

$sshBase = @(
  '-o', 'BatchMode=yes',
  '-o', 'ConnectTimeout=30',
  '-o', 'StrictHostKeyChecking=accept-new',
  '-o', 'IdentitiesOnly=yes',
  '-i', $keyPath
)

Write-Host "=== Building archive (tar) ===" -ForegroundColor Cyan
Push-Location $repoRoot.Path
try {
  & tar.exe @(
    '-czf', $tempTgz,
    '--exclude=.git',
    '--exclude=node_modules',
    '--exclude=dist',
    '--exclude=.venv',
    '--exclude=__pycache__',
    '--exclude=.cursor',
    '--exclude=site/out',
    '.'
  )
} finally {
  Pop-Location
}
if (-not (Test-Path $tempTgz)) { Write-Error "tar failed" }

Write-Host "=== scp (archive + remote script) ===" -ForegroundColor Cyan
& scp.exe @sshBase $tempTgz "${target}:/tmp/amline-src.tgz"
if ($LASTEXITCODE -ne 0) {
  Remove-Item -Force $tempTgz -ErrorAction SilentlyContinue
  Write-Error "scp archive failed (exit $LASTEXITCODE). Check SSH key on server: docs/PARMIN_CONSOLE_SSH_KEY.md"
}
& scp.exe @sshBase $remoteScript "${target}:/tmp/parmin-server-deploy.sh"
if ($LASTEXITCODE -ne 0) {
  Remove-Item -Force $tempTgz -ErrorAction SilentlyContinue
  Write-Error "scp deploy script failed (exit $LASTEXITCODE)."
}

Write-Host "=== Run deploy on server ===" -ForegroundColor Cyan
$remoteCmd = 'chmod +x /tmp/parmin-server-deploy.sh && bash /tmp/parmin-server-deploy.sh && rm -f /tmp/parmin-server-deploy.sh'
& ssh.exe @sshBase $target $remoteCmd
if ($LASTEXITCODE -ne 0) {
  Remove-Item -Force $tempTgz -ErrorAction SilentlyContinue
  Write-Error "remote deploy failed (exit $LASTEXITCODE)."
}

Remove-Item -Force $tempTgz -ErrorAction SilentlyContinue
Write-Host "=== Done. api.amline.ir → proxy 127.0.0.1:8080 if needed (docs/DEPLOY_BACKEND_PARMIN.md). ===" -ForegroundColor Green
