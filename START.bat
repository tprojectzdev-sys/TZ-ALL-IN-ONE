@echo off
title Discord Bot - Quick Start
color 0B

echo ========================================
echo   Discord Bot - Status Check
echo ========================================
echo.

REM Check Node.js
echo [Checking] Node.js...
where node >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    for /f "tokens=*" %%i in ('node --version') do set NODE_VER=%%i
    echo [OK] Node.js installed: %NODE_VER%
) else (
    echo [ERROR] Node.js not found! Install from: https://nodejs.org/
    pause
    exit /b 1
)
echo.

REM Check MongoDB service
echo [Checking] MongoDB service...
sc query MongoDB | find "RUNNING" >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [OK] MongoDB is running
) else (
    echo [WARNING] MongoDB not running or not installed
    echo.
    echo Starting MongoDB service...
    net start MongoDB >nul 2>nul
    if %ERRORLEVEL% EQU 0 (
        echo [OK] MongoDB started
    ) else (
        echo [ERROR] Failed to start MongoDB
        echo.
        echo Please run INSTALL.ps1 to install MongoDB:
        echo   Right-click INSTALL.ps1 ^> Run with PowerShell (Admin)
        echo.
        pause
        exit /b 1
    )
)
echo.

REM Check .env file
echo [Checking] Configuration file...
if exist ".env" (
    echo [OK] .env file found
    
    REM Check if token is configured
    findstr /C:"DISCORD_TOKEN=your_discord_token_here" .env >nul 2>nul
    if %ERRORLEVEL% EQU 0 (
        echo [WARNING] DISCORD_TOKEN not configured in .env
        echo.
        echo Please edit .env file and add your Discord bot token
        echo.
        set /p OPEN_ENV="Open .env file now? (Y/N): "
        if /i "%OPEN_ENV%"=="Y" notepad .env
        pause
        exit /b 1
    )
) else (
    echo [ERROR] .env file not found!
    if exist ".env.example" (
        echo Creating .env from template...
        copy .env.example .env >nul
        echo [OK] Created .env file
        echo.
        echo Please edit .env file and add your Discord bot token
        notepad .env
    )
    pause
    exit /b 1
)
echo.

REM Check node_modules
echo [Checking] Dependencies...
if exist "node_modules\" (
    echo [OK] Dependencies installed
) else (
    echo [INFO] Installing dependencies...
    echo This may take 2-5 minutes...
    echo.
    npm install
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Failed to install dependencies
        pause
        exit /b 1
    )
    echo [OK] Dependencies installed
)
echo.

echo ========================================
echo   Starting Discord Bot + Dashboard
echo ========================================
echo.
echo Dashboard will be available at:
echo   http://localhost:3000
echo.
echo Press Ctrl+C to stop the bot
echo ========================================
echo.

REM Start the bot
node dashboard.js

REM If bot exits
echo.
echo ========================================
echo Bot stopped
echo ========================================
pause
