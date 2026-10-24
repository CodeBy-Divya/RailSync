import React from 'react';
import { Check, CheckCheck, Clock, AlertCircle, Shield, MapPin, ZoomIn } from 'lucide-react';
import { ChatMessage, ChatPhoto } from '../hooks/useChatStore';

interface ChatBubbleProps {
  message: ChatMessage;
  isMe: boolean;
  onPhotoClick: (photo: ChatPhoto) => void;
}

// Generate distinct avatar background and text color based on sender role
const getAvatarStyle = (role: string, sender: string) => {
  const roleU = (role || '').toUpperCase();
  const senderU = (sender || '').toUpperCase();

  if (senderU.includes('STATION MASTER') || roleU.includes('STATION_MASTER')) {
    return { bg: '#EFF6FF', border: '#BFDBFE', text: '#1D4ED8', badge: 'SM' };
  }
  if (senderU.includes('TPC') || roleU.includes('TPC')) {
    return { bg: '#FEF3C7', border: '#FDE68A', text: '#B45309', badge: 'TPC' };
  }
  if (senderU.includes('OHE') || senderU.includes('FIELD') || roleU.includes('FIELD_SUPERVISOR')) {
    return { bg: '#F0FDF4', border: '#BBF7D0', text: '#15803D', badge: 'OHE' };
  }
  if (senderU.includes('CONTROLLER') || roleU.includes('CONTROLLER')) {
    return { bg: '#FAF5FF', border: '#E9D5FF', text: '#7E22CE', badge: 'CTRL' };
  }
  return { bg: '#F1F5F9', border: '#E2E8F0', text: '#475569', badge: 'RA' };
};

// Render message text with highlighted @mention tag chips
const renderTextWithMentions = (text: string) => {
  if (!text) return null;

  // Split by whitespace while preserving tokens
  const tokens = text.split(/(\s+)/);

  return tokens.map((token, index) => {
    const trimmed = token.trim();
    if (trimmed.startsWith('@')) {
      const tagUpper = trimmed.toUpperCase();
      let tagBg = '#EFF6FF';
      let tagColor = '#1D4ED8';
      let tagBorder = '#BFDBFE';

      if (tagUpper.includes('OHE')) {
        tagBg = '#FEF3C7';
        tagColor = '#B45309';
        tagBorder = '#FDE68A';
      } else if (tagUpper.includes('S_AND_T') || tagUpper.includes('S&T') || tagUpper.includes('SIGNAL')) {
        tagBg = '#FAF5FF';
        tagColor = '#7E22CE';
        tagBorder = '#E9D5FF';
      } else if (tagUpper.includes('CIVIL') || tagUpper.includes('P_WAY') || tagUpper.includes('PWAY')) {
        tagBg = '#ECFDF5';
        tagColor = '#047857';
        tagBorder = '#A7F3D0';
      }

      return (
        <span
          key={index}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '1px 6px',
            margin: '0 2px',
            borderRadius: 4,
            fontSize: '0.88em',
            fontWeight: 700,
            background: tagBg,
            color: tagColor,
            border: `1px solid ${tagBorder}`,
            letterSpacing: '0.01em',
          }}
        >
          {token}
        </span>
      );
    }
    return <span key={index}>{token}</span>;
  });
};

export const ChatBubble: React.FC<ChatBubbleProps> = ({ message, isMe, onPhotoClick }) => {
  const avatar = getAvatarStyle(message.role, message.sender);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        alignSelf: isMe ? 'flex-end' : 'flex-start',
        maxWidth: '82%',
        flexDirection: isMe ? 'row-reverse' : 'row',
        animation: 'fadeIn 0.15s ease-out',
      }}
    >
      {/* Sender Initials Avatar */}
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          background: isMe ? '#DBEAFE' : avatar.bg,
          border: `1.5px solid ${isMe ? '#93C5FD' : avatar.border}`,
          color: isMe ? '#1D4ED8' : avatar.text,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 10.5,
          fontWeight: 800,
          flexShrink: 0,
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          letterSpacing: '-0.02em',
        }}
        title={`${message.sender} (${message.role})`}
      >
        {isMe ? 'ME' : avatar.badge}
      </div>

      {/* Bubble Container */}
      <div
        style={{
          background: isMe ? '#EFF6FF' : '#FFFFFF',
          border: isMe ? '1.5px solid #BFDBFE' : '1px solid #E2E8F0',
          borderRadius: isMe ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
          padding: '12px 16px',
          boxShadow: isMe
            ? '0 2px 8px rgba(37,99,235,0.08)'
            : '0 2px 8px rgba(0,0,0,0.04)',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          minWidth: 160,
          maxWidth: '100%',
        }}
      >
        {/* Header: Sender name, role pill & timestamp */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            borderBottom: isMe ? '1px solid rgba(191,219,254,0.5)' : '1px solid #F1F5F9',
            paddingBottom: 5,
            marginBottom: 2,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: isMe ? '#1D4ED8' : '#0F172A',
                letterSpacing: '-0.01em',
              }}
            >
              {message.sender}
            </span>
            {message.role && !isMe && (
              <span
                style={{
                  fontSize: 9.5,
                  fontWeight: 600,
                  color: avatar.text,
                  background: avatar.bg,
                  border: `1px solid ${avatar.border}`,
                  padding: '1px 6px',
                  borderRadius: 4,
                  textTransform: 'uppercase',
                }}
              >
                {message.role.replace(/_/g, ' ')}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 10, color: '#94A3B8', fontWeight: 500 }}>
              {message.timestamp}
            </span>
            <span title="Statutory Ledger Verified" style={{ display: 'flex' }}>
              <Shield size={10} color="#94A3B8" />
            </span>
          </div>
        </div>

        {/* Message Text */}
        {message.text && (
          <div
            style={{
              fontSize: 12.5,
              color: '#1E293B',
              lineHeight: 1.5,
              wordBreak: 'break-word',
            }}
          >
            {renderTextWithMentions(message.text)}
          </div>
        )}

        {/* Attached Photos Grid */}
        {message.photos && message.photos.length > 0 && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: message.photos.length > 1 ? 'repeat(2, 1fr)' : '1fr',
              gap: 8,
              marginTop: message.text ? 4 : 0,
            }}
          >
            {message.photos.map(photo => (
              <div
                key={photo.id}
                role="button"
                tabIndex={0}
                onClick={() => onPhotoClick(photo)}
                onKeyDown={e => e.key === 'Enter' && onPhotoClick(photo)}
                style={{
                  position: 'relative',
                  borderRadius: 8,
                  overflow: 'hidden',
                  border: '1px solid #CBD5E1',
                  background: '#0F172A',
                  cursor: 'pointer',
                }}
                title="Click to view full inspection photo"
              >
                <img
                  src={photo.url}
                  alt={photo.caption || 'Field evidence'}
                  style={{
                    width: '100%',
                    height: message.photos && message.photos.length > 1 ? 130 : 180,
                    objectFit: 'cover',
                    display: 'block',
                    transition: 'transform 0.2s ease',
                  }}
                />

                {/* Hover overlay with zoom hint */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(15, 23, 42, 0.35)',
                    opacity: 0,
                    transition: 'opacity 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FFFFFF',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                  onMouseLeave={e => (e.currentTarget.style.opacity = '0')}
                >
                  <div
                    style={{
                      background: 'rgba(0,0,0,0.6)',
                      padding: '4px 8px',
                      borderRadius: 6,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: 11,
                    }}
                  >
                    <ZoomIn size={14} />
                    <span>View Proof</span>
                  </div>
                </div>

                {/* Watermark Strip */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    background: 'linear-gradient(0deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0) 100%)',
                    padding: '12px 8px 5px',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: 9.5,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontWeight: 600 }}>
                    <MapPin size={10} color="#60A5FA" />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>
                      {photo.geo?.chainage || 'Danapur ECR'}
                    </span>
                  </div>
                  <div style={{ color: '#10B981', fontWeight: 700, fontSize: 9 }}>
                    ✓ Geo-Anchored
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer: Delivery Ticks */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 4,
            fontSize: 10,
            color: '#94A3B8',
            marginTop: 2,
          }}
        >
          {isMe && (
            <>
              {message.status === 'sending' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 3, color: '#3B82F6' }}>
                  <Clock size={11} className="animate-spin" />
                  <span>Sending...</span>
                </div>
              )}
              {message.status === 'sent' && (
                <span title="Sent to control desk" style={{ display: 'flex' }}>
                  <Check size={13} color="#94A3B8" />
                </span>
              )}
              {message.status === 'delivered' && (
                <span title="Delivered to Station Master & TPC" style={{ display: 'flex' }}>
                  <CheckCheck size={14} color="#64748B" />
                </span>
              )}
              {message.status === 'read' && (
                <span title="Read by Station Master Desk" style={{ display: 'flex' }}>
                  <CheckCheck size={14} color="#2563EB" />
                </span>
              )}
              {message.status === 'failed' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 3, color: '#DC2626' }}>
                  <AlertCircle size={11} />
                  <span>Failed</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
