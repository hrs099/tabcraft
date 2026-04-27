@echo off
setlocal enabledelayedexpansion

cd /d "C:\Users\hp\Downloads\Site"

echo ==============================
echo 1) Running production build
echo ==============================
call npm run build
if errorlevel 1 (
  echo.
  echo BUILD FAILED.
  pause
  exit /b 1
)

echo.
echo ==============================
echo 2) Starting production server
echo ==============================
start "Next.js Production Server" cmd /k "cd /d C:\Users\hp\Downloads\Site && npm run start"

echo.
echo ==============================
echo 3) Open browser for Lighthouse
echo ==============================
timeout /t 5 /nobreak >nul
start "" "http://localhost:3000"

echo.
echo Done.
echo Run Lighthouse manually in Chrome DevTools:
echo DevTools ^> Lighthouse ^> Generate report
pause