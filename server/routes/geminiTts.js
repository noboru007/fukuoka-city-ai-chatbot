import express from 'express';

const router = express.Router();

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

// POST /api/gemini-tts - Server-side Gemini TTS
router.post('/gemini-tts', async (req, res) => {
    try {
        const apiKey = process.env.API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: 'Gemini API key not configured' });
        }

        const { text, language } = req.body;
        if (!text || !language) {
            return res.status(400).json({ error: 'Missing text or language' });
        }

        const { GoogleGenAI, Modality } = await import('@google/genai');
        const ai = new GoogleGenAI({ apiKey });
        const names = SPEAKER_NAMES[language] || SPEAKER_NAMES['en'];

        // Clean text
        let cleanText = text
            .replace(/\*\*/g, '')
            .replace(/[\u4E00-\u9FFF々〆〤]+[\(（]([\u3040-\u309F\u30A0-\u30FF\u30FC\s]+)[\)）]/g, '$1');

        console.log(`[Gemini TTS] Generating audio for text: "${cleanText.substring(0, 100)}..."`);

        const ttsConfig = {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                multiSpeakerVoiceConfig: {
                    speakerVoiceConfigs: [
                        {
                            speaker: names.agent,
                            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } }
                        },
                        {
                            speaker: names.grandma,
                            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Gacrux' } }
                        }
                    ]
                }
            }
        };

        try {
            // Try Pro model first
            const response = await ai.models.generateContent({
                model: "gemini-2.5-pro-preview-tts",
                contents: [{ parts: [{ text: cleanText }] }],
                config: ttsConfig
            });
            const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
            if (audioData) {
                return res.json({ audio: audioData });
            }
        } catch (proError) {
            console.warn("[Gemini TTS] Pro model failed, falling back to Flash:", proError.message);
        }

        // Fallback to Flash
        try {
            const fallbackResponse = await ai.models.generateContent({
                model: "gemini-2.5-flash-preview-tts",
                contents: [{ parts: [{ text: cleanText }] }],
                config: ttsConfig
            });
            const audioData = fallbackResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
            res.json({ audio: audioData });
        } catch (flashError) {
            console.error("[Gemini TTS] All models failed:", flashError.message);
            res.status(500).json({ error: 'TTS generation failed', message: flashError.message });
        }

    } catch (error) {
        console.error('[Gemini TTS] Error:', error);
        res.status(500).json({ error: 'Internal server error', message: error.message });
    }
});

// POST /api/lyrics/convert - Convert kanji to kana for singing
router.post('/lyrics/convert', async (req, res) => {
    try {
        const apiKey = process.env.API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: 'Gemini API key not configured' });
        }

        const { text } = req.body;
        if (!text) {
            return res.status(400).json({ error: 'Missing text' });
        }

        const { GoogleGenAI } = await import('@google/genai');
        const ai = new GoogleGenAI({ apiKey });

        const prompt = `
    You are a professional lyricist assistant. Your task is to convert Japanese lyrics into a format that is easy for AI singers to pronounce correctly.
    Input Text:
    "${text}"

    Instructions:
    1. **Structure Tags**: **KEEP ALL tags in brackets (e.g., [Intro], [Verse], [Chorus], [Outro]) UNCHANGED.** Do not convert them.
    2. **Kanji to Kana**: Convert ALL Kanji to Hiragana or Katakana based on the context and standard song pronunciation.
    3. **Particles**: Convert particles based on PRONUNCIATION, not spelling.
       - "は" (ha) as a subject marker -> "わ" (wa). **Keep "は" as "ハ" (ha) when it is part of a word.**
       - "へ" (he) as a direction marker -> "え" (e). **Keep "へ" as "ヘ" (he) within words.**
       - "を" (wo) -> "を" (wo) is usually fine, but if it sounds better as "お" (o), use "お".
    4. **Numbers to Katakana**: Convert ALL numbers to their Katakana reading.
    5. **Alphabet/Romaji**: **Keep English words or Romaji UNCHANGED**. Do NOT convert to Katakana.
    6. **Output ONLY the converted text**: Do not include any explanations.
    `;

        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: [{ parts: [{ text: prompt }] }],
        });

        const convertedText = response.candidates?.[0]?.content?.parts?.[0]?.text || "";
        console.log('[Lyrics] Converted to reading:', convertedText.substring(0, 50) + '...');
        res.json({ text: convertedText.trim() });

    } catch (error) {
        console.error('[Lyrics] Conversion error:', error);
        res.status(500).json({ error: 'Lyrics conversion failed', message: error.message });
    }
});

// POST /api/lyrics/generate - Generate song lyrics
router.post('/lyrics/generate', async (req, res) => {
    try {
        const apiKey = process.env.API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: 'Gemini API key not configured' });
        }

        const { topic, language } = req.body;
        if (!topic || !language) {
            return res.status(400).json({ error: 'Missing topic or language' });
        }

        const { GoogleGenAI } = await import('@google/genai');
        const ai = new GoogleGenAI({ apiKey });

        const prompt = `
    You are a professional songwriter composing for an AI music generator (like Suno/Mureka).
    Write lyrics for a song about the following topic.
    
    Topic: "${topic}"
    Language: "${language}" (If language is 'ja', write in Japanese. If 'en', write in English. etc.)
    
    Output Requirements:
    - The output MUST be a valid JSON object.
    - Schema: { "title": "Song Title", "lyrics": "Song Lyrics" }
    - **Structure**: You MUST use standard AI song structure tags such as [Intro], [Verse], [Chorus], [Bridge], [Outro], [Instrumental], etc.
    - The 'lyrics' field must contain the tags and the song text, formatted with line breaks (\\n).
    - **Parentheses Usage**: You MAY use parentheses '()' ONLY for backing vocals, ad-libs, or call-and-response parts. Do NOT use parentheses for explanations or stage directions.
    - Do not include conversational filler.
    `;

        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: [{ parts: [{ text: prompt }] }],
            config: { responseMimeType: 'application/json' }
        });

        const responseText = response.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!responseText) throw new Error("No text generated");

        const data = JSON.parse(responseText);
        console.log('[Lyrics] Generated lyrics:', data.title);
        res.json({ title: data.title || "Untitled", lyrics: data.lyrics || "" });

    } catch (error) {
        console.error('[Lyrics] Generation error:', error);
        res.status(500).json({ error: 'Lyrics generation failed', message: error.message });
    }
});

export default router;
