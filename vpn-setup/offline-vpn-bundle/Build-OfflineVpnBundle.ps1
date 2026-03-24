#Requires -Version 5.1
<#
  Run once on LAPTOP 1 (online). Builds folder READY_TO_COPY with MSI + profile + vpn.auth.
  Password cannot be read from OpenVPN Connect (encrypted in Credential Manager). Supply it once:

    set VPN_BUNDLE_PLAIN_PASSWORD=YourVpnPassword
    powershell -ExecutionPolicy Bypass -File .\Build-OfflineVpnBundle.ps1

  Optional: -ProfileId 1773563126038  (default = newest .ovpn in OpenVPN Connect profiles)
#>
param(
  [string] $ProfileId,

  [string] $PlainPassword,

  [switch] $SkipMsiDownload
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$out = Join-Path $root "READY_TO_COPY"
$installers = Join-Path $out "installers"

$pw = $PlainPassword
if (-not $pw) { $pw = $env:VPN_BUNDLE_PLAIN_PASSWORD }
if (-not $pw) {
  throw @"
VPN password is stored encrypted by OpenVPN Connect and cannot be exported automatically.

Set it once for this build only (not saved in repo), then re-run:

  cmd.exe:
    set VPN_BUNDLE_PLAIN_PASSWORD=YOUR_PASSWORD_HERE
    powershell -ExecutionPolicy Bypass -File `"$($MyInvocation.MyCommand.Path)`"

  PowerShell:
    `$env:VPN_BUNDLE_PLAIN_PASSWORD = 'YOUR_PASSWORD_HERE'
    & `"$($MyInvocation.MyCommand.Path)`"
"@
}

$profilesDir = Join-Path $env:APPDATA "OpenVPN Connect\profiles"
if (-not (Test-Path $profilesDir)) {
  throw "OpenVPN Connect profiles folder not found: $profilesDir"
}

$ovpnSrc = $null
if ($ProfileId) {
  $cand = Join-Path $profilesDir "$ProfileId.ovpn"
  if (-not (Test-Path $cand)) { throw "Profile file not found: $cand" }
  $ovpnSrc = Get-Item $cand
} else {
  $ovpnSrc = Get-ChildItem $profilesDir -Filter "*.ovpn" -File | Sort-Object LastWriteTime -Descending | Select-Object -First 1
  if (-not $ovpnSrc) { throw "No .ovpn files in $profilesDir" }
}

$idFromName = if ($ovpnSrc.BaseName -match '^\d+$') { $ovpnSrc.BaseName } else { $null }
$configPath = Join-Path $env:APPDATA "OpenVPN Connect\config.json"
if (-not (Test-Path $configPath)) { throw "Missing $configPath" }
$cfgRaw = Get-Content -LiteralPath $configPath -Raw -Encoding UTF8
$username = $null
if ($idFromName) {
  $escId = [regex]::Escape($idFromName)
  if ($cfgRaw -match "`"$escId`"[\s\S]*?`"username`"\s*:\s*`"([^`"]*)`"") {
    $username = $Matches[1]
  }
}
if (-not $username) {
  throw "Could not resolve username for profile $($ovpnSrc.Name) from config.json. Use OpenVPN Connect on this PC once, or pass a known ProfileId."
}

New-Item -ItemType Directory -Force -Path $installers | Out-Null
if (-not $SkipMsiDownload) {
  $haveMsi = @(Get-ChildItem $installers -Filter "*.msi" -File)
  if ($haveMsi.Count -eq 0) {
    Write-Host "Downloading OpenVPN Connect MSI via winget..." -ForegroundColor Cyan
    try {
      $wi = Start-Process -FilePath "winget.exe" -ArgumentList @(
        "download", "-e", "--id", "OpenVPNTechnologies.OpenVPNConnect",
        "-d", $installers, "--accept-package-agreements", "--disable-interactivity"
      ) -Wait -PassThru -NoNewWindow
      if ($wi.ExitCode -ne 0) { throw "winget exit $($wi.ExitCode)" }
    } catch {
      Write-Host "winget failed: $($_.Exception.Message). Looking in Downloads..." -ForegroundColor Yellow
    }
    $haveMsi = @(Get-ChildItem $installers -Filter "*.msi" -File)
    if ($haveMsi.Count -eq 0) {
      $fromDl = Get-ChildItem (Join-Path $env:USERPROFILE "Downloads") -Filter "*.msi" -File -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -match 'openvpn|OpenVPN' } |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1
      if ($fromDl) {
        Copy-Item -LiteralPath $fromDl.FullName -Destination (Join-Path $installers $fromDl.Name) -Force
        Write-Host "Copied MSI from Downloads: $($fromDl.Name)" -ForegroundColor Green
      }
    }
  }
}

$msiFinal = Get-ChildItem $installers -Filter "*.msi" -File -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $msiFinal) {
  throw "No MSI in $installers. Download OpenVPN Connect .msi from https://openvpn.net/client/ into that folder, then run with -SkipMsiDownload."
}

# Copy profile unchanged (relative paths inside stay valid). Credentials go only to vpn.auth for the installer.
$bundleOvpn = Join-Path $out "vpn-bundle.ovpn"
Copy-Item -LiteralPath $ovpnSrc.FullName -Destination $bundleOvpn -Force

$authPath = Join-Path $out "vpn.auth"
$enc = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($authPath, "$username`r`n$pw`r`n", $enc)

Copy-Item -LiteralPath (Join-Path $root "Install-OnLaptop2.ps1") -Destination (Join-Path $out "Install-OnLaptop2.ps1") -Force
Copy-Item -LiteralPath (Join-Path $root "Setup-Laptop2-Offline.ps1") -Destination (Join-Path $out "Setup-Laptop2-Offline.ps1") -Force
Copy-Item -LiteralPath (Join-Path $root "RUN-ON-LAPTOP2.bat") -Destination (Join-Path $out "RUN-ON-LAPTOP2.bat") -Force

@"
OpenVPN Connect stores your password encrypted on this PC; it cannot be auto-exported.
This USB folder contains:
  - vpn-bundle.ovpn (includes client private key)
  - vpn.auth (username + password in PLAINTEXT — used once by the installer; you may delete it after VPN works)

Anyone with this drive can impersonate VPN login. Delete vpn.auth after the other PC works, or encrypt the drive.

Do NOT commit READY_TO_COPY to git (it is gitignored).
"@ | Set-Content -LiteralPath (Join-Path $out "SECURITY-WARNING.txt") -Encoding UTF8

Write-Host "`nBuilt: $out" -ForegroundColor Green
Write-Host "Copy the entire READY_TO_COPY folder to USB. On laptop 2: right-click RUN-ON-LAPTOP2.bat -> Run as administrator.`n" -ForegroundColor Cyan
