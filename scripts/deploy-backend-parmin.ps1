#Requires -Version 5.1
<#
.SYNOPSIS
  Deploy backend stack to Parmin VPS from Windows (plink/pscp — no WSL/sshpass).

.DESCRIPTION
  Set password only in the shell session (never commit):
    $env:DEPLOY_PASSWORD = '...'   # copy from Parmin panel (exact characters)

  Optional:
    $env:PARMIN_HOST = '212.80.24.109'
    $env:PARMIN_USER = 'root'

.EXAMPLE
  cd Amline_namAvaran
  $env:DEPLOY_PASSWORD = 'your-root-password'
  .\scripts\deploy-backend-parmin.ps1
#>
$ErrorActionPreference = 'Stop'

$pass = $env:DEPLOY_PASSWORD
if ([string]::IsNullOrEmpty($pass)) {
  Write-Error "Set DEPLOY_PASSWORD to the server root password (Parmin → Access)."
}

$hostName = if ($env:PARMIN_HOST) { $env:PARMIN_HOST } else { '212.80.24.109' }
$user = if ($env:PARMIN_USER) { $env:PARMIN_USER } else { 'root' }
$target = "${user}@${hostName}"

function Find-PuTTYTool {
  param([string]$Name)
  $cmd = Get-Command $Name -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  $p = "${env:ProgramFiles}\PuTTY\$Name.exe"
  if (Test-Path $p) { return $p }
  $p = "${env:ProgramFiles(x86)}\PuTTY\$Name.exe"
  if (Test-Path $p) { return $p }
  return $null
}

$plink = Find-PuTTYTool 'plink'
$pscp = Find-PuTTYTool 'pscp'
if (-not $plink -or -not $pscp) {
  Write-Error "plink/pscp not found. Install PuTTY: winget install PuTTY.PuTTY"
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$tempTgz = Join-Path $env:TEMP "amline-src-$(Get-Date -Format 'yyyyMMddHHmmss').tgz"
$remoteScript = Join-Path $PSScriptRoot 'parmin-server-deploy.sh'

Write-Host "=== Building archive (tar) ===" -ForegroundColor Cyan
# Run tar from repo root (avoids tar.exe failing on non-ASCII -C paths on some Windows builds)
Push-Location $repoRoot.Path
try {
  $tarArgs = @(
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
  & tar.exe @tarArgs
} finally {
  Pop-Location
}
if (-not (Test-Path $tempTgz)) { Write-Error "tar failed" }

Write-Host "=== Host key (ssh-keyscan for plink -hostkey) ===" -ForegroundColor Cyan
$hostKeyExtra = @()
try {
  $scanLines = & ssh-keyscan.exe -T 12 -t ed25519,rsa $hostName 2>$null
  if ($scanLines) {
    foreach ($line in ($scanLines -split "`r?`n")) {
      if ($line -match '^\s*#' -or [string]::IsNullOrWhiteSpace($line)) { continue }
      $p = $line.Trim() -split '\s+'
      if ($p.Length -ge 3 -and $p[1] -match '^ssh-') {
        $hostKeyExtra = @('-hostkey', ($p[1] + ':' + $p[2]))
        Write-Host "Using host key type $($p[1])"
        break
      }
    }
  }
} catch { }
if ($hostKeyExtra.Count -eq 0) {
  Write-Warning "Could not get host key via ssh-keyscan (firewall/offline?). Run once: plink -ssh $target -pw ... then accept key, or fix network; pscp may fail with -batch."
}

Write-Host "=== Upload (pscp) ===" -ForegroundColor Cyan
$pscpArgs = @('-batch', '-pw', $pass) + $hostKeyExtra + @($tempTgz, "${target}:/tmp/amline-src.tgz")
& $pscp @pscpArgs
$pscpArgs2 = @('-batch', '-pw', $pass) + $hostKeyExtra + @($remoteScript, "${target}:/tmp/parmin-server-deploy.sh")
& $pscp @pscpArgs2

Write-Host "=== Run remote deploy ===" -ForegroundColor Cyan
$remoteBash = 'chmod +x /tmp/parmin-server-deploy.sh && bash /tmp/parmin-server-deploy.sh && rm -f /tmp/parmin-server-deploy.sh'
$plinkArgs = @('-batch', '-ssh', $target, '-pw', $pass) + $hostKeyExtra + @($remoteBash)
& $plink @plinkArgs

Remove-Item -Force $tempTgz -ErrorAction SilentlyContinue
Write-Host "=== Done. See docs/DEPLOY_BACKEND_PARMIN.md for api.amline.ir nginx. ===" -ForegroundColor Green
