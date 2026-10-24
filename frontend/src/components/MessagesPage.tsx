import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare, Radio, Users, ShieldCheck, Zap,
  Search, Info, CheckCircle2, ChevronRight, Filter,
  PhoneCall, Shield, Activity, RefreshCw
} from 'lucide-react';
import {
  useChatStore, CHANNELS, ChannelId, ChatMessage,
  matchesChannel, ChatPhoto
} from '../hooks/useChatStore';
import { ChatBubble } from './ChatBubble';
import { ChatComposer } from './ChatComposer';
import { ImageLightbox, LightboxPhoto } from './ImageLightbox';

interface MessagesPageProps {
  currentUser?: { name: string; role: string; department?: string; station?: string } | null;
  chatStore?: ReturnType<typeof useChatStore>;
}

export const MessagesPage: React.FC<MessagesPageProps> = ({ currentUser, chatStore: externalChatStore }) => {
  // Use passed store or initialize internal one
  const internalStore = useChatStore(currentUser);
  const {
    messages,
    activeChannel,
    setActiveChannel,
    unreadCount,
    unreadByChannel,
    markChannelRead,
    sendMessage,
    isTyping,
    typingUser,
  } = externalChatStore || internalStore;

  const [activePhoto, setActivePhoto] = useState<LightboxPhoto | null>(null);
  const [channelSearch, setChannelSearch] = useState('');
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Mark active channel as read when channel changes
  useEffect(() => {
    markChannelRead(activeChannel);
  }, [activeChannel, markChannelRead]);

  // Filter messages for current channel
  const filteredMessages = messages.filter(m => matchesChannel(m, activeChannel));

  const currentChannelInfo = CHANNELS.find(c => c.id === activeChannel) || CHANNELS[0];

  const filteredChannels = CHANNELS.filter(ch =>
    ch.name.toLowerCase().includes(channelSearch.toLowerCase()) ||
    ch.tag.toLowerCase().includes(channelSearch.toLowerCase())
  );

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: '#F8FAFC',
        overflow: 'hidden',
      }}
    >
      {/* ── Top Header Card ───────────────────────────── */}
      <div
        style={{
          background: '#FFFFFF',
          borderBottom: '1px solid #E2E8F0',
          padding: '14px 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 3px 10px rgba(37,99,235,0.3)',
              flexShrink: 0,
            }}
          >
            <MessageSquare size={20} />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h1
                style={{
                  margin: 0,
                  fontSize: 17,
                  fontWeight: 800,
                  color: '#0F172A',
                  letterSpacing: '-0.02em',
                }}
              >
                Two-Way Station Master Clarification Desk
              </h1>

              {/* Live Status Pill */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '2px 8px',
                  borderRadius: 12,
                  background: '#ECFDF5',
                  border: '1px solid #A7F3D0',
                  color: '#059669',
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: '#10B981',
                  }}
                  className="animate-pulse"
                />
                <span>Live Feed</span>
              </div>

              {/* Message Count Chip */}
              <div
                style={{
                  padding: '2px 9px',
                  borderRadius: 6,
                  background: '#EFF6FF',
                  border: '1px solid #BFDBFE',
                  color: '#1D4ED8',
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                {filteredMessages.length} Messages Logged
              </div>
            </div>

            <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
              Control room and frontline field teams, synchronized in real time • ECR Danapur Division
            </div>
          </div>
        </div>

        {/* Right Info: Statutory Ledger Audit Chip */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              borderRadius: 8,
              background: '#F1F5F9',
              border: '1px solid #E2E8F0',
              fontSize: 11.5,
              color: '#334155',
              fontWeight: 600,
            }}
            title="All chat messages and photo attachments are immutably archived into AWS S3 WORM legal hold"
          >
            <ShieldCheck size={14} color="#059669" />
            <span>Statutory WORM Log Active</span>
          </div>
        </div>
      </div>

      {/* ── Main Content Area: Channels Sidebar + Chat Window ─ */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          overflow: 'hidden',
          padding: '16px 24px',
          gap: 16,
        }}
      >
        {/* ── Left: Channels List (Desktop) ─────────────── */}
        <div
          style={{
            width: 250,
            background: '#FFFFFF',
            borderRadius: 12,
            border: '1px solid #E2E8F0',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            flexShrink: 0,
          }}
          className="hidden md:flex"
        >
          {/* Channel Header & Filter Search */}
          <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid #F1F5F9' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Control Channels
              </div>
              <span style={{ fontSize: 10.5, color: '#64748B', fontWeight: 600 }}>
                {CHANNELS.length} Active
              </span>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: 7,
                padding: '5px 8px',
              }}
            >
              <Search size={13} color="#94A3B8" />
              <input
                type="text"
                placeholder="Filter channels..."
                value={channelSearch}
                onChange={e => setChannelSearch(e.target.value)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  outline: 'none',
                  fontSize: 11.5,
                  color: '#1E293B',
                  width: '100%',
                }}
              />
            </div>
          </div>

          {/* Channel Rows */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
            {filteredChannels.map(ch => {
              const isActive = activeChannel === ch.id;
              const unread = unreadByChannel[ch.id] || 0;

              return (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => setActiveChannel(ch.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: isActive ? '1px solid #BFDBFE' : '1px solid transparent',
                    background: isActive ? '#EFF6FF' : 'transparent',
                    cursor: 'pointer',
                    textAlign: 'left',
                    marginBottom: 4,
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={e => {
                    if (!isActive) e.currentTarget.style.background = '#F8FAFC';
                  }}
                  onMouseLeave={e => {
                    if (!isActive) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 7,
                        background: isActive ? '#DBEAFE' : '#F1F5F9',
                        color: isActive ? '#1D4ED8' : '#64748B',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {ch.id === 'all' && <Users size={14} />}
                      {ch.id === 'operating' && <ShieldCheck size={14} />}
                      {ch.id === 'ohe' && <Zap size={14} />}
                      {ch.id === 'sandt' && <Radio size={14} />}
                      {ch.id === 'civil' && <Activity size={14} />}
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 12.5,
                          fontWeight: isActive ? 700 : 600,
                          color: isActive ? '#1D4ED8' : '#1E293B',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {ch.name}
                      </div>
                      <div
                        style={{
                          fontSize: 10.5,
                          color: '#94A3B8',
                          fontWeight: 500,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {ch.tag}
                      </div>
                    </div>
                  </div>

                  {unread > 0 && (
                    <span
                      style={{
                        background: '#DC2626',
                        color: '#FFFFFF',
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '1px 6px',
                        borderRadius: 10,
                        flexShrink: 0,
                      }}
                    >
                      {unread}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Right: Active Chat Area ───────────────────── */}
        <div
          style={{
            flex: 1,
            background: '#FFFFFF',
            borderRadius: 12,
            border: '1px solid #E2E8F0',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            minWidth: 0,
          }}
        >
          {/* Active Channel Banner / Mobile Channel Pills */}
          <div
            style={{
              padding: '10px 16px',
              background: '#F8FAFC',
              borderBottom: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 10,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Channel:
              </span>
              <span style={{ fontSize: 13, fontWeight: 800, color: '#0F172A' }}>
                {currentChannelInfo.name}
              </span>
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  color: '#2563EB',
                  background: '#EFF6FF',
                  padding: '1px 7px',
                  borderRadius: 4,
                  border: '1px solid #BFDBFE',
                }}
              >
                {currentChannelInfo.tag}
              </span>
            </div>

            <div style={{ fontSize: 11, color: '#64748B', fontStyle: 'italic' }}>
              {currentChannelInfo.description}
            </div>
          </div>

          {/* ── Chat Messages Stream Container ────────────── */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '20px 24px',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              background: '#FAFBFD',
            }}
          >
            {/* Date Separator Pill */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '4px 0',
              }}
            >
              <div
                style={{
                  padding: '3px 12px',
                  borderRadius: 12,
                  background: '#E2E8F0',
                  color: '#475569',
                  fontSize: 10.5,
                  fontWeight: 700,
                  letterSpacing: '0.03em',
                }}
              >
                TODAY • STATUTORY FEED ARCHIVE
              </div>
            </div>

            {/* Empty State */}
            {filteredMessages.length === 0 && (
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#94A3B8',
                  padding: 40,
                  textAlign: 'center',
                  gap: 10,
                }}
              >
                <div
                  style={{
                    width: 50,
                    height: 50,
                    borderRadius: '50%',
                    background: '#F1F5F9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#64748B',
                  }}
                >
                  <MessageSquare size={24} />
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#334155' }}>
                  No messages in {currentChannelInfo.name} yet
                </div>
                <div style={{ fontSize: 12, maxWidth: 360, lineHeight: 1.4 }}>
                  Say hello to the control desk or attach photo evidence using the composer below.
                </div>
              </div>
            )}

            {/* Message Bubbles */}
            {filteredMessages.map(msg => {
              const isMe =
                msg.sender.toLowerCase().includes('ravi amish') ||
                msg.sender.toLowerCase().includes('station master desk') ||
                msg.role === 'CURRENT_USER';

              return (
                <ChatBubble
                  key={msg.id}
                  message={msg}
                  isMe={isMe}
                  onPhotoClick={photo => setActivePhoto(photo)}
                />
              );
            })}

            {/* Typing Indicator */}
            {isTyping && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  alignSelf: 'flex-start',
                  background: '#F1F5F9',
                  padding: '6px 14px',
                  borderRadius: 16,
                  color: '#475569',
                  fontSize: 11.5,
                  fontWeight: 600,
                  animation: 'fadeIn 0.2s ease-out',
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: '#2563EB',
                  }}
                  className="animate-bounce"
                />
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: '#2563EB',
                    animationDelay: '0.15s',
                  }}
                  className="animate-bounce"
                />
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: '#2563EB',
                    animationDelay: '0.3s',
                  }}
                  className="animate-bounce"
                />
                <span>{typingUser || 'Station Master'} is typing...</span>
              </div>
            )}

            <div ref={chatBottomRef} />
          </div>

          {/* ── Fixed Bottom Composer Card ────────────────── */}
          <div
            style={{
              padding: '12px 18px',
              background: '#FFFFFF',
              borderTop: '1px solid #E2E8F0',
            }}
          >
            <ChatComposer
              onSendMessage={sendMessage}
              activeChannel={activeChannel}
              placeholder={`Ask Station Master or tag ${currentChannelInfo.tag}...`}
            />
          </div>
        </div>
      </div>

      {/* ── Full-Screen Image Lightbox Modal ─────────── */}
      <ImageLightbox
        photo={activePhoto}
        onClose={() => setActivePhoto(null)}
      />
    </div>
  );
};

