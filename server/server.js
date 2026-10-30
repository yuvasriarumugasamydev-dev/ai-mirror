import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import sareeRoutes from './routes/sareeRoutes.js';
import snapshotRoutes from './routes/snapshotRoutes.js';
import stylistRoutes from './routes/stylistRoutes.js';
import tryonRoutes from './routes/tryonRoutes.js';
import resultsRoutes from './routes/resultsRoutes.js';
import { tryOnManager } from './services/tryonProvider.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5050;

/**
 * Auto-detect local Wi-Fi / LAN IPv4 address so phone QR scanning works seamlessly
 */
export function getLanIpAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return '127.0.0.1';
}

// Middleware
app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Static Assets Serving
app.use('/assets', express.static(path.join(__dirname, '../assets')));
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/admin', express.static(path.join(__dirname, '../admin')));

// API Routes
app.use('/api/sarees', sareeRoutes);
app.use('/api/snapshots', snapshotRoutes);
app.use('/api/stylist', stylistRoutes);
app.use('/api/tryon', tryonRoutes);

// Mobile QR Result Routes (View look on phone & download image)
app.use('/results', resultsRoutes);

// Network Info Endpoint for QR Generation
app.get('/api/system/network-info', (req, res) => {
  const lanIp = getLanIpAddress();
  res.json({
    success: true,
    lanIp,
    port: PORT,
    baseUrl: `http://${lanIp}:${PORT}`
  });
});

// Health Check
app.get('/api/health', (req, res) => {
  const lanIp = getLanIpAddress();
  res.json({
    status: 'online',
    app: 'VASTRA AI Mirror Backend',
    stack: 'Express + Node.js + JSON Data Store',
    lanIp,
    timestamp: new Date().toISOString()
  });
});

// Start Server
const startServer = async () => {
  const lanIp = getLanIpAddress();

  app.listen(PORT, '0.0.0.0', () => {
    const activeChain = tryOnManager.getActiveProviderChain();
    console.log(`===============================================`);
    console.log(`✨ VASTRA AI MIRROR - BACKEND RUNNING ✨`);
    console.log(`🚀 Local Server:      http://localhost:${PORT}`);
    console.log(`📱 LAN Mobile QR:     http://${lanIp}:${PORT}/results/<id>`);
    console.log(`🔗 API Base:          http://localhost:${PORT}/api/sarees`);
    console.log(`🤖 AI Provider Mode:  ${process.env.AI_PROVIDER || 'hf_free'}`);
    console.log(`⛓️  Active Chain:     ${activeChain.join(' -> ')}`);
    console.log(`===============================================`);
  });
};

startServer();
