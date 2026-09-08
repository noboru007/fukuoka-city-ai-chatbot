import React, { useState, useEffect, useRef, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ExternalLinkIcon, PlayIcon, StopIcon, LoadingSpinnerIcon, MusicIcon } from './Icons';
import type { Source, Language, AudioSegment } from '../types';
import { AudioQueue } from '../utils/audioQueue';
import { translations } from '../utils/translations';
import { SPEAKER_NAMES } from '../services/geminiService';

const AUDIO_PREROLL_MS = 500;
const AUDIO_PREROLL_OVERLAP_MS = 150;

const createSilentWavUrl = (durationMs: number): string => {
  const sampleRate = 8000;
  const bytesPerSample = 2;
  const sampleCount = Math.ceil(sampleRate * durationMs / 1000);
  const dataLength = sampleCount * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(buffer);

  const writeAscii = (offset: number, value: string) => {
    for (let index = 0; index < value.length; index++) {
      view.setUint8(offset + index, value.charCodeAt(index));
    }
  };

  writeAscii(0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeAscii(8, 'WAVE');
  writeAscii(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * bytesPerSample, true);
  view.setUint16(32, bytesPerSample, true);
  view.setUint16(34, 16, true);
  writeAscii(36, 'data');
  view.setUint32(40, dataLength, true);

  return URL.createObjectURL(new Blob([buffer], { type: 'audio/wav' }));
};

interface MessageProps {
  role: 'user' | 'model';
  content: string;
  sources?: Source[];
  audioSegments?: AudioSegment[];
  isGeneratingAudio?: boolean;
  onGenerateAudio: () => void;
  onComposeMusic?: () => void;
  language: Language;
  autoPlayAudio: boolean;
}

const Message: React.FC<MessageProps> = ({ role, content, sources, audioSegments, isGeneratingAudio, onGenerateAudio, onComposeMusic, language, autoPlayAudio }) => {
  const isUser = role === 'user';
  const [isPlaying, setIsPlaying] = useState(false);

  const audioQueueRef = useRef<AudioQueue | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const warmupAudioRef = useRef<HTMLAudioElement | null>(null);
  const warmupUrlRef = useRef<string | null>(null);
  const currentSegmentIndexRef = useRef<number>(0);
  const prerollTimeoutRef = useRef<number | null>(null);

  const t = translations[language];

  const clearAudioWarmup = () => {
    if (prerollTimeoutRef.current !== null) {
      window.clearTimeout(prerollTimeoutRef.current);
      prerollTimeoutRef.current = null;
    }
    if (warmupAudioRef.current) {
      warmupAudioRef.current.onended = null;
      warmupAudioRef.current.onerror = null;
      warmupAudioRef.current.pause();
      warmupAudioRef.current = null;
    }
    if (warmupUrlRef.current) {
      URL.revokeObjectURL(warmupUrlRef.current);
      warmupUrlRef.current = null;
    }
  };

  // Apply items-end/start here to the wrapper to prevent stretching
  const containerClasses = isUser
    ? 'flex justify-end items-end w-full'
    : 'flex justify-start items-start w-full';

  const bubbleClasses = isUser
    ? 'bg-blue-600 text-white px-1.5 py-1 leading-tight rounded-lg rounded-br-none whitespace-pre-wrap w-fit max-w-[90%] sm:max-w-xl break-words'
    : 'bg-gray-700 text-gray-200 px-1.5 py-1 leading-tight rounded-lg rounded-bl-none w-fit max-w-[90%] sm:max-w-xl break-words';

  useEffect(() => {
    if (!audioQueueRef.current) {
      audioQueueRef.current = new AudioQueue(() => {
        // Called when AudioQueue finishes playing
        playNextSegment();
      });
    }
    return () => {
      clearAudioWarmup();
      audioQueueRef.current?.stop();
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }
    };
  }, []);

  // Auto-play when audio generation completes
  const prevIsGeneratingRef = useRef<boolean>(false);
  useEffect(() => {
    if (prevIsGeneratingRef.current && !isGeneratingAudio && audioSegments && audioSegments.length > 0 && !isPlaying) {
      // Audio generation just completed, auto-play
      playAudio();
    }
    prevIsGeneratingRef.current = isGeneratingAudio || false;
  }, [isGeneratingAudio, audioSegments]);

  const stopPlayback = () => {
    clearAudioWarmup();
    audioQueueRef.current?.stop();
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    currentSegmentIndexRef.current = 0;
    setIsPlaying(false);
  };

  useEffect(() => {
    if (!autoPlayAudio) {
      stopPlayback();
    }
  }, [autoPlayAudio]);

  const playNextSegment = () => {
    if (!audioSegments || currentSegmentIndexRef.current >= audioSegments.length) {
      // All segments played, stop
      setIsPlaying(false);
      currentSegmentIndexRef.current = 0;
      return;
    }

    const segmentIndex = currentSegmentIndexRef.current;
    const segment = audioSegments[segmentIndex];
    currentSegmentIndexRef.current++;

    if (segment.format === 'mp3') {
      // Play MP3 using Audio element
      const audio = new Audio(`data:audio/mp3;base64,${segment.audio}`);
      audio.preload = 'auto';
      currentAudioRef.current = audio;

      audio.onended = () => {
        clearAudioWarmup();
        currentAudioRef.current = null;
        playNextSegment(); // Play next segment
      };

      audio.onerror = (e) => {
        console.error('MP3 playback error:', e);
        clearAudioWarmup();
        currentAudioRef.current = null;
        playNextSegment(); // Try next segment
      };

      const handlePlayError = (err: unknown) => {
        console.error('Failed to play MP3:', err);
        clearAudioWarmup();
        currentAudioRef.current = null;
        playNextSegment();
      };

      if (segmentIndex === 0) {
        // Keep the real speech untouched at its first sample. A separate silent
        // WAV wakes the browser/device output path and overlaps the real start,
        // avoiding unreliable MP3 rewinds that can skip the first phoneme.
        const warmupUrl = createSilentWavUrl(AUDIO_PREROLL_MS + AUDIO_PREROLL_OVERLAP_MS);
        const warmupAudio = new Audio(warmupUrl);
        warmupAudio.preload = 'auto';
        warmupAudioRef.current = warmupAudio;
        warmupUrlRef.current = warmupUrl;

        warmupAudio.onended = clearAudioWarmup;
        warmupAudio.onerror = () => {
          clearAudioWarmup();
          if (currentAudioRef.current === audio) {
            audio.play().catch(handlePlayError);
          }
        };

        warmupAudio.play()
          .then(() => {
            prerollTimeoutRef.current = window.setTimeout(() => {
              prerollTimeoutRef.current = null;
              if (currentAudioRef.current !== audio) return;
              audio.play().catch(handlePlayError);
            }, AUDIO_PREROLL_MS);
          })
          .catch(() => {
            clearAudioWarmup();
            if (currentAudioRef.current === audio) {
              audio.play().catch(handlePlayError);
            }
          });
      } else {
        audio.play().catch(handlePlayError);
      }
    } else if (segment.format === 'pcm') {
      // Play PCM using AudioQueue
      if (audioQueueRef.current) {
        audioQueueRef.current.stop();
        audioQueueRef.current.enqueue(segment.audio);
        audioQueueRef.current.play();
        // Note: playNextSegment will be called by AudioQueue's onComplete callback
      } else {
        console.error('AudioQueue not initialized');
        playNextSegment();
      }
    }
  };

  const playAudio = async () => {
    if (isPlaying) return;

    if (!audioSegments || audioSegments.length === 0) {
      // No audio, trigger generation
      if (!isGeneratingAudio) {
        onGenerateAudio();
      }
      return;
    }

    // Start playback from first segment
    setIsPlaying(true);
    currentSegmentIndexRef.current = 0;
    playNextSegment();
  };

  const handlePlayButtonClick = () => {
    if (isPlaying) {
      stopPlayback();
    } else {
      playAudio();
    }
  };

  const { agentRegex, grandmaRegex } = useMemo(() => {
    const allAgents = Object.values(SPEAKER_NAMES).map(n => n.agent.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const allGrandmas = Object.values(SPEAKER_NAMES).map(n => n.grandma.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

    return {
      agentRegex: new RegExp(`^(${allAgents.join('|')})(：|:)?`),
      grandmaRegex: new RegExp(`^(${allGrandmas.join('|')})(：|:)?`)
    };
  }, []);

  // Helper to render loading dots
  const renderLoadingDots = () => (
    <div className="flex items-center gap-1 h-5 px-1">
      <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
      <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
      <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce"></div>
    </div>
  );

  return (
    <div className={containerClasses}>
      {/* Added items-end/start to this inner flex column to prevent children from stretching to full width */}
      <div className={`flex flex-col max-w-full ${isUser ? 'items-end' : 'items-start'}`}>
        <div className={bubbleClasses}>
          {isUser ? (
            content
          ) : (
            (!content || content.trim() === '') ? (
              renderLoadingDots()
            ) : (
              <div className="[&_p]:m-0 [&_ul]:m-0 [&_ol]:m-0 [&_li]:m-0 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    a: ({ node, ...props }) => <a className="text-blue-300 hover:underline" {...props} target="_blank" rel="noopener noreferrer" />,
                    p: ({ node, ...props }) => {
                      // Note: Speaker name coloring is handled by the <strong> component
                      // We only handle plain text (non-bold) speaker names here
                      const children = props.children;

                      // Case: Plain text line starting with speaker name (no ** bold markers)
                      if (children && typeof children === 'string') {
                        // Extract speaker name and remaining text
                        const agentMatch = children.match(agentRegex);
                        if (agentMatch) {
                          const speakerName = agentMatch[0];
                          const remainingText = children.slice(speakerName.length);
                          return (
                            <p className="m-0">
                              <span className="text-cyan-400 font-bold">{speakerName}</span>
                              {remainingText}
                            </p>
                          );
                        }

                        const grandmaMatch = children.match(grandmaRegex);
                        if (grandmaMatch) {
                          const speakerName = grandmaMatch[0];
                          const remainingText = children.slice(speakerName.length);
                          return (
                            <p className="m-0">
                              <span className="text-amber-400 font-bold">{speakerName}</span>
                              {remainingText}
                            </p>
                          );
                        }
                      }

                      // Default: No speaker name detected, render normally
                      return <p className="m-0" {...props} />;
                    },
                    ul: ({ node, ...props }) => <ul className="list-disc list-inside m-0 pl-1" {...props} />,
                    ol: ({ node, ...props }) => <ol className="list-decimal list-inside m-0 pl-1" {...props} />,
                    li: ({ node, ...props }) => <li className="m-0" {...props} />,
                    strong: ({ node, ...props }) => {
                      // Robustly extract text from children to check against regex
                      // React children can be strings, arrays, or other elements
                      const getText = (children: React.ReactNode): string => {
                        if (!children) return '';
                        if (typeof children === 'string') return children;
                        if (Array.isArray(children)) return children.map(getText).join('');
                        if (React.isValidElement(children) && children.props.children) return getText(children.props.children);
                        return '';
                      };

                      const textContent = getText(props.children);

                      if (agentRegex.test(textContent)) {
                        return <strong className="text-cyan-400">{props.children}</strong>;
                      }
                      if (grandmaRegex.test(textContent)) {
                        return <strong className="text-amber-400">{props.children}</strong>;
                      }
                      return <strong>{props.children}</strong>;
                    }
                  }}
                >
                  {content}
                </ReactMarkdown>
              </div>
            )
          )}
        </div>

        {!isUser && (content && content.trim() !== '') && (
          <div className="w-full flex flex-wrap items-center gap-x-2 gap-y-1 mt-0 text-gray-400">
            <div className="flex-1 min-w-0">
              {sources && sources.length > 0 && (
                <details className="group">
                  <summary className="list-none flex items-center gap-1 cursor-pointer text-[10px] hover:text-gray-200 transition-colors w-fit uppercase tracking-wider">
                    <span className="font-semibold opacity-80">{t.sources}</span>
                    <svg className="w-2.5 h-2.5 transition-transform duration-200 group-open:rotate-90" fill="none" viewBox="0 0 24 24" strokeWidth="3" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                    </svg>
                  </summary>
                  <div className="mt-1 text-[10px] text-gray-300 border-l border-gray-700 ml-0.5 pl-2 py-0.5">
                    <ol className="list-decimal list-inside space-y-1">
                      {sources.map((source, index) => (
                        <li key={index} className="truncate max-w-[150px]">
                          <a
                            href={source.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-blue-300 hover:underline group/link inline-flex items-center gap-1"
                            title={source.uri}
                          >
                            <span className="truncate">{source.title || new URL(source.uri).hostname}</span>
                            <ExternalLinkIcon />
                          </a>
                        </li>
                      ))}
                    </ol>
                  </div>
                </details>
              )}
            </div>

            <div className="flex-shrink-0 transform scale-90 origin-right flex gap-1">
              {!isUser && onComposeMusic && (
                <button
                  onClick={onComposeMusic}
                  className="p-1 bg-gray-800/50 hover:bg-gray-700 text-gray-400 hover:text-white rounded-full transition-colors"
                  title="Compose Song"
                >
                  <MusicIcon />
                </button>
              )}
              <div className="relative">
                <button
                  onClick={handlePlayButtonClick}
                  disabled={isGeneratingAudio && (!audioSegments || audioSegments.length === 0)}
                  className="p-1 bg-gray-800/50 hover:bg-gray-700 text-gray-400 hover:text-white rounded-full transition-colors disabled:opacity-30"
                  aria-label={isPlaying ? "Stop" : "Play"}
                >
                  {isGeneratingAudio && (!audioSegments || audioSegments.length === 0) ? (
                    <LoadingSpinnerIcon />
                  ) : isPlaying ? (
                    <StopIcon />
                  ) : (
                    <PlayIcon />
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Message;
