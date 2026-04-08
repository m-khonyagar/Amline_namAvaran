# Remove 0-byte files (except .gitkeep) and Windows-style duplicate filenames.
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
if (-not (Test-Path (Join-Path $root '.git'))) { $root = 'E:\Amline_namAvaran' }

function Test-ExcludedPath([string]$p) {
  foreach ($pat in @(
    '\\node_modules\\', '/node_modules/', '\\.git\\', '/.git/',
    '\\.next\\', '\\dist\\', '\\build\\', '\\out\\', '\\target\\',
    '\\__pycache__\\', '\\.turbo\\', '\\coverage\\',
    '\\playwright-report\\', '\\test-results\\',
    'portable_runtime', '\\.venv\\', '\\venv\\',
    '\\.cache\\', '\\.parcel-cache\\'
  )) {
    if ($p -match $pat) { return $true }
  }
  return $false
}

$emptyRemoved = 0
Get-ChildItem -LiteralPath $root -Recurse -File -Force -ErrorAction SilentlyContinue | ForEach-Object {
  if (Test-ExcludedPath $_.FullName) { return }
  if ($_.Length -ne 0) { return }
  if ($_.Name -eq '.gitkeep') { return }
  if ($_.Name -eq '__init__.py') { return }
  Remove-Item -LiteralPath $_.FullName -Force
  $script:emptyRemoved++
  Write-Host "EMPTY: $($_.Name) <- $($_.DirectoryName)"
}

$dupRemoved = 0
Get-ChildItem -LiteralPath $root -Recurse -File -Force -ErrorAction SilentlyContinue | ForEach-Object {
  if (Test-ExcludedPath $_.FullName) { return }
  $n = $_.Name
  if ($n -notmatch ' - Copy(\s*\(\d+\))?\.| \(\d+\)\.') { return }
  Remove-Item -LiteralPath $_.FullName -Force
  $script:dupRemoved++
  Write-Host "DUP-NAME: $($_.FullName)"
}

Write-Host "Done. Empty removed: $emptyRemoved  Duplicate-named removed: $dupRemoved"
