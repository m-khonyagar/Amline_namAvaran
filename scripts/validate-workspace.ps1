param(
  [ValidateSet("all", "frontend", "services", "labs")]
  [string]$Scope = "all",
  [switch]$IncludeBuild,
  [switch]$IncludeBackendTests,
  [switch]$SkipNode,
  [switch]$SkipPython
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path $PSScriptRoot -Parent
Set-Location $repoRoot

$projects = @(
  @{ Name = "admin-ui"; Path = "admin-ui"; Type = "node"; Group = "frontend" },
  @{ Name = "amline-ui"; Path = "amline-ui"; Type = "node"; Group = "frontend" },
  @{ Name = "site"; Path = "site"; Type = "node"; Group = "frontend" },
  @{ Name = "seo-dashboard"; Path = "seo-dashboard"; Type = "node"; Group = "frontend" },
  @{ Name = "backend-api"; Path = "backend/backend"; Type = "python"; Group = "services" },
  @{ Name = "pdf-generator"; Path = "pdf-generator"; Type = "python"; Group = "services" },
  @{ Name = "figma-tools"; Path = "Figma"; Type = "node"; Group = "labs" },
  @{ Name = "taskflow-frontend"; Path = "Agent/Agent/winfsurf-20/taskflow/frontend"; Type = "node"; Group = "labs" }
)

if ($Scope -ne "all") {
  $projects = $projects | Where-Object { $_.Group -eq $Scope }
}

foreach ($project in $projects) {
  $fullPath = Join-Path $repoRoot $project.Path
  if (-not (Test-Path $fullPath)) {
    Write-Warning "Skipping missing path: $($project.Path)"
    continue
  }

  Write-Host ""
  Write-Host "==> Validating $($project.Name) [$($project.Type)]" -ForegroundColor Cyan
  Push-Location $fullPath
  try {
    if ($project.Type -eq "node" -and -not $SkipNode) {
      if (Test-Path "package.json") {
        $package = Get-Content "package.json" -Raw | ConvertFrom-Json
        $scripts = @{}
        if ($package.scripts) {
          $package.scripts.PSObject.Properties | ForEach-Object { $scripts[$_.Name] = $_.Value }
        }

        if ($scripts.ContainsKey("lint")) {
          npm run lint
        }

        if ($IncludeBuild -and $scripts.ContainsKey("build")) {
          npm run build
        }
      }
    }

    if ($project.Type -eq "python" -and -not $SkipPython) {
      poetry check

      if ($IncludeBackendTests -and $project.Name -eq "backend-api") {
        poetry run pytest tests/ -q
      }
    }
  } finally {
    Pop-Location
  }
}

Write-Host ""
Write-Host "Workspace validation completed." -ForegroundColor Green
