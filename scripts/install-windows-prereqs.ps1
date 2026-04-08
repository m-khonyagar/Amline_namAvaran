# One-time Windows prerequisites for Amline (run as normal user; some steps may prompt UAC).
# After WSL install, reboot if Windows asks; then open Docker Desktop once.
$ErrorActionPreference = "Stop"

Write-Host "Installing Microsoft.WSL (WSL2 kernel)..." -ForegroundColor Cyan
winget install --id Microsoft.WSL --accept-package-agreements --accept-source-agreements -e --silent

Write-Host "Installing Ubuntu (default WSL distro)..." -ForegroundColor Cyan
wsl --install -d Ubuntu --no-launch

Write-Host "Installing Redis on Windows (optional local broker)..." -ForegroundColor Cyan
winget install --id Redis.Redis --accept-package-agreements --accept-source-agreements -e --silent

Write-Host "Done. If Docker Desktop still fails: reboot Windows, then start Docker Desktop." -ForegroundColor Green
Write-Host "PostgreSQL: use Docker after reboot, or install EDB installer manually if winget download fails." -ForegroundColor Yellow
