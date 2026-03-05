import { describe, it, expect } from 'vitest';
import { splitIntoSpeakerSegments } from '../services/ttsService';

describe('splitIntoSpeakerSegments', () => {
    it('splits Japanese text into agent and grandma segments', () => {
        const text = `**市役所エージェント：** 福岡市の公式情報です。
こちらが詳細です。

**フク婆さん：** 昔はこうだったったい。
懐かしいねぇ。`;

        const segments = splitIntoSpeakerSegments(text, 'ja');

        expect(segments).toHaveLength(2);
        expect(segments[0].speaker).toBe('agent');
        expect(segments[0].text).toContain('福岡市の公式情報');
        expect(segments[1].speaker).toBe('grandma');
        expect(segments[1].text).toContain('昔はこうだった');
    });

    it('splits English text correctly', () => {
        const text = `**City Hall Agent：** Here is the official information.

**Grandma Fuku：** Back in my day, things were different.`;

        const segments = splitIntoSpeakerSegments(text, 'en');

        expect(segments).toHaveLength(2);
        expect(segments[0].speaker).toBe('agent');
        expect(segments[1].speaker).toBe('grandma');
    });

    it('treats unprefixed text as narrator', () => {
        const text = 'This text has no speaker prefix at all.';

        const segments = splitIntoSpeakerSegments(text, 'ja');

        expect(segments).toHaveLength(1);
        expect(segments[0].speaker).toBe('narrator');
    });

    it('handles empty text', () => {
        const segments = splitIntoSpeakerSegments('', 'ja');
        expect(segments).toHaveLength(0);
    });

    it('handles multiline agent text before grandma', () => {
        const text = `**市役所エージェント：** 1行目
2行目
3行目

**フク婆さん：** おばあちゃんの話`;

        const segments = splitIntoSpeakerSegments(text, 'ja');

        expect(segments).toHaveLength(2);
        expect(segments[0].text).toContain('2行目');
        expect(segments[0].text).toContain('3行目');
    });

    it('works with Korean speaker names', () => {
        const text = `**시청 에이전트：** 공식 정보입니다.

**후쿠 할머니：** 옛날에는 이렇게 했어요.`;

        const segments = splitIntoSpeakerSegments(text, 'ko');

        expect(segments).toHaveLength(2);
        expect(segments[0].speaker).toBe('agent');
        expect(segments[1].speaker).toBe('grandma');
    });
});
