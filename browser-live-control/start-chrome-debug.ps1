# Start Chrome with Remote Debugging for Live Control
# Run this script, then use run-command.js to control your Chrome

$chromePath = "C:\Program Files\Google\Chrome\Application\chrome.exe"
$chromePathX86 = "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"

if (Test-Path $chromePath) {
    $exe = $chromePath
} elseif (Test-Path $chromePathX86) {
    $exe = $chromePathX86
} else {
    Write-Host "Chrome not found. Install Chrome or update path in this script." -ForegroundColor Red
    exit 1
}

# Close ALL existing Chrome processes (required for CDP to work)
Write-Host "Closing existing Chrome instances..." -ForegroundColor Yellow
Get-Process -Name "chrome" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 3

# Use a separate profile to avoid conflicts with existing Chrome
$debugProfile = "$env:TEMP\chrome-debug-profile"
if (-not (Test-Path $debugProfile)) { New-Item -ItemType Directory -Path $debugProfile -Force | Out-Null }

Write-Host "Starting Chrome with Remote Debugging (port 9222)..." -ForegroundColor Cyan
Write-Host "Keep this Chrome window open. Use run-command.js to send commands." -ForegroundColor Yellow
Write-Host ""

$args = "--remote-debugging-port=9222", "--user-data-dir=$debugProfile"
Start-Process $exe -ArgumentList $args
Start-Sleep -Seconds 3

Write-Host "Chrome started. CDP endpoint: http://localhost:9222" -ForegroundColor Green
Write-Host "Run: node run-command.js goto https://google.com" -ForegroundColor Green
