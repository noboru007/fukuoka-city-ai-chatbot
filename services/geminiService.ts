import { GoogleGenAI, Chat, Modality } from "@google/genai";
import { Source, ResponseLength, Language, AudioSegment, Model } from "../types";
import { getConfig } from "../utils/config";

export const SPEAKER_NAMES = {
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

// Fish Audio supported languages (13 languages)
const FISH_AUDIO_SUPPORTED_LANGUAGES: Language[] = [
    'en', 'zh', 'ja', 'de', 'fr', 'es', 'ko', 'ru', 'it', 'pt',
  // Arabic (ar), Dutch (nl), Polish (pl) are not in our Language type yet
];

// Helper to check if language is supported by Fish Audio
const isFishAudioSupported = (language: Language): boolean => {
    return FISH_AUDIO_SUPPORTED_LANGUAGES.includes(language);
};

const getSystemInstruction = (responseLength: ResponseLength, language: Language): string => {
    const lengthInstruction = responseLength === 'short'
        ? '- **Conciseness**: Keep answers concise and to the point, within 3 lines.'
        : '- **Comprehensiveness**: Cover the user\'s request thoroughly and explain in detail.';
    
    const names = SPEAKER_NAMES[language];
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

# Guardrails
- Maintain neutrality.
- Reject malicious questions.
- Handle sensitive info cautiously.

# Response Length
${lengthInstruction}

# Output Format (Always mark speaker names with ** bold markers)
1. **${names.agent}**: (Answer)
2. **${names.grandma}**: (Answer)

`;
}

let ai: GoogleGenAI | null = null;

export const getAi = async (): Promise<GoogleGenAI> => {
    if (!ai) {
        // Fetch API key from server at runtime
        const config = await getConfig();
        const apiKey = config.API_KEY;

        if (!apiKey) {
            console.error("API Key is missing.");
            throw new Error("API Key is missing. Please ensure API_KEY is set in Cloud Run environment variables.");
        }
        
        ai = new GoogleGenAI({ apiKey: apiKey });
    }
    return ai;
};

export const initChat = async (responseLength: ResponseLength, language: Language, history?: any[], model: Model = 'gemini-2.5-flash'): Promise<Chat> => {
    const genAI = await getAi();
    const systemInstruction = getSystemInstruction(responseLength, language);

    const chat = genAI.chats.create({
    model: model,
    history,
    config: {
        systemInstruction,
        tools: [{ googleSearch: {} }],
    },
    });

    return chat;
};

// Helper: Get latest YouTube videos from Fukuoka City Channel
const getLatestYouTubeVideos = async (): Promise<Array<{ title: string; description: string; url: string; publishedAt: string }>> => {
    try {
        console.log('[YouTube] Fetching from /api/youtube...');
        const response = await fetch('/api/youtube');
        if (!response.ok) {
            const errorText = await response.text();
            console.error('[YouTube] API error:', response.status, response.statusText, errorText);
            return [];
        }
        const data = await response.json();
        console.log('[YouTube] API response:', { videoCount: data.videos?.length || 0, error: data.error });
        
        if (data.error) {
            console.error('[YouTube] Server error:', data.error);
            return [];
        }
        
        const videos = data.videos || [];
        if (videos.length > 0) {
            console.log('[YouTube] First video:', videos[0].title);
        }
        return videos;
    } catch (error) {
        console.error('[YouTube] Fetch error:', error);
        return [];
    }
};

// Helper: Build YouTube context for LLM
const buildYouTubeContext = (videos: Array<{ title: string; description: string; url: string; publishedAt: string }>): string => {
    if (videos.length === 0) return '';
    
    const videoList = videos.map((video, index) => {
        const date = new Date(video.publishedAt).toLocaleDateString('ja-JP');
        const desc = video.description ? video.description.substring(0, 200) + '...' : '';
        return `${index + 1}. ${video.title} (${date})\n   URL: ${video.url}\n   ${desc}`;
    }).join('\n\n');
    
    return `\n\n# 最新のYouTube動画情報（福岡市公式チャンネル）\n以下の最新動画情報を参考にしてください。質問に関連する動画があれば、その情報を回答に含めてください。\n\n${videoList}`;
};

export async function* streamChat(chat: Chat, message: string) {
    const result = await chat.sendMessageStream({ message });
    for await (const chunk of result) {
        yield chunk;
    }
}

export const sendMessage = async (chat: Chat, message: string): Promise<{ text: string; sources: Source[] }> => {
    let text = '';
    let sources: Source[] = [];
    
    // Check if message might benefit from YouTube context (contains keywords related to recent info, videos, events)
    const youtubeKeywords = ['動画', 'YouTube', '最新', '最近', '新着', 'イベント', '情報', '投稿', '配信', 'video', 'latest', 'recent', 'event'];
    const needsYouTubeContext = youtubeKeywords.some(keyword => message.includes(keyword));
    
    let enhancedMessage = message;
    if (needsYouTubeContext) {
        console.log('[YouTube] Fetching latest videos for context...');
        const videos = await getLatestYouTubeVideos();
        console.log(`[YouTube] Received ${videos.length} videos from API`);
        if (videos.length > 0) {
            const youtubeContext = buildYouTubeContext(videos);
            enhancedMessage = message + youtubeContext;
            console.log(`[YouTube] Added context for ${videos.length} videos`);
            console.log('[YouTube] Enhanced message preview:', enhancedMessage.substring(0, 300) + '...');
        } else {
            console.warn('[YouTube] No videos found, proceeding without YouTube context');
        }
    } else {
        console.log('[YouTube] Skipping YouTube context (no relevant keywords found)');
    }
    
    const stream = streamChat(chat, enhancedMessage);
    
    for await (const chunk of stream) {
        if (chunk.text) text += chunk.text;
        if (chunk.candidates?.[0]?.groundingMetadata?.groundingChunks) {
            const newSources = chunk.candidates[0].groundingMetadata.groundingChunks
                .filter((c: any) => c.web && c.web.uri)
                .map((c: any) => ({ uri: c.web.uri, title: c.web.title || '' }));
            sources = [...sources, ...newSources];
        }
    }
    
    const uniqueSources = Array.from(new Map(sources.map(item => [item.uri, item])).values());
    return { text, sources: uniqueSources };
};

// Helper: Get Fish Audio Voice ID for specific language and speaker
// Falls back to default (Japanese) if language-specific ID is not found
const getFishAudioVoiceId = async (speakerRole: 'agent' | 'grandma', language: Language): Promise<string | null> => {
    const config = await getConfig();
    const langKey = language.toUpperCase();
    
    // Try language-specific voice ID first
    const langSpecificKey = speakerRole === 'agent' 
        ? `FISH_AGENT_VOICE_ID_${langKey}` as keyof typeof config
        : `FISH_GRANDMA_VOICE_ID_${langKey}` as keyof typeof config;
    
    const langSpecificVoiceId = config[langSpecificKey];
    
    if (langSpecificVoiceId) {
        console.log(`[Fish Audio] Using ${language}-specific voice ID for ${speakerRole}: ${langSpecificVoiceId.substring(0, 8)}...`);
        return langSpecificVoiceId;
    }
    
    // Fallback to default (Japanese) voice ID
    const defaultKey = speakerRole === 'agent' ? 'FISH_AGENT_VOICE_ID' : 'FISH_GRANDMA_VOICE_ID';
    const defaultVoiceId = config[defaultKey];
    
    if (defaultVoiceId) {
        console.log(`[Fish Audio] No ${language}-specific voice ID found, using default (Japanese) for ${speakerRole}: ${defaultVoiceId.substring(0, 8)}...`);
        return defaultVoiceId;
    }
    
    console.error(`[Fish Audio] No voice ID configured for ${speakerRole} (neither ${language}-specific nor default)`);
    return null;
};

// Fish Audio TTS - Generate audio for a single speaker via proxy
const generateFishAudioSegment = async (text: string, speakerRole: 'agent' | 'grandma', language: Language): Promise<string | null> => {
    if (!text || !text.trim()) return null;

    // Get language-specific voice ID, fallback to default (Japanese)
    const voiceId = await getFishAudioVoiceId(speakerRole, language);

    if (!voiceId) {
        console.error(`[Fish Audio] Voice ID not configured for ${language} (${speakerRole})`);
        return null;
    }

    const names = SPEAKER_NAMES[language];
    
    // Clean text: Remove ALL speaker prefixes (with or without **) and replace kanji with furigana
    let cleanText = text
        // Remove ALL markdown bold markers (**) first
        .replace(/\*\*/g, '')
        // Remove speaker names at the start: Speaker: or Speaker：
        .replace(new RegExp(`^\\s*${names.agent}\\s*[：:]+\\s*`, 'i'), '')
        .replace(new RegExp(`^\\s*${names.grandma}\\s*[：:]+\\s*`, 'i'), '')
        // Replace kanji with furigana
        .replace(/[\u4E00-\u9FFF々〆〤]+[\(（]([\u3040-\u309F\u30A0-\u30FF\u30FC\s]+)[\)）]/g, '$1')
        .trim();

    // Add emotion tags for more realistic speech
    const agentEmotion = '';
    const grandmaEmotion = '';
    const emotion = speakerRole === 'agent' ? agentEmotion : grandmaEmotion;
    
    // Prepend emotion tag to text
    const textWithEmotion = `${emotion} ${cleanText}`;

    console.log(`[Fish Audio] Generating ${speakerRole} voice with emotion ${emotion} for text: "${cleanText.substring(0, 50)}..."`);

    try {
        // Call our server-side proxy to avoid CORS issues
        const response = await fetch('/api/fish-tts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text: textWithEmotion,
                reference_id: voiceId,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Fish Audio proxy error: ${errorData.error || response.statusText}`);
        }

        const data = await response.json();
        return data.audio; // Already base64 encoded
    } catch (error) {
        console.error(`Fish Audio TTS failed for ${speakerRole}:`, error);
        return null;
    }
};

// Helper: Split text into speaker segments
const splitIntoSpeakerSegments = (text: string, language: Language): { text: string, speaker: 'agent' | 'grandma' | 'narrator' }[] => {
    const names = SPEAKER_NAMES[language];
    const segments: { text: string, speaker: 'agent' | 'grandma' | 'narrator' }[] = [];
    
    // Escape special regex characters in speaker names
    const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // Create regex patterns for speaker detection (with or without ** bold markers)
    // Handles both: **Name**: and **Name**:
    const agentPattern = `(?:\\*\\*)?${escapeRegex(names.agent)}(?:\\*\\*)?\\s*[:：]`;
    const grandmaPattern = `(?:\\*\\*)?${escapeRegex(names.grandma)}(?:\\*\\*)?\\s*[:：]`;
    
    // Split by lines and detect speaker changes
    const lines = text.split('\n');
    let currentSpeaker: 'agent' | 'grandma' | 'narrator' = 'narrator'; // Default to narrator (agent voice)
    let accumulatedText = '';
    
    for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;
        
        // Check if line starts with a speaker name
        // Use 'i' flag for case-insensitive matching (though speaker names should be exact)
        const agentMatch = trimmedLine.match(new RegExp(`^${agentPattern}\\s*(.*)$`, 'i'));
        const grandmaMatch = trimmedLine.match(new RegExp(`^${grandmaPattern}\\s*(.*)$`, 'i'));
        
        if (agentMatch) {
            // Save accumulated text for previous speaker
            if (accumulatedText.trim()) {
                segments.push({ text: accumulatedText.trim(), speaker: currentSpeaker });
                accumulatedText = '';
            }
            // Switch to agent and add the rest of the line
            currentSpeaker = 'agent';
            const restOfLine = agentMatch[1].trim();
            console.log(`[Speaker Detection] Line detected as AGENT: "${trimmedLine.substring(0, 40)}..." -> remaining: "${restOfLine.substring(0, 40)}..."`);
            if (restOfLine) {
                accumulatedText += restOfLine + '\n';
            }
        } else if (grandmaMatch) {
            // Save accumulated text for previous speaker
            if (accumulatedText.trim()) {
                segments.push({ text: accumulatedText.trim(), speaker: currentSpeaker });
                accumulatedText = '';
            }
            // Switch to grandma and add the rest of the line
            currentSpeaker = 'grandma';
            const restOfLine = grandmaMatch[1].trim();
            console.log(`[Speaker Detection] Line detected as GRANDMA: "${trimmedLine.substring(0, 40)}..." -> remaining: "${restOfLine.substring(0, 40)}..."`);
            if (restOfLine) {
                accumulatedText += restOfLine + '\n';
            }
        } else {
            // Continue with current speaker
            accumulatedText += trimmedLine + '\n';
        }
    }
    
    // Add final accumulated text
    if (accumulatedText.trim()) {
        segments.push({ text: accumulatedText.trim(), speaker: currentSpeaker });
    }
    
    return segments;
};

// Multi-speaker TTS using Fish Audio - Returns array of audio segments
const generateFishAudioMultiSpeaker = async (text: string, language: Language): Promise<AudioSegment[]> => {
    if (!text || !text.trim()) return [];

    // Split text into speaker segments
    const textSegments = splitIntoSpeakerSegments(text, language);
    console.log(`[Fish Audio] Split into ${textSegments.length} segments:`);
    textSegments.forEach((s, i) => {
        console.log(`  [${i}] ${s.speaker}: "${s.text.substring(0, 50)}..."`);
    });

    // Generate audio for each segment
    const audioSegments: AudioSegment[] = [];
    for (let i = 0; i < textSegments.length; i++) {
        const segment = textSegments[i];
        // Narrator uses agent voice
        const speakerRole = segment.speaker === 'narrator' ? 'agent' : segment.speaker;
        console.log(`[Fish Audio] Segment ${i}: Detected speaker="${segment.speaker}", Using voice="${speakerRole}"`);
        
        const audio = await generateFishAudioSegment(segment.text, speakerRole, language);
        if (audio) {
            audioSegments.push({ audio, format: 'mp3' });
            console.log(`[Fish Audio] Segment ${i}: Audio generated successfully (${audio.length} chars)`);
        } else {
            console.warn(`[Fish Audio] Segment ${i}: Audio generation failed`);
        }
    }

    console.log(`[Fish Audio] Total audio segments generated: ${audioSegments.length}`);
    return audioSegments;
};

// Multi-speaker TTS using Gemini - Returns single audio segment (Gemini handles multi-speaker internally)
const generateGeminiMultiSpeakerAudio = async (text: string, language: Language): Promise<string | null> => {
    if (!text || !text.trim()) return null;

    const ai = await getAi();
    const names = SPEAKER_NAMES[language];

    // Clean text: For Gemini, we need to keep speaker names but in the correct format
    // Gemini expects: "Speaker Name: text" format (without ** markers)
    // Also replace kanji with furigana for correct pronunciation
    let cleanText = text
        .replace(/\*\*/g, '') // Remove markdown bold markers
        .replace(/[\u4E00-\u9FFF々〆〤]+[\(（]([\u3040-\u309F\u30A0-\u30FF\u30FC\s]+)[\)）]/g, '$1'); // Replace kanji with furigana
    
    console.log(`[Gemini TTS] Generating audio for text: "${cleanText.substring(0, 100)}..."`);

    try {
        // Try High Quality Pro Model first
        const response = await ai.models.generateContent({
            model: "gemini-2.5-pro-preview-tts",
            contents: [{ parts: [{ text: cleanText }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    multiSpeakerVoiceConfig: {
                        speakerVoiceConfigs: [
                            {
                                speaker: names.agent,
                                voiceConfig: {
                                    prebuiltVoiceConfig: { voiceName: 'Puck' }
                                }
                            },
                            {
                                speaker: names.grandma,
                                voiceConfig: {
                                    prebuiltVoiceConfig: { voiceName: 'Gacrux' }
                                }
                            }
                        ]
                    }
                }
            }
        });
        return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
    } catch (error: any) {
        console.warn("Gemini TTS Pro model failed, falling back to Flash:", error);
        
        // Fallback: Try Faster/Cheaper Flash Model
        try {
            const fallbackResponse = await ai.models.generateContent({
                model: "gemini-2.5-flash-preview-tts",
                contents: [{ parts: [{ text: cleanText }] }],
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: {
                        multiSpeakerVoiceConfig: {
                            speakerVoiceConfigs: [
                                {
                                    speaker: names.agent,
                                    voiceConfig: {
                                        prebuiltVoiceConfig: { voiceName: 'Puck' }
                                    }
                                },
                                {
                                    speaker: names.grandma,
                                    voiceConfig: {
                                        prebuiltVoiceConfig: { voiceName: 'Gacrux' }
                                    }
                                }
                            ]
                        }
                    }
                }
            });
            return fallbackResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
        } catch (fallbackError) {
            console.error("All Gemini TTS attempts failed:", fallbackError);
            return null;
        }
    }
};

// Main TTS function - Switches between Fish Audio and Gemini TTS based on language
// Returns array of AudioSegments for sequential playback
export const generateMultiSpeakerAudio = async (text: string, language: Language): Promise<AudioSegment[]> => {
    if (!text || !text.trim()) return [];

    // Use Fish Audio for supported languages, Gemini TTS for others
    if (isFishAudioSupported(language)) {
        console.log(`[TTS] Using Fish Audio for language: ${language}`);
        return await generateFishAudioMultiSpeaker(text, language);
    } else {
        console.log(`[TTS] Using Gemini TTS for language: ${language}`);
        // Gemini TTS handles multi-speaker internally, returns single PCM audio
        const audioData = await generateGeminiMultiSpeakerAudio(text, language);
        return audioData ? [{ audio: audioData, format: 'pcm' }] : [];
    }
};

// Legacy function for backwards compatibility (now deprecated)
export const generateSpeech = async (text: string): Promise<string | null> => {
    const segments = await generateMultiSpeakerAudio(text, 'ja'); // Default to Japanese
    return segments.length > 0 ? segments[0].audio : null;
};

export const generateSpeechSegment = async (text: string, speakerRole: 'agent' | 'grandma'): Promise<string | null> => {
    // Deprecated: Use generateMultiSpeakerAudio instead
    const segments = await generateMultiSpeakerAudio(text, 'ja');
    return segments.length > 0 ? segments[0].audio : null;
};