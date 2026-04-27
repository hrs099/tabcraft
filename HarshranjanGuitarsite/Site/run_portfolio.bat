@echo off
TITLE Harsh Ranjan Portfolio Launcher
SETLOCAL

echo ======================================================
echo    HARSH RANJAN 3D PORTFOLIO - LAUNCHER
echo ======================================================
echo.

:: 1. Force close any previous hanging processes to unlock files
echo [INFO] Cleaning up previous sessions...
taskkill /F /IM node.exe /T >nul 2>&1

:: 2. Check for Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed. Please install it from https://nodejs.org/
    pause
    exit /b
)

:: 3. Ensure dependencies are correct and stable
if not exist "node_modules\.bin\next" (
    echo [INFO] Repairing Universe dependencies...
    echo [INFO] This takes 3-5 minutes on some systems. PLEASE DO NOT CLOSE THIS!
    call npm install --legacy-peer-deps
)

echo.
echo [INFO] Starting Development Server...
echo [INFO] A second window will open. Do not close it!
:: Run via npx to ensure we use the local version correctly
start "Harsh Portfolio Server" cmd /k "npx next dev"

echo [INFO] Waiting for the 3D Universe to harmonize...
echo [INFO] This takes longer on the first run (approx 45 seconds).
timeout /t 45 /nobreak > NUL

echo [INFO] Entering the Universe...
start http://localhost:3000

echo.
echo ======================================================
echo    PORTFOLIO SHOULD BE LIVE AT http://localhost:3000
echo    If you see a "Connection Refused" error, wait 10 
echo    seconds and Refresh (F5) the browser.
echo ======================================================
echo.

pause
exit
