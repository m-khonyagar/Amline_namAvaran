#Requires -Version 5.1
#Requires -RunAsAdministrator
<#
  Offline install: OpenVPN Connect + import .ovpn (OpenVPN Connect 3.3+ CLI).
  Run from USB copy on laptop 2. No Internet required if .msi and .ovpn are in this folder.
#>
param(
  [string] $ProfileFile,

  [string] $ProfileDisplayName = "ImportedProfile",

  [string] $VpnUser,

  [string] $VpnPass,

  [switch] $UninstallFirst,

  [switch] $ResetNetwork,

  [switch] $SkipImport,

  [switch] $NoAutoLaunch,

  [switch] $AutoConnect
)

$ErrorActionPreference = "Stop"
$here = Split-Path -Parent $MyInvocation.MyCommand.Path

function Read-VpnAuthFile {
  param([string] $Path)
  if (-not (Test-Path -LiteralPath $Path)) { return $null, $null }
  $lines = @(Get-Content -LiteralPath $Path -Encoding UTF8 | ForEach-Object { $_.TrimEnd() } | Where-Object { $_ -ne "" })
  if ($lines.Count -lt 2) { throw "vpn.auth must have line1=username, line2=password" }
  $u = $lines[0]
  $p = ($lines[1..($lines.Count - 1)] -join "`n")
  return $u, $p
}

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
    Write-Host "No existing OpenVPN Connect found in Add/Remove Programs." -ForegroundColor DarkGray
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
  if ($entry.UninstallString -match 'msiexec\.exe\s+/I\{') {
    $guid = [regex]::Match($entry.UninstallString, '\{[A-F0-9\-]+\}').Value
    if ($guid) {
      Start-Process msiexec.exe -ArgumentList @("/x", $guid, "/qn", "REBOOT=ReallySuppress") -Wait -NoNewWindow
      return
    }
  }
  throw "Could not determine quiet uninstall command. Remove OpenVPN Connect manually from Settings > Apps."
}

Write-Host "`n=== Offline OpenVPN Connect setup (laptop 2) ===" -ForegroundColor Cyan

if ($UninstallFirst) {
  Uninstall-OpenVpnConnect
  Start-Sleep -Seconds 2
}

if ($ResetNetwork) {
  Write-Host "`nResetting IPv4 on active adapters to DHCP (Wi-Fi / Ethernet)..." -ForegroundColor Yellow
  Get-NetAdapter | Where-Object { $_.Status -eq "Up" -and $_.HardwareInterface -eq $true } | ForEach-Object {
    $ifName = $_.Name
    try {
      netsh interface ip set address name="$ifName" dhcp 2>$null | Out-Null
      netsh interface ip set dns name="$ifName" dhcp 2>$null | Out-Null
      Write-Host "  DHCP: $ifName" -ForegroundColor Green
    } catch {
      Write-Host "  Skip (netsh): $ifName" -ForegroundColor DarkGray
    }
  }
  ipconfig /flushdns | Out-Null
  Write-Host "DNS cache flushed." -ForegroundColor DarkGray
}

$msi = @(
  Get-ChildItem -Path $here -Filter "*.msi" -File -ErrorAction SilentlyContinue
  Get-ChildItem -Path (Join-Path $here "installers") -Filter "*.msi" -File -ErrorAction SilentlyContinue
) | Sort-Object Name | Select-Object -First 1
if (-not $msi) {
  throw "No .msi in $here or $here\installers. Copy OpenVPN Connect installer (.msi) into installers\."
}

$authPath = Join-Path $here "vpn.auth"
if (-not $VpnUser -or -not $VpnPass) {
  $uFile, $pFile = Read-VpnAuthFile $authPath
  if ($uFile) {
    if (-not $VpnUser) { $VpnUser = $uFile }
    if (-not $VpnPass) { $VpnPass = $pFile }
  }
}

$ovpn = $null
$pref = Join-Path $here "vpn-bundle.ovpn"
if (Test-Path -LiteralPath $pref) {
  $ovpn = Get-Item -LiteralPath $pref
} elseif ($ProfileFile) {
  $cand = Join-Path $here $ProfileFile
  if (-not (Test-Path -LiteralPath $cand)) {
    throw "Profile not found: $cand"
  }
  $ovpn = Get-Item -LiteralPath $cand
} else {
  $all = @(Get-ChildItem -Path $here -Filter "*.ovpn" -File)
  if ($all.Count -eq 0) { throw "No .ovpn in $here. Expected vpn-bundle.ovpn or use -ProfileFile." }
  if ($all.Count -gt 1) {
    throw "Multiple .ovpn files. Use vpn-bundle.ovpn or -ProfileFile. Files: $($all.Name -join ', ')"
  }
  $ovpn = $all[0]
}

Write-Host "`nInstalling: $($msi.Name) ..." -ForegroundColor Yellow
$p = Start-Process -FilePath "msiexec.exe" -ArgumentList @("/i", $msi.FullName, "/qn", "REBOOT=ReallySuppress") -Wait -PassThru
if ($p.ExitCode -ne 0 -and $p.ExitCode -ne 3010) {
  throw "msiexec failed with exit code $($p.ExitCode). Try running without -UninstallFirst or install manually from the MSI."
}

$connectExe = Join-Path $env:ProgramFiles "OpenVPN Connect\OpenVPNConnect.exe"
if (-not (Test-Path -LiteralPath $connectExe)) {
  $pf86 = [Environment]::GetEnvironmentVariable("ProgramFiles(x86)")
  if ($pf86) {
    $connectExe = Join-Path $pf86 "OpenVPN Connect\OpenVPNConnect.exe"
  }
}
if (-not (Test-Path -LiteralPath $connectExe)) {
  throw "OpenVPNConnect.exe not found after install. Check Program Files for 'OpenVPN Connect'."
}

Write-Host "Installed: $connectExe" -ForegroundColor Green

if ($SkipImport) {
  Write-Host "`nSkipImport: copy $($ovpn.Name) manually via OpenVPN Connect > File > Import." -ForegroundColor Yellow
  if (-not $NoAutoLaunch) {
    Start-Process -FilePath $connectExe -ArgumentList @("--accept-gdpr", "--skip-startup-dialogs")
  }
  exit 0
}

$profPath = $ovpn.FullName
$importArgs = @(
  "--accept-gdpr",
  "--skip-startup-dialogs",
  "--import-profile=$profPath",
  "--name=$ProfileDisplayName"
)
if ($VpnUser) { $importArgs += "--username=$VpnUser" }
if ($VpnPass) { $importArgs += "--password=$VpnPass" }
elseif ((Get-Content -LiteralPath $profPath -Raw) -match '(?m)^\s*auth-user-pass\s*$') {
  Write-Host "No password in vpn.auth; OpenVPN Connect may prompt once after import." -ForegroundColor Yellow
}

Write-Host "`nImporting profile (needs Connect 3.3+) ..." -ForegroundColor Yellow
$importProc = Start-Process -FilePath $connectExe -ArgumentList $importArgs -Wait -PassThru -NoNewWindow
if ($importProc.ExitCode -ne 0) {
  Write-Host "CLI import returned exit $($importProc.ExitCode). Open the app and use File > Import for:`n  $profPath" -ForegroundColor Yellow
} else {
  Write-Host "Import finished (exit 0). Check OpenVPN Connect profile list." -ForegroundColor Green
}

if ($AutoConnect) {
  Write-Host "Setting launch option: connect-latest ..." -ForegroundColor DarkGray
  Start-Process -FilePath $connectExe -ArgumentList @(
    "--accept-gdpr", "--skip-startup-dialogs",
    "--set-setting=launch-options", "--value=connect-latest"
  ) -Wait -NoNewWindow
}

if (-not $NoAutoLaunch) {
  Start-Process -FilePath $connectExe -ArgumentList @("--accept-gdpr", "--skip-startup-dialogs", "--minimize")
}

Write-Host "`nDone. Connect to VPN from the tray / OpenVPN Connect window.`n" -ForegroundColor Cyan
