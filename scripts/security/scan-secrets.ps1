param(
  [string]$Root = ".",
  [string]$Output = "docs/security-incident/05-local-secret-scan-report.md"
)

$ErrorActionPreference = "Stop"

Set-Location $Root

$patterns = @(
  "sk-[A-Za-z0-9]{20,}",
  "ghp_[A-Za-z0-9]{20,}",
  "glpat-[A-Za-z0-9\-_]{20,}",
  "AKIA[0-9A-Z]{16}",
  "AIza[0-9A-Za-z\-_]{20,}",
  "-----BEGIN (RSA|OPENSSH|EC) PRIVATE KEY-----"
)

$excludeRegex = @(
  "Agent\\Agent\\winfsurf-20\\taskflow\\backend\\portable_runtime\\",
  "\\node_modules\\",
  "\\.next\\",
  "\\dist\\",
  "\\build\\"
)

$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$matches = @()
$files = Get-ChildItem -Path . -Recurse -File -ErrorAction SilentlyContinue | Where-Object {
  $fp = $_.FullName
  $ext = $_.Extension.ToLowerInvariant()
  $allowed = @(
    ".env",".json",".yaml",".yml",".toml",".ini",".txt",".md",".ps1",".sh",".py",
    ".ts",".tsx",".js",".jsx",".go",".java",".kt",".cs",".rb",".php",".sql",".cfg"
  )
  ($allowed -contains $ext) -and (-not ($excludeRegex | Where-Object { $fp -match $_ }))
}

foreach ($p in $patterns) {
  foreach ($f in $files) {
    $found = Select-String -Path $f.FullName -Pattern $p -AllMatches -ErrorAction SilentlyContinue
    if ($found) {
      foreach ($hit in $found) {
        $line = $hit.LineNumber
        if (-not $hit.Line) { continue }
        $text = $hit.Line.Trim()
        if ([string]::IsNullOrWhiteSpace($text)) { continue }
        $rel = Resolve-Path -Relative $f.FullName
        $matches += ("{0}:{1}:{2}" -f $rel, $line, $text)
      }
    }
  }
}

$header = @(
  "# Local Secret Scan Report",
  "",
  "- Timestamp: $timestamp",
  "- Root: $((Get-Location).Path)",
  "- Scanner: ripgrep patterns",
  ""
)

$body = @()
if ($matches.Count -eq 0) {
  $body += "## Result"
  $body += ""
  $body += "No high-confidence secret pattern found in scanned files."
} else {
  $body += "## Result"
  $body += ""
  $body += "Potential secret-like matches were found and must be reviewed:"
  $body += ""
  foreach ($m in $matches | Select-Object -Unique) {
    $body += ("- {0}" -f $m)
  }
}

$footer = @(
  "",
  "## Notes",
  "",
  "- This scan detects high-confidence patterns only.",
  "- Env examples and documentation placeholders may trigger expected findings.",
  "- Revoke any real key immediately if exposed."
)

$content = ($header + $body + $footer) -join "`r`n"
New-Item -ItemType Directory -Force (Split-Path $Output -Parent) | Out-Null
Set-Content -Path $Output -Value $content -Encoding UTF8

Write-Output "Report written: $Output"
