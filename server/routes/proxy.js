import express from 'express';

const router = express.Router();

// Proxy endpoint for downloading files with custom names
router.get('/proxy-download', async (req, res) => {
    const { url, filename } = req.query;

    if (!url) {
        return res.status(400).send('Missing url parameter');
    }

    try {
        const fetchResponse = await fetch(url);
        if (!fetchResponse.ok) {
            return res.status(fetchResponse.status).send('Failed to fetch file');
        }

        // Use filename*=UTF-8'' syntax for non-ASCII characters
        const safeFilename = filename ? encodeURIComponent(filename) : 'download';
        res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"; filename*=UTF-8''${safeFilename}`);
        res.setHeader('Content-Type', fetchResponse.headers.get('content-type') || 'application/octet-stream');

        const blob = await fetchResponse.blob();
        const buffer = Buffer.from(await blob.arrayBuffer());
        res.send(buffer);

    } catch (error) {
        console.error('Proxy download error:', error);
        res.status(500).send('Internal server error');
    }
});

export default router;
