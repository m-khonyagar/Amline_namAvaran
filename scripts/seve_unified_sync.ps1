# One unified Amline tree -> F:\برنامه نویسی\Seve_code_Amline\amline
$ErrorActionPreference = 'Stop'
$utf8bom = New-Object System.Text.UTF8Encoding $true

$parentF = -join @(
  'F:\',
  [string][char]0x628, [string][char]0x631, [string][char]0x646, [string][char]0x627, [string][char]0x645, [string][char]0x647,
  ' ',
  [string][char]0x646, [string][char]0x648, [string][char]0x06CC, [string][char]0x633, [string][char]0x06CC
)
$seve = Join-Path $parentF 'Seve_code_Amline'
$unified = Join-Path $seve 'amline'
$src = 'E:\Amline_namAvaran'

if (-not (Test-Path -LiteralPath $src)) { throw "Source missing: $src" }

New-Item -ItemType Directory -Path $parentF -Force | Out-Null

# Remove old multi-folder layout (01, 02, 03, loose CHECKLIST, etc.)
if (Test-Path -LiteralPath $seve) {
  Remove-Item -LiteralPath $seve -Recurse -Force
}
New-Item -ItemType Directory -Path $seve -Force | Out-Null
New-Item -ItemType Directory -Path $unified -Force | Out-Null

$xd = @(
  'node_modules', '.next', '.turbo', 'dist', 'build', 'out', '.cache',
  'coverage', '__pycache__', '.pytest_cache', '.venv', 'venv',
  'playwright-report', 'test-results', '.parcel-cache', '.nuxt',
  'target'
)

Write-Host "Robocopy $src -> $unified"
& robocopy.exe $src $unified /E /R:2 /W:2 /NFL /NDL /NJH /NJS /XD @xd | Out-Null
$code = $LASTEXITCODE
if ($code -ge 8) { throw "robocopy failed exit=$code" }

$readmeSeve = @'
# Seve_code_Amline — نسخهٔ واحد (بک‌آپ / آرشیو روی F:)

| مسیر | معنی |
|------|------|
| `amline/` | کل مونوریپو از `E:\Amline_namAvaran` (شامل `.git`؛ بدون `node_modules` و خروجی build) |

**مرجع روزمرهٔ توسعه:** همان `E:\Amline_namAvaran` (بعد از `git push`، برای به‌روز کردن این پوشه اسکریپت `scripts\seve_unified_sync.ps1` را دوباره اجرا کنید).

## بعد از کپی
```powershell
cd amline
npm install
```

تاریخ: 
'@ + (Get-Date -Format 'yyyy-MM-dd HH:mm')

[System.IO.File]::WriteAllText((Join-Path $seve 'README.md'), $readmeSeve, $utf8bom)

$n = (Get-ChildItem -LiteralPath $unified -Recurse -File -ErrorAction SilentlyContinue | Measure-Object).Count
Write-Host "OK: $n files under amline\"
Write-Host "Root: $seve"
