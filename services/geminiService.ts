import { GoogleGenAI, Chat, ThinkingLevel } from "@google/genai";
import { Source, ResponseLength, Language, Model } from "../types";
import { getConfig } from "../utils/config";

export const SPEAKER_NAMES: Record<string, { agent: string; grandma: string }> = {
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

const getGenerationConfig = (model: Model) => {
    if (model.includes('gemini-3')) {
        return {
            temperature: 1.0,
            thinkingConfig: { thinkingLevel: "high" as ThinkingLevel }
        };
    }
    return {
        temperature: 0.4
    };
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
};

// --- AI Client Singleton ---
let ai: GoogleGenAI | null = null;

export const getAi = async (): Promise<GoogleGenAI> => {
    if (!ai) {
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

// --- Chat Functions ---
export const initChat = async (responseLength: ResponseLength, language: Language, model: Model, history?: any[]): Promise<Chat> => {
    const genAI = await getAi();

    console.log(`[InitChat] Using Standard Prompt for model: ${model}`);
    const systemInstruction = getSystemInstruction(responseLength, language);

    const generationConfig = getGenerationConfig(model);
    console.log(`[InitChat] Model: ${model}, Config:`, generationConfig);

    const chat = genAI.chats.create({
        model: model,
        history,
        config: {
            systemInstruction,
            tools: [{ googleSearch: {} }],
            ...generationConfig
        },
    });

    return chat;
};

export async function* streamChat(chat: Chat, message: string) {
    const result = await chat.sendMessageStream({ message });
    for await (const chunk of result) {
        yield chunk;
    }
}

// --- YouTube Integration ---
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

const buildYouTubeContext = (videos: Array<{ title: string; description: string; url: string; publishedAt: string }>): string => {
    if (videos.length === 0) return '';

    const videoList = videos.map((video, index) => {
        const date = new Date(video.publishedAt).toLocaleDateString('ja-JP');
        const desc = video.description ? video.description.substring(0, 200) + '...' : '';
        return `${index + 1}. ${video.title} (${date})\n   URL: ${video.url}\n   ${desc}`;
    }).join('\n\n');

    return `\n\n# 最新のYouTube動画情報（福岡市公式チャンネル）\n以下の最新動画情報を参考にしてください。質問に関連する動画があれば、その情報を回答に含めてください。\n\n${videoList}`;
};

export const sendMessage = async (chat: Chat, message: string): Promise<{ text: string; sources: Source[] }> => {
    let text = '';
    let sources: Source[] = [];

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
