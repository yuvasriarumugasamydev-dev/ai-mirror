@echo off
title VASTRA AI Mirror - 100% In-House Real Body AI Launcher
color 0B

echo ========================================================
echo       VASTRA AI MIRROR - REAL BODY TRY-ON SYSTEM
echo         (100% In-House Local GPU AI - No 3rd Party)
echo ========================================================
echo.

:: 1. Check for Python
python --version >nul 2>&1
if errorlevel 1 (
    color 0C
    echo [ERROR] Python is not installed or not in PATH!
    echo Please install Python 3.10 or 3.11 from python.org.
    pause
    exit /b
)

:: 2. Check for Nvidia GPU
nvidia-smi >nul 2>&1
if errorlevel 1 (
    color 0E
    echo [WARNING] Nvidia GPU (nvidia-smi) not detected!
    echo If this laptop has an Intel/AMD CPU, it will run in CPU fallback mode.
    echo For real-time 15-second try-on, an Nvidia RTX GPU is recommended.
    echo.
) else (
    echo [SUCCESS] Nvidia Dedicated GPU Detected!
    nvidia-smi --query-gpu=name,memory.total --format=csv,noheader
    echo.
)

:: 3. Setup Python Virtual Environment if not exists
if not exist "api\.venv-gpu\Scripts\activate.bat" (
    echo [INFO] Setting up local Python AI environment (one-time setup)...
    cd api
    python -m venv .venv-gpu
    call .venv-gpu\Scripts\activate
    echo [INFO] Installing PyTorch with Nvidia CUDA support...
    pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121
    pip install -r requirements.txt
    cd ..
)

:: 4. Start AI Backend Server
echo [1/3] Starting Python In-House AI Backend (Port 5002)...
start "VASTRA - AI Server (Port 5002)" cmd /k "cd api && .\.venv-gpu\Scripts\activate && python app.py"

:: Wait 3 seconds
timeout /t 3 /nobreak >nul

:: 5. Start Node Express Backend
echo [2/3] Starting VASTRA Node Express Backend (Port 5050)...
start "VASTRA - Node Backend (Port 5050)" cmd /k "cd server && npm start"

:: Wait 3 seconds
timeout /t 3 /nobreak >nul

:: 6. Start Client Frontend
echo [3/3] Starting VASTRA Frontend Client (Port 3000)...
start "VASTRA - Frontend (Port 3000)" cmd /k "cd client && npm run dev"

echo.
echo ========================================================
echo   ALL SERVERS STARTED SUCCESSFULLY!
echo   Opening VASTRA AI Mirror in your default browser...
echo   URL: http://localhost:3000
echo ========================================================
echo.

timeout /t 5 /nobreak >nul
start http://localhost:3000
