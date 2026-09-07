import React, { useState, useEffect, useRef } from 'react';
import { initChat, streamChat } from '../services/geminiService';
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
  autoPlayAudio: boolean;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ responseLength, language, model, autoPlayAudio }) => {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isMusicComposerOpen, setIsMusicComposerOpen] = useState(false);
  const [composerPrompt, setComposerPrompt] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<MessageType[]>([]);
  const autoPlayAudioRef = useRef(autoPlayAudio);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    autoPlayAudioRef.current = autoPlayAudio;
  }, [autoPlayAudio]);

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
  }, []);

  const updateMessage = (messageId: string, updates: Partial<MessageType>) => {
    setMessages(prev => prev.map(message => (
      message.id === messageId ? { ...message, ...updates } : message
    )));
  };

  const handleSendMessage = async (userInput: string) => {
    if (!sessionId || userInput.trim() === '') return;

    const shouldAutoPlayResponse = autoPlayAudio;
    const userMessage: MessageType = { id: generateMessageId(), role: 'user', content: userInput };
    setIsLoading(true);

    const botMessageId = generateMessageId();
    const botMessage: MessageType = {
      id: botMessageId,
      role: 'model',
      content: '',
      sources: [],
      isGeneratingAudio: false,
      audioContent: null,
    };
    setMessages(prev => [...prev, userMessage, botMessage]);

    let fullText = '';
    let collectedSources: Source[] = [];

    try {
      const stream = streamChat(sessionId, userInput, responseLength, language, model);

      for await (const chunk of stream) {
        if (chunk.type === 'text' && chunk.text) {
          fullText += chunk.text;
          updateMessage(botMessageId, { content: fullText, sources: collectedSources });
        }

        if (chunk.type === 'sources' && chunk.sources) {
          collectedSources = [...collectedSources, ...chunk.sources];
          collectedSources = Array.from(new Map(collectedSources.map(item => [item.uri, item])).values());
          updateMessage(botMessageId, { content: fullText, sources: collectedSources });
        }

        if (chunk.type === 'done') {
          break;
        }
      }

    } catch (error) {
      console.error("Streaming error:", error);
      fullText = fullText || "An error occurred. Please try again.";
      updateMessage(botMessageId, { content: fullText });
    } finally {
      setIsLoading(false);
    }

    if (shouldAutoPlayResponse && autoPlayAudioRef.current && fullText) {
      void handleGenerateAudio(botMessageId, fullText, language);
    }
  };

  const handleGenerateAudio = async (messageId: string, contentOverride?: string, languageOverride?: Language) => {
    const message = messagesRef.current.find(item => item.id === messageId);
    const content = contentOverride || message?.content;
    if ((!message && !contentOverride) || message?.role === 'user' || !content) return;

    updateMessage(messageId, { isGeneratingAudio: true });

    try {
      const audioSegments = await generateMultiSpeakerAudio(content, languageOverride || language);
      updateMessage(messageId, { audioSegments, isGeneratingAudio: false });
    } catch (error) {
      console.error('Audio generation failed:', error);
      updateMessage(messageId, { isGeneratingAudio: false });
    }
  };

  const handleComposeMusic = (content: string) => {
    setComposerPrompt(content);
    setIsMusicComposerOpen(true);
  };

  return (
    <>
      <div className="flex-grow p-1 overflow-y-auto space-y-2">
        {messages.map((msg) => (
          <Message
            key={msg.id}
            role={msg.role}
            content={msg.content}
            sources={msg.sources}
            audioSegments={msg.audioSegments}
            isGeneratingAudio={msg.isGeneratingAudio}
            onGenerateAudio={() => handleGenerateAudio(msg.id)}
            onComposeMusic={() => handleComposeMusic(msg.content)}
            language={language}
            autoPlayAudio={autoPlayAudio}
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
