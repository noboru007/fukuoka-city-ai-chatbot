import { Source, ResponseLength, Language, Model } from "../types";

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

// --- Session-based Chat (server-side) ---

let currentSessionId: string | null = null;

export const initChat = async (responseLength: ResponseLength, language: Language, model: Model): Promise<string> => {
    const response = await fetch('/api/chat/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responseLength, language, model }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to initialize chat');
    }

    const data = await response.json();
    currentSessionId = data.sessionId;
    console.log(`[Chat] Session initialized: ${currentSessionId}`);
    return currentSessionId;
};

interface SSEChunk {
    type: 'text' | 'sources' | 'done' | 'error';
    text?: string;
    sources?: Source[];
    error?: string;
}

// Stream chat response via SSE
export async function* streamChat(sessionId: string, message: string): AsyncGenerator<SSEChunk> {
    const response = await fetch('/api/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, message }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to send message');
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
            if (line.startsWith('data: ')) {
                try {
                    const data: SSEChunk = JSON.parse(line.slice(6));
                    if (data.type === 'error') {
                        throw new Error(data.error || 'Stream error');
                    }
                    yield data;
                } catch (e) {
                    if (e instanceof SyntaxError) {
                        console.warn('[Chat] Failed to parse SSE data:', line);
                    } else {
                        throw e;
                    }
                }
            }
        }
    }
}
