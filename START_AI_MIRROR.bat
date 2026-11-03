@echo off
setlocal enabledelayedexpansion
title VASTRA AI Mirror - In-House Launcher
color 0B

echo ========================================================
echo       VASTRA AI MIRROR - REAL BODY TRY-ON SYSTEM
echo ========================================================
echo.

cd /d "%~dp0"

echo [1/3] Starting Python In-House AI Backend (Port 5002)...
if exist "api\.venv-gpu\Scripts\python.exe" (
    start "VASTRA - AI Server" cmd /k "cd /d "%~dp0api" && .\.venv-gpu\Scripts\activate && python app.py"
) else if exist "api\.venv-cpu\Scripts\python.exe" (
    start "VASTRA - AI Server" cmd /k "cd /d "%~dp0api" && .\.venv-cpu\Scripts\activate && python app.py"
) else (
    start "VASTRA - AI Server" cmd /k "cd /d "%~dp0api" && python app.py"
)

timeout /t 3 /nobreak >nul

echo [2/3] Starting VASTRA Node Express Backend (Port 5050)...
start "VASTRA - Node Backend" cmd /k "cd /d "%~dp0server" && node server.js"

timeout /t 3 /nobreak >nul

echo [3/3] Starting VASTRA Frontend Client (Port 3000)...
start "VASTRA - Frontend" cmd /k "cd /d "%~dp0client" && npm run dev"

echo.
echo ========================================================
echo   ALL SERVERS STARTED!
echo   Opening browser in 4 seconds: http://localhost:3000
echo ========================================================
echo.

timeout /t 4 /nobreak >nul
start http://localhost:3000
exit
