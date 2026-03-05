import express from 'express';

const router = express.Router();

// Generate lyrics
router.post('/mureka/lyrics', async (req, res) => {
    try {
        const { prompt } = req.body;
        console.log('[Mureka] Generating lyrics for:', prompt?.substring(0, 50));
        const apiKey = process.env.MUREKA_API_KEY;

        if (!apiKey) {
            return res.status(500).json({ error: 'Mureka API key not configured' });
        }

        const response = await fetch('https://api.mureka.ai/v1/lyrics/generate', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ prompt }),
        });

        const data = await response.json();
        if (!response.ok) {
            console.error('Mureka Lyrics API error:', data);
            return res.status(response.status).json(data);
        }
        console.log('[Mureka] Lyrics generated successfully');
        res.json(data);
    } catch (error) {
        console.error('Mureka Lyrics API error:', error);
        res.status(500).json({ error: 'Internal server error', message: error.message });
    }
});

// Generate song
router.post('/mureka/song', async (req, res) => {
    try {
        const { lyrics, prompt, model } = req.body;
        console.log('[Mureka] Generating song. Style:', prompt);
        const apiKey = process.env.MUREKA_API_KEY;

        if (!apiKey) {
            return res.status(500).json({ error: 'Mureka API key not configured' });
        }

        const response = await fetch('https://api.mureka.ai/v1/song/generate', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ lyrics, prompt, model }),
        });

        const data = await response.json();
        if (!response.ok) {
            console.error('Mureka Song API error:', data);
            return res.status(response.status).json(data);
        }
        console.log('[Mureka] Song generation started. TaskId:', data);
        res.json(data);
    } catch (error) {
        console.error('Mureka Song API error:', error);
        res.status(500).json({ error: 'Internal server error', message: error.message });
    }
});

// Query song status
router.get('/mureka/song/:taskId', async (req, res) => {
    try {
        const { taskId } = req.params;
        const apiKey = process.env.MUREKA_API_KEY;

        if (!apiKey) {
            return res.status(500).json({ error: 'Mureka API key not configured' });
        }

        const response = await fetch(`https://api.mureka.ai/v1/song/query/${taskId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
            },
        });

        const data = await response.json();
        if (!response.ok) {
            console.error('Mureka Query API error:', data);
            return res.status(response.status).json(data);
        }

        // Log meaningful status updates
        if (data.status !== 'queued' && data.status !== 'running') {
            console.log(`[Mureka] Task ${taskId} status: ${data.status}`);
            if (data.status === 'completed') {
                console.log('[Mureka] Song data:', JSON.stringify(data).substring(0, 200) + '...');
            }
        }

        res.json(data);
    } catch (error) {
        console.error('Mureka Query API error:', error);
        res.status(500).json({ error: 'Internal server error', message: error.message });
    }
});

export default router;
