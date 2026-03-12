@echo off
echo Starting TaskFlow Desktop Development Environment...
echo.

echo 1. Starting Backend...
cd /d "%~dp0"
start "TaskFlow Backend" cmd /k "start-backend.bat"

echo 2. Starting Web Dev Server...
timeout /t 3 /nobreak > nul
start "TaskFlow Web Dev" cmd /k "start-web-dev.bat"

echo.
echo Development Environment Started!
echo.
echo Backend: http://127.0.0.1:8060
echo Web Dev: http://localhost:1420
echo.
echo Open your browser to http://localhost:1420 to use the app
echo.
echo Testing Checklist:
echo - Desktop window opens successfully
echo - Navigate between pages
echo - Theme toggle works
echo - Language toggle works
echo - Persian RTL works
echo - Computer Control page loads
echo - Session start/end works
echo.
echo Press any key to stop all services...
pause > nul

echo Stopping services...
taskkill /f /im node.exe
taskkill /f /im python.exe
echo All services stopped.
