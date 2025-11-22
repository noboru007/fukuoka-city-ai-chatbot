import dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

// Load .env.local file
dotenv.config({ path: '.env.local' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read version from package.json
const packageJson = JSON.parse(readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
const APP_VERSION = packageJson.version;

const app = express();
const PORT = process.env.PORT || 8080;

// JSON body parser
app.use(express.json());

// Environment variables endpoint (for frontend to fetch API keys)
app.get('/api/config', (req, res) => {
  // Only expose necessary environment variables to frontend
  const config = {
    API_KEY: process.env.API_KEY || null,
    FISH_API_KEY: process.env.FISH_API_KEY || null,
    FISH_AGENT_VOICE_ID: process.env.FISH_AGENT_VOICE_ID || null,
    FISH_GRANDMA_VOICE_ID: process.env.FISH_GRANDMA_VOICE_ID || null,
    // Language-specific voice IDs
    FISH_AGENT_VOICE_ID_EN: process.env.FISH_AGENT_VOICE_ID_EN || null,
    FISH_GRANDMA_VOICE_ID_EN: process.env.FISH_GRANDMA_VOICE_ID_EN || null,
    FISH_AGENT_VOICE_ID_KR: process.env.FISH_AGENT_VOICE_ID_KR || null,
    FISH_GRANDMA_VOICE_ID_KR: process.env.FISH_GRANDMA_VOICE_ID_KR || null,
    FISH_AGENT_VOICE_ID_ZH: process.env.FISH_AGENT_VOICE_ID_ZH || null,
    FISH_GRANDMA_VOICE_ID_ZH: process.env.FISH_GRANDMA_VOICE_ID_ZH || null,
    FISH_AGENT_VOICE_ID_ES: process.env.FISH_AGENT_VOICE_ID_ES || null,
    FISH_GRANDMA_VOICE_ID_ES: process.env.FISH_GRANDMA_VOICE_ID_ES || null,
    FISH_AGENT_VOICE_ID_FR: process.env.FISH_AGENT_VOICE_ID_FR || null,
    FISH_GRANDMA_VOICE_ID_FR: process.env.FISH_GRANDMA_VOICE_ID_FR || null,
    FISH_AGENT_VOICE_ID_DE: process.env.FISH_AGENT_VOICE_ID_DE || null,
    FISH_GRANDMA_VOICE_ID_DE: process.env.FISH_GRANDMA_VOICE_ID_DE || null,
  };

  console.log('[Config API] Serving config to frontend:', {
    API_KEY: config.API_KEY ? 'YES' : 'NO',
    FISH_API_KEY: config.FISH_API_KEY ? 'YES' : 'NO',
  });

  res.json(config);
});

// Gemini API Proxy
app.post('/api/gemini', async (req, res) => {
  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Gemini API key not configured' });
    }

    const { endpoint, method = 'POST', body } = req.body;
    
    if (!endpoint) {
      return res.status(400).json({ error: 'Missing endpoint' });
    }

    // Construct full URL
    const url = `https://generativelanguage.googleapis.com/v1beta/${endpoint}?key=${apiKey}`;

    // Forward request to Gemini API
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(`Gemini API error (${response.status}):`, data);
      return res.status(response.status).json(data);
    }

    res.json(data);
  } catch (error) {
    console.error('Gemini API proxy error:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// Fish Audio TTS Proxy API
app.post('/api/fish-tts', async (req, res) => {
  try {
    const { text, reference_id } = req.body;
    
    if (!text || !reference_id) {
      return res.status(400).json({ error: 'Missing text or reference_id' });
    }

    const apiKey = process.env.FISH_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Fish Audio API key not configured' });
    }

    // Call Fish Audio API
    const response = await fetch('https://api.fish.audio/v1/tts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        reference_id,
        format: 'mp3',
        mp3_bitrate: 128,
        normalize: true,
        latency: 'balanced',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Fish Audio API error (${response.status}):`, errorText);
      return res.status(response.status).json({ 
        error: `Fish Audio API error: ${response.statusText}`,
        details: errorText
      });
    }

    // Stream the audio response
    const audioBuffer = await response.arrayBuffer();
    const base64Audio = Buffer.from(audioBuffer).toString('base64');
    
    res.json({ audio: base64Audio });
  } catch (error) {
    console.error('Fish Audio proxy error:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// ビルドされた静的ファイル（distフォルダ）を配信
app.use(express.static(path.join(__dirname, 'dist')));

// SPA対応: どのパスへのアクセスも index.html を返す
app.get('*', (req, res) => {
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