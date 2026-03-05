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

    const names = SPEAKER_NAMES[language];

    let cleanText = text
        .replace(/\*\*/g, '')
        .replace(new RegExp(`^\\s*${names.agent}\\s*[：:]+\\s*`, 'i'), '')
        .replace(new RegExp(`^\\s*${names.grandma}\\s*[：:]+\\s*`, 'i'), '')
        .replace(/[\u4E00-\u9FFF々〆〤]+[\(（]([\u3040-\u309F\u30A0-\u30FF\u30FC\s]+)[\)）]/g, '$1')
        .trim();

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
    const names = SPEAKER_NAMES[language];
    const segments: { text: string, speaker: 'agent' | 'grandma' | 'narrator' }[] = [];

    const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const agentPattern = `(?:\\*\\*)?${escapeRegex(names.agent)}(?:\\*\\*)?\\s*[:：]`;
    const grandmaPattern = `(?:\\*\\*)?${escapeRegex(names.grandma)}(?:\\*\\*)?\\s*[:：]`;

    const lines = text.split('\n');
    let currentSpeaker: 'agent' | 'grandma' | 'narrator' = 'narrator';
    let accumulatedText = '';

    for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;

        const agentMatch = trimmedLine.match(new RegExp(`^${agentPattern}\\s*(.*)$`, 'i'));
        const grandmaMatch = trimmedLine.match(new RegExp(`^${grandmaPattern}\\s*(.*)$`, 'i'));

        if (agentMatch) {
            if (accumulatedText.trim()) {
                segments.push({ text: accumulatedText.trim(), speaker: currentSpeaker });
                accumulatedText = '';
            }
            currentSpeaker = 'agent';
            const restOfLine = agentMatch[1].trim();
            if (restOfLine) accumulatedText += restOfLine + '\n';
        } else if (grandmaMatch) {
            if (accumulatedText.trim()) {
                segments.push({ text: accumulatedText.trim(), speaker: currentSpeaker });
                accumulatedText = '';
            }
            currentSpeaker = 'grandma';
            const restOfLine = grandmaMatch[1].trim();
            if (restOfLine) accumulatedText += restOfLine + '\n';
        } else {
            accumulatedText += trimmedLine + '\n';
        }
    }

    if (accumulatedText.trim()) {
        segments.push({ text: accumulatedText.trim(), speaker: currentSpeaker });
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
