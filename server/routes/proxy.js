import express from 'express';
import { Readable } from 'stream';

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

        // ヘッダーを即座に送信（ブラウザがダウンロードであることを即座に認識できる）
        const rawFilename = filename || 'download.mp3';
        const asciiFilename = rawFilename.replace(/[^\w.\-]/g, '_');
        const utf8Filename = encodeURIComponent(rawFilename);
        res.setHeader('Content-Disposition', `attachment; filename="${asciiFilename}"; filename*=UTF-8''${utf8Filename}`);

        const contentType = fetchResponse.headers.get('content-type');
        res.setHeader('Content-Type', contentType && contentType.includes('audio') ? contentType : 'audio/mpeg');

        // Content-Lengthがあれば転送（ブラウザがファイルサイズを認識できる）
        const contentLength = fetchResponse.headers.get('content-length');
        if (contentLength) {
            res.setHeader('Content-Length', contentLength);
        }

        // バッファリングせずストリーミングで返す
        const nodeStream = Readable.fromWeb(fetchResponse.body);
        nodeStream.pipe(res);

    } catch (error) {
        console.error('Proxy download error:', error);
        if (!res.headersSent) {
            res.status(500).send('Internal server error');
        }
    }
});

export default router;
