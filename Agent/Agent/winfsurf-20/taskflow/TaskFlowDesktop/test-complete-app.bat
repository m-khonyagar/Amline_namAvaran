@echo off
setlocal
cd /d "%~dp0"
echo Starting Agent Windsurf smoke-test environment...
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
echo Open http://localhost:1420 and verify:
echo - Main shell opens successfully
echo - Navigate between pages
echo - Theme toggle works
echo - Language toggle works
echo - Persian RTL works
echo - Task creation and task detail work
echo - Settings save successfully
echo - Artifacts and memory load
echo.
echo Close the backend and web windows manually when the check is complete.
pause
endlocal
