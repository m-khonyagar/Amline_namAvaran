#Requires -Version 5.1
<#
  Deploys offline VPN bundle to F:\VPN (or -TargetRoot).
  Run on laptop 1. Does not embed VPN password on disk by default (USB risk).
  Laptop 2 script prompts once for password, then imports all profiles in priority order.
#>
param(
  [string] $TargetRoot = "F:\VPN",

  [string] $PlainPassword,

  [switch] $SkipMsiDownload,

  [switch] $EmbedPasswordInAuthFiles
)

$ErrorActionPreference = "Stop"

$pw = $PlainPassword
if (-not $pw) { $pw = $env:VPN_BUNDLE_PLAIN_PASSWORD }

$profilesDir = Join-Path $env:APPDATA "OpenVPN Connect\profiles"
$configPath = Join-Path $env:APPDATA "OpenVPN Connect\config.json"
if (-not (Test-Path $profilesDir)) { throw "Missing profiles: $profilesDir" }
if (-not (Test-Path $configPath)) { throw "Missing config: $configPath" }

$top = Get-Content -LiteralPath $configPath -Raw -Encoding UTF8 | ConvertFrom-Json
$rootObj = $top.'persist:root' | ConvertFrom-Json
$status = $rootObj.status
if ($status -is [string]) { $status = $status | ConvertFrom-Json }

$profilesMeta = @{}
foreach ($prop in $status.profiles.PSObject.Properties) {
  $profilesMeta[$prop.Name] = $prop.Value
}

# Prefer profile matching active server hostname (screenshot: amline.tnl.linuxcloud.ir; configs may use linuzcloud)
$preferredHosts = @(
  "amline.tnl.linuxcloud.ir",
  "amline.tnl.linuzcloud.ir"
)

$connectedId = $null
if ($status.connectedProfile -and $status.connectedProfile.id) {
  $connectedId = [string]$status.connectedProfile.id
}
if (-not $connectedId -and $status.previouslyConnectedProfile -and $status.previouslyConnectedProfile.id) {
  $connectedId = [string]$status.previouslyConnectedProfile.id
}

if (-not $connectedId -and $status.lastAction) {
  $la = $status.lastAction
  if ($la -is [string]) { $la = $la | ConvertFrom-Json -ErrorAction SilentlyContinue }
  if ($la -and $la.payload -and $la.payload.profileId) {
    $connectedId = [string]$la.payload.profileId
  }
}

$allFiles = @(Get-ChildItem $profilesDir -Filter "*.ovpn" -File)
$manifest = @()

foreach ($f in $allFiles) {
  $id = $f.BaseName
  $meta = $profilesMeta[$id]
  $username = ""
  $display = $id
  $remoteHost = ""
  $lastConn = 0
  if ($meta) {
    if ($meta.username) { $username = [string]$meta.username }
    if ($meta.profileDisplayName) { $display = [string]$meta.profileDisplayName }
    elseif ($meta.name) { $display = [string]$meta.name }
    if ($meta.remoteHost) { $remoteHost = [string]$meta.remoteHost }
    if ($meta.lastConnected) { $lastConn = [long]$meta.lastConnected }
  }
  $manifest += [pscustomobject]@{
    id           = $id
    file         = "profiles\$id.ovpn"
    username     = $username
    displayName  = $display
    remoteHost   = $remoteHost
    lastConnected = $lastConn
    preferred    = $false
  }
}

# Mark preferred: exact connected id, else host match, else first by lastConnected
if ($connectedId -and ($manifest | Where-Object { $_.id -eq $connectedId })) {
  ($manifest | Where-Object { $_.id -eq $connectedId }).preferred = $true
} else {
  foreach ($h in $preferredHosts) {
    $hit = $manifest | Where-Object { $_.remoteHost -eq $h } | Select-Object -First 1
    if ($hit) { $hit.preferred = $true; break }
  }
}
if (-not ($manifest | Where-Object { $_.preferred })) {
  ($manifest | Sort-Object -Property lastConnected -Descending | Select-Object -First 1).preferred = $true
}

$ordered = @(
  $manifest | Where-Object { $_.preferred } | Sort-Object -Property lastConnected -Descending
  $manifest | Where-Object { -not $_.preferred } | Sort-Object -Property lastConnected -Descending
)

# Dedupe by id (keep order)
$seen = @{}
$finalOrder = @()
foreach ($m in $ordered) {
  if ($seen[$m.id]) { continue }
  $seen[$m.id] = $true
  $finalOrder += $m
}

$installers = Join-Path $TargetRoot "installers"
$profOut = Join-Path $TargetRoot "profiles"
$credOut = Join-Path $TargetRoot "credentials"

if (Test-Path $TargetRoot) {
  Remove-Item $TargetRoot -Recurse -Force -ErrorAction Stop
}
New-Item -ItemType Directory -Force -Path $installers, $profOut, $credOut | Out-Null

foreach ($f in $allFiles) {
  Copy-Item -LiteralPath $f.FullName -Destination (Join-Path $profOut $f.Name) -Force
}

if (-not $SkipMsiDownload) {
  Write-Host "Downloading OpenVPN Connect MSI (winget)..." -ForegroundColor Cyan
  $wi = Start-Process -FilePath "winget.exe" -ArgumentList @(
    "download", "-e", "--id", "OpenVPNTechnologies.OpenVPNConnect",
    "-d", $installers, "--accept-package-agreements", "--disable-interactivity"
  ) -Wait -PassThru -NoNewWindow
  if ($wi.ExitCode -ne 0) {
    Write-Host "winget failed; checking Downloads for OpenVPN MSI..." -ForegroundColor Yellow
  }
  if (-not (Get-ChildItem $installers -Filter "*.msi" -File -ErrorAction SilentlyContinue)) {
    $fromDl = Get-ChildItem (Join-Path $env:USERPROFILE "Downloads") -Filter "*.msi" -File -ErrorAction SilentlyContinue |
      Where-Object { $_.Name -match 'openvpn|OpenVPN' } |
      Sort-Object LastWriteTime -Descending |
      Select-Object -First 1
    if ($fromDl) {
      Copy-Item -LiteralPath $fromDl.FullName -Destination (Join-Path $installers $fromDl.Name) -Force
      Write-Host "Copied: $($fromDl.Name)" -ForegroundColor Green
    }
  }
}

$msi = Get-ChildItem $installers -Filter "*.msi" -File -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $msi) {
  Write-Host "WARNING: No MSI in $installers. Put OpenVPN Connect .msi there before using laptop 2." -ForegroundColor Red
}

$finalOrder | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $TargetRoot "manifest.json") -Encoding UTF8

if ($pw) { $EmbedPasswordInAuthFiles = $true }

# Optional: embed password into per-profile credential files (USB risk — delete credentials\ after setup)
if ($EmbedPasswordInAuthFiles -and $pw) {
  foreach ($entry in $finalOrder) {
    if (-not $entry.username) { continue }
    $pth = Join-Path $credOut "$($entry.id).auth"
    $enc = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($pth, "$($entry.username)`r`n$pw`r`n", $enc)
  }
}

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
Copy-Item -LiteralPath (Join-Path $here "Install-OnLaptop2-Multi.ps1") -Destination (Join-Path $TargetRoot "Install-OnLaptop2-Multi.ps1") -Force
Copy-Item -LiteralPath (Join-Path $here "Setup-Laptop2-FDrive.ps1") -Destination (Join-Path $TargetRoot "Setup-Laptop2-FDrive.ps1") -Force
Copy-Item -LiteralPath (Join-Path $here "RUN-ON-LAPTOP2-FDRIVE.bat") -Destination (Join-Path $TargetRoot "RUN-ON-LAPTOP2.bat") -Force
Copy-Item -LiteralPath (Join-Path $here "FETCH-MSI-IF-MISSING.ps1") -Destination (Join-Path $TargetRoot "FETCH-MSI-IF-MISSING.ps1") -Force

Copy-Item -LiteralPath (Join-Path $here "README-FDRIVE-FA.txt") -Destination (Join-Path $TargetRoot "README-FA.txt") -Force

Write-Host "`nDeployed to $TargetRoot" -ForegroundColor Green
Write-Host "Profiles: $($finalOrder.Count); preferred id: $(($finalOrder | Where-Object preferred).id)`n" -ForegroundColor Cyan
