import { describe, expect, it } from 'vitest';
import {
    LYRICS_RESPONSE_JSON_SCHEMA,
    parseLyricsResponse,
} from '../../server/utils/lyricsStructuredOutput.js';

describe('lyrics structured output', () => {
    it('requires title and lyrics strings in the response schema', () => {
        expect(LYRICS_RESPONSE_JSON_SCHEMA.required).toEqual(['title', 'lyrics']);
        expect(LYRICS_RESPONSE_JSON_SCHEMA.additionalProperties).toBe(false);
        expect(LYRICS_RESPONSE_JSON_SCHEMA.properties.title.type).toBe('string');
        expect(LYRICS_RESPONSE_JSON_SCHEMA.properties.lyrics.type).toBe('string');
    });

    it('parses a valid structured lyrics response', () => {
        const result = parseLyricsResponse(JSON.stringify({
            title: '福岡の空',
            lyrics: '[Verse]\n空を見上げて',
        }));

        expect(result).toEqual({
            title: '福岡の空',
            lyrics: '[Verse]\n空を見上げて',
        });
    });

    it('recovers the first JSON object when extra model text follows it', () => {
        const response = `${JSON.stringify({
            title: '街の歌',
            lyrics: '[Verse]\n「元気」と歌う {みんな}',
        })}\nHere are your lyrics.`;

        expect(parseLyricsResponse(response)).toEqual({
            title: '街の歌',
            lyrics: '[Verse]\n「元気」と歌う {みんな}',
        });
    });

    it('rejects responses with invalid field types', () => {
        expect(() => parseLyricsResponse('{"title": 123, "lyrics": []}')).toThrow(
            'Lyrics response must contain string title and lyrics fields',
        );
    });
});
