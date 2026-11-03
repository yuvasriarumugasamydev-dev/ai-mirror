@echo off
title VASTRA AI Mirror - GPU Server
color 0B

echo ============================================================
echo   VASTRA AI Mirror - Starting GPU-Powered Servers
echo ============================================================
echo.

REM Check venv exists
if not exist "api\.venv-gpu\Scripts\python.exe" (
    echo [ERROR] GPU venv not found! Run setup_gpu.bat first.
    pause
    exit /b 1
)

REM Check Node
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not found! Install from nodejs.org
    pause
    exit /b 1
)

echo [1] Starting Python GPU API on port 5002...
start "VASTRA GPU API" cmd /k "cd api && .\.venv-gpu\Scripts\python.exe app_gpu.py"
timeout /t 4 /nobreak >nul

echo [2] Starting Node.js server on port 5050...
start "VASTRA Node Server" cmd /k "cd server && node server.js"
timeout /t 3 /nobreak >nul

echo [3] Starting React frontend on port 3000...
start "VASTRA Frontend" cmd /k "cd client && npm run dev"
timeout /t 3 /nobreak >nul

echo.
echo ============================================================
echo   All 3 servers are starting!
echo.
echo   Open browser: http://localhost:3000
echo.
echo   GPU API:      http://localhost:5002
echo   Node Server:  http://localhost:5050
echo ============================================================
echo.
echo   First try-on will take 1-2 minutes (model loading)
echo   After that: 20-30 seconds per try-on on GPU!
echo.
pause

