@echo off
title VASTRA AI Mirror - GPU Setup (NVIDIA CUDA + CatVTON)
color 0A

echo ============================================================
echo   VASTRA AI Mirror - Sir Laptop GPU Setup
echo   Real Photorealistic Try-On using CatVTON + NVIDIA GPU
echo ============================================================
echo.

REM Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found! Install Python 3.10 from python.org
    pause
    exit /b 1
)
echo [OK] Python found

REM Check NVIDIA GPU
nvidia-smi >nul 2>&1
if errorlevel 1 (
    echo [ERROR] NVIDIA GPU not detected! Check driver installation.
    pause
    exit /b 1
) else (
    echo [OK] NVIDIA GPU detected:
    nvidia-smi --query-gpu=name,driver_version,memory.total --format=csv,noheader
)
echo.

REM Check Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not found! Download from https://nodejs.org
    pause
    exit /b 1
)
echo [OK] Node.js found

REM Create GPU virtual environment
echo.
echo [1/6] Creating Python virtual environment for GPU...
if not exist "api\.venv-gpu" (
    python -m venv api\.venv-gpu
    echo [OK] Created api\.venv-gpu
) else (
    echo [OK] venv already exists - skipping
)

REM Upgrade pip
echo [2/6] Upgrading pip...
api\.venv-gpu\Scripts\python.exe -m pip install --upgrade pip --quiet

REM Install PyTorch with CUDA 12.1 (compatible with CUDA 12.x)
echo [3/6] Installing PyTorch with CUDA 12.1 support...
echo     ^(Downloading ~2.5GB - please wait^)
api\.venv-gpu\Scripts\pip install torch==2.4.0 torchvision==0.19.0 torchaudio --index-url https://download.pytorch.org/whl/cu121 --quiet
echo [OK] PyTorch CUDA installed

REM Install CatVTON dependencies
echo [4/6] Installing CatVTON and VASTRA dependencies...
api\.venv-gpu\Scripts\pip install ^
    fastapi uvicorn python-multipart pillow ^
    opencv-python-headless requests python-dotenv ^
    accelerate==0.31.0 transformers==4.46.3 peft ^
    diffusers scipy scikit-image fvcore cloudpickle ^
    omegaconf huggingface_hub pycocotools gradio ^
    --quiet
echo [OK] All dependencies installed

REM Install Node packages
echo [5/6] Installing Node.js packages...
pushd server
call npm install --silent
popd
pushd client
call npm install --silent
popd
echo [OK] Node packages installed

REM Setup face detection model
echo [6/6] Setting up face detection model...
if not exist "api\models" mkdir api\models
if exist "scratch\face_detection_yunet.onnx" (
    copy "scratch\face_detection_yunet.onnx" "api\models\face_detection_yunet.onnx" >nul
    echo [OK] YuNet face detection model ready
)

echo.
echo ============================================================
echo   SETUP COMPLETE!
echo.
echo   GPU Test:
api\.venv-gpu\Scripts\python.exe -c "import torch; cuda=torch.cuda.is_available(); print(f'  CUDA: {cuda}  |  GPU: {torch.cuda.get_device_name(0) if cuda else chr(78)+chr(111)+chr(110)+chr(101)}')"
echo.
echo   Next step: Run start_gpu_server.bat
echo ============================================================
echo.
pause
