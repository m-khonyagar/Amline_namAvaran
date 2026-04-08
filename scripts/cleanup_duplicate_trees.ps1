# Remove duplicate Amline trees + reproducible artifacts under E:\Amline_namAvaran
$ErrorActionPreference = 'Continue'
$log = Join-Path $PSScriptRoot '..\CLEANUP-RUN.log'
"--- $(Get-Date -Format o) ---" | Out-File -FilePath $log -Encoding utf8

function Log($m) { $m | Tee-Object -FilePath $log -Append }

function Remove-Tree($path, $label) {
  if (-not (Test-Path -LiteralPath $path)) { Log "SKIP (missing): $label"; return }
  Log "REMOVE: $label -> $path"
  Remove-Item -LiteralPath $path -Recurse -Force -ErrorAction SilentlyContinue
  if (Test-Path -LiteralPath $path) { Log "WARN: still exists $path" } else { Log "OK: removed $label" }
}

Remove-Tree 'E:\CTO' 'CTO duplicate (unique UI merged into Amline_namAvaran)'
Remove-Tree 'E:\repos\Amline_namAvaran_src' 'GitHub export duplicate'
Remove-Tree 'E:\Amline_namAvaran_clean' 'Empty .git-only folder'

$mono = 'E:\Amline_namAvaran'
Remove-Tree (Join-Path $mono 'node_modules') 'root node_modules'
Remove-Tree (Join-Path $mono '.turbo') 'root .turbo'

Get-ChildItem -LiteralPath $mono -Directory -Force -ErrorAction SilentlyContinue | ForEach-Object {
  $base = $_.FullName
  foreach ($leaf in @('node_modules', '.next', 'dist', 'build', 'out', '.turbo', '.parcel-cache')) {
    $p = Join-Path $base $leaf
    if (Test-Path -LiteralPath $p) {
      Log "REMOVE: $leaf under $($_.Name)"
      Remove-Item -LiteralPath $p -Recurse -Force -ErrorAction SilentlyContinue
    }
  }
}

# packages/* often has node_modules
Get-ChildItem -LiteralPath (Join-Path $mono 'packages') -Directory -ErrorAction SilentlyContinue | ForEach-Object {
  $nm = Join-Path $_.FullName 'node_modules'
  if (Test-Path -LiteralPath $nm) {
    Log "REMOVE: packages\$($_.Name)\node_modules"
    Remove-Item -LiteralPath $nm -Recurse -Force -ErrorAction SilentlyContinue
  }
}

Log 'DONE cleanup_duplicate_trees.ps1'
