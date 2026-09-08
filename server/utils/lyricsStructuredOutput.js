export const LYRICS_RESPONSE_JSON_SCHEMA = {
    type: 'object',
    properties: {
        title: {
            type: 'string',
            description: 'The song title.',
        },
        lyrics: {
            type: 'string',
            description: 'The complete song lyrics, including section tags and line breaks.',
        },
    },
    required: ['title', 'lyrics'],
    additionalProperties: false,
    propertyOrdering: ['title', 'lyrics'],
};

const extractFirstJsonObject = (text) => {
    let objectStart = -1;
    let depth = 0;
    let inString = false;
    let isEscaped = false;

    for (let index = 0; index < text.length; index++) {
        const character = text[index];

        if (objectStart === -1) {
            if (character === '{') {
                objectStart = index;
                depth = 1;
            }
            continue;
        }

        if (inString) {
            if (isEscaped) {
                isEscaped = false;
            } else if (character === '\\') {
                isEscaped = true;
            } else if (character === '"') {
                inString = false;
            }
            continue;
        }

        if (character === '"') {
            inString = true;
        } else if (character === '{') {
            depth++;
        } else if (character === '}') {
            depth--;
            if (depth === 0) {
                return text.slice(objectStart, index + 1);
            }
        }
    }

    return null;
};

export const parseLyricsResponse = (responseText) => {
    if (typeof responseText !== 'string' || !responseText.trim()) {
        throw new Error('No lyrics response generated');
    }

    const trimmedResponse = responseText.trim();
    let data;

    try {
        data = JSON.parse(trimmedResponse);
    } catch (parseError) {
        const extractedObject = extractFirstJsonObject(trimmedResponse);
        if (!extractedObject) throw parseError;
        data = JSON.parse(extractedObject);
    }

    if (!data || Array.isArray(data) || typeof data !== 'object') {
        throw new Error('Lyrics response must be a JSON object');
    }
    if (typeof data.title !== 'string' || typeof data.lyrics !== 'string') {
        throw new Error('Lyrics response must contain string title and lyrics fields');
    }
    if (!data.lyrics.trim()) {
        throw new Error('Generated lyrics are empty');
    }

    return {
        title: data.title.trim() || 'Untitled',
        lyrics: data.lyrics.trim(),
    };
};
