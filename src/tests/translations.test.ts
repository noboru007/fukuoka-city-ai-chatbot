import { describe, it, expect } from 'vitest';
import { translations } from '../utils/translations';

describe('translations', () => {
    it('contains ja and en translations', () => {
        expect(translations.ja).toBeDefined();
        expect(translations.en).toBeDefined();
    });

    it('ja translation has all required fields', () => {
        const t = translations.ja;
        expect(t.title).toBeTruthy();
        expect(t.online).toBeTruthy();
        expect(t.thinking).toBeTruthy();
        expect(t.sources).toBeTruthy();
        expect(t.placeholder).toBeTruthy();
        expect(t.initialMessage).toBeTruthy();
        expect(t.menu).toBeDefined();
        expect(t.menu.fontSize).toBeTruthy();
    });

    it('all 21 languages have required base fields', () => {
        const requiredFields = ['title', 'online', 'thinking', 'sources', 'placeholder', 'initialMessage'] as const;

        for (const [lang, t] of Object.entries(translations)) {
            for (const field of requiredFields) {
                expect(t[field], `${lang}.${field} should be defined`).toBeTruthy();
            }
            expect(t.menu, `${lang}.menu should be defined`).toBeDefined();
        }
    });

    it('musicComposer translations exist for ja and en', () => {
        expect(translations.ja.musicComposer).toBeDefined();
        expect(translations.en.musicComposer).toBeDefined();

        expect(translations.ja.musicComposer!.headerTitle).toBeTruthy();
        expect(translations.en.musicComposer!.headerTitle).toBeTruthy();
        expect(translations.ja.musicComposer!.composeButton).toBeTruthy();
        expect(translations.en.musicComposer!.composeButton).toBeTruthy();
    });

    it('has exactly 21 languages', () => {
        expect(Object.keys(translations)).toHaveLength(21);
    });
});
