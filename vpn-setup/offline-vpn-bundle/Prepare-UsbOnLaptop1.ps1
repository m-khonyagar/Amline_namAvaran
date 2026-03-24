#Requires -Version 5.1
<#
  Run on LAPTOP 1 (has Internet). Copies your working .ovpn into this bundle folder.
  You must still download OpenVPN Connect .msi from https://openvpn.net/client/
  and place it next to this script (or use -DownloadMsi with a direct MSI URL).
#>
param(
  [Parameter(Mandatory = $false)]
  [string] $SourceProfilePath,

  [Parameter(Mandatory = $false)]
  [string] $DownloadMsiUrl,

  [Parameter(Mandatory = $false)]
  [string] $MsiSaveName = "openvpn-connect-bundle.msi"
)

$ErrorActionPreference = "Stop"
$here = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "`n=== Prepare offline VPN bundle (laptop 1) ===" -ForegroundColor Cyan
Write-Host "Bundle folder: $here`n" -ForegroundColor DarkGray

if ($SourceProfilePath) {
  if (-not (Test-Path -LiteralPath $SourceProfilePath)) {
    throw "Profile not found: $SourceProfilePath"
  }
  $dest = Join-Path $here (Split-Path -Leaf $SourceProfilePath)
  Copy-Item -LiteralPath $SourceProfilePath -Destination $dest -Force
  Write-Host "Copied profile -> $dest" -ForegroundColor Green
} else {
  Write-Host "Tip: copy your .ovpn into:`n  $here`n" -ForegroundColor Yellow
}

if ($DownloadMsiUrl) {
  $out = Join-Path $here $MsiSaveName
  Write-Host "Downloading MSI..." -ForegroundColor Cyan
  Invoke-WebRequest -Uri $DownloadMsiUrl -OutFile $out -UseBasicParsing
  Write-Host "Saved -> $out" -ForegroundColor Green
} else {
  Write-Host "Download OpenVPN Connect for Windows (.msi) from:" -ForegroundColor Yellow
  Write-Host "  https://openvpn.net/client/" -ForegroundColor White
  Write-Host "Save the .msi file into:`n  $here`n" -ForegroundColor Yellow
}

$msi = Get-ChildItem -Path $here -Filter "*.msi" -File -ErrorAction SilentlyContinue
$ovpn = Get-ChildItem -Path $here -Filter "*.ovpn" -File -ErrorAction SilentlyContinue

Write-Host "--- Checklist ---" -ForegroundColor Cyan
Write-Host "  MSI present: $(if ($msi) { 'YES - ' + $msi.Name } else { 'NO' })"
Write-Host "  OVPN present: $(if ($ovpn) { 'YES - ' + ($ovpn.Name -join ', ') } else { 'NO' })"
Write-Host "`nCopy the whole folder to USB, then run Install-OnLaptop2.ps1 on laptop 2 (admin).`n" -ForegroundColor DarkGray
