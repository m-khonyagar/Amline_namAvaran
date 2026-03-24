@echo off
setlocal
cd /d "%~dp0"
echo Starting Agent Windsurf development environment...
echo.
echo 1. Starting backend on http://127.0.0.1:8060
start "Agent Windsurf Backend" cmd /k "call start-backend.bat"
echo 2. Starting web shell on http://localhost:1420
timeout /t 3 /nobreak > nul
start "Agent Windsurf Web" cmd /k "call start-web-dev.bat"
echo.
echo Environment started.
echo Backend: http://127.0.0.1:8060
echo Web UI:  http://localhost:1420
echo.
echo Leave the two new windows open while you work.
echo Close them manually when you are done.
pause
endlocal
