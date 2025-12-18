import React, { useState, useEffect, useRef } from 'react';
import { generateSong, querySong } from '../services/murekaService';
import { convertLyricsToReading, generateSongLyrics } from '../services/geminiService';
import { CloseIcon, LoadingSpinnerIcon, PlayIcon, StopIcon, MusicIcon } from './Icons'; // Assuming I add MusicIcon later

import type { Language } from '../types';

interface MusicComposerProps {
    isOpen: boolean;
    onClose: () => void;
    initialPrompt: string;
    language: Language;
}

const uiTranslations = {
    ja: {
        headerTitle: 'AIソング作曲',
        songTitle: '曲のタイトル',
        songTitlePlaceholder: 'タイトルを入力',
        lyrics: '歌詞',
        lyricsPlaceholder: '歌詞を生成中...',
        style: 'スタイル',
        stylePlaceholder: '例: J-Pop, ロック, バラード',
        vocal: 'ボーカル',
        female: '女性',
        male: '男性',
        composeButton: '作曲する',
        generatingLyrics: '歌詞を生成中...',
        generatingTitle: '作曲中...',
        generatingDesc: 'AIがメロディと歌声を生成しています。通常1分ほどかかります。',
        download: '音声をダウンロード',
        createAnother: '別の曲を作る',
        poweredBy: 'Powered by Mureka API. 生成には1〜2分かかります。',
        errorLyrics: '歌詞の生成に失敗しました',
        errorComposition: '作曲の開始に失敗しました',
        errorGenFailed: '生成に失敗しました',
        convertKana: '漢字をかなに変換して作曲'
    },
    en: {
        headerTitle: 'AI Song Composer',
        songTitle: 'Song Title',
        songTitlePlaceholder: 'Song Title',
        lyrics: 'Lyrics',
        lyricsPlaceholder: 'Generating lyrics...',
        style: 'Style',
        stylePlaceholder: 'e.g. J-Pop, Rock, Ballad',
        vocal: 'Vocal',
        female: 'Female',
        male: 'Male',
        composeButton: 'Compose Song',
        generatingLyrics: 'Generating Lyrics...',
        generatingTitle: 'Composing your song...',
        generatingDesc: 'The AI is producing the melody and vocals. This usually takes about a minute.',
        download: 'Download Audio',
        createAnother: 'Create Another Version',
        poweredBy: 'Powered by Mureka API. Generation takes 1-2 minutes.',
        errorLyrics: 'Failed to generate lyrics',
        errorComposition: 'Failed to start song generation',
        errorGenFailed: 'Generation failed',
        convertKana: 'Convert Kanji to Kana for singing'
    }
};

const MusicComposer: React.FC<MusicComposerProps> = ({ isOpen, onClose, initialPrompt, language }) => {
    const [step, setStep] = useState<'lyrics' | 'generating' | 'completed'>('lyrics');
    const [lyrics, setLyrics] = useState('');
    const [title, setTitle] = useState('');
    const [style, setStyle] = useState('J-Pop, Upbeat');
    const [gender, setGender] = useState('Female');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [taskId, setTaskId] = useState<string | null>(null);
    const [songUrl, setSongUrl] = useState<string | null>(null);
    const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    // Default to true for better singing results in JA
    const [convertKana, setConvertKana] = useState(true);

    const t = language === 'ja' ? uiTranslations.ja : uiTranslations.en;

    // Auto-generate lyrics on open
    useEffect(() => {
        if (isOpen && initialPrompt) {
            handleGenerateLyrics();
        }
    }, [isOpen, initialPrompt]);

    // Reset audio when songUrl changes
    useEffect(() => {
        if (audio) {
            audio.pause();
            setAudio(null);
            setIsPlaying(false);
        }
    }, [songUrl]);

    const handleGenerateLyrics = async () => {
        setIsLoading(true);
        setError(null);
        try {
            // Using Gemini to generate lyrics
            // We pass the prompt directly as the topic
            const data = await generateSongLyrics(initialPrompt, language);
            setLyrics(data.lyrics);
            setTitle(data.title);
            setStep('lyrics');
        } catch (e: any) {
            console.error('[MusicComposer] Lyrics generation error:', e);
            setError(e.message || t.errorLyrics);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCompose = async () => {
        if (!lyrics) return;
        setIsLoading(true);
        setError(null);
        setStep('generating');

        try {
            let finalLyrics = lyrics;

            // Convert Kanji to Kana if language is Japanese and checkbox is checked
            if (language === 'ja' && convertKana) {
                console.log('[MusicComposer] Converting lyrics to kana for generation...');
                // NOTE: We do NOT update the lyrics state here, so the UI keeps showing the original Kanji lyrics
                const converted = await convertLyricsToReading(lyrics);
                finalLyrics = converted;
                console.log('[MusicComposer] Converted lyrics (internal):', finalLyrics.substring(0, 50) + '...');
            }

            const fullStyle = `${style}, ${gender} vocals`;
            console.log('[MusicComposer] Starting composition:', { fullStyle });
            // Send the converted lyrics (if applicable) to Mureka, but keep original lyrics in UI
            const id = await generateSong(finalLyrics, fullStyle);
            console.log('[MusicComposer] Task ID received:', id);
            setTaskId(id);
            pollStatus(id);
        } catch (e: any) {
            console.error('[MusicComposer] Composition error:', e);
            setError(e.message || t.errorComposition);
            setStep('lyrics');
            setIsLoading(false);
        }
    };

    const pollStatus = async (id: string) => {
        console.log('[MusicComposer] Starting polling for:', id);
        const interval = setInterval(async () => {
            try {
                const data = await querySong(id);
                console.log('[MusicComposer] Poll result:', data.status, data);

                // Check for both 'completed' (legacy/docs) and 'succeeded' (observed in mureka-o2)
                if (data.status === 'completed' || data.status === 'succeeded') {
                    // Check 'data' (docs) or 'choices' (observed)
                    const songs = data.data || data.choices || [];
                    console.log('[MusicComposer] Songs found:', songs);

                    if (songs.length > 0) {
                        // Try typical keys for audio URL
                        const song = songs[0];
                        const url = song.audio_url || song.url || song.audio;

                        if (url) {
                            console.log('[MusicComposer] Audio URL found:', url);
                            setSongUrl(url);
                            setStep('completed');
                            clearInterval(interval);
                            setIsLoading(false);
                        } else {
                            console.warn('[MusicComposer] Completed but no audio URL found in first item', Object.keys(song));
                        }
                    } else {
                        console.warn('[MusicComposer] Completed but empty songs array');
                    }
                } else if (data.status === 'failed') {
                    console.error('[MusicComposer] Generation status failed');
                    setError(t.errorGenFailed);
                    setStep('lyrics');
                    clearInterval(interval);
                    setIsLoading(false);
                }
            } catch (e) {
                console.error('[MusicComposer] Poll error:', e);
            }
        }, 3000);
    };

    const togglePlay = () => {
        if (!songUrl) return;

        if (isPlaying && audio) {
            audio.pause();
            setIsPlaying(false);
        } else {
            const newAudio = audio || new Audio(songUrl);
            if (!audio) setAudio(newAudio);

            newAudio.onended = () => setIsPlaying(false);
            newAudio.play();
            setIsPlaying(true);
        }
    };

    const handleDownload = async () => {
        if (!songUrl) return;

        // Format: YYYYMMDD-HHmmss
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        const timestamp = `${year}${month}${day}-${hours}${minutes}${seconds}`;

        // Sanitize title (simple replacement)
        // Ensure to keep Japanese characters
        const safeTitle = (title || 'song').trim().replace(/[\\/:*?"<>|]/g, '_');
        const fileNameBase = `${safeTitle}_${timestamp}`;

        // Download Audio - Use Proxy to force filename
        try {
            const proxyUrl = `/api/proxy-download?url=${encodeURIComponent(songUrl)}&filename=${encodeURIComponent(fileNameBase + '.mp3')}`;
            // Trigger download via proxy
            const a = document.createElement('a');
            a.href = proxyUrl;
            a.download = `${fileNameBase}.mp3`; // Fallback hint
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } catch (e) {
            console.error('Failed to download audio via proxy', e);
            // Fallback to direct link
            const a = document.createElement('a');
            a.href = songUrl;
            a.target = '_blank';
            a.download = `${fileNameBase}.mp3`;
            a.click();
        }

        // Download Lyrics - Add BOM for Windows/Android compatibility
        if (lyrics) {
            // Add Byte Order Mark (BOM) for UTF-8 identification
            const blob = new Blob(['\uFEFF', lyrics], { type: 'text/plain;charset=utf-8' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${fileNameBase}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-700 flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 flex justify-between items-center">
                    <h2 className="text-white font-bold text-lg flex items-center gap-2">
                        <MusicIcon /> {t.headerTitle}
                    </h2>
                    <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
                        <CloseIcon />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1">
                    {error && (
                        <div className="bg-red-500/20 text-red-200 p-3 rounded-lg mb-4 text-sm">
                            {error}
                        </div>
                    )}

                    {step === 'lyrics' && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs uppercase text-gray-400 font-semibold mb-1">{t.songTitle}</label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder={t.songTitlePlaceholder}
                                />
                            </div>

                            <div>
                                <label className="block text-xs uppercase text-gray-400 font-semibold mb-1">{t.lyrics}</label>
                                <textarea
                                    value={lyrics}
                                    onChange={(e) => setLyrics(e.target.value)}
                                    className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white h-40 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                    placeholder={t.lyricsPlaceholder}
                                />
                                {isLoading && !lyrics && (
                                    <div className="text-center text-gray-400 text-sm mt-2 flex justify-center items-center gap-2">
                                        <LoadingSpinnerIcon /> {t.generatingLyrics}
                                    </div>
                                )}
                            </div>

                            {/* Convert Kana Checkbox (Japanese Only) */}
                            {language === 'ja' && (
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="convertKana"
                                        checked={convertKana}
                                        onChange={(e) => setConvertKana(e.target.checked)}
                                        className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-600 ring-offset-gray-800"
                                    />
                                    <label htmlFor="convertKana" className="text-sm text-gray-300 select-none cursor-pointer">
                                        {t.convertKana}
                                    </label>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs uppercase text-gray-400 font-semibold mb-1">{t.style}</label>
                                    <input
                                        type="text"
                                        value={style}
                                        onChange={(e) => setStyle(e.target.value)}
                                        className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white text-sm"
                                        placeholder={t.stylePlaceholder}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs uppercase text-gray-400 font-semibold mb-1">{t.vocal}</label>
                                    <select
                                        value={gender}
                                        onChange={(e) => setGender(e.target.value)}
                                        className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white text-sm"
                                    >
                                        <option value="Female">{t.female}</option>
                                        <option value="Male">{t.male}</option>
                                    </select>
                                </div>
                            </div>

                            <button
                                onClick={handleCompose}
                                disabled={isLoading || !lyrics}
                                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg transition-colors flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                            >
                                {isLoading ? <LoadingSpinnerIcon /> : <MusicIcon />}
                                {t.composeButton}
                            </button>

                            <p className="text-xs text-gray-500 mt-2 text-center">
                                {t.poweredBy}
                            </p>
                        </div>
                    )}

                    {step === 'generating' && (
                        <div className="flex flex-col items-center justify-center py-10 space-y-6">
                            <div className="relative w-24 h-24">
                                <div className="absolute inset-0 border-4 border-blue-500/30 rounded-full animate-ping"></div>
                                <div className="absolute inset-0 border-4 border-t-blue-500 rounded-full animate-spin"></div>
                                <div className="absolute inset-0 flex items-center justify-center text-4xl">🎵</div>
                            </div>
                            <div className="text-center">
                                <h3 className="text-xl font-bold text-white mb-2">{t.generatingTitle}</h3>
                                <p className="text-gray-400 text-sm max-w-xs mx-auto">
                                    {t.generatingDesc}
                                </p>
                            </div>
                        </div>
                    )}

                    {step === 'completed' && (
                        <div className="flex flex-col items-center justify-center py-6 space-y-6">
                            <div className="w-32 h-32 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/50 mb-4 ring-4 ring-gray-800">
                                <button
                                    onClick={togglePlay}
                                    className="w-full h-full flex items-center justify-center text-white hover:scale-110 transition-transform"
                                >
                                    {isPlaying ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                        </svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 pl-2" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                                        </svg>
                                    )}
                                </button>
                            </div>

                            <div className="text-center">
                                <h3 className="text-2xl font-bold text-white">{title || 'Your Song'}</h3>
                                <p className="text-blue-400 text-sm mt-1">{style} • {gender}</p>
                            </div>

                            {songUrl && (
                                <button
                                    onClick={handleDownload}
                                    className="text-gray-400 hover:text-white text-sm underline mt-4 block"
                                >
                                    {t.download}
                                </button>
                            )}

                            {/* Display Lyrics during playback */}
                            {lyrics && (
                                <div className="w-full max-h-40 overflow-y-auto bg-gray-900/50 rounded p-4 mt-6 text-sm text-gray-300 text-left whitespace-pre-wrap border border-gray-700">
                                    <p className="font-bold text-gray-500 mb-2 text-xs uppercase">{t.lyrics}</p>
                                    {lyrics}
                                </div>
                            )}

                            <button
                                onClick={() => setStep('lyrics')}
                                className="text-gray-400 hover:text-white text-sm mt-8 border border-gray-600 rounded px-4 py-2 hover:bg-gray-700 transition"
                            >
                                {t.createAnother}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MusicComposer;
