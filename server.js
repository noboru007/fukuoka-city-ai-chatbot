import dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

// Load .env.local file
dotenv.config({ path: '.env.local' });

// --- SECURITY FIX: Add Referer header to all Google API requests ---
// This allows us to use "Website restrictions" in Google Cloud Console
// even for server-side requests.
const CLOUD_RUN_URL = 'https://fukuoka-city-ai-chatbot-v2-411258323672.us-west1.run.app';
const originalFetch = global.fetch;

global.fetch = async (url, options = {}) => {
  const urlStr = url.toString();
  if (urlStr.includes('googleapis.com')) {
    const newOptions = { ...options };
    const headers = new Headers(newOptions.headers || {});
    headers.set('Referer', CLOUD_RUN_URL);
    headers.set('Origin', CLOUD_RUN_URL);
    newOptions.headers = headers;
    return originalFetch(url, newOptions);
  }
  return originalFetch(url, options);
};
// ------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read version from package.json
const packageJson = JSON.parse(readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
const APP_VERSION = packageJson.version;

const app = express();
const PORT = process.env.PORT || 8080;

// JSON body parser
app.use(express.json());

// --- Route Modules ---
import configRoutes from './server/routes/config.js';
import geminiRoutes from './server/routes/gemini.js';
import youtubeRoutes from './server/routes/youtube.js';
import ttsRoutes from './server/routes/tts.js';
import murekaRoutes from './server/routes/mureka.js';
import proxyRoutes from './server/routes/proxy.js';

app.use('/api', configRoutes);
app.use('/api', geminiRoutes);
app.use('/api', youtubeRoutes);
app.use('/api', ttsRoutes);
app.use('/api', murekaRoutes);
app.use('/api', proxyRoutes);

// ビルドされた静的ファイル（distフォルダ）を配信
app.use(express.static(path.join(__dirname, 'dist')));

// SPA対応: どのパスへのアクセスも index.html を返す
app.get('*', (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`========================================`);
  console.log(`Fukuoka City AI Chatbot v${APP_VERSION}`);
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'production'}`);
  console.log(`Gemini API Key: ${process.env.API_KEY ? 'YES' : 'NO'}`);
  console.log(`Fish Audio API Key: ${process.env.FISH_API_KEY ? 'YES' : 'NO'}`);
  console.log(`Fish Agent Voice ID: ${process.env.FISH_AGENT_VOICE_ID ? 'YES' : 'NO'}`);
  console.log(`Fish Grandma Voice ID: ${process.env.FISH_GRANDMA_VOICE_ID ? 'YES' : 'NO'}`);
  console.log(`========================================`);
});