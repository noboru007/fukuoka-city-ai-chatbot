import { Language } from "../types";
import { getAi } from "./geminiService";

// Convert text to reading (Kana) for music generation - Japanese Only
export const convertLyricsToReading = async (text: string): Promise<string> => {
    if (!text || !text.trim()) return text;

    const ai = await getAi();

    const prompt = `
    You are a professional lyricist assistant. Your task is to convert Japanese lyrics into a format that is easy for AI singers to pronounce correctly.
    Input Text:
    "${text}"

    Instructions:
    1. **Structure Tags**: **KEEP ALL tags in brackets (e.g., [Intro], [Verse], [Chorus], [Outro]) UNCHANGED.** Do not convert them.
    2. **Kanji to Kana**: Convert ALL Kanji to Hiragana or Katakana based on the context and standard song pronunciation.
    3. **Particles**: Convert particles based on PRONUNCIATION, not spelling.
       - "は" (ha) as a subject marker -> "わ" (wa). (e.g., "こんにちは" -> "コンニチワ", "私は" -> "ワタシワ"). **Keep "は" as "ハ" (ha) when it is part of a word (e.g., "母" -> "ハハ", "走る" -> "ハシル").**
       - "へ" (he) as a direction marker -> "え" (e). (e.g., "海へ" -> "ウミエ"). **Keep "へ" as "ヘ" (he) within words.**
       - "を" (wo) -> "を" (wo) is usually fine, but if it sounds better as "お" (o), use "お". Priority is natural singing.
    4. **Numbers to Katakana**: Convert ALL numbers (digits) to their Katakana reading (e.g., "1990" -> "ナインティーンナインティ" or "センキュウヒャクキュウジュウ" depending on context, or just "イチキュウキュウゼロ"). If unsure, use standard Japanese reading.
    5. **Alphabet/Romaji**: 
       - **Keep English words or Romaji UNCHANGED** (e.g., "Love" -> "Love", "You" -> "You"). Do NOT convert to Katakana.
       - **Exception**: For acronyms or specific letter sequences meant to be spelled out, use hyphens to help pronunciation (e.g., "JA" -> "J-A-", "TV" -> "T-V-").
    6. **Output ONLY the converted text**: Do not include any explanations, prefixes, or suffixes. Just the lyrics.
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: [{ parts: [{ text: prompt }] }],
        });

        const convertedText = response.candidates?.[0]?.content?.parts?.[0]?.text || "";
        console.log('[Gemini] Converted lyrics to reading:', convertedText.substring(0, 50) + '...');
        return convertedText.trim();
    } catch (error) {
        console.error("Gemini lyrics conversion failed:", error);
        return text;
    }
};

// Generate structured lyrics using Gemini
export const generateSongLyrics = async (topic: string, language: Language): Promise<{ title: string, lyrics: string }> => {
    const ai = await getAi();

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
    - **Parentheses Usage**: You MAY use parentheses '()' ONLY for backing vocals, ad-libs, or call-and-response parts (e.g., "(Yeah!)", "(Love you)"). Do NOT use parentheses for explanations, stage directions, or silent reading guides. Mureka sings everything inside parentheses, so meaningful lyrics only.
    - Do not include conversational filler.
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: [{ parts: [{ text: prompt }] }],
            config: {
                responseMimeType: 'application/json',
            }
        });

        const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) throw new Error("No text generated");

        const data = JSON.parse(text);
        console.log('[Gemini] Generated lyrics:', data.title);
        return {
            title: data.title || "Untitled",
            lyrics: data.lyrics || ""
        };
    } catch (error) {
        console.error("Gemini lyrics generation failed:", error);
        throw error;
    }
};
