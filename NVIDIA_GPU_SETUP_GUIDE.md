# 🚀 VASTRA AI Mirror - 100% In-House Real Body AI Saree Try-On Setup Guide (Nvidia GPU)

இந்த வழிகாட்டி மூலம் உங்கள் **மேமின் Nvidia GPU லேப்டாப்பில்** எந்த 3rd-party API-யும் இல்லாமல், இணையம் இல்லாமல், முழு உடம்பிலும் புடவையை நேர்த்தியாக AI-யில் அணிவிக்கும் அமைப்பை இயக்கலாம்.

---

## 💻 1. தேவையான சிஸ்டம் தகுதிகள் (System Requirements)
* **OS:** Windows 10 அல்லது 11 (64-bit)
* **GPU:** **Nvidia GeForce RTX 3050 / 3060 / 4050 / 4060 அல்லது அதற்கு மேல்** (குறைந்தது 6GB - 8GB VRAM)
* **CUDA:** Nvidia CUDA Toolkit 11.8 அல்லது 12.1 நிறுவப்பட்டிருக்க வேண்டும்.
* **Storage:** 15 GB Free Space.

---

## 📥 2. மேமின் லேப்டாப்பில் செய்ய வேண்டிய படிநிலைகள் (Step-by-Step)

### படி 1: கோப்புகளைப் பெறுதல் (Clone Repository)
Git மூலமாக புராஜெக்ட்டை மேமின் லேப்டாப்பில் Clone செய்யவும்:
```bash
git clone https://github.com/yuvasriarumugasamydev-dev/ai-mirror.git
cd ai-mirror
```

---

### படி 2: Nvidia PyTorch (GPU Version) நிறுவுதல்
Python Virtual Environment உருவாக்கி, Nvidia GPU-வுக்கான PyTorch-ஐ நிறுவ வேண்டும்:
```powershell
cd api
python -m venv .venv-gpu
.\.venv-gpu\Scripts\activate

# Nvidia CUDA 12.1 ஆதரவுள்ள PyTorch நிறுவுதல்
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121

# பிற தேவையான லைப்ரரிகள்
pip install -r requirements.txt
pip install diffusers accelerate transformers opencv-python Pillow uvicorn fastapi
```

---

### படி 3: GPU-வை பரிசோதித்தல் (Verification)
GPU சரியாகக் கண்டறியப்படுகிறதா என்பதைப் பார்க்க:
```powershell
python -c "import torch; print('CUDA Available:', torch.cuda.is_available()); print('GPU Name:', torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'No GPU')"
```
* இதில் **`CUDA Available: True`** மற்றும் உங்கள் மேமின் GPU பெயர் (எ.கா: *NVIDIA GeForce RTX 3060 Laptop GPU*) வரவேண்டும்.

---

### படி 4: Environment அமைத்தல் (`api/.env` & `server/.env`)

1. **`api/.env` கோப்பில்:**
```env
PORT=5002
DEVICE=cuda
PRECISION=float16
AI_PROVIDER=local_gpu
LOCAL_INPAINT_STEPS=25
```

2. **`server/.env` கோப்பில்:**
```env
PORT=5050
AI_PROVIDER=python_ai
TRYON_API_URL=http://localhost:5002
PYTHON_AI_URL=http://localhost:5002
```

---

### படி 5: சர்வர்களை இயக்குதல் (Run Project)

3 வெவ்வேறு Terminal-களில் பின்வருவனவற்றை இயக்கவும்:

**Terminal 1 (Python GPU AI Server):**
```powershell
cd api
.\.venv-gpu\Scripts\activate
python app.py
```
*(வெற்றிகரமாக GPU-வில் மாடல் ஏறியவுடன் `Uvicorn running on http://0.0.0.0:5002` என்று வரும்).*

**Terminal 2 (Node Express Backend):**
```powershell
cd server
npm install
node server.js
```

**Terminal 3 (React Client Frontend):**
```powershell
cd client
npm install
npm run dev
```

---

## 👗 3. எப்படி வேலை செய்யும்? (Output Workflow)
1. Browser-ல் **`http://localhost:3000`** திறக்கவும்.
2. கேமரா முன் முழு உடம்பும் தெரியும்படி நின்று Capture செய்யவும்.
3. மேமின் GPU-வில் இயங்கும் DensePose & Diffusion AI:
   - வாடிக்கையாளரின் தலையையும் முகத்தையும் 100% பாதுகாக்கும்.
   - அணிந்திருக்கும் உடையை உடம்பிலிருந்து நீக்கும்.
   - புடவை மடிப்புகளையும் முந்தானையையும் நிஜமான உடலின் தோள்பட்டை மற்றும் இடுப்பில் **15 முதல் 25 விநாடிகளில்** துல்லியமாக வரைந்து தந்துவிடும்!

---

## ⚡ அவசரக் காலத்திற்கு (Fallback Feature):
GPU இல்லாத சாதாரண லேப்டாப்பில் டெமோ காட்ட வேண்டுமென்றால், புராஜெக்ட்டில் உள்ள **"⚡ Instant Face Preview"** பட்டனைப் பயன்படுத்தினால், வெறும் 1 விநாடியில் பட்டுப்புடவை மாடலில் முகம் பொருந்தி உடனடியாகக் காட்டும்.
