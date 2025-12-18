import React, { useState, useEffect, useRef } from 'react';
import type { Chat } from '@google/genai';
import { initChat, streamChat, generateMultiSpeakerAudio, SPEAKER_NAMES } from '../services/geminiService';
import type { Message as MessageType, ResponseLength, Language, Source, Model } from '../types';
import Message from './Message';
import UserInput from './UserInput';
import MusicComposer from './MusicComposer';
import { translations } from '../utils/translations';

interface ChatWindowProps {
  responseLength: ResponseLength;
  language: Language;
  model: Model;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ responseLength, language, model }) => {
  const [chat, setChat] = useState<Chat | null>(null);
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
        const chatSession = await initChat(responseLength, language, undefined, model);
        setChat(chatSession);

        const t = translations[language];
        const initialMsg: MessageType = {
          role: 'model',
          content: t.initialMessage,
          isGeneratingAudio: false,
          audioSegments: [],
        };
        setMessages([initialMsg]);

      } catch (error) {
        console.error("Failed to initialize chat:", error);
        setMessages([{ role: 'model', content: "Initialization failed. Please reload." }]);
      } finally {
        setIsLoading(false);
      }
    };

    setupChat();
  }, [responseLength, language, model]);

  const handleSendMessage = async (userInput: string) => {
    if (!chat || userInput.trim() === '') return;

    const userMessage: MessageType = { role: 'user', content: userInput };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    const botMessageIndex = messages.length + 1;
    setMessages(prev => [...prev, {
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
      const stream = streamChat(chat, userInput);

      for await (const chunk of stream) {
        let shouldUpdate = false;

        // Extract sources FIRST so they are available for the text update
        if (chunk.candidates?.[0]?.groundingMetadata?.groundingChunks) {
          const newSources = chunk.candidates[0].groundingMetadata.groundingChunks
            .filter((c: any) => c.web && c.web.uri)
            .map((c: any) => ({ uri: c.web.uri, title: c.web.title || '' }));

          if (newSources.length > 0) {
            collectedSources = [...collectedSources, ...newSources];
            collectedSources = Array.from(new Map(collectedSources.map(item => [item.uri, item])).values());
            shouldUpdate = true;
          }
        }

        if (chunk.text) {
          const newText = chunk.text;
          fullText += newText;
          shouldUpdate = true;

          setMessages(prev => {
            const newMsgs = [...prev];
            if (newMsgs[botMessageIndex]) {
              newMsgs[botMessageIndex] = {
                ...newMsgs[botMessageIndex],
                content: fullText,
                sources: collectedSources
              };
            }
            return newMsgs;
          });
        }

        // If only sources were updated (and no text), trigger an update here
        if (shouldUpdate) {
          setMessages(prev => {
            const newMsgs = [...prev];
            if (newMsgs[botMessageIndex]) {
              newMsgs[botMessageIndex] = {
                ...newMsgs[botMessageIndex],
                content: fullText,
                sources: collectedSources
              };
            }
            return newMsgs;
          });
        }
      }

    } catch (e) {
      console.error("Error in stream:", e);
    } finally {
      setIsLoading(false);
      setMessages(prev => {
        const newMsgs = [...prev];
        if (newMsgs[botMessageIndex]) {
          newMsgs[botMessageIndex] = {
            ...newMsgs[botMessageIndex],
            isGeneratingAudio: false,
            sources: collectedSources // Ensure sources are updated at the end
          };
        }
        return newMsgs;
      });
    }
  };

  const handleGenerateAudio = async (messageIndex: number) => {
    const message = messages[messageIndex];
    if (!message || !message.content) return;

    setMessages(prev => {
      const newMsgs = [...prev];
      newMsgs[messageIndex] = { ...newMsgs[messageIndex], isGeneratingAudio: true, audioSegments: [] };
      return newMsgs;
    });

    try {
      // Generate multi-speaker audio segments
      const audioSegments = await generateMultiSpeakerAudio(message.content, language);

      setMessages(prev => {
        const newMsgs = [...prev];
        if (newMsgs[messageIndex]) {
          newMsgs[messageIndex] = {
            ...newMsgs[messageIndex],
            audioSegments: audioSegments,
            isGeneratingAudio: false
          };
        }
        return newMsgs;
      });
    } catch (e) {
      console.error("Multi-speaker audio generation failed:", e);
      setMessages(prev => {
        const newMsgs = [...prev];
        if (newMsgs[messageIndex]) {
          newMsgs[messageIndex] = { ...newMsgs[messageIndex], isGeneratingAudio: false };
        }
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
            key={index}
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