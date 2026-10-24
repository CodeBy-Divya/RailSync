import React, { useState, useRef, useEffect } from 'react';
import {
  Send, Mic, MicOff, Square, Globe, AlertCircle, Sparkles
} from 'lucide-react';
import { PhotoPicker, PhotoThumbnailsStrip } from './PhotoPicker';
import { ChatPhoto, ChannelId } from '../hooks/useChatStore';
import { useSpeechToText, SpeechLanguage } from '../hooks/useSpeechToText';

interface ChatComposerProps {
  onSendMessage: (data: {
    text: string;
    taggedDepts: string[];
    photos: ChatPhoto[];
    channel?: ChannelId;
  }) => Promise<any> | void;
  activeChannel?: ChannelId;
  placeholder?: string;
  disabled?: boolean;
}

const TAG_CHIPS = [
  { label: '@OPERATING',   name: 'Operating',    color: '#1D4ED8', bg: '#EFF6FF', border: '#BFDBFE', channel: 'operating' as ChannelId },
  { label: '@OHE',         name: 'OHE',          color: '#B45309', bg: '#FEF3C7', border: '#FDE68A', channel: 'ohe' as ChannelId },
  { label: '@S_AND_T',     name: 'S&T',          color: '#7E22CE', bg: '#FAF5FF', border: '#E9D5FF', channel: 'sandt' as ChannelId },
  { label: '@CIVIL_P_WAY', name: 'Civil / P-Way', color: '#047857', bg: '#ECFDF5', border: '#A7F3D0', channel: 'civil' as ChannelId },
];

export const ChatComposer: React.FC<ChatComposerProps> = ({
  onSendMessage,
  activeChannel = 'all',
  placeholder = 'Ask Station Master or tag @OPERATING...',
  disabled = false,
}) => {
  const [text, setText] = useState('');
  const [photos, setPhotos] = useState<ChatPhoto[]>([]);
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Voice dictation hook
  const {
    isListening,
    transcript,
    error: speechError,
    isSupported: isSpeechSupported,
    language: speechLang,
    setLanguage: setSpeechLang,
    startListening,
    stopListening,
    clearError: clearSpeechError,
  } = useSpeechToText((liveTranscript) => {
    // Append or update live transcribed words to text
    setText(prev => {
      // If text already ended with something, append neatly
      return prev ? `${prev} ${liveTranscript}`.trim() : liveTranscript;
    });
  });

  // Adjust textarea height automatically
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [text]);

  // Insert tag into text box
  const handleInsertTag = (tag: string) => {
    setText(prev => {
      if (prev.includes(tag)) return prev;
      return prev ? `${prev} ${tag} ` : `${tag} `;
    });
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 50);
  };

  // Detect active tags present in text
  const detectedTags = TAG_CHIPS.filter(chip => text.toUpperCase().includes(chip.label.toUpperCase())).map(c => c.label);

  const canSend = (text.trim().length > 0 || photos.length > 0) && !isSending && !disabled;

  const handleSend = async () => {
    if (!canSend) return;

    if (isListening) {
      stopListening();
    }

    setIsSending(true);
    try {
      await onSendMessage({
        text: text.trim(),
        taggedDepts: detectedTags,
        photos,
        channel: activeChannel,
      });

      // Clear composer state
      setText('');
      setPhotos([]);
      clearSpeechError();
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch (err) {
      console.error('Failed to send message', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleSpeechLang = () => {
    const next = speechLang === 'en-IN' ? 'hi-IN' : 'en-IN';
    setSpeechLang(next as SpeechLanguage);
  };

  return (
    <div
      style={{
        background: '#FFFFFF',
        borderRadius: 14,
        border: '1.5px solid #CBD5E1',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        transition: 'border-color 0.15s ease',
      }}
    >
      {/* ── 1. Department Tag Chips Row ───────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '8px 14px 6px',
          background: '#F8FAFC',
          borderBottom: '1px solid #E2E8F0',
          overflowX: 'auto',
          scrollbarWidth: 'none',
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 700, color: '#64748B', whiteSpace: 'nowrap' }}>
          Tag Channel:
        </span>

        {TAG_CHIPS.map(chip => {
          const isSelected = text.toUpperCase().includes(chip.label.toUpperCase());
          return (
            <button
              key={chip.label}
              type="button"
              onClick={() => handleInsertTag(chip.label)}
              aria-label={`Tag ${chip.name} department`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '3px 9px',
                borderRadius: 6,
                border: isSelected ? `1.5px solid ${chip.color}` : `1px solid ${chip.border}`,
                background: isSelected ? chip.bg : '#FFFFFF',
                color: isSelected ? chip.color : '#475569',
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
                boxShadow: isSelected ? `0 1px 3px ${chip.bg}` : '0 1px 2px rgba(0,0,0,0.02)',
              }}
            >
              <span>{chip.label}</span>
              {isSelected && <span style={{ fontSize: 9 }}>✓</span>}
            </button>
          );
        })}
      </div>

      {/* ── 2. Photo Thumbnails Strip (if photos attached) ─ */}
      <PhotoThumbnailsStrip
        photos={photos}
        onRemove={id => setPhotos(photos.filter(p => p.id !== id))}
        onCaptionChange={(id, cap) =>
          setPhotos(photos.map(p => (p.id === id ? { ...p, caption: cap } : p)))
        }
      />

      {/* ── 3. Voice Dictation Listening Indicator ─────── */}
      {isListening && (
        <div
          role="status"
          aria-live="polite"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 14px',
            background: '#FEF2F2',
            borderBottom: '1px solid #FECACA',
            color: '#B91C1C',
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: '#DC2626',
              }}
              className="animate-ping"
            />
            <span>
              Listening in {speechLang === 'en-IN' ? 'English (India)' : 'हिन्दी (Hindi)'}... Speak now
            </span>
          </div>

          <button
            type="button"
            onClick={stopListening}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 10px',
              borderRadius: 6,
              background: '#DC2626',
              color: '#FFFFFF',
              border: 'none',
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <Square size={11} fill="#FFFFFF" />
            <span>Stop Recording</span>
          </button>
        </div>
      )}

      {/* ── 4. Speech Error Banner (if any) ────────────── */}
      {speechError && (
        <div
          role="alert"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '6px 14px',
            background: '#FFFBEB',
            borderBottom: '1px solid #FDE68A',
            color: '#92400E',
            fontSize: 11.5,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <AlertCircle size={14} color="#D97706" />
            <span>{speechError}</span>
          </div>
          <button
            type="button"
            onClick={clearSpeechError}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: 11,
              color: '#B45309',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ── 5. Main Composer Row ──────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 10,
          padding: '10px 14px',
          background: '#FFFFFF',
        }}
      >
        {/* Photo Picker Menu Button */}
        <PhotoPicker
          photos={photos}
          onPhotosChange={setPhotos}
          disabled={disabled || isSending}
        />

        {/* Text Input Area */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || isSending}
          rows={1}
          style={{
            flex: 1,
            border: 'none',
            background: 'transparent',
            outline: 'none',
            fontSize: 13,
            color: '#0F172A',
            lineHeight: 1.45,
            resize: 'none',
            maxHeight: 120,
            fontFamily: 'inherit',
            padding: '7px 4px',
          }}
        />

        {/* Speech Language Toggle Button (EN / HI) */}
        {isSpeechSupported && (
          <button
            type="button"
            onClick={toggleSpeechLang}
            title={`Toggle Voice Dictation Language: Current is ${speechLang === 'en-IN' ? 'English' : 'Hindi'}`}
            aria-label={`Toggle Speech Language: currently ${speechLang === 'en-IN' ? 'English' : 'Hindi'}`}
            style={{
              padding: '6px 8px',
              borderRadius: 6,
              border: '1px solid #CBD5E1',
              background: '#F8FAFC',
              color: '#334155',
              fontSize: 11,
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 3,
            }}
          >
            <Globe size={12} color="#64748B" />
            <span>{speechLang === 'en-IN' ? 'EN' : 'HI'}</span>
          </button>
        )}

        {/* Microphone Button */}
        {isSpeechSupported && (
          <button
            type="button"
            onClick={() => {
              if (isListening) stopListening();
              else startListening();
            }}
            disabled={disabled || isSending}
            aria-label={isListening ? 'Stop voice dictation' : 'Start voice dictation'}
            title={isListening ? 'Stop Listening' : `Click to speak (${speechLang === 'en-IN' ? 'English' : 'Hindi'})`}
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              border: isListening ? '1.5px solid #DC2626' : '1px solid #CBD5E1',
              background: isListening ? '#FEF2F2' : '#FFFFFF',
              color: isListening ? '#DC2626' : '#475569',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: disabled || isSending ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease',
              boxShadow: isListening ? '0 0 0 2px rgba(220,38,38,0.2)' : '0 1px 2px rgba(0,0,0,0.02)',
            }}
          >
            {isListening ? (
              <Mic size={17} className="animate-pulse text-red-600" />
            ) : (
              <Mic size={17} />
            )}
          </button>
        )}

        {/* Blue Send Button */}
        <button
          type="button"
          onClick={handleSend}
          disabled={!canSend}
          aria-label="Send message"
          title="Send message (Enter)"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            height: 36,
            padding: '0 16px',
            borderRadius: 8,
            border: 'none',
            background: canSend
              ? 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)'
              : '#E2E8F0',
            color: canSend ? '#FFFFFF' : '#94A3B8',
            fontSize: 13,
            fontWeight: 700,
            cursor: canSend ? 'pointer' : 'not-allowed',
            transition: 'all 0.15s ease',
            boxShadow: canSend ? '0 2px 6px rgba(37,99,235,0.3)' : 'none',
          }}
        >
          <Send size={15} />
          <span>Send</span>
        </button>
      </div>
    </div>
  );
};

