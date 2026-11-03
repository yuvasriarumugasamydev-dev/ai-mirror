
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

let mainWindow;
let pythonProcess = null;
let pythonPort = 5000;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 800,
    backgroundColor: '#fff7ed',
    icon: path.join(__dirname, 'assets/icon.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    },
    titleBarStyle: 'hiddenInset',
    show: false
  });

  mainWindow.loadFile('renderer/index.html');
  
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.maximize();
  });

  // Start Python backend
  startPythonBackend();
}

function startPythonBackend() {
  console.log('🚀 Starting Local Python AI Backend ma...');
  
  const pythonPath = process.platform === 'win32' ? 'python' : 'python3';
  const scriptPath = path.join(__dirname, 'python_backend', 'app_local.py');
  
  // Check if python file exists
  if (!fs.existsSync(scriptPath)) {
    console.error('Python backend not found ma!', scriptPath);
    return;
  }

  pythonProcess = spawn(pythonPath, [scriptPath], {
    cwd: path.join(__dirname, 'python_backend'),
    env: { ...process.env, PYTHONUNBUFFERED: '1' }
  });

  pythonProcess.stdout.on('data', (data) => {
    console.log(`[Python] ${data}`);
    if (mainWindow) {
      mainWindow.webContents.send('python-log', data.toString());
    }
  });

  pythonProcess.stderr.on('data', (data) => {
    console.error(`[Python Error] ${data}`);
    if (mainWindow) {
      mainWindow.webContents.send('python-log', `ERROR: ${data.toString()}`);
    }
  });

  pythonProcess.on('close', (code) => {
    console.log(`Python process exited ma with code ${code}`);
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (pythonProcess) {
    pythonProcess.kill();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

ipcMain.on('app-ready', () => {
  console.log('Renderer ready ma!');
});

ipcMain.handle('select-image', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [{ name: 'Images', extensions: ['jpg','jpeg','png','webp'] }]
  });
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

ipcMain.handle('get-python-port', () => pythonPort);
