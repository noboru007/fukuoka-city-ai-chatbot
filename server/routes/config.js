import express from 'express';

const router = express.Router();

// Environment variables endpoint (for frontend to fetch API keys)
router.get('/config', (req, res) => {
    const config = {
        API_KEY: process.env.API_KEY || null,
        FISH_API_KEY: process.env.FISH_API_KEY || null,
        FISH_AGENT_VOICE_ID: process.env.FISH_AGENT_VOICE_ID || null,
        FISH_GRANDMA_VOICE_ID: process.env.FISH_GRANDMA_VOICE_ID || null,
        // Language-specific voice IDs
        FISH_AGENT_VOICE_ID_EN: process.env.FISH_AGENT_VOICE_ID_EN || null,
        FISH_GRANDMA_VOICE_ID_EN: process.env.FISH_GRANDMA_VOICE_ID_EN || null,
        FISH_AGENT_VOICE_ID_KO: process.env.FISH_AGENT_VOICE_ID_KO || process.env.FISH_AGENT_VOICE_ID_KR || null,
        FISH_GRANDMA_VOICE_ID_KO: process.env.FISH_GRANDMA_VOICE_ID_KO || process.env.FISH_GRANDMA_VOICE_ID_KR || null,
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
router.post('/ephemeral-token', async (req, res) => {
    try {
        const apiKey = process.env.API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: 'Gemini API key not configured' });
        }

        const { GoogleGenAI } = await import('@google/genai');
        const client = new GoogleGenAI({
            apiKey: apiKey,
            httpOptions: { apiVersion: 'v1alpha' }
        });

        const now = new Date();
        const expireTime = new Date(now.getTime() + 30 * 60 * 1000);
        const newSessionExpireTime = new Date(now.getTime() + 1 * 60 * 1000);

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

export default router;
