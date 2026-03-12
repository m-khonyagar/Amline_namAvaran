@echo off
cd /d "%~dp0"
echo Starting TaskFlow Backend...
cd ..\backend
start "TaskFlow Backend" cmd /k "python -m uvicorn app.main:app --host 127.0.0.1 --port 8060"
echo Backend starting at http://127.0.0.1:8060
echo.
echo Press any key to stop the backend when done...
pause > nul
taskkill /f /im python.exe
echo Backend stopped.
