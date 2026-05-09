@echo off
title Astra Music Engine Launcher
echo Starting Astra Music Engine...

cd /d "%~dp0"

start "Astra Backend" cmd /k "cd /d "%~dp0server" && start.bat"
start "Astra Frontend" cmd /k "cd /d "%~dp0" && npm run dev"

echo Waiting for services to warm up...
timeout /t 8 /nobreak >nul

start "" "http://localhost:5173"
exit