@echo off
echo 🚀 TaskFlow GitHub Auto Setup
echo ========================================
echo.

echo 🔍 Checking current directory...
cd /d "%~dp0"
if not exist "TaskFlowDesktop" (
    echo ❌ TaskFlowDesktop directory not found!
    echo Please run this script from the taskflow directory.
    pause
    exit /b 1
)

echo ✅ TaskFlowDesktop directory found!
echo.

echo 📋 Step 1: Create GitHub Repository
echo ========================================
echo.
echo Please follow these steps:
echo.
echo 1. Open your web browser and go to: https://github.com
echo 2. Click the '+' button in the top right corner
echo 3. Select 'New repository'
echo 4. Repository name: taskflow-desktop
echo 5. Description: TaskFlow Desktop Application with Computer Control
echo 6. Set to Public (or Private if you prefer)
echo 7. DO NOT initialize with README (we have code ready)
echo 8. Click 'Create repository'
echo.
echo After creating the repository, copy the HTTPS URL
echo It should look like: https://github.com/YOUR_USERNAME/taskflow-desktop.git
echo.

set /p repo_url="🔗 Enter your repository URL: "

if "%repo_url%"=="" (
    echo ❌ No repository URL provided!
    pause
    exit /b 1
)

echo.
echo 📋 Step 2: Connect to GitHub and Push Code
echo ========================================
echo.

echo 🔧 Adding remote repository...
git remote add origin %repo_url%
if %errorlevel% neq 0 (
    echo ❌ Failed to add remote repository!
    echo The repository URL might be incorrect or already exists.
    pause
    exit /b 1
)

echo ✅ Remote repository added successfully!

echo.
echo 🔧 Setting main branch...
git branch -M main
if %errorlevel% neq 0 (
    echo ❌ Failed to set main branch!
    pause
    exit /b 1
)

echo ✅ Main branch set successfully!

echo.
echo 🚀 Pushing code to GitHub...
echo This might take a few minutes...
git push -u origin main
if %errorlevel% neq 0 (
    echo ❌ Failed to push to GitHub!
    echo Possible issues:
    echo - Authentication required (check your GitHub credentials)
    echo - Repository URL incorrect
    echo - Network connectivity issues
    echo.
    echo Try running: git push -u origin main
    pause
    exit /b 1
)

echo.
echo 🎉 SUCCESS! TaskFlow is now on GitHub!
echo ========================================
echo.
echo 📍 Your repository is available at:
echo %repo_url%
echo.
echo 🔗 You can now:
echo - View your code online
echo - Share with your team
echo - Collaborate with others
echo - Use as portfolio project
echo.
echo 📊 What was uploaded:
echo - Complete TaskFlow Desktop Application
echo - Computer Control System
echo - All documentation and guides
echo - Development scripts and tools
echo.
echo 🎯 Your TaskFlow project is now live!
echo.

echo 🌐 Opening your repository in browser...
start "" "%repo_url%"

echo.
echo ✅ Setup complete! Press any key to exit...
pause > nul
