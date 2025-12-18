
export interface Source {
  uri: string;
  title: string;
}

export interface AudioSegment {
  audio: string; // Base64 encoded audio (MP3 or PCM)
  format: 'mp3' | 'pcm'; // Audio format
}

export interface Message {
  role: 'user' | 'model';
  content: string;
  sources?: Source[];
  audioContent?: string | null; // Legacy: Single audio (base64)
  audioSegments?: AudioSegment[]; // New: Multiple audio segments for multi-speaker
  isGeneratingAudio?: boolean;
}

export type FontSize = 'sm' | 'md' | 'lg';

export type ResponseLength = 'short' | 'long';

export type Model = 'gemini-3-flash-preview' | 'gemini-2.5-pro';

export type Language =
  | 'ja' // Japanese
  | 'en' // English
  | 'ko' // Korean
  | 'zh' // Chinese
  | 'es' // Spanish
  | 'fr' // French
  | 'de' // German
  | 'it' // Italian
  | 'pt' // Portuguese
  | 'vi' // Vietnamese
  | 'th' // Thai
  | 'id' // Indonesian
  | 'ru' // Russian
  | 'my' // Burmese (Myanmar)
  | 'ms' // Malay
  | 'ur' // Urdu (Pakistan)
  | 'ne' // Nepali
  | 'ta' // Tamil
  | 'hi' // Hindi
  | 'tl' // Tagalog
  | 'lo'; // Lao
