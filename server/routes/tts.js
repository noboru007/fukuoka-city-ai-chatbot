import express from 'express';

const router = express.Router();

// Fish Audio TTS Proxy API
router.post('/fish-tts', async (req, res) => {
    try {
        const { text, reference_id } = req.body;

        if (!text || !reference_id) {
            return res.status(400).json({ error: 'Missing text or reference_id' });
        }

        const apiKey = process.env.FISH_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: 'Fish Audio API key not configured' });
        }

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

        const audioBuffer = await response.arrayBuffer();
        const base64Audio = Buffer.from(audioBuffer).toString('base64');

        res.json({ audio: base64Audio });
    } catch (error) {
        console.error('Fish Audio proxy error:', error);
        res.status(500).json({ error: 'Internal server error', message: error.message });
    }
});

export default router;
