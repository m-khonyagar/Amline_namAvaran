# Local dev: start admin-ui (3002), site (3005), amline-ui (3006) in separate terminals, then open browser tabs.
# Usage from repo root:  .\scripts\dev-local-test.ps1
#   -SkipServers   only open URLs (servers already running)
#   -SkipBrowser   only start npm dev windows

param(
    [switch]$SkipServers,
    [switch]$SkipBrowser
)

$ErrorActionPreference = 'Continue'
$RepoRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
if (-not (Test-Path (Join-Path $RepoRoot 'admin-ui\package.json'))) {
    $RepoRoot = 'e:\Amline_namAvaran'
}

$urls = @(
    'http://127.0.0.1:3002/login',
    'http://127.0.0.1:3002/dashboard',
    'http://127.0.0.1:3002/dev/test-hub',
    'http://127.0.0.1:3005/',
    'http://127.0.0.1:3005/agencies',
    'http://127.0.0.1:3005/blog',
    'http://127.0.0.1:3006/',
    'http://127.0.0.1:3006/login',
    'http://127.0.0.1:3006/contracts/wizard'
)

if (-not $SkipServers) {
    Write-Host ''
    Write-Host '[dev-local-test] Starting 3 terminals: admin-ui :3002 | site :3005 | amline-ui :3006' -ForegroundColor Cyan
    Start-Process powershell -WorkingDirectory (Join-Path $RepoRoot 'admin-ui') -ArgumentList '-NoExit', '-Command', 'npm run dev'
    Start-Sleep -Seconds 1
    Start-Process powershell -WorkingDirectory (Join-Path $RepoRoot 'site') -ArgumentList '-NoExit', '-Command', 'npm run dev'
    Start-Sleep -Seconds 1
    Start-Process powershell -WorkingDirectory (Join-Path $RepoRoot 'amline-ui') -ArgumentList '-NoExit', '-Command', 'npm run dev'
    Write-Host '[dev-local-test] Waiting 10s for servers...' -ForegroundColor Yellow
    Start-Sleep -Seconds 10
}

if (-not $SkipBrowser) {
    Write-Host '[dev-local-test] Opening browser tabs...' -ForegroundColor Cyan
    foreach ($u in $urls) {
        Start-Process $u
        Start-Sleep -Milliseconds 350
    }
}

Write-Host ''
Write-Host 'Ports: admin-ui=3002 | marketing site=3005 | user app=3006' -ForegroundColor Green
Write-Host 'MSW demo data: set VITE_USE_MSW=true in admin-ui/.env.local' -ForegroundColor DarkGray
Write-Host 'Browser only:  .\scripts\dev-local-test.ps1 -SkipServers' -ForegroundColor DarkGray
Write-Host 'Servers only:   .\scripts\dev-local-test.ps1 -SkipBrowser' -ForegroundColor DarkGray
