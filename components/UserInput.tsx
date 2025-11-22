
import React, { useState } from 'react';
import { SendIcon, MicrophoneIcon } from './Icons';
import { useLiveInput } from '../hooks/useLiveInput';
import type { Language } from '../types';
import { translations } from '../utils/translations';

interface UserInputProps {
  onSendMessage: (input: string) => void;
  isLoading: boolean;
  language: Language;
}

const UserInput: React.FC<UserInputProps> = ({ onSendMessage, isLoading, language }) => {
  const [input, setInput] = useState('');
  const t = translations[language];
  
  const handleTranscriptUpdate = (text: string) => {
    setInput(text);
  };

  const handleError = (message: string) => {
    setInput(message);
  };

  const { recordingStatus, startRecording, stopRecording } = useLiveInput({
    onTranscriptUpdate: handleTranscriptUpdate,
    onError: handleError
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading && recordingStatus === 'idle') {
      onSendMessage(input);
      setInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const isRecordingOrTranscribing = recordingStatus !== 'idle';

  const handleMicClick = () => {
    if (recordingStatus === 'idle') {
      startRecording();
    } else if (recordingStatus === 'recording') {
      stopRecording();
    }
    // preparing or transcribing: do nothing
  };

  const micButtonClass = {
    idle: 'bg-gray-600 hover:bg-gray-500',
    preparing: 'bg-yellow-600 animate-pulse cursor-wait',
    recording: 'bg-red-600 animate-pulse hover:bg-red-700',
    transcribing: 'bg-blue-600 animate-pulse cursor-wait',
  }[recordingStatus];

  const micButtonLabel = {
    idle: 'Start recording',
    preparing: 'Preparing...',
    recording: 'Stop recording',
    transcribing: 'Processing...',
  }[recordingStatus];

  return (
    <div className="p-2 bg-gray-800 border-t border-gray-700 rounded-b-2xl">
      <form onSubmit={handleSubmit} className="flex items-center gap-1.5">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t.placeholder}
          className="flex-grow bg-gray-700 text-gray-200 rounded-lg p-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200 max-h-24"
          rows={2}
          disabled={isLoading || isRecordingOrTranscribing}
        />
        <button
          type="button"
          onClick={handleMicClick}
          disabled={recordingStatus === 'preparing' || recordingStatus === 'transcribing'}
          className={`text-white rounded-full p-2 transition-colors duration-200 flex-shrink-0 ${micButtonClass}`}
          aria-label={micButtonLabel}
        >
          <MicrophoneIcon />
        </button>
        <button
          type="submit"
          disabled={isLoading || isRecordingOrTranscribing || !input.trim()}
          className="bg-blue-600 text-white rounded-full p-2 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors duration-200 flex-shrink-0"
          aria-label="Send message"
        >
          <SendIcon />
        </button>
      </form>
    </div>
  );
};

export default UserInput;
