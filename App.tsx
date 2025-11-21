import React, { useState, useRef, useEffect } from 'react';
import ChatWindow from './components/ChatWindow';
import type { FontSize, ResponseLength, Language } from './types';
import { MenuIcon } from './components/Icons';
import { translations } from './utils/translations';

const App: React.FC = () => {
  const [fontSize, setFontSize] = useState<FontSize>('md');
  const [responseLength, setResponseLength] = useState<ResponseLength>('short');
  const [language, setLanguage] = useState<Language>('ja');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Updated version for verification
  const APP_VERSION = "v0.43"; // Markdown bold markers removed from TTS

  // Log version on component mount
  useEffect(() => {
    console.log(`[App] Version: ${APP_VERSION}`);
  }, []);

  const fontSizeClassMap = {
    sm: 'font-size-sm',
    md: 'font-size-md',
    lg: 'font-size-lg',
  };

  const t = translations[language];

  useEffect(() => {
    const detectLanguage = (): Language => {
      const lang = navigator.language.split('-')[0];
      switch (lang) {
        case 'ja': return 'ja';
        case 'ko': return 'ko';
        case 'zh': return 'zh';
        case 'es': return 'es';
        case 'fr': return 'fr';
        case 'de': return 'de';
        case 'it': return 'it';
        case 'pt': return 'pt';
        case 'vi': return 'vi';
        case 'th': return 'th';
        case 'id': return 'id';
        case 'ru': return 'ru';
        case 'my': return 'my';
        case 'ms': return 'ms';
        case 'ur': return 'ur';
        case 'ne': return 'ne';
        case 'ta': return 'ta';
        case 'hi': return 'hi';
        case 'tl': return 'tl';
        case 'lo': return 'lo';
        default: return 'en';
      }
    };
    setLanguage(detectLanguage());
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setLanguage(e.target.value as Language);
    setIsMenuOpen(false);
  };

  return (
    <div className={`flex flex-col h-screen bg-gray-900 text-gray-100 ${fontSizeClassMap[fontSize]}`}>
      {/* Header */}
      <header className="bg-gray-800 p-2 sm:p-4 shadow-md flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-600 rounded-full flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-lg sm:text-xl">福</span>
          </div>
          <div>
            <h1 className="font-bold text-base sm:text-lg leading-tight">{t.title}</h1>
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
              </span>
              <span className="text-xs text-gray-400">{t.online}</span>
            </div>
          </div>
        </div>

        <div className="relative" ref={menuRef}>
            <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 text-gray-400 hover:text-white focus:outline-none"
            >
                <MenuIcon />
            </button>

            {isMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-md shadow-lg py-1 border border-gray-700 z-50">
                     {/* Language Selector in Menu */}
                    <div className="px-4 py-2 border-b border-gray-700">
                        <label className="block text-xs text-gray-500 mb-1 uppercase tracking-wide font-semibold">
                            {t.menu.language}
                        </label>
                         <select
                            value={language}
                            onChange={handleLanguageChange}
                            className="w-full bg-gray-700 text-white text-sm rounded p-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="ja">日本語</option>
                            <option value="en">English</option>
                            <option value="ko">한국어</option>
                            <option value="zh">中文</option>
                            <option value="es">Español</option>
                            <option value="fr">Français</option>
                            <option value="de">Deutsch</option>
                            <option value="it">Italiano</option>
                            <option value="pt">Português</option>
                            <option value="vi">Tiếng Việt</option>
                            <option value="th">ไทย</option>
                            <option value="id">Bahasa Indonesia</option>
                            <option value="ru">Русский</option>
                            <option value="my">မြန်မာဘာသာ</option>
                            <option value="ms">Bahasa Melayu</option>
                            <option value="ur">اردو</option>
                            <option value="ne">नेपाली</option>
                            <option value="ta">தமிழ்</option>
                            <option value="hi">हिन्दी</option>
                            <option value="tl">Tagalog</option>
                            <option value="lo">ລາວ</option>
                          </select>
                    </div>

                    <div className="px-4 py-2 border-b border-gray-700">
                        <label className="block text-xs text-gray-500 mb-1 uppercase tracking-wide font-semibold">
                            {t.menu.fontSize}
                        </label>
                        <div className="flex flex-col gap-1">
                            <button
                                onClick={() => setFontSize('sm')}
                                className={`text-left text-sm px-2 py-1 rounded ${fontSize === 'sm' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
                            >
                                {t.menu.sm}
                            </button>
                            <button
                                onClick={() => setFontSize('md')}
                                className={`text-left text-sm px-2 py-1 rounded ${fontSize === 'md' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
                            >
                                {t.menu.md}
                            </button>
                            <button
                                onClick={() => setFontSize('lg')}
                                className={`text-left text-sm px-2 py-1 rounded ${fontSize === 'lg' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
                            >
                                {t.menu.lg}
                            </button>
                        </div>
                    </div>
                    <div className="px-4 py-2 border-b border-gray-700">
                        <label className="block text-xs text-gray-500 mb-1 uppercase tracking-wide font-semibold">
                            {t.menu.responseLength}
                        </label>
                        <div className="flex flex-col gap-1">
                            <button
                                onClick={() => setResponseLength('short')}
                                className={`text-left text-sm px-2 py-1 rounded ${responseLength === 'short' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
                            >
                                {t.menu.short}
                            </button>
                            <button
                                onClick={() => setResponseLength('long')}
                                className={`text-left text-sm px-2 py-1 rounded ${responseLength === 'long' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
                            >
                                {t.menu.long}
                            </button>
                        </div>
                    </div>
                    <div className="px-4 py-2 text-xs text-gray-500 text-center">
                        App Version: {APP_VERSION}
                    </div>
                </div>
            )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow overflow-hidden flex flex-col relative">
         <ChatWindow responseLength={responseLength} language={language} />
      </main>
    </div>
  );
};

export default App;