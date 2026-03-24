# Cloudflare WARP - Free VPN for personal use
# Run: powershell -ExecutionPolicy Bypass -File install-warp.ps1

$ErrorActionPreference = "Stop"
Write-Host "=== Installing Cloudflare WARP (Free VPN) ===" -ForegroundColor Cyan

$warpUrl = "https://1111-releases.cloudflareclient.com/windows/Cloudflare_WARP_Release-x64.msi"
$installerPath = "$env:TEMP\Cloudflare_WARP.msi"

Write-Host "Downloading..." -ForegroundColor Yellow
try {
    Invoke-WebRequest -Uri $warpUrl -OutFile $installerPath -UseBasicParsing
} catch {
    Write-Host "Direct download failed. Trying winget..." -ForegroundColor Yellow
    winget install Cloudflare.Warp --accept-package-agreements --accept-source-agreements
    exit 0
}

Write-Host "Installing..." -ForegroundColor Yellow
Start-Process msiexec.exe -ArgumentList "/i", "`"$installerPath`"", "/quiet", "/norestart" -Wait

Remove-Item $installerPath -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "=== Installation Complete! ===" -ForegroundColor Green
Write-Host "1. Open '1.1.1.1 WARP' from Start menu"
Write-Host "2. Click Connect"
Write-Host "3. Done!"
Write-Host ""
