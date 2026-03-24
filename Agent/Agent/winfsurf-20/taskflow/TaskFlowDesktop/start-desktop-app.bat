@echo off
setlocal
cd /d "%~dp0"
echo Starting Agent Windsurf desktop app...
echo.
echo 1. Starting backend on http://127.0.0.1:8060
start "Agent Windsurf Backend" cmd /k "call start-backend.bat"
echo 2. Starting Tauri desktop window
timeout /t 3 /nobreak > nul
npm run tauri dev
endlocal
