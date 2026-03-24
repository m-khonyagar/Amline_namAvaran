#Requires -Version 5.1
# Push this repo to YOUR empty remote (adds remote "mygit" by default; keeps existing "origin").
# Usage:
#   .\scripts\push-to-my-repo.ps1 -RepoUrl "https://github.com/USER/REPO.git" -CommitAll
#   $env:MY_GIT_REPO_URL = "https://github.com/USER/REPO.git"; .\scripts\push-to-my-repo.ps1 -CommitAll
# Never put tokens in the URL; use Git Credential Manager or paste token when Git asks for password.

param(
    [Parameter(Mandatory = $false)]
    [string] $RepoUrl = $env:MY_GIT_REPO_URL,

    [string] $RemoteName = "mygit",

    [switch] $CommitAll,

    [string] $CommitMessage = "Sync local project to my remote",

    [string] $Branch = ""
)

$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path $PSScriptRoot -Parent
if (-not (Test-Path (Join-Path $RepoRoot ".git"))) {
    Write-Error "No .git folder. Run from repository root (e.g. E:\CTO)."
    exit 1
}

if ([string]::IsNullOrWhiteSpace($RepoUrl)) {
    Write-Host "Missing repository URL."
    Write-Host "Example: .\scripts\push-to-my-repo.ps1 -RepoUrl https://github.com/YOUR_USER/YOUR_REPO.git -CommitAll"
    Write-Host "Or set: `$env:MY_GIT_REPO_URL = 'https://github.com/YOUR_USER/YOUR_REPO.git'"
    exit 2
}

if ($RepoUrl -match "ghp_[A-Za-z0-9]+") {
    Write-Error "Do not embed GitHub tokens in the URL. Use repo URL only; authenticate when Git prompts."
    exit 3
}

Push-Location $RepoRoot
try {
    $currentBranch = (& git rev-parse --abbrev-ref HEAD).Trim()
    if ([string]::IsNullOrWhiteSpace($Branch)) {
        $Branch = $currentBranch
    }

    Write-Host "Root: $RepoRoot"
    Write-Host "Branch: $Branch | Remote: $RemoteName"

    $null = & git remote get-url $RemoteName 2>$null
    if ($LASTEXITCODE -eq 0) {
        $existing = & git remote get-url $RemoteName
        if ($existing -ne $RepoUrl) {
            Write-Host "Updating remote URL..."
            git remote set-url $RemoteName $RepoUrl
        }
    }
    else {
        Write-Host "Adding remote $RemoteName ..."
        git remote add $RemoteName $RepoUrl
    }

    if ($CommitAll) {
        $status = & git status --porcelain
        if ($status) {
            Write-Host "Staging and commit..."
            git add -A
            git commit -m $CommitMessage
        }
        else {
            Write-Host "Nothing to commit."
        }
    }

    Write-Host "Pushing to $RemoteName $Branch ..."
    git push -u $RemoteName $Branch
    if ($LASTEXITCODE -ne 0) {
        exit $LASTEXITCODE
    }

    Write-Host "Done. Check: git remote -v"
}
finally {
    Pop-Location
}
