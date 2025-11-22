import { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Session } from '@google/genai';
import { getConfig } from '../utils/config';

export type RecordingStatus = 'idle' | 'preparing' | 'recording' | 'transcribing';

interface UseLiveInputProps {
  onTranscriptUpdate: (text: string) => void;
  onError: (message: string) => void;
}

export const useLiveInput = ({ onTranscriptUpdate, onError }: UseLiveInputProps) => {
  const [recordingStatus, setRecordingStatus] = useState<RecordingStatus>('idle');
  
  const recordingStatusRef = useRef(recordingStatus);
  const sessionRef = useRef<Session | null>(null);  // Changed to Session directly
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const audioBufferRef = useRef<Int16Array>(new Int16Array(2048));  // Match sample: 2048 buffer
  const bufferWriteIndexRef = useRef<number>(0);
  const transcriptRef = useRef('');  // Confirmed (final) text only
  const interimTextRef = useRef('');  // Temporary interim text
  const finalTranscriptTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    recordingStatusRef.current = recordingStatus;
  }, [recordingStatus]);

  const cleanupRecording = useCallback(() => {
    console.log('[Recording] cleanupRecording called');
    
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

    if (sessionRef.current) {
        sessionRef.current.close();
        sessionRef.current = null;
    }

    setRecordingStatus('idle');
  }, []);

  const stopRecording = useCallback(() => {
    console.log('[Recording] stopRecording called, current status:', recordingStatusRef.current);
    
    if (recordingStatusRef.current === 'idle' || recordingStatusRef.current === 'transcribing') {
      console.log('[Recording] Ignoring stopRecording - already idle or transcribing');
      return;
    }

    // Stop sending audio immediately
    if (scriptProcessorRef.current) {
        scriptProcessorRef.current.disconnect();
        scriptProcessorRef.current = null;
    }
    streamRef.current?.getTracks().forEach(track => track.stop());
    
    // Change to transcribing status and wait for final transcript
    if ((recordingStatusRef.current === 'recording' || recordingStatusRef.current === 'preparing') && sessionRef.current) {
        setRecordingStatus('transcribing');
        console.log('[Recording] Stopped recording, waiting for final transcription...');
        
        // Set timeout for final transcript
        if (finalTranscriptTimeoutRef.current) clearTimeout(finalTranscriptTimeoutRef.current);
        finalTranscriptTimeoutRef.current = window.setTimeout(() => {
            console.log('[Recording] Timeout waiting for transcription, cleaning up');
            // If we have accumulated transcript, use it
            if (transcriptRef.current || interimTextRef.current) {
                const finalText = transcriptRef.current + interimTextRef.current;
                if (finalText) {
                    onTranscriptUpdate(finalText);
                }
            }
            cleanupRecording();
        }, 3000); // Wait up to 3 seconds for final transcript
    } else {
        cleanupRecording();
    }
  }, [cleanupRecording, onTranscriptUpdate]);

  const startRecording = useCallback(async () => {
    console.log('[Recording] startRecording called, current status:', recordingStatus);
    if (recordingStatus !== 'idle') {
      console.log('[Recording] Ignoring startRecording - status is not idle');
      return;
    }
    
    console.log('[Recording] Starting recording...');
    transcriptRef.current = '';
    interimTextRef.current = '';  // Reset interim text
    setRecordingStatus('preparing');
    onTranscriptUpdate('マイクの許可を待っています...');

    try {
        console.log('[Recording] Requesting microphone permission...');
        const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                sampleRate: 16000,
            }
        });
        console.log('[Recording] Microphone permission granted');
        
        if ((recordingStatusRef.current as RecordingStatus) === 'idle') {
            console.log('[Recording] Cancelled after getUserMedia');
            stream.getTracks().forEach(track => track.stop());
            return;
        }

        streamRef.current = stream;
        onTranscriptUpdate('AIに接続しています...');

        // Get ephemeral token or API key
        let ai;
        const { GoogleGenAI } = await import('@google/genai');
        
        try {
            console.log('[Recording] Attempting to get ephemeral token...');
            const tokenResponse = await fetch('/api/ephemeral-token', { method: 'POST' });
            if (tokenResponse.ok) {
                const tokenData = await tokenResponse.json();
                const ephemeralToken = tokenData.token;
                console.log('[Recording] Ephemeral token obtained');
                
                ai = new GoogleGenAI({ 
                    apiKey: ephemeralToken,
                    httpOptions: { apiVersion: 'v1alpha' }
                });
            } else {
                throw new Error('Ephemeral token not available');
            }
        } catch (error) {
            console.warn('[Recording] Ephemeral token failed, falling back to API key:', error);
            const config = await getConfig();
            ai = new GoogleGenAI({ 
                apiKey: config.API_KEY || '',
                httpOptions: { apiVersion: 'v1alpha' }
            });
        }
        
        if ((recordingStatusRef.current as RecordingStatus) === 'idle') {
            console.log('[Recording] Cancelled after getAi');
            stream.getTracks().forEach(track => track.stop());
            return;
        }

        // Connect to Live API with proper config (based on sample code)
        const session = await ai.live.connect({
            model: 'models/gemini-2.5-flash-native-audio-preview-09-2025',
            callbacks: {
                onopen: () => {
                    console.log('[Recording] Live session opened');
                    if (recordingStatusRef.current !== 'preparing') return;

                    setRecordingStatus('recording');
                    console.log('[Recording] Status set to recording');
                    onTranscriptUpdate('お話しください...');

                    // Set up audio streaming (matching sample code)
                    const context = new ((window as any).AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
                    audioContextRef.current = context;
                    
                    const source = context.createMediaStreamSource(stream);
                    const scriptProcessor = context.createScriptProcessor(2048, 1, 1);  // Match sample: 2048
                    scriptProcessorRef.current = scriptProcessor;

                    scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                        if (recordingStatusRef.current !== 'recording' || !sessionRef.current) return;
                        
                        const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                        const buffer = audioBufferRef.current;
                        let writeIndex = bufferWriteIndexRef.current;
                        
                        // Process chunk like sample code
                        for (let i = 0; i < inputData.length; i++) {
                            // Convert float32 -1 to 1 to int16 -32768 to 32767
                            buffer[writeIndex++] = inputData[i] * 32768;
                            
                            // Send buffer when full (2048 samples)
                            if (writeIndex >= buffer.length) {
                                const int16Buffer = buffer.slice(0, writeIndex);
                                const base64 = btoa(String.fromCharCode(...new Uint8Array(int16Buffer.buffer)));
                                
                                // Match sample code: send as media object
                                sessionRef.current.sendRealtimeInput({
                                    media: {
                                        mimeType: 'audio/pcm;rate=16000',
                                        data: base64
                                    }
                                });
                                
                                writeIndex = 0;  // Reset buffer
                            }
                        }
                        
                        bufferWriteIndexRef.current = writeIndex;
                    };

                    source.connect(scriptProcessor);
                    scriptProcessor.connect(context.destination);
                },
                onmessage: (message: LiveServerMessage) => {
                    console.log('[Recording] Message received:', message);
                    
                    // Check for input transcription (user's speech)
                    if (message.serverContent?.inputTranscription) {
                        const transcription = message.serverContent.inputTranscription;
                        const text = transcription.text;
                        const isFinal = (transcription as any).isFinal ?? false;
                        
                        if (text) {
                            console.log('[Recording] Input transcription:', text, 'isFinal:', isFinal);
                            
                            if (isFinal) {
                                // Final transcription - append to confirmed text and clear interim
                                transcriptRef.current += text;
                                interimTextRef.current = '';  // Clear interim
                                
                                console.log('[Recording] Final transcript:', transcriptRef.current);
                                
                                // Always update display with confirmed text
                                onTranscriptUpdate(transcriptRef.current);
                                
                                // If we're in transcribing state, this is the last piece - clean up
                                if (recordingStatusRef.current === 'transcribing') {
                                    if (finalTranscriptTimeoutRef.current) clearTimeout(finalTranscriptTimeoutRef.current);
                                    finalTranscriptTimeoutRef.current = window.setTimeout(() => {
                                        console.log('[Recording] Final transcription received, cleaning up');
                                        cleanupRecording();
                                    }, 300);
                                }
                            } else {
                                // Interim transcription - accumulate like sample code
                                // API sends incremental text, so we need to append
                                interimTextRef.current += text;
                                const combinedText = transcriptRef.current + interimTextRef.current;
                                onTranscriptUpdate(combinedText);
                                console.log('[Recording] Interim transcript:', combinedText);
                            }
                        }
                    }

                    // Check for turn complete
                    if (message.serverContent?.turnComplete) {
                        console.log('[Recording] Turn complete');
                    }
                },
                onerror: (e: ErrorEvent) => {
                    console.error('[Recording] Live session error:', e);
                    onError('文字起こし中にエラーが発生しました。');
                    cleanupRecording();
                },
                onclose: (e: CloseEvent) => {
                    console.log('[Recording] Live session closed:', e);
                    cleanupRecording();
                },
            },
            config: {
                responseModalities: ['AUDIO' as Modality],  // Match sample: AUDIO only
                inputAudioTranscription: {},  // Enable input transcription
                outputAudioTranscription: {},  // Enable output transcription
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: {
                            voiceName: 'Aoede',  // Japanese female voice
                        },
                    },
                },
            },
        });
        
        sessionRef.current = session;  // Store session directly

    } catch (error: any) {
        console.error('[Recording] Error in startRecording:', error);
        onError(error.message || 'マイクへのアクセスが拒否されました。');
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
