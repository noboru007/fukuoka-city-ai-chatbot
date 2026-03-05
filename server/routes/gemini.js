import express from 'express';
import multer from 'multer';

const router = express.Router();
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Audio transcription endpoint
router.post('/transcribe', upload.single('audio'), async (req, res) => {
    try {
        const apiKey = process.env.API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: 'Gemini API key not configured' });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'No audio file provided' });
        }

        console.log('[Transcribe] Received audio file:', req.file.size, 'bytes, type:', req.file.mimetype);

        const { GoogleGenAI } = await import('@google/genai');
        const genAI = new GoogleGenAI({ apiKey });

        console.log('[Transcribe] Converting audio to base64...');
        const base64Audio = req.file.buffer.toString('base64');

        console.log('[Transcribe] Generating transcription with inline audio...');

        const result = await genAI.models.generateContent({
            model: 'gemini-3-flash-preview',
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
router.post('/gemini', async (req, res) => {
    try {
        const apiKey = process.env.API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: 'Gemini API key not configured' });
        }

        const { endpoint, method = 'POST', body } = req.body;

        if (!endpoint) {
            return res.status(400).json({ error: 'Missing endpoint' });
        }

        const url = `https://generativelanguage.googleapis.com/v1beta/${endpoint}?key=${apiKey}`;

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

export default router;
