# VASTRA AI Mirror - Desktop Application

## 🚀 Setup Instructions

### Prerequisites
- Node.js (v18 or higher)
- Python 3.8+ (AI backend-க்கு)
- Windows OS (for building .exe)

---

## 📦 Installation

### 1. Install Electron dependencies
```bash
cd electron
npm install
```

### 2. Install main project dependencies (if not done)
```bash
cd ..
npm run install:all
```

---

## 🔧 Development Mode

### Step 1: Start Backend Server
```bash
# Terminal 1 - Backend server
cd server
npm run dev
```

### Step 2: Start Frontend (React)
```bash
# Terminal 2 - Frontend dev server
cd client
npm run dev
```

### Step 3: Start Electron App
```bash
# Terminal 3 - Electron
cd electron
npm run dev
```

**App will open automatically!** 🎉

---

## 🏗️ Building Desktop App (.exe)

### Step 1: Build React Frontend
```bash
cd client
npm run build
```

This creates `client/dist/` folder with production files.

### Step 2: Build Electron App
```bash
cd electron
npm run build:win
```

**Output:** `electron/dist/VASTRA AI Mirror Setup.exe`

---

## 📁 Project Structure

```
AI Mirror/
├── electron/               # Electron app files
│   ├── main.js            # Main process
│   ├── preload.js         # Preload script
│   ├── package.json       # Electron config
│   └── dist/              # Built .exe files (after build)
├── client/                # React frontend
│   └── dist/              # Production build
├── server/                # Node.js backend
└── api/                   # Python AI backend (optional)
```

---

## 🎯 How It Works

1. **Electron starts** → Opens desktop window
2. **Backend server starts** → Port 5050
3. **Frontend loads** → From `client/dist/`
4. **Camera access** → Webcam enabled
5. **AI Try-on** → Images processed locally

---

## 🐛 Troubleshooting

### Issue: "Cannot find module"
```bash
cd electron
npm install
```

### Issue: Backend server not starting
```bash
cd server
npm install
npm run dev
```

### Issue: Blank window
- Make sure `client/dist/` folder exists
- Run `cd client && npm run build` first

---

## 📦 Distribution

**Built .exe file location:**
```
electron/dist/VASTRA AI Mirror Setup.exe
```

**Size:** ~200-300 MB (includes Chromium)

**Install:**
- Double-click .exe file
- Follow installation wizard
- Desktop shortcut created automatically

---

## 🔐 Security Notes

- Camera permission automatically handled
- Backend runs on localhost only
- No external network calls (offline mode)
- Customer data stays local

---

## 🚀 Future Enhancements

- [ ] Auto-update functionality
- [ ] Python AI backend integration
- [ ] GPU detection and optimization
- [ ] Custom splash screen
- [ ] System tray support
- [ ] Multi-language support

---

## 📝 License

Commercial use requires proper licensing.

---

## 🆘 Support

For issues, contact: Life Changers Team
