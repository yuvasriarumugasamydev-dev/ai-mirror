const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const PythonAIBridge = require('./python-bridge');

let mainWindow;
let pythonProcess;
let pythonAI = null;
let usePythonAI = false; // Toggle between local Python AI or cloud API

// Python backend server start பண்ணும் function
function startPythonBackend() {
  const pythonScript = path.join(__dirname, '../server/server.js');
  
  // Node.js server start (Python-ஐ விட Node.js server use பண்றோம்)
  pythonProcess = spawn('node', [pythonScript], {
    stdio: 'inherit'
  });

  pythonProcess.on('error', (err) => {
    console.error('Backend server error:', err);
  });

  console.log('✅ Backend server started on port 5050');
}

// Main window create பண்ணும் function
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    },
    icon: path.join(__dirname, 'icon.png'),
    title: 'VASTRA AI Mirror - Smart Saree Boutique',
    backgroundColor: '#ffffff',
    autoHideMenuBar: true, // Menu bar hide பண்ணும்
  });

  // Development-ல இருந்தா localhost load பண்ணும்
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools(); // Dev tools open
  } else {
    // Production-ல build files load பண்ணும்
    mainWindow.loadFile(path.join(__dirname, '../client/dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// App ready ஆனப்போ
app.whenReady().then(async () => {
  // Check if Python is available
  const hasPython = await PythonAIBridge.checkPython();
  
  if (hasPython) {
    console.log('✅ Python detected - Local AI available');
    usePythonAI = true;
    pythonAI = new PythonAIBridge();
    
    try {
      await pythonAI.startPythonServer();
      console.log('✅ Python AI server started');
    } catch (err) {
      console.warn('⚠️ Failed to start Python AI, using cloud API:', err.message);
      usePythonAI = false;
    }
  } else {
    console.log('⚠️ Python not found - Using cloud API only');
  }
  
  // Backend server start பண்ணும்
  startPythonBackend();
  
  // 2 seconds wait பண்ணி window create பண்ணும் (server start ஆக time)
  setTimeout(() => {
    createWindow();
  }, 2000);
});

// எல்லா windows-ம் close ஆனப்போ
app.on('window-all-closed', () => {
  // Python backend stop பண்ணும்
  if (pythonProcess) {
    pythonProcess.kill();
  }
  
  // macOS-ல இல்லாம quit பண்ணும்
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// macOS-ல app activate ஆனப்போ
app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// App quit ஆகும்போது cleanup
app.on('before-quit', () => {
  if (pythonProcess) {
    pythonProcess.kill();
  }
  if (pythonAI) {
    pythonAI.stopPythonServer();
  }
});
