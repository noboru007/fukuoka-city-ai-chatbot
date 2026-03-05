import { Language } from "../types";

// Convert text to reading (Kana) for music generation - via server proxy
export const convertLyricsToReading = async (text: string): Promise<string> => {
    if (!text || !text.trim()) return text;

    try {
        const response = await fetch('/api/lyrics/convert', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Lyrics conversion failed');
        }

        const data = await response.json();
        return data.text || text;
    } catch (error) {
        console.error("Lyrics conversion failed:", error);
        return text; // Fallback to original text
    }
};

// Generate structured lyrics - via server proxy
export const generateSongLyrics = async (topic: string, language: Language): Promise<{ title: string, lyrics: string }> => {
    const response = await fetch('/api/lyrics/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, language }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Lyrics generation failed');
    }

    const data = await response.json();
    return {
        title: data.title || "Untitled",
        lyrics: data.lyrics || ""
    };
};
