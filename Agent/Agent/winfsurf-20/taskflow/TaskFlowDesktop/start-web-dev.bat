@echo off
cd /d "%~dp0"
echo Starting TaskFlow Desktop Web Dev Server...
start "TaskFlow Dev" cmd /k "npm run dev"
echo Web dev server starting at http://localhost:1420
echo.
echo Press any key to stop the server when done...
pause > nul
taskkill /f /im node.exe
echo Server stopped.
:wq
