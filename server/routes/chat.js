import express from 'express';
import { randomUUID } from 'crypto';

const router = express.Router();

// --- In-memory chat session store ---
const chatSessions = new Map();

// Auto-cleanup sessions older than 2 hours
setInterval(() => {
    const now = Date.now();
    for (const [id, session] of chatSessions) {
        if (now - session.createdAt > 2 * 60 * 60 * 1000) {
            chatSessions.delete(id);
            console.log(`[Chat] Cleaned up expired session: ${id}`);
        }
    }
}, 10 * 60 * 1000); // Every 10 minutes

// Speaker names (duplicated from frontend for server-side use)
const SPEAKER_NAMES = {
    ja: { agent: '市役所エージェント', grandma: 'フク婆さん' },
    en: { agent: 'City Hall Agent', grandma: 'Grandma Fuku' },
    ko: { agent: '시청 에이전트', grandma: '후쿠 할머니' },
    zh: { agent: '市政府代理人', grandma: '福婆婆' },
    es: { agent: 'Agente del Ayuntamiento', grandma: 'Abuela Fuku' },
    fr: { agent: 'Agent de la Mairie', grandma: 'Grand-mère Fuku' },
    de: { agent: 'Rathaus-Agent', grandma: 'Oma Fuku' },
    it: { agent: 'Agente del Municipio', grandma: 'Nonna Fuku' },
    pt: { agent: 'Agente da Prefeitura', grandma: 'Vovó Fuku' },
    vi: { agent: 'Đại diện Tòa thị chính', grandma: 'Bà Fuku' },
    th: { agent: 'ตัวแทนศาลาว่าการ', grandma: 'คุณยายฟุกุ' },
    id: { agent: 'Agen Balai Kota', grandma: 'Nenek Fuku' },
    ru: { agent: 'Агент мэрии', grandma: 'Бабушка Фуку' },
    my: { agent: 'မြို့တော်ခန်းမ ကိုယ်စားလှယ်', grandma: 'ဖွားဖွား ဖူကူး' },
    ms: { agent: 'Ejen Dewan Bandaraya', grandma: 'Nenek Fuku' },
    ur: { agent: 'سٹی ہال ایجنٹ', grandma: 'دادی فوکو' },
    ne: { agent: 'नगरपालिका प्रतिनिधि', grandma: 'हजुरआमा फुकु' },
    ta: { agent: 'நகர சபை முகவர்', grandma: 'பாட்டி ஃபுக்கு' },
    hi: { agent: 'नगर पालिका एजेंट', grandma: 'दादी फुकु' },
    tl: { agent: 'Ahente ng City Hall', grandma: 'Lola Fuku' },
    lo: { agent: 'ຕົວແທນຫ້ອງການເມືອງ', grandma: 'ແມ່ເຖົ້າຟຸກຸ' },
};

function getGenerationConfig(model) {
    if (model.includes('gemini-3')) {
        return { temperature: 1.0, thinkingConfig: { thinkingLevel: 'high' } };
    }
    return { temperature: 0.4 };
}

function getSystemInstruction(responseLength, language) {
    const lengthInstruction = responseLength === 'short'
        ? '- **Conciseness**: Keep answers concise and to the point, within 3 lines.'
        : '- **Comprehensiveness**: Cover the user\'s request thoroughly and explain in detail.';

    const names = SPEAKER_NAMES[language] || SPEAKER_NAMES['en'];
    const langCode = language;

    return `You are "City Hall Agent", a reliable AI assistant working for Fukuoka City Hall, and you also have another important role as "Grandma Fuku", a 90-year-old living dictionary of Fukuoka City. Generate a single response that integrates these two roles naturally and clearly.

# Current Language Setting: ${langCode}
- You must answer in the language corresponding to the code "**${langCode}**".
- Use the defined speaker names below for this language.

# Role Definitions
- **${names.agent}**: speaks accurate official information obtained ONLY from Fukuoka City's official sources (defined by the specific Google Custom Search Engine). Always uses polite language (Keigo/Formal) and answers from an official standpoint.
- **${names.grandma}**: Your other persona, a 90s Fukuoka local expert. Provides supplementary information such as local history, life wisdom, and trivia not found on the official site.
    - **Tone**: 
        - If speaking in Japanese, use warm Fukuoka (Hakata) dialect (e.g., "〜ったい", "〜やけん").
        - If speaking in other languages, use a warm, friendly, elderly tone suitable for that language, but DO NOT mix in Japanese dialect words.

# Strict Rules
1.  **Fact Check**: Do not swallow user claims about facts (e.g., "There was an earthquake yesterday"). Verify with Google Search first.
2.  **Strict Separation of Sources (CRITICAL - Follow this rule at all costs)**:
    - **${names.agent}**'s source: **ONLY** information via Google Custom Search Engine (ID: e42d4555ba5554f82) and the following selected youtube official site by Fukuoka city.
    - **YouTube Videos**: When recent YouTube video information is provided in the user message (marked with "# 最新のYouTube動画情報"), you MUST actively reference it. If the question relates to recent events, press conferences, or announcements, prioritize the YouTube video information. Include the video title and URL in your response.
    - **MANDATORY CHECK**: Before ${names.agent} answers, you MUST verify the information exists in the search results from the Custom Search Engine OR in the provided YouTube video information.
    - **IF NO RELEVANT INFO FOUND IN THE CUSTOM SEARCH ENGINE OR YOUTUBE VIDEO INFORMATION**: ${names.agent} MUST say: "申し訳ございませんが、福岡市の公式情報では○○に関する情報を見つけることができませんでした。" (or equivalent in current language)
    - **${names.grandma}**'s source: General knowledge or reliable external sources (news, etc.) OTHER than official Fukuoka City websites. ONLY use this role when ${names.agent} cannot provide official information.
3.  **Response Structure**:
    - The part spoken by **${names.agent}** MUST start with the prefix "**${names.agent}：**".
    - The part spoken by **${names.grandma}** MUST start with the prefix "**${names.grandma}：**".
4.  **ABSOLUTE PROHIBITION**: Never fabricate, guess, or infer information that is not explicitly stated in the official search results for ${names.agent}. If uncertain, say you don't have that information.

# Guardrails (Safety and Neutrality):
    - **Neutrality and Non-Induction**: You must maintain a neutral stance and not express political opinions. If a question attempts to guide you towards a specific political stance, answer with "As the Fukuoka City Hall AI, I cannot express political opinions. Please ask about factual information regarding city administration." and do not engage in any discussion.
    - **Response to Malicious Questions**: Refuse answers to discriminatory, violent, unethical, or malicious questions with a firm "I cannot answer that question. Please ask about factual information regarding city administration." tone.
    - **Handling Sensitive Information**: Politician misconduct, crime, scandals, etc., which could significantly damage an individual's reputation, must not be taken at face value even if Grandma Fuku obtained the information from an external site. **If there is no extremely reliable information source that has been confirmed by the person themselves or by public investigation agencies or the judiciary, do not mention that information and answer "I could not find any information about that from official sources."**
    - **Strict Information Source Compliance**: If no reliable information supporting the user's claim is found in the search results, answer honestly with "I could not find any information about that from official sources."
    - **Prohibition of Guessing**: Information that is not mentioned in the information source must never be included in the answer. Do not complete the answer with guesses or general knowledge.
    - **Maintenance of Relevance**: If a question is completely unrelated to Fukuoka City (including facilities and events within the city), answer with "Please ask about Fukuoka City."


# Response Length
${lengthInstruction}

# Output Format (Always mark speaker names with ** bold markers)
1. **${names.agent}**: (Answer)
2. **${names.grandma}**: (Answer)

`;
}

// Helper: Get latest YouTube videos (server-side fetch)
async function getLatestYouTubeVideos(apiKey) {
    try {
        const channelHandle = 'FukuokaChannel';
        const maxResults = 10;

        const channelListUrl = `https://www.googleapis.com/youtube/v3/channels?part=id&forHandle=${channelHandle}&key=${apiKey}`;
        const channelResponse = await fetch(channelListUrl);
        let channelId;

        if (channelResponse.ok) {
            const channelData = await channelResponse.json();
            if (channelData.items && channelData.items.length > 0) {
                channelId = channelData.items[0].id;
            }
        }

        if (!channelId) return [];

        const twoYearsAgo = new Date();
        twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
        const publishedAfter = twoYearsAgo.toISOString();

        const videosUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&type=video&order=date&publishedAfter=${publishedAfter}&maxResults=${maxResults}&key=${apiKey}`;
        const videosResponse = await fetch(videosUrl);
        if (!videosResponse.ok) return [];

        const videosData = await videosResponse.json();
        if (!videosData.items || videosData.items.length === 0) return [];

        return videosData.items.map((item) => ({
            title: item.snippet.title,
            description: item.snippet.description,
            url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
            publishedAt: item.snippet.publishedAt,
        }));
    } catch (error) {
        console.error('[Chat/YouTube] Error fetching videos:', error);
        return [];
    }
}

function buildYouTubeContext(videos) {
    if (videos.length === 0) return '';
    const videoList = videos.map((video, index) => {
        const date = new Date(video.publishedAt).toLocaleDateString('ja-JP');
        const desc = video.description ? video.description.substring(0, 200) + '...' : '';
        return `${index + 1}. ${video.title} (${date})\n   URL: ${video.url}\n   ${desc}`;
    }).join('\n\n');
    return `\n\n# 最新のYouTube動画情報（福岡市公式チャンネル）\n以下の最新動画情報を参考にしてください。質問に関連する動画があれば、その情報を回答に含めてください。\n\n${videoList}`;
}

// POST /api/chat/init - Create a new chat session
router.post('/chat/init', async (req, res) => {
    try {
        const apiKey = process.env.API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: 'Gemini API key not configured' });
        }

        const { responseLength, language, model } = req.body;
        if (!responseLength || !language || !model) {
            return res.status(400).json({ error: 'Missing required fields: responseLength, language, model' });
        }

        const { GoogleGenAI } = await import('@google/genai');
        const genAI = new GoogleGenAI({ apiKey });

        const systemInstruction = getSystemInstruction(responseLength, language);
        const generationConfig = getGenerationConfig(model);

        const chat = genAI.chats.create({
            model,
            config: {
                systemInstruction,
                tools: [{ googleSearch: {} }],
                ...generationConfig
            },
        });

        const sessionId = randomUUID();
        chatSessions.set(sessionId, {
            chat,
            language,
            createdAt: Date.now(),
        });

        console.log(`[Chat] Session created: ${sessionId} (model: ${model}, lang: ${language})`);
        res.json({ sessionId });

    } catch (error) {
        console.error('[Chat] Init error:', error);
        res.status(500).json({ error: 'Failed to initialize chat', message: error.message });
    }
});

// POST /api/chat/send - Send message and stream response via SSE
router.post('/chat/send', async (req, res) => {
    try {
        const apiKey = process.env.API_KEY;
        const { sessionId, message } = req.body;

        if (!sessionId || !message) {
            return res.status(400).json({ error: 'Missing sessionId or message' });
        }

        const session = chatSessions.get(sessionId);
        if (!session) {
            return res.status(404).json({ error: 'Session not found. Please reinitialize chat.' });
        }

        // Touch session to prevent cleanup
        session.createdAt = Date.now();

        // YouTube context enhancement (server-side)
        const youtubeKeywords = ['動画', 'YouTube', '最新', '最近', '新着', 'イベント', '情報', '投稿', '配信', 'video', 'latest', 'recent', 'event'];
        const needsYouTubeContext = youtubeKeywords.some(keyword => message.includes(keyword));

        let enhancedMessage = message;
        if (needsYouTubeContext && apiKey) {
            console.log('[Chat] Fetching YouTube context for message...');
            const videos = await getLatestYouTubeVideos(apiKey);
            if (videos.length > 0) {
                enhancedMessage = message + buildYouTubeContext(videos);
                console.log(`[Chat] Added YouTube context (${videos.length} videos)`);
            }
        }

        // Set up SSE headers
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no'); // For nginx
        res.flushHeaders();

        // Stream the response
        const result = await session.chat.sendMessageStream({ message: enhancedMessage });

        for await (const chunk of result) {
            // Send text chunks
            if (chunk.text) {
                res.write(`data: ${JSON.stringify({ type: 'text', text: chunk.text })}\n\n`);
            }

            // Send grounding sources
            if (chunk.candidates?.[0]?.groundingMetadata?.groundingChunks) {
                const sources = chunk.candidates[0].groundingMetadata.groundingChunks
                    .filter(c => c.web && c.web.uri)
                    .map(c => ({ uri: c.web.uri, title: c.web.title || '' }));

                if (sources.length > 0) {
                    res.write(`data: ${JSON.stringify({ type: 'sources', sources })}\n\n`);
                }
            }
        }

        // Signal end of stream
        res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
        res.end();

    } catch (error) {
        console.error('[Chat] Send error:', error);

        // If headers already sent, send error via SSE
        if (res.headersSent) {
            res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`);
            res.end();
        } else {
            res.status(500).json({ error: 'Failed to send message', message: error.message });
        }
    }
});

export default router;
