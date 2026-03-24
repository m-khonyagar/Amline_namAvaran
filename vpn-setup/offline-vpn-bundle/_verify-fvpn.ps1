$root = "F:\VPN"
if (-not (Test-Path $root)) {
  Write-Host "FAIL: F:\VPN not found" -ForegroundColor Red
  exit 1
}

Write-Host "`n=== F:\VPN files ===" -ForegroundColor Cyan
Get-ChildItem $root -Recurse -File | ForEach-Object { "{0,-8} {1}" -f $_.Length, $_.FullName }

Write-Host "`n=== MSI ===" -ForegroundColor Cyan
$msi = @(Get-ChildItem (Join-Path $root "installers") -Filter "*.msi" -File -ErrorAction SilentlyContinue)
if ($msi.Count -ge 1) {
  Write-Host "OK: $($msi[0].Name) ($($msi[0].Length) bytes)" -ForegroundColor Green
} else {
  Write-Host "FAIL: No .msi in installers\" -ForegroundColor Red
}

Write-Host "`n=== manifest + profile files ===" -ForegroundColor Cyan
$mj = Join-Path $root "manifest.json"
$manifest = Get-Content $mj -Raw -Encoding UTF8 | ConvertFrom-Json
if ($manifest -isnot [array]) { $manifest = @($manifest) }
$allOk = $true
foreach ($e in $manifest) {
  $p = Join-Path $root ($e.file -replace '\\', '\')
  $ex = Test-Path -LiteralPath $p
  if (-not $ex) { $allOk = $false }
  $pr = $e.preferred
  Write-Host ("  id={0} preferred={1} exists={2}" -f $e.id, $pr, $ex)
}
if (-not $allOk) { Write-Host "FAIL: missing .ovpn" -ForegroundColor Red } else { Write-Host "OK: all profile files present" -ForegroundColor Green }

Write-Host "`n=== credentials ===" -ForegroundColor Cyan
$cr = @(Get-ChildItem (Join-Path $root "credentials") -File -ErrorAction SilentlyContinue)
if ($cr.Count -eq 0) {
  Write-Host "  (none - laptop 2 will prompt for VPN password)" -ForegroundColor DarkGray
} else {
  $cr | ForEach-Object { Write-Host "  $($_.Name)" -ForegroundColor Green }
}

Write-Host "`n=== Script syntax ===" -ForegroundColor Cyan
$parseErrs = $null
$null = [System.Management.Automation.Language.Parser]::ParseFile(
  (Join-Path $root "Install-OnLaptop2-Multi.ps1"), [ref]$null, [ref]$parseErrs)
if ($parseErrs.Count -gt 0) {
  Write-Host "FAIL Install-OnLaptop2-Multi.ps1" -ForegroundColor Red
  $parseErrs | ForEach-Object { $_.ToString() }
} else {
  Write-Host "OK: Install-OnLaptop2-Multi.ps1 parses" -ForegroundColor Green
}

Write-Host "`n=== Summary ===" -ForegroundColor Cyan
$pass = ($msi.Count -ge 1) -and $allOk -and ($parseErrs.Count -eq 0)
if ($pass) {
  Write-Host "Bundle checks PASSED (ready for laptop 2 after RUN-ON-LAPTOP2.bat as admin)." -ForegroundColor Green
  exit 0
} else {
  Write-Host "Bundle checks FAILED - fix items above." -ForegroundColor Red
  exit 1
}
