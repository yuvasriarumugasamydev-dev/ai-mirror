@echo off
title VASTRA AI Mirror - GPU Server (CatVTON)
color 0B

echo ============================================================
echo   VASTRA AI Mirror - CatVTON GPU Servers
echo   Real Photorealistic Virtual Try-On
echo ============================================================
echo.

if not exist "api\.venv-gpu\Scripts\python.exe" (
    echo [ERROR] GPU venv not found! Run setup_gpu.bat first.
    pause
    exit /b 1
)

echo [1] Starting CatVTON GPU API on port 5002...
echo     First try-on will auto-download model ^(~3-4 GB, one time^)
start "VASTRA CatVTON GPU API" cmd /k "cd api && .\.venv-gpu\Scripts\python.exe app_gpu.py"
timeout /t 5 /nobreak >nul

echo [2] Starting Node.js server on port 5050...
start "VASTRA Node Server" cmd /k "cd server && node server.js"
timeout /t 3 /nobreak >nul

echo [3] Starting React frontend on port 3000...
start "VASTRA Frontend" cmd /k "cd client && npm run dev"
timeout /t 3 /nobreak >nul

echo.
echo ============================================================
echo   All 3 servers starting!
echo.
echo   Open browser: http://localhost:3000
echo.
echo   IMPORTANT:
echo   First try-on takes ~2-5 min ^(model loading + download^)
echo   After that: 20-30 seconds per REAL photorealistic try-on!
echo ============================================================
echo.
pause
