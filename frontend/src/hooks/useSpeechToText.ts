import { useState, useEffect, useRef, useCallback } from 'react';

// Declaration for Web Speech API
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  }
}

export type SpeechLanguage = 'en-IN' | 'hi-IN';

export interface UseSpeechToTextReturn {
  isListening: boolean;
  transcript: string;
  error: string | null;
  isSupported: boolean;
  language: SpeechLanguage;
  setLanguage: (lang: SpeechLanguage) => void;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
  clearError: () => void;
}

export function useSpeechToText(
  onTranscriptChange?: (text: string, isFinal: boolean) => void
): UseSpeechToTextReturn {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguageState] = useState<SpeechLanguage>('en-IN');
  const [isSupported, setIsSupported] = useState(false);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const activeLangRef = useRef<SpeechLanguage>('en-IN');
  activeLangRef.current = language;

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    setIsSupported(Boolean(SpeechRecognition));
  }, []);

  const clearError = useCallback(() => setError(null), []);
  const resetTranscript = useCallback(() => setTranscript(''), []);

  const setLanguage = useCallback((newLang: SpeechLanguage) => {
    setLanguageState(newLang);
    if (recognitionRef.current && isListening) {
      // Re-start recognition with new language
      recognitionRef.current.abort();
      setTimeout(() => {
        startListening();
      }, 100);
    }
  }, [isListening]);

  const startListening = useCallback(() => {
    setError(null);
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError('Voice dictation is not supported in this browser. Please use Google Chrome or Edge.');
      return;
    }

    try {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = activeLangRef.current;

      recognition.onstart = () => {
        setIsListening(true);
        setError(null);
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interimText = '';
        let finalText = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const item = event.results[i];
          const text = item[0]?.transcript || '';
          if (item.isFinal) {
            finalText += text + ' ';
          } else {
            interimText += text;
          }
        }

        const combined = (finalText || interimText).trim();
        if (combined) {
          setTranscript(combined);
          if (onTranscriptChange) {
            onTranscriptChange(combined, Boolean(finalText));
          }
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setError('Microphone permission denied. Please allow microphone access in your browser settings.');
        } else if (event.error === 'no-speech') {
          setError('No speech detected. Please speak clearly into your microphone.');
        } else if (event.error === 'network') {
          setError('Network error during speech recognition. Please check your connection.');
        } else if (event.error !== 'aborted') {
          setError(`Speech recognition error: ${event.error}`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      setIsListening(false);
      setError(err?.message || 'Failed to start microphone recognition.');
    }
  }, [onTranscriptChange]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  return {
    isListening,
    transcript,
    error,
    isSupported,
    language,
    setLanguage,
    startListening,
    stopListening,
    resetTranscript,
    clearError,
  };
}

