@echo off
title VASTRA AI Mirror - GPU Setup (NVIDIA CUDA)
color 0A

echo ============================================================
echo   VASTRA AI Mirror - Sir Laptop GPU Setup
echo   NVIDIA CUDA 12.x compatible
echo ============================================================
echo.

REM Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found! Install Python 3.10 or 3.11 from python.org
    pause
    exit /b 1
)
echo [OK] Python found

REM Check NVIDIA GPU
nvidia-smi >nul 2>&1
if errorlevel 1 (
    echo [WARNING] nvidia-smi not found. Make sure NVIDIA drivers are installed.
) else (
    echo [OK] NVIDIA GPU detected
    nvidia-smi --query-gpu=name,driver_version,memory.total --format=csv,noheader
)
echo.

REM Create virtual environment
echo [1/5] Creating Python virtual environment...
if not exist "api\.venv-gpu" (
    python -m venv api\.venv-gpu
    echo [OK] Created api\.venv-gpu
) else (
    echo [OK] venv already exists
)
echo.

REM Upgrade pip
echo [2/5] Upgrading pip...
api\.venv-gpu\Scripts\python.exe -m pip install --upgrade pip --quiet

REM Install PyTorch with CUDA 12.1 (compatible with CUDA 12.x drivers)
echo [3/5] Installing PyTorch with CUDA 12.1 support...
echo     (This may take 5-10 minutes - downloading ~2.5GB)
api\.venv-gpu\Scripts\pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121 --quiet
echo [OK] PyTorch CUDA installed

REM Install other requirements
echo [4/5] Installing VASTRA API dependencies...
api\.venv-gpu\Scripts\pip install fastapi uvicorn python-multipart pillow opencv-python-headless gradio_client google-auth requests python-dotenv diffusers transformers accelerate safetensors xformers --quiet
echo [OK] Dependencies installed

REM Copy YuNet model
echo [5/5] Setting up face detection model...
if not exist "api\models" mkdir api\models
if exist "scratch\face_detection_yunet.onnx" (
    copy "scratch\face_detection_yunet.onnx" "api\models\face_detection_yunet.onnx" >nul
    echo [OK] YuNet face model ready
) else (
    echo [WARN] YuNet model not found in scratch\ - face swap will use Haar fallback
)

echo.
echo ============================================================
echo   Setup Complete!
echo   Now run: start_gpu_server.bat
echo ============================================================
echo.

REM Verify CUDA
api\.venv-gpu\Scripts\python.exe -c "import torch; print('[GPU Test] CUDA:', torch.cuda.is_available(), '| GPU:', torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'None')"
echo.
pause

