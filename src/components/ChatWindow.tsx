import React, { useState, useEffect, useRef } from 'react';
import { initChat, streamChat, SPEAKER_NAMES } from '../services/geminiService';
import { generateMultiSpeakerAudio } from '../services/ttsService';
import type { Message as MessageType, ResponseLength, Language, Source, Model } from '../types';
import Message from './Message';
import UserInput from './UserInput';
import MusicComposer from './MusicComposer';
import { translations } from '../utils/translations';

let messageIdCounter = 0;
const generateMessageId = () => `msg-${Date.now()}-${++messageIdCounter}`;

interface ChatWindowProps {
  responseLength: ResponseLength;
  language: Language;
  model: Model;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ responseLength, language, model }) => {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isMusicComposerOpen, setIsMusicComposerOpen] = useState(false);
  const [composerPrompt, setComposerPrompt] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentStreamingAudioIndex = useRef<number | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const setupChat = async () => {
      setIsLoading(true);
      try {
        const newSessionId = await initChat(responseLength, language, model);
        setSessionId(newSessionId);

        const t = translations[language];
        const initialMsg: MessageType = {
          id: generateMessageId(),
          role: 'model',
          content: t.initialMessage,
          isGeneratingAudio: false,
          audioSegments: [],
        };
        setMessages([initialMsg]);

      } catch (error) {
        console.error("Failed to initialize chat:", error);
        setMessages([{ id: generateMessageId(), role: 'model', content: "Initialization failed. Please reload." }]);
      } finally {
        setIsLoading(false);
      }
    };

    setupChat();
  }, [responseLength, language, model]);

  const handleSendMessage = async (userInput: string) => {
    if (!sessionId || userInput.trim() === '') return;

    const userMessage: MessageType = { id: generateMessageId(), role: 'user', content: userInput };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    const botMessageIndex = messages.length + 1;
    setMessages(prev => [...prev, {
      id: generateMessageId(),
      role: 'model',
      content: '',
      sources: [],
      isGeneratingAudio: false,
      audioContent: null,
    }]);

    currentStreamingAudioIndex.current = botMessageIndex;

    let fullText = '';
    let collectedSources: Source[] = [];

    try {
      const stream = streamChat(sessionId, userInput);

      for await (const chunk of stream) {
        if (chunk.type === 'text' && chunk.text) {
          fullText += chunk.text;
          setMessages(prev => {
            const newMsgs = [...prev];
            if (newMsgs[botMessageIndex]) {
              newMsgs[botMessageIndex] = {
                ...newMsgs[botMessageIndex],
                content: fullText,
                sources: collectedSources,
              };
            }
            return newMsgs;
          });
        }

        if (chunk.type === 'sources' && chunk.sources) {
          collectedSources = [...collectedSources, ...chunk.sources];
          collectedSources = Array.from(new Map(collectedSources.map(item => [item.uri, item])).values());
          setMessages(prev => {
            const newMsgs = [...prev];
            if (newMsgs[botMessageIndex]) {
              newMsgs[botMessageIndex] = {
                ...newMsgs[botMessageIndex],
                content: fullText,
                sources: collectedSources,
              };
            }
            return newMsgs;
          });
        }

        if (chunk.type === 'done') {
          break;
        }
      }

    } catch (error) {
      console.error("Streaming error:", error);
      setMessages(prev => {
        const newMsgs = [...prev];
        if (newMsgs[botMessageIndex]) {
          newMsgs[botMessageIndex] = {
            ...newMsgs[botMessageIndex],
            content: fullText || "An error occurred. Please try again.",
          };
        }
        return newMsgs;
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateAudio = async (messageIndex: number) => {
    const message = messages[messageIndex];
    if (!message || message.role !== 'model' || !message.content) return;

    setMessages(prev => {
      const newMsgs = [...prev];
      newMsgs[messageIndex] = { ...newMsgs[messageIndex], isGeneratingAudio: true };
      return newMsgs;
    });

    try {
      const audioSegments = await generateMultiSpeakerAudio(message.content, language);

      setMessages(prev => {
        const newMsgs = [...prev];
        newMsgs[messageIndex] = {
          ...newMsgs[messageIndex],
          audioSegments: audioSegments,
          isGeneratingAudio: false
        };
        return newMsgs;
      });
    } catch (error) {
      console.error('Audio generation failed:', error);
      setMessages(prev => {
        const newMsgs = [...prev];
        newMsgs[messageIndex] = { ...newMsgs[messageIndex], isGeneratingAudio: false };
        return newMsgs;
      });
    }
  };

  const handleComposeMusic = (content: string) => {
    setComposerPrompt(content);
    setIsMusicComposerOpen(true);
  };

  return (
    <>
      <div className="flex-grow p-1 overflow-y-auto space-y-2">
        {messages.map((msg, index) => (
          <Message
            key={msg.id}
            role={msg.role}
            content={msg.content}
            sources={msg.sources}
            audioSegments={msg.audioSegments}
            isGeneratingAudio={msg.isGeneratingAudio}
            onGenerateAudio={() => handleGenerateAudio(index)}
            onComposeMusic={() => handleComposeMusic(msg.content)}
            language={language}
          />
        ))}
        {isLoading && messages.length > 0 && messages[messages.length - 1]?.role === 'user' && (
          <div className="flex justify-start">
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <UserInput
        onSendMessage={handleSendMessage}
        isLoading={isLoading}
        language={language}
      />
      <MusicComposer
        isOpen={isMusicComposerOpen}
        onClose={() => setIsMusicComposerOpen(false)}
        initialPrompt={composerPrompt}
        language={language}
      />
    </>
  );
};

export default ChatWindow;