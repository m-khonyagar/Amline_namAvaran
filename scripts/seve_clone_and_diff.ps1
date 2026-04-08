# Clone Amline_old + Amline_Old_Power; admin-ui file-set diff (Seve_code_Amline on F:).
param([switch]$SkipClone)
$ErrorActionPreference = 'Stop'

$goodParent = -join @(
  'F:\',
  [string][char]0x628, [string][char]0x631, [string][char]0x646, [string][char]0x627, [string][char]0x645, [string][char]0x647,
  ' ',
  [string][char]0x646, [string][char]0x648, [string][char]0x06CC, [string][char]0x633, [string][char]0x06CC
)
$root = Join-Path $goodParent 'Seve_code_Amline'
$d01 = Join-Path $root '01-platform-Amline_old'
$d02 = Join-Path $root '02-line-Amline_namAvaran'
$d03 = Join-Path $root '03-power-Amline_Old_Power'

if (-not (Test-Path -LiteralPath $root)) { throw "Missing: $root" }

$utf8 = New-Object System.Text.UTF8Encoding $true

function Write-Placeholder {
  param([string]$Dir, [string]$Text)
  if (Test-Path -LiteralPath $Dir) { Remove-Item -LiteralPath $Dir -Recurse -Force }
  New-Item -ItemType Directory -Path $Dir -Force | Out-Null
  [System.IO.File]::WriteAllText((Join-Path $Dir 'README-CLONE-FAILED.md'), $Text, $utf8)
}

function Try-GitClone {
  param([string]$Path, [string]$Url, [string]$Label)
  $failMarker = Join-Path $Path 'README-CLONE-FAILED.md'
  if ((Test-Path -LiteralPath $Path) -and -not (Test-Path -LiteralPath (Join-Path $Path '.git')) -and (Test-Path -LiteralPath $failMarker)) {
    Write-Host "[$Label] skip clone (previous failure marker present; delete README-CLONE-FAILED.md to retry)"
    return $false
  }
  if (Test-Path -LiteralPath (Join-Path $Path '.git')) {
    Write-Host "[$Label] repo exists, verify + pull..."
    Push-Location $Path
    $pullOk = $false
    try {
      git rev-parse HEAD 2>&1 | Out-Null
      if ($LASTEXITCODE -ne 0) { throw 'invalid repo' }
      git fetch --prune 2>&1 | Out-Null
      git pull --ff-only 2>&1 | Out-Null
      $pullOk = ($LASTEXITCODE -eq 0)
    } catch { $pullOk = $false } finally { Pop-Location }
    if ($pullOk) { return $true }
    Write-Host "[$Label] repo broken or pull failed, removing and re-cloning..."
    Remove-Item -LiteralPath $Path -Recurse -Force
  }
  if (Test-Path -LiteralPath $Path) { Remove-Item -LiteralPath $Path -Recurse -Force }
  $parent = Split-Path $Path -Parent
  $leaf = Split-Path $Path -Leaf
  Push-Location $parent
  try {
    git clone --single-branch --branch main $Url $leaf 2>&1 | Out-Host
    if ($LASTEXITCODE -eq 0) { return $true }
    if (Test-Path -LiteralPath $Path) { Remove-Item -LiteralPath $Path -Recurse -Force }
    git clone --single-branch --branch master $Url $leaf 2>&1 | Out-Host
    if ($LASTEXITCODE -eq 0) { return $true }
    if (Test-Path -LiteralPath $Path) { Remove-Item -LiteralPath $Path -Recurse -Force }
    git clone $Url $leaf 2>&1 | Out-Host
    $ok = ($LASTEXITCODE -eq 0)
    if (-not $ok -and (Test-Path -LiteralPath $Path)) { Remove-Item -LiteralPath $Path -Recurse -Force }
    return $ok
  } finally { Pop-Location }
}

$ok1 = $false
$ok3 = $false
if (-not $SkipClone) {
  try { $ok1 = Try-GitClone -Path $d01 -Url 'https://github.com/m-khonyagar/Amline_old.git' -Label '01' } catch { $ok1 = $false }
  if (-not $ok1) {
    Write-Warning '01: clone failed; writing placeholder.'
    $t = @'
# Amline_old — clone failed

Run in PowerShell (authenticated GitHub):

git clone --single-branch --branch main https://github.com/m-khonyagar/Amline_old.git

If you see: multiple updates for ref refs/remotes/origin/main — try upgrading Git for Windows or clone on another PC, then copy the folder into 01-platform-Amline_old.
'@
    Write-Placeholder $d01 $t
  }

  try { $ok3 = Try-GitClone -Path $d03 -Url 'https://github.com/m-khonyagar/Amline_Old_Power.git' -Label '03' } catch { $ok3 = $false }
  if (-not $ok3) {
    Write-Warning '03: clone failed; writing placeholder.'
    $t3 = @'
# Amline_Old_Power — clone failed

git clone --single-branch --branch main https://github.com/m-khonyagar/Amline_Old_Power.git
'@
    Write-Placeholder $d03 $t3
  }
} else {
  Write-Host 'SkipClone: not running git clone/pull.'
  $ok1 = (Test-Path -LiteralPath (Join-Path $d01 '.git')) -and (Test-Path -LiteralPath (Join-Path $d01 'admin-ui'))
  $ok3 = (Test-Path -LiteralPath (Join-Path $d03 '.git')) -and (Test-Path -LiteralPath (Join-Path $d03 'admin-ui'))
}

function Get-RelativeFileList {
  param([string]$BasePath, [string]$SubRel)
  $full = Join-Path $BasePath $SubRel
  if (-not (Test-Path -LiteralPath $full)) { return @() }
  Get-ChildItem -LiteralPath $full -Recurse -File -ErrorAction SilentlyContinue | Where-Object {
    $p = $_.FullName
    if ($p -match '\\node_modules\\' -or $p -match '/node_modules/') { return $false }
    if ($p -match '\\.next\\' -or $p -match '/.next/') { return $false }
    if ($p -match '\\dist\\' -or $p -match '/dist/') { return $false }
    $true
  } | ForEach-Object { $_.FullName.Substring($full.Length).TrimStart('\', '/') }
}

function New-StringSet {
  param([string[]]$Items)
  $h = [System.Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
  foreach ($x in $Items) { if ($null -ne $x -and $x.Length -gt 0) { [void]$h.Add($x) } }
  return ,$h
}

$rel = 'admin-ui'
$s1 = New-StringSet @(Get-RelativeFileList $d01 $rel)
$s2 = New-StringSet @(Get-RelativeFileList $d02 $rel)
$s3 = New-StringSet @(Get-RelativeFileList $d03 $rel)
$dCto = 'E:\CTO'
$sCto = New-StringSet @(Get-RelativeFileList $dCto $rel)

$report = Join-Path $root 'CHECKLIST-DIFF-admin-ui.md'
$lines = [System.Collections.Generic.List[string]]::new()
$lines.Add('# admin-ui diff checklist (file presence)')
$lines.Add('')
$lines.Add('Generated: ' + (Get-Date -Format 'yyyy-MM-dd HH:mm'))
$lines.Add('')
$lines.Add('## admin-ui folder exists')
$lines.Add('- 01-platform-Amline_old: ' + ($(if (Test-Path (Join-Path $d01 'admin-ui')) { 'yes' } else { 'no' })))
$lines.Add('- 02-line-Amline_namAvaran: ' + ($(if (Test-Path (Join-Path $d02 'admin-ui')) { 'yes' } else { 'no' })))
$lines.Add('- 03-power-Amline_Old_Power: ' + ($(if (Test-Path (Join-Path $d03 'admin-ui')) { 'yes' } else { 'no' })))
$lines.Add('- E:\\CTO (local): ' + ($(if (Test-Path (Join-Path $dCto 'admin-ui')) { 'yes' } else { 'no' })))
$lines.Add('')
$lines.Add('## clone status')
$lines.Add('- 01 Amline_old: ' + ($(if ($ok1) { 'cloned' } else { 'FAILED (see README-CLONE-FAILED.md)' })))
$lines.Add('- 03 Old_Power: ' + ($(if ($ok3) { 'cloned' } else { 'FAILED (see README-CLONE-FAILED.md)' })))
$lines.Add('')
$lines.Add('## file counts under admin-ui/')
$lines.Add('| tree | count |')
$lines.Add('|------|-------|')
$lines.Add('| 01 | ' + $s1.Count + ' |')
$lines.Add('| 02 | ' + $s2.Count + ' |')
$lines.Add('| 03 | ' + $s3.Count + ' |')
$lines.Add('| CTO | ' + $sCto.Count + ' |')
$lines.Add('')

function Add-OnlyIn {
  param([System.Collections.Generic.HashSet[string]]$A, [System.Collections.Generic.HashSet[string]]$B, [string]$Title, [string]$NameA, [string]$NameB)
  if ($null -eq $A) { $A = [System.Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase) }
  if ($null -eq $B) { $B = [System.Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase) }
  $lines.Add("## $Title")
  $onlyA = New-Object System.Collections.Generic.List[string]
  foreach ($i in $A) { if (-not $B.Contains($i)) { $onlyA.Add($i) } }
  $onlyB = New-Object System.Collections.Generic.List[string]
  foreach ($i in $B) { if (-not $A.Contains($i)) { $onlyB.Add($i) } }
  $lines.Add("### only in $NameA ($($onlyA.Count) files)")
  $max = [Math]::Min(120, $onlyA.Count)
  for ($k = 0; $k -lt $max; $k++) { $lines.Add('- `' + $onlyA[$k] + '`') }
  if ($onlyA.Count -gt $max) { $lines.Add("- ... and $($onlyA.Count - $max) more") }
  $lines.Add('')
  $lines.Add("### only in $NameB ($($onlyB.Count) files)")
  $max2 = [Math]::Min(120, $onlyB.Count)
  for ($k = 0; $k -lt $max2; $k++) { $lines.Add('- `' + $onlyB[$k] + '`') }
  if ($onlyB.Count -gt $max2) { $lines.Add("- ... and $($onlyB.Count - $max2) more") }
  $lines.Add('')
}

Add-OnlyIn $s2 $s1 '02 vs 01 (namAvaran vs Amline_old)' '02' '01'
Add-OnlyIn $s2 $s3 '02 vs 03 (namAvaran vs Old_Power)' '02' '03'
Add-OnlyIn $s1 $s3 '01 vs 03 (Amline_old vs Old_Power)' '01' '03'
if ($sCto.Count -gt 0) {
  Add-OnlyIn $s2 $sCto '02 vs E:\CTO (Seve 02 vs local CTO copy)' '02' 'CTO'
}

$lines.Add('## next steps')
$lines.Add('1. Files only in 02: merge candidates into canonical line (01) via PR/cherry-pick.')
$lines.Add('2. Files only in 01/03: verify intentional vs missing in 02.')
$lines.Add('3. Shared paths: diff content with IDE or git.')

[System.IO.File]::WriteAllLines($report, $lines, $utf8)
Write-Host "Wrote: $report"
