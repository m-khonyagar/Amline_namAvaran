# Setup GitHub remote and push (requires GitHub CLI - gh)
# Run from repo root: .\scripts\setup-github-remote.ps1
#
# If you already have an "origin" and only want to push to YOUR repo URL, use instead:
#   .\scripts\push-to-my-repo.ps1 -RepoUrl "https://github.com/USER/REPO.git" -CommitAll

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path $PSScriptRoot -Parent
if (-not (Test-Path (Join-Path $RepoRoot ".git"))) {
    $RepoRoot = $PSScriptRoot
    while ($RepoRoot -and -not (Test-Path (Join-Path $RepoRoot ".git"))) { $RepoRoot = Split-Path $RepoRoot -Parent }
}
if (-not $RepoRoot -or -not (Test-Path (Join-Path $RepoRoot ".git"))) {
    Write-Error "Not inside a git repository. Run from e:\CTO or repo root."
    exit 1
}

# Ensure gh is on PATH (fresh install)
$env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")

# 1) Login if needed
$ErrorActionPreferenceSave = $ErrorActionPreference
$ErrorActionPreference = 'SilentlyContinue'
$null = gh auth status 2>$null
$authOk = ($LASTEXITCODE -eq 0)
$ErrorActionPreference = $ErrorActionPreferenceSave
if (-not $authOk) {
    Write-Host "GitHub login required. A browser window will open."
    & gh auth login -p https -h github.com -w
    if ($LASTEXITCODE -ne 0) { exit 1 }
}

# 2) Create repo and set remote (repo name = folder name, e.g. e-CTO or CTO)
$repoName = Split-Path $RepoRoot -Leaf
$repoName = $repoName -replace " ", "-"
Push-Location $RepoRoot
try {
    $remoteExists = git remote get-url origin 2>$null
    if ($remoteExists) {
        Write-Host "Remote 'origin' already exists: $remoteExists"
        Write-Host "Setting upstream and pushing main..."
        git push -u origin main
        exit 0
    }
    Write-Host "Creating GitHub repo '$repoName' and pushing..."
    gh repo create $repoName --private --source=. --remote=origin --push
    if ($LASTEXITCODE -ne 0) {
        # Maybe repo already exists under user/org
        Write-Host "If repo already exists, add remote and push manually:"
        Write-Host "  git remote add origin https://github.com/YOUR_USER/$repoName.git"
        Write-Host "  git push -u origin main"
        exit 1
    }
    Write-Host "Done. Remote 'origin' set and main pushed."
} finally {
    Pop-Location
}
