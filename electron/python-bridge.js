// Python AI Bridge for Electron
// Connects Electron app to local Python AI server

const { spawn } = require('child_process');
const path = require('path');

class PythonAIBridge {
  constructor() {
    this.pythonProcess = null;
    this.isReady = false;
  }

  // Start Python AI server locally
  startPythonServer() {
    return new Promise((resolve, reject) => {
      // Path to Python script
      const pythonScript = path.join(__dirname, '../api/app.py');
      
      // Check if Python exists
      const pythonCommand = process.platform === 'win32' ? 'python' : 'python3';
      
      console.log('🐍 Starting Python AI server...');
      
      // Start Python process
      this.pythonProcess = spawn(pythonCommand, [pythonScript], {
        env: {
          ...process.env,
          PORT: '5001',
          TRYON_PROVIDER: 'huggingface'
        }
      });

      // Listen to stdout
      this.pythonProcess.stdout.on('data', (data) => {
        const output = data.toString();
        console.log('Python:', output);
        
        // Check if server started
        if (output.includes('Running on') || output.includes('Serving Flask')) {
          this.isReady = true;
          console.log('✅ Python AI server ready on http://localhost:5001');
          resolve();
        }
      });

      // Listen to stderr
      this.pythonProcess.stderr.on('data', (data) => {
        console.error('Python Error:', data.toString());
      });

      // Handle process exit
      this.pythonProcess.on('exit', (code) => {
        console.log(`Python process exited with code ${code}`);
        this.isReady = false;
      });

      // Handle errors
      this.pythonProcess.on('error', (err) => {
        console.error('Failed to start Python server:', err);
        reject(err);
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        if (!this.isReady) {
          reject(new Error('Python server start timeout'));
        }
      }, 30000);
    });
  }

  // Stop Python server
  stopPythonServer() {
    if (this.pythonProcess) {
      console.log('🛑 Stopping Python AI server...');
      this.pythonProcess.kill();
      this.pythonProcess = null;
      this.isReady = false;
    }
  }

  // Call Python AI API
  async generateTryOn(personImage, garmentImage) {
    if (!this.isReady) {
      throw new Error('Python AI server not ready');
    }

    const FormData = require('form-data');
    const fetch = require('node-fetch');

    const form = new FormData();
    form.append('person', personImage);
    form.append('garment', garmentImage);

    const response = await fetch('http://localhost:5001/tryon', {
      method: 'POST',
      body: form
    });

    return await response.json();
  }

  // Check if Python is installed
  static checkPython() {
    return new Promise((resolve) => {
      const pythonCommand = process.platform === 'win32' ? 'python' : 'python3';
      const checkProcess = spawn(pythonCommand, ['--version']);

      checkProcess.on('exit', (code) => {
        resolve(code === 0);
      });

      checkProcess.on('error', () => {
        resolve(false);
      });
    });
  }
}

module.exports = PythonAIBridge;
