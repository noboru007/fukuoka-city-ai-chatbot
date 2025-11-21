import { useState, useRef, useEffect, useCallback } from 'react';
import { getAi } from '../services/geminiService';
import { createPcmBlob } from '../utils/audioHelper';
import type { LiveServerMessage, Modality } from '@google/genai';

export type RecordingStatus = 'idle' | 'preparing' | 'recording' | 'transcribing';

interface UseLiveInputProps {
  onTranscriptUpdate: (text: string) => void;
  onError: (message: string) => void;
}

export const useLiveInput = ({ onTranscriptUpdate, onError }: UseLiveInputProps) => {
  const [recordingStatus, setRecordingStatus] = useState<RecordingStatus>('idle');
  
  // Refs to maintain state across closures
  const recordingStatusRef = useRef(recordingStatus);
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const transcriptRef = useRef('');
  const finalTranscriptTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    recordingStatusRef.current = recordingStatus;
  }, [recordingStatus]);

  const cleanupRecording = useCallback(() => {
    if (finalTranscriptTimeoutRef.current) {
        clearTimeout(finalTranscriptTimeoutRef.current);
        finalTranscriptTimeoutRef.current = null;
    }

    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;

    if (scriptProcessorRef.current) {
        scriptProcessorRef.current.disconnect();
        scriptProcessorRef.current = null;
    }

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(e => console.error("Error closing AudioContext:", e));
        audioContextRef.current = null;
    }

    sessionPromiseRef.current?.then(session => {
        session.close();
    }).catch(e => console.error("Error closing session:", e));
    sessionPromiseRef.current = null;

    setRecordingStatus('idle');
  }, []);

  const stopRecording = useCallback(() => {
    if (recordingStatusRef.current === 'idle' || recordingStatusRef.current === 'transcribing') return;

    // Stop sending audio
    if (scriptProcessorRef.current) {
        scriptProcessorRef.current.disconnect();
    }
    streamRef.current?.getTracks().forEach(track => track.stop());

    // If recording was in progress, wait for final transcript
    if ((recordingStatusRef.current === 'recording' || recordingStatusRef.current === 'preparing') && sessionPromiseRef.current) {
        setRecordingStatus('transcribing');
        
        if (finalTranscriptTimeoutRef.current) clearTimeout(finalTranscriptTimeoutRef.current);
        finalTranscriptTimeoutRef.current = window.setTimeout(() => {
            cleanupRecording();
        }, 2000);
    } else {
        cleanupRecording();
    }
  }, [cleanupRecording]);

  const startRecording = useCallback(async () => {
    if (recordingStatus !== 'idle') return;
    
    transcriptRef.current = '';
    setRecordingStatus('preparing');
    onTranscriptUpdate('マイクの許可を待っています...');

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        onTranscriptUpdate('AIに接続しています...');

        const ai = getAi();
        sessionPromiseRef.current = ai.live.connect({
            model: 'gemini-2.5-flash-native-audio-preview-09-2025',
            callbacks: {
                onopen: () => {
                    if (recordingStatusRef.current !== 'preparing') return;

                    setRecordingStatus('recording');
                    onTranscriptUpdate('お話しください...');

                    const context = new ((window as any).AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
                    audioContextRef.current = context;
                    
                    const source = context.createMediaStreamSource(stream);
                    const scriptProcessor = context.createScriptProcessor(4096, 1, 1);
                    scriptProcessorRef.current = scriptProcessor;

                    scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                        const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                        const pcmBlob = createPcmBlob(inputData);
                        sessionPromiseRef.current?.then((session: any) => {
                            session.sendRealtimeInput({ media: pcmBlob });
                        }).catch((e: any) => console.error("Error sending audio data:", e));
                    };

                    source.connect(scriptProcessor);
                    scriptProcessor.connect(context.destination);
                },
                onmessage: (message: LiveServerMessage) => {
                    if (message.serverContent?.inputTranscription) {
                        const text = message.serverContent.inputTranscription.text;
                        transcriptRef.current += text;
                        onTranscriptUpdate(transcriptRef.current);

                        if (recordingStatusRef.current === 'transcribing') {
                            if (finalTranscriptTimeoutRef.current) clearTimeout(finalTranscriptTimeoutRef.current);
                            finalTranscriptTimeoutRef.current = window.setTimeout(() => {
                                cleanupRecording();
                            }, 800);
                        }
                    }
                },
                onerror: (e: ErrorEvent) => {
                    console.error('Live session error:', e);
                    onError('文字起こし中にエラーが発生しました。');
                    cleanupRecording();
                },
                onclose: (e: CloseEvent) => {
                    console.debug('Live session closed');
                    cleanupRecording();
                },
            },
            config: {
                responseModalities: ['AUDIO' as Modality],
                inputAudioTranscription: {},
            },
        });

    } catch (error) {
        console.error("Microphone access denied:", error);
        onError("マイクへのアクセスが拒否されました。");
        setRecordingStatus('idle');
    }
  }, [recordingStatus, cleanupRecording, onTranscriptUpdate, onError]);

  useEffect(() => {
    return () => {
      cleanupRecording();
    };
  }, [cleanupRecording]);

  return {
    recordingStatus,
    startRecording,
    stopRecording
  };
};