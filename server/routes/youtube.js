import express from 'express';

const router = express.Router();

// YouTube Data API Proxy - Debug endpoint
router.get('/youtube/debug', (req, res) => {
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
router.get('/youtube', async (req, res) => {
    try {
        const apiKey = process.env.API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: 'API key not configured' });
        }

        const channelHandle = 'FukuokaChannel';
        const maxResults = 10;

        console.log('[YouTube API] Fetching channel ID for handle:', channelHandle);

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

        // If no recent videos found, try without publishedAfter filter
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

export default router;
