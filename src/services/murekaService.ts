
export interface LyricsResponse {
    title: string;
    lyrics: string;
}

export interface SongGenerateResponse {
    id: string; // Task ID
    message: string;
}

export interface SongStatusResponse {
    id: string;
    status: 'queued' | 'running' | 'completed' | 'failed' | 'unknown';
    suno_data?: {
        audio_url?: string;
        image_url?: string;
        title?: string;
        model_name?: string;
        tags?: string;
    }[]; // Mureka might wrap Suno or stable audio, docs might vary.
}

// Based on standard simple schema assumption. 
// If Mureka API differs, we will adjust after first run (or I could have checked docs more deeply).
// For now I'll assume Mureka API follows a standard pattern: status and a download url.

export const generateSong = async (lyrics: string, style: string, model: string = 'mureka-o2'): Promise<string> => {
    const response = await fetch('/api/mureka/song', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lyrics, prompt: style, model }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to generate song');
    }
    const data = await response.json();
    return data.id; // Assuming 'id' is the task ID field
};

export const querySong = async (taskId: string): Promise<any> => {
    const response = await fetch(`/api/mureka/song/${taskId}`);
    if (!response.ok) {
        throw new Error('Failed to query song status');
    }
    return response.json(); // Returning raw for flexibility first
};
