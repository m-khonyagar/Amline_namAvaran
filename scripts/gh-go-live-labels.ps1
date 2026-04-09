# Creates GitHub labels for Go-Live tracking (idempotent: ignores "already exists").
# Requires: gh CLI, authenticated (`gh auth login`).
# Usage: from repo root: .\scripts\gh-go-live-labels.ps1

$ErrorActionPreference = "Stop"

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
  Write-Host "gh CLI not found. Install: https://cli.github.com/"
  exit 1
}

$labels = @(
  @{ name = "go-live"; color = "0E8A16"; description = "Go-Live v1 backlog item" }
  @{ name = "phase/P0"; color = "C2E0C6"; description = "Roadmap phase 0 - product lock" }
  @{ name = "phase/P1"; color = "BFD4F2"; description = "Roadmap phase 1 - admin-ui quality" }
  @{ name = "phase/P2"; color = "F9D0C4"; description = "Roadmap phase 2 - backend and staging" }
  @{ name = "phase/P3"; color = "FEF2C0"; description = "Roadmap phase 3 - prod auth" }
  @{ name = "phase/P4"; color = "D4C5F9"; description = "Roadmap phase 4 - deploy and observability" }
  @{ name = "phase/P5"; color = "E5E5E5"; description = "Roadmap phase 5 - trust and support" }
)

foreach ($l in $labels) {
  $name = $l.name
  $color = $l.color
  $desc = $l.description
  gh label create $name --color $color --description $desc 2>$null | Out-Null
  if ($LASTEXITCODE -eq 0) {
    Write-Host "created: $name"
  } else {
    Write-Host "exists or skip: $name"
  }
}

Write-Host "Done. Verify with: gh label list --search go-live"
