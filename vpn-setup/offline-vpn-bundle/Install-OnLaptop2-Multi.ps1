#Requires -Version 5.1
#Requires -RunAsAdministrator
param(
  [switch] $UninstallFirst,
  [switch] $ResetNetwork,
  [switch] $NoAutoLaunch,
  [switch] $AutoConnect,
  [string] $SharedPassword
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path

function Get-UninstallEntry {
  param([string] $NameMatch)
  $paths = @(
    "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*",
    "HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*"
  )
  foreach ($p in $paths) {
    $hit = Get-ItemProperty $p -ErrorAction SilentlyContinue |
      Where-Object { $_.DisplayName -and $_.DisplayName -match $NameMatch } |
      Select-Object -First 1
    if ($hit) { return $hit }
  }
  return $null
}

function Uninstall-OpenVpnConnect {
  $entry = Get-UninstallEntry "OpenVPN Connect"
  if (-not $entry) {
    Write-Host "No existing OpenVPN Connect in Programs list." -ForegroundColor DarkGray
    return
  }
  Write-Host "Removing: $($entry.DisplayName) ..." -ForegroundColor Yellow
  if ($entry.QuietUninstallString) {
    $cmd = $entry.QuietUninstallString
    if ($cmd -match '^"([^"]+)"\s*(.*)$') {
      $exe = $Matches[1]; $args = $Matches[2]
      Start-Process -FilePath $exe -ArgumentList $args -Wait -NoNewWindow
    } else {
      cmd.exe /c $cmd
    }
    return
  }
  if ($entry.UninstallString -match 'msiexec') {
    $guid = [regex]::Match($entry.UninstallString, '\{[A-F0-9\-]+\}').Value
    if ($guid) {
      Start-Process msiexec.exe -ArgumentList @("/x", $guid, "/qn", "REBOOT=ReallySuppress") -Wait -NoNewWindow
      return
    }
  }
  throw "Uninstall OpenVPN Connect manually from Settings > Apps."
}

function Read-AuthFile {
  param([string] $Path)
  if (-not (Test-Path -LiteralPath $Path)) { return $null, $null }
  $lines = @(Get-Content -LiteralPath $Path -Encoding UTF8 | ForEach-Object { $_.TrimEnd() } | Where-Object { $_ -ne "" })
  if ($lines.Count -lt 1) { return $null, $null }
  $u = $lines[0]
  $p = if ($lines.Count -ge 2) { ($lines[1..($lines.Count - 1)] -join "`n") } else { $null }
  return $u, $p
}

Write-Host "`n=== OpenVPN Connect offline setup (multi-profile) ===" -ForegroundColor Cyan

if ($UninstallFirst) {
  Uninstall-OpenVpnConnect
  Start-Sleep -Seconds 2
}

if ($ResetNetwork) {
  Write-Host "Resetting active adapters to DHCP..." -ForegroundColor Yellow
  Get-NetAdapter | Where-Object { $_.Status -eq "Up" -and $_.HardwareInterface -eq $true } | ForEach-Object {
    $ifName = $_.Name
    netsh interface ip set address name="$ifName" dhcp 2>$null | Out-Null
    netsh interface ip set dns name="$ifName" dhcp 2>$null | Out-Null
    Write-Host "  DHCP: $ifName" -ForegroundColor Green
  }
  ipconfig /flushdns | Out-Null
}

$msi = @(
  Get-ChildItem -Path $Root -Filter "*.msi" -File -ErrorAction SilentlyContinue
  Get-ChildItem -Path (Join-Path $Root "installers") -Filter "*.msi" -File -ErrorAction SilentlyContinue
) | Select-Object -First 1
if (-not $msi) {
  throw "No .msi in $Root or installers\. Add OpenVPN Connect installer."
}

$manifestPath = Join-Path $Root "manifest.json"
if (-not (Test-Path $manifestPath)) { throw "Missing manifest.json" }
$manifest = Get-Content -LiteralPath $manifestPath -Raw -Encoding UTF8 | ConvertFrom-Json
if ($manifest -isnot [System.Array]) { $manifest = @($manifest) }

$sharedPass = $SharedPassword
if (-not $sharedPass) { $sharedPass = $env:VPN_BUNDLE_PLAIN_PASSWORD }

if (-not $sharedPass) {
  foreach ($e in $manifest) {
    $authF = Join-Path $Root "credentials\$($e.id).auth"
    $_, $pf = Read-AuthFile $authF
    if ($pf) { $sharedPass = $pf; break }
  }
}

if (-not $sharedPass) {
  Write-Host "`nEnter VPN password once (used for every profile in manifest.json):" -ForegroundColor Yellow
  $sec = Read-Host -AsSecureString
  if (-not $sec) { throw "Password required." }
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec)
  try {
    $sharedPass = [Runtime.InteropServices.Marshal]::PtrToStringUni($bstr)
  } finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
  }
}

Write-Host "`nInstalling OpenVPN Connect..." -ForegroundColor Yellow
$p = Start-Process msiexec.exe -ArgumentList @("/i", $msi.FullName, "/qn", "REBOOT=ReallySuppress") -Wait -PassThru
if ($p.ExitCode -ne 0 -and $p.ExitCode -ne 3010) {
  throw "msiexec failed: $($p.ExitCode)"
}

$connectExe = Join-Path $env:ProgramFiles "OpenVPN Connect\OpenVPNConnect.exe"
if (-not (Test-Path $connectExe)) {
  $pf86 = [Environment]::GetEnvironmentVariable("ProgramFiles(x86)")
  if ($pf86) { $connectExe = Join-Path $pf86 "OpenVPN Connect\OpenVPNConnect.exe" }
}
if (-not (Test-Path $connectExe)) { throw "OpenVPNConnect.exe not found after install." }

$imported = 0
foreach ($e in $manifest) {
  $ovpnPath = Join-Path $Root $e.file
  if (-not (Test-Path -LiteralPath $ovpnPath)) {
    Write-Host "Skip missing file: $($e.file)" -ForegroundColor Red
    continue
  }
  $user = $e.username
  $pass = $sharedPass
  $authF = Join-Path $Root "credentials\$($e.id).auth"
  $uFile, $pFile = Read-AuthFile $authF
  if ($uFile) { $user = $uFile }
  if ($pFile) { $pass = $pFile }
  if (-not $user) {
    Write-Host "Skip $($e.id): no username in manifest or credentials." -ForegroundColor Yellow
    continue
  }
  $disp = if ($e.displayName) { [string]$e.displayName } else { "VPN-$($e.id)" }
  $disp = ($disp -replace '[\\/:*?"<>|]', "_").Trim()
  if ($disp.Length -gt 80) { $disp = $disp.Substring(0, 80) }

  Write-Host "`nImporting: $disp" -ForegroundColor Cyan
  $args = @(
    "--accept-gdpr", "--skip-startup-dialogs",
    "--import-profile=$ovpnPath",
    "--name=$disp",
    "--username=$user",
    "--password=$pass"
  )
  $proc = Start-Process -FilePath $connectExe -ArgumentList $args -Wait -PassThru -NoNewWindow
  if ($proc.ExitCode -eq 0) {
    $imported++
    Write-Host "  OK" -ForegroundColor Green
  } else {
    Write-Host "  Exit $($proc.ExitCode) - try importing this .ovpn manually in the app." -ForegroundColor Yellow
  }
}

if ($imported -eq 0) { throw "No profile imported successfully." }

if ($AutoConnect) {
  Start-Process -FilePath $connectExe -ArgumentList @(
    "--accept-gdpr", "--skip-startup-dialogs",
    "--set-setting=launch-options", "--value=connect-latest"
  ) -Wait -NoNewWindow
}

if (-not $NoAutoLaunch) {
  Start-Process -FilePath $connectExe -ArgumentList @("--accept-gdpr", "--skip-startup-dialogs", "--minimize")
}

Write-Host ""
Write-Host ("Done. {0} profile(s) imported; first in manifest = priority. Use tray to connect if needed." -f $manifest.Count) -ForegroundColor Green
