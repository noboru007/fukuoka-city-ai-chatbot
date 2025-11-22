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
  // Only add headers to Google API requests
  if (urlStr.includes('googleapis.com')) {
    const newOptions = { ...options };
    const headers = new Headers(newOptions.headers || {});
    
    // Add Referer header to match Google Cloud Console restrictions
    headers.set('Referer', CLOUD_RUN_URL);
    // Also add Origin for good measure
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

// Multer for file uploads
import multer from 'multer';
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

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

// Generate ephemeral token for Live API
app.post('/api/ephemeral-token', async (req, res) => {
  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Gemini API key not configured' });
    }

    // Use SDK to generate ephemeral token
    const { GoogleGenAI } = await import('@google/genai');
    const client = new GoogleGenAI({ 
      apiKey: apiKey,
      httpOptions: { apiVersion: 'v1alpha' }
    });

    const now = new Date();
    const expireTime = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes
    const newSessionExpireTime = new Date(now.getTime() + 1 * 60 * 1000); // 1 minute

    const token = await client.authTokens.create({
      config: {
        uses: 1,
        expireTime: expireTime.toISOString(),
        newSessionExpireTime: newSessionExpireTime.toISOString(),
        httpOptions: { apiVersion: 'v1alpha' }
      }
    });

    console.log('[Ephemeral Token] Generated successfully');
    res.json({ token: token.name });

  } catch (error) {
    console.error('[Ephemeral Token] Generation error:', error);
    console.error('[Ephemeral Token] Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Internal server error', 
      message: error.message,
      details: error.toString()
    });
  }
});

// Audio transcription endpoint
app.post('/api/transcribe', upload.single('audio'), async (req, res) => {
  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Gemini API key not configured' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    console.log('[Transcribe] Received audio file:', req.file.size, 'bytes, type:', req.file.mimetype);

    // Import Gemini SDK
    const { GoogleGenAI } = await import('@google/genai');
    const genAI = new GoogleGenAI({ apiKey });

    // Convert audio to base64 for inline data
    console.log('[Transcribe] Converting audio to base64...');
    const base64Audio = req.file.buffer.toString('base64');
    
    console.log('[Transcribe] Generating transcription with inline audio...');

    // Generate transcription with inline audio (using gemini-2.0-flash which supports audio)
    const result = await genAI.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [{
        parts: [
          {
            inlineData: {
              data: base64Audio,
              mimeType: req.file.mimetype,
            },
          },
          {
            text: 'この音声を日本語で文字起こししてください。文字起こしのテキストのみを返してください。',
          },
        ],
      }],
    });

    const transcription = result.text();
    console.log('[Transcribe] Transcription:', transcription);

    res.json({ text: transcription });

  } catch (error) {
    console.error('[Transcribe] Error:', error);
    res.status(500).json({ error: 'Transcription failed', message: error.message });
  }
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

// YouTube Data API Proxy - Debug endpoint to show expected URLs
app.get('/api/youtube/debug', (req, res) => {
  const apiKey = process.env.API_KEY;
  const channelHandle = 'FukuokaCityChannel';
  
  if (!apiKey) {
    return res.json({ error: 'API key not configured' });
  }
  
  const urls = {
    primary: `https://www.googleapis.com/youtube/v3/channels?part=id&forHandle=${channelHandle}&key=${apiKey}`,
    fallback: `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(channelHandle)}&key=${apiKey}&maxResults=1`,
    note: 'Replace YOUR_API_KEY with your actual API key to test in browser'
  };
  
  res.json(urls);
});

// YouTube Data API Proxy - Get latest videos from Fukuoka City Channel
app.get('/api/youtube', async (req, res) => {
  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'API key not configured' });
    }

    const channelHandle = 'FukuokaChannel'; // @FukuokaChannel (latest official channel)
    const maxResults = 10; // Latest 10 videos

    console.log('[YouTube API] Fetching channel ID for handle:', channelHandle);

    // Use channels.list with forHandle parameter (more reliable than search)
    // Note: forHandle requires the handle WITHOUT the @ symbol
    const channelListUrl = `https://www.googleapis.com/youtube/v3/channels?part=id&forHandle=${channelHandle}&key=${apiKey}`;
    
    const channelResponse = await fetch(channelListUrl);
    let channelData;
    let channelId;
    
    if (channelResponse.ok) {
      channelData = await channelResponse.json();
      if (channelData.items && channelData.items.length > 0) {
        channelId = channelData.items[0].id;
        console.log('[YouTube API] Found channel ID via forHandle:', channelId);
      }
    } else {
      const errorText = await channelResponse.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { raw: errorText };
      }
      console.error('[YouTube API] Channel lookup error:', channelResponse.status, channelResponse.statusText, errorData);
      console.warn('[YouTube API] Falling back to search method...');
    }
    
    // If channel ID not found via forHandle, try search method
    if (!channelId) {
      console.warn('[YouTube API] Channel not found via forHandle, falling back to search method');
      
      // Fallback: Try search method
      const channelSearchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(channelHandle)}&key=${apiKey}&maxResults=1`;
      const searchResponse = await fetch(channelSearchUrl);
      if (!searchResponse.ok) {
        return res.json({ videos: [], error: 'Channel not found' });
      }
      const searchData = await searchResponse.json();
      if (!searchData.items || searchData.items.length === 0) {
        return res.json({ videos: [], error: 'Channel not found' });
      }
      channelId = searchData.items[0].snippet.channelId;
      console.log('[YouTube API] Found channel ID via search:', channelId);
    }
    
    if (!channelId) {
      return res.json({ videos: [], error: 'Failed to find channel ID' });
    }

    // Get latest videos from channel (last 2 years)
    // Use publishedAfter to filter recent videos only
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
    const publishedAfter = twoYearsAgo.toISOString();
    
    const videosUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&type=video&order=date&publishedAfter=${publishedAfter}&maxResults=${maxResults}&key=${apiKey}`;
    
    console.log(`[YouTube API] Fetching videos published after: ${publishedAfter}`);
    
    let videosResponse = await fetch(videosUrl);
    let videosData;
    
    if (!videosResponse.ok) {
      const errorData = await videosResponse.json();
      throw new Error(`YouTube API error: ${JSON.stringify(errorData)}`);
    }

    videosData = await videosResponse.json();
    
    // If no recent videos found, try without publishedAfter filter (get all videos)
    if (!videosData.items || videosData.items.length === 0) {
      console.warn('[YouTube API] No recent videos found, fetching all videos...');
      const allVideosUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&type=video&order=date&maxResults=${maxResults}&key=${apiKey}`;
      videosResponse = await fetch(allVideosUrl);
      if (videosResponse.ok) {
        videosData = await videosResponse.json();
      }
    }
    const videos = videosData.items.map((item) => ({
      id: item.id.videoId,
      title: item.snippet.title,
      description: item.snippet.description,
      publishedAt: item.snippet.publishedAt,
      thumbnail: item.snippet.thumbnails?.default?.url || '',
      url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
    }));

    console.log(`[YouTube API] Found ${videos.length} videos`);
    res.json({ videos });
  } catch (error) {
    console.error('[YouTube API] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: 'Failed to fetch YouTube videos', message: errorMessage });
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