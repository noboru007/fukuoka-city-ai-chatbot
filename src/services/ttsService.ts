import { Language, AudioSegment } from "../types";
import { getConfig } from "../utils/config";
import { SPEAKER_NAMES } from "./geminiService";

// Fish Audio supported languages
const FISH_AUDIO_SUPPORTED_LANGUAGES: Language[] = [
    'en', 'zh', 'ja', 'de', 'fr', 'es', 'ko', 'ru', 'it', 'pt',
];

const isFishAudioSupported = (language: Language): boolean => {
    return FISH_AUDIO_SUPPORTED_LANGUAGES.includes(language);
};

const escapeRegex = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const createSpeakerMarkerPattern = (names: { agent: string; grandma: string }): string => {
    const speakerNames = `${escapeRegex(names.agent)}|${escapeRegex(names.grandma)}`;
    return `(?:\\*\\*)?(${speakerNames})(?:\\*\\*)?\\s*[:：](?:\\*\\*)?`;
};

const JAPANESE_DIGITS = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
const JAPANESE_LARGE_UNITS = ['', '万', '億', '兆', '京'];

const convertFourDigitGroupToJapanese = (value: number): string => {
    const places = [
        { divisor: 1000, unit: '千' },
        { divisor: 100, unit: '百' },
        { divisor: 10, unit: '十' },
    ];
    let remainder = value;
    let result = '';

    for (const { divisor, unit } of places) {
        const digit = Math.floor(remainder / divisor);
        if (digit > 0) {
            result += digit === 1 ? unit : `${JAPANESE_DIGITS[digit]}${unit}`;
            remainder %= divisor;
        }
    }

    if (remainder > 0) result += JAPANESE_DIGITS[remainder];
    return result;
};

const numberToJapanese = (rawNumber: string): string => {
    const normalizedNumber = rawNumber.replace(/,/g, '');
    const isNegative = normalizedNumber.startsWith('-');
    const unsignedNumber = isNegative ? normalizedNumber.slice(1) : normalizedNumber;
    const [integerPart, decimalPart] = unsignedNumber.split('.');

    let integer = BigInt(integerPart || '0');
    let integerReading = '';
    let groupIndex = 0;

    if (integer === 0n) {
        integerReading = JAPANESE_DIGITS[0];
    } else {
        while (integer > 0n) {
            const group = Number(integer % 10000n);
            if (group > 0) {
                const largeUnit = JAPANESE_LARGE_UNITS[groupIndex];
                if (largeUnit === undefined) {
                    return rawNumber;
                }
                integerReading = `${convertFourDigitGroupToJapanese(group)}${largeUnit}${integerReading}`;
            }
            integer /= 10000n;
            groupIndex++;
        }
    }

    const decimalReading = decimalPart
        ? `点${decimalPart.split('').map(digit => JAPANESE_DIGITS[Number(digit)]).join('')}`
        : '';

    return `${isNegative ? 'マイナス' : ''}${integerReading}${decimalReading}`;
};

const normalizeFullWidthNumbers = (text: string): string => text
    .replace(/[０-９]/g, character => String.fromCharCode(character.charCodeAt(0) - 0xFEE0))
    .replace(/，/g, ',')
    .replace(/．/g, '.');

const JAPANESE_SPOKEN_UNITS: Record<string, string> = {
    kcal: 'キロカロリー',
    cal: 'カロリー',
    kg: 'キログラム',
    mg: 'ミリグラム',
    g: 'グラム',
    km: 'キロメートル',
    cm: 'センチメートル',
    mm: 'ミリメートル',
    m: 'メートル',
    kl: 'キロリットル',
    ml: 'ミリリットル',
    l: 'リットル',
    '%': 'パーセント',
    '％': 'パーセント',
    '℃': '度',
    '°c': '度',
};

export const normalizeJapaneseTtsText = (text: string): string => {
    const normalizedText = normalizeFullWidthNumbers(text);

    return normalizedText
        .replace(
            /(-?\d[\d,]*(?:\.\d+)?)\s*(kcal|cal|kg|mg|g|km|cm|mm|m|kl|ml|l|%|％|℃|°c)(?![a-z])/gi,
            (_match, number: string, unit: string) => `${numberToJapanese(number)}${JAPANESE_SPOKEN_UNITS[unit.toLowerCase()]}`,
        )
        .replace(
            /(-?\d[\d,]*(?:\.\d+)?)\s*個/g,
            (_match, number: string) => `${numberToJapanese(number)}個`,
        );
};

// Helper: Get Fish Audio Voice ID for specific language and speaker
const getFishAudioVoiceId = async (speakerRole: 'agent' | 'grandma', language: Language): Promise<string | null> => {
    const config = await getConfig();
    const langKey = language.toUpperCase();

    const langSpecificKey = speakerRole === 'agent'
        ? `FISH_AGENT_VOICE_ID_${langKey}` as keyof typeof config
        : `FISH_GRANDMA_VOICE_ID_${langKey}` as keyof typeof config;

    const langSpecificVoiceId = config[langSpecificKey];

    if (langSpecificVoiceId) {
        console.log(`[Fish Audio] Using ${language}-specific voice ID for ${speakerRole}: ${langSpecificVoiceId.substring(0, 8)}...`);
        return langSpecificVoiceId;
    }

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

    const voiceId = await getFishAudioVoiceId(speakerRole, language);
    if (!voiceId) {
        console.error(`[Fish Audio] Voice ID not configured for ${language} (${speakerRole})`);
        return null;
    }

    const names = SPEAKER_NAMES[language] || SPEAKER_NAMES.en;
    const speakerMarkerPattern = createSpeakerMarkerPattern(names);

    let cleanText = text
        .replace(/\*\*/g, '')
        .replace(new RegExp(speakerMarkerPattern, 'gi'), '')
        .replace(/[\u4E00-\u9FFF々〆〤]+[\(（]([\u3040-\u309F\u30A0-\u30FF\u30FC\s]+)[\)）]/g, '$1')
        .trim();

    if (language === 'ja') {
        cleanText = normalizeJapaneseTtsText(cleanText);
    }

    const agentEmotion = '';
    const grandmaEmotion = '';
    const emotion = speakerRole === 'agent' ? agentEmotion : grandmaEmotion;
    const textWithEmotion = `${emotion} ${cleanText}`;

    console.log(`[Fish Audio] Generating ${speakerRole} voice with emotion ${emotion} for text: "${cleanText.substring(0, 50)}..."`);

    try {
        const response = await fetch('/api/fish-tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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
        return data.audio;
    } catch (error) {
        console.error(`Fish Audio TTS failed for ${speakerRole}:`, error);
        return null;
    }
};

// Helper: Split text into speaker segments
export const splitIntoSpeakerSegments = (text: string, language: Language): { text: string, speaker: 'agent' | 'grandma' | 'narrator' }[] => {
    const names = SPEAKER_NAMES[language] || SPEAKER_NAMES.en;
    const segments: { text: string, speaker: 'agent' | 'grandma' | 'narrator' }[] = [];

    const speakerMarkerPattern = createSpeakerMarkerPattern(names);
    const leadingMarkdownPattern = new RegExp(
        `^\\s*(?:(?:>\\s*)|(?:#{1,6}\\s+)|(?:(?:[-+*]|\\d+[.)])\\s+))*(?=${speakerMarkerPattern})`,
        'i',
    );
    const normalizedText = text
        .split('\n')
        .map(line => line.replace(leadingMarkdownPattern, ''))
        .join('\n');
    const markerRegex = new RegExp(speakerMarkerPattern, 'gi');
    let currentSpeaker: 'agent' | 'grandma' | 'narrator' = 'narrator';
    let contentStart = 0;

    for (const match of normalizedText.matchAll(markerRegex)) {
        const markerStart = match.index;
        const precedingText = normalizedText.slice(contentStart, markerStart).trim();
        if (precedingText) {
            segments.push({ text: precedingText, speaker: currentSpeaker });
        }

        const matchedSpeakerName = match[1].toLocaleLowerCase();
        currentSpeaker = matchedSpeakerName === names.agent.toLocaleLowerCase() ? 'agent' : 'grandma';
        contentStart = markerStart + match[0].length;
    }

    const remainingText = normalizedText.slice(contentStart).trim();
    if (remainingText) {
        segments.push({ text: remainingText, speaker: currentSpeaker });
    }

    return segments;
};

// Multi-speaker TTS using Fish Audio
const generateFishAudioMultiSpeaker = async (text: string, language: Language): Promise<AudioSegment[]> => {
    if (!text || !text.trim()) return [];

    const textSegments = splitIntoSpeakerSegments(text, language);
    console.log(`[Fish Audio] Split into ${textSegments.length} segments`);

    const audioSegments: AudioSegment[] = [];
    for (let i = 0; i < textSegments.length; i++) {
        const segment = textSegments[i];
        const speakerRole = segment.speaker === 'narrator' ? 'agent' : segment.speaker;

        const audio = await generateFishAudioSegment(segment.text, speakerRole, language);
        if (audio) {
            audioSegments.push({ audio, format: 'mp3' });
        }
    }

    return audioSegments;
};

// Gemini TTS via server proxy
const generateGeminiMultiSpeakerAudio = async (text: string, language: Language): Promise<string | null> => {
    if (!text || !text.trim()) return null;

    try {
        const response = await fetch('/api/gemini-tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, language }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Gemini TTS failed');
        }

        const data = await response.json();
        return data.audio;
    } catch (error) {
        console.error('[Gemini TTS] Error:', error);
        return null;
    }
};

// Main TTS function - Switches between Fish Audio and Gemini TTS based on language
export const generateMultiSpeakerAudio = async (text: string, language: Language): Promise<AudioSegment[]> => {
    if (!text || !text.trim()) return [];

    if (isFishAudioSupported(language)) {
        console.log(`[TTS] Using Fish Audio for language: ${language}`);
        return await generateFishAudioMultiSpeaker(text, language);
    } else {
        console.log(`[TTS] Using Gemini TTS for language: ${language}`);
        const audioData = await generateGeminiMultiSpeakerAudio(text, language);
        return audioData ? [{ audio: audioData, format: 'pcm' }] : [];
    }
};
