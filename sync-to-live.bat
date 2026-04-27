@echo off
title TabCraft - Sync to Live
color 0B

echo ================================================
echo    TabCraft  -  Auto Sync to GitHub + Vercel
echo ================================================
echo.

cd /d "%~dp0"

echo [1/4] Checking Git status...
git status --short
echo.

echo [2/4] Staging all changes...
git add .
echo.

echo [3/4] Committing...
set TIMESTAMP=%DATE% %TIME%
git commit -m "TabCraft auto-sync: %TIMESTAMP%"
echo.

echo [4/4] Pushing to GitHub (triggers Vercel rebuild)...
git push
echo.

if %ERRORLEVEL%==0 (
    color 0A
    echo ================================================
    echo    SUCCESS! Your site will be live in ~60 seconds.
    echo    Vercel will auto-rebuild from the latest push.
    echo ================================================
) else (
    color 0C
    echo ================================================
    echo    PUSH FAILED. Check your internet connection
    echo    or run "git push" manually to debug.
    echo ================================================
)

echo.
pause
