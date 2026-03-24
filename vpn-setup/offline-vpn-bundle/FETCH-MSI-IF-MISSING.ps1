# Run on laptop 1 while online if F:\VPN\installers has no .msi
$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
$inst = Join-Path $dir "installers"
New-Item -ItemType Directory -Force -Path $inst | Out-Null
if (Get-ChildItem $inst -Filter "*.msi" -File) {
  Write-Host "MSI already present."
  exit 0
}
$u = "https://packages.openvpn.net/connect/v3/openvpn-connect-3.8.0.4528_signed.msi"
$out = Join-Path $inst "openvpn-connect-3.8.0.4528_signed.msi"
Write-Host "Downloading..."
try {
  Invoke-WebRequest -Uri $u -OutFile $out -UseBasicParsing
} catch {
  Write-Host "Download failed: $($_.Exception.Message)" -ForegroundColor Red
  exit 1
}
$item = Get-Item -LiteralPath $out -ErrorAction SilentlyContinue
if (-not $item -or $item.Length -lt 1MB) {
  Write-Host "Download incomplete or missing file." -ForegroundColor Red
  exit 1
}
Write-Host "Saved: $out ($([math]::Round($item.Length/1MB, 2)) MB)" -ForegroundColor Green
