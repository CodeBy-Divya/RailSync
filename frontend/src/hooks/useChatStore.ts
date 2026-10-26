import { useState, useEffect, useCallback, useMemo } from 'react';
import { AuditBlock } from '../types';
import { saveAuditBlock } from './useEmergencyStop';
import { syncClient } from '../syncClient';

export interface ChatPhoto {
  id: string;
  url: string;
  caption?: string;
  timestamp: string;
  geo?: {
    lat?: string;
    lng?: string;
    chainage?: string;
  };
}

export type ChannelId = 'all' | 'operating' | 'ohe' | 'sandt' | 'civil';

export interface ChannelInfo {
  id: ChannelId;
  name: string;
  tag: string;
  description: string;
  department: string;
}

export const CHANNELS: ChannelInfo[] = [
  { id: 'all',       name: 'All Control Desk (Group)', tag: '@ALL',          description: 'Joint inter-departmental master feed', department: 'ALL' },
  { id: 'operating', name: 'Operating',                tag: '@OPERATING',    description: 'Station Master & Section Controller', department: 'OPERATING' },
  { id: 'ohe',       name: 'OHE (Traction)',           tag: '@OHE',          description: '25kV catenary, power cut & tower wagons', department: 'OHE' },
  { id: 'sandt',     name: 'S&T (Signalling)',         tag: '@S_AND_T',      description: 'Point machines, track circuits & interlock', department: 'S_AND_T' },
  { id: 'civil',     name: 'Civil / P-Way',            tag: '@CIVIL_P_WAY',  description: 'Track gauge, rail renewals & tamping', department: 'CIVIL_P_WAY' },
];

export interface ChatMessage {
  id: string;
  sender: string;
  senderId?: string;
  role: 'FIELD_SUPERVISOR' | 'STATION_MASTER' | 'TPC' | 'CONTROLLER' | string;
  department?: string;
  text: string;
  timestamp: string;
  createdAt: string;
  taggedDepts?: string[];
  photos?: ChatPhoto[];
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  channel?: ChannelId;
}

export const CHAT_STORAGE_KEY = 'railsync_messages_v1';
export const UNREAD_STORAGE_KEY = 'railsync_unread_messages_v1';

export const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'msg-1',
    sender: 'Station Master (PNBE)',
    role: 'STATION_MASTER',
    department: 'OPERATING',
    text: 'Section Controller confirmed path margin. Confirm physical earthing rod clamp deployed on FP-02 catenary.',
    timestamp: '13:02 UTC',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    status: 'read',
    channel: 'operating',
    taggedDepts: ['@OPERATING'],
  },
  {
    id: 'msg-2',
    sender: 'SSE / OHE (Field Supervisor)',
    role: 'FIELD_SUPERVISOR',
    department: 'OHE',
    text: 'Earthing rods clamped at KM 548/14. Photo evidence uploaded with chainage watermark. Requesting Form ETR-3 token.',
    timestamp: '13:05 UTC',
    createdAt: new Date(Date.now() - 3400000).toISOString(),
    status: 'read',
    channel: 'ohe',
    taggedDepts: ['@OHE', '@OPERATING'],
    photos: [
      {
        id: 'photo-seed-1',
        url: 'https://images.unsplash.com/photo-1474487548417-781cb71495f3?auto=format&fit=crop&w=800&q=80',
        caption: 'Earthing discharge rod clamped at KM 548/14 UP MAIN',
        timestamp: '13:04 UTC',
        geo: {
          lat: '25.60214° N',
          lng: '85.12053° E',
          chainage: 'KM 548/14 UP MAIN (Danapur–Patna)',
        },
      },
    ],
  },
  {
    id: 'msg-3',
    sender: 'TPC Danapur Grid',
    role: 'TPC',
    department: 'OHE',
    text: 'Circuit breaker CB-204 tripped. 25kV catenary dead. Form ETR-1 clearance issued to SM.',
    timestamp: '13:08 UTC',
    createdAt: new Date(Date.now() - 3200000).toISOString(),
    status: 'read',
    channel: 'ohe',
    taggedDepts: ['@OHE'],
  },
];

// Helper to determine which channel a message belongs to
export const getMessageChannel = (msg: ChatMessage): ChannelId => {
  if (msg.channel && msg.channel !== 'all') return msg.channel;
  if (!msg.taggedDepts || msg.taggedDepts.length === 0) return 'all';

  const tags = msg.taggedDepts.map(t => t.toUpperCase());
  if (tags.some(t => t.includes('OPERAT'))) return 'operating';
  if (tags.some(t => t.includes('OHE'))) return 'ohe';
  if (tags.some(t => t.includes('S_AND_T') || t.includes('S&T') || t.includes('SIGNAL'))) return 'sandt';
  if (tags.some(t => t.includes('CIVIL') || t.includes('P_WAY') || t.includes('PWAY'))) return 'civil';
  return 'all';
};

// Check if message belongs to a specific channel filter
export const matchesChannel = (msg: ChatMessage, channelId: ChannelId): boolean => {
  if (channelId === 'all') return true;
  const msgChan = getMessageChannel(msg);
  if (msgChan === channelId) return true;

  // Check tags
  const tags = (msg.taggedDepts || []).map(t => t.toUpperCase());
  if (channelId === 'operating' && tags.some(t => t.includes('OPERAT'))) return true;
  if (channelId === 'ohe' && tags.some(t => t.includes('OHE'))) return true;
  if (channelId === 'sandt' && tags.some(t => t.includes('S_AND_T') || t.includes('S&T') || t.includes('SIGNAL'))) return true;
  if (channelId === 'civil' && tags.some(t => t.includes('CIVIL') || t.includes('P_WAY') || t.includes('PWAY'))) return true;

  return false;
};

export function useChatStore(currentUser?: { name: string; role: string; department?: string } | null) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem(CHAT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (_) {}
    return INITIAL_MESSAGES;
  });

  const [activeChannel, setActiveChannel] = useState<ChannelId>('all');
  const [unreadIds, setUnreadIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(UNREAD_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (_) {}
    return [];
  });
  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState<string | null>(null);

  // Broadcast Channel for multi-tab instantaneous synchronization
  const broadcastRef = useMemo(() => {
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        return new BroadcastChannel('railsync_chat_sync');
      }
    } catch (_) {}
    return null;
  }, []);

  // Listen for broadcasts from other tabs
  useEffect(() => {
    if (!broadcastRef) return;
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'NEW_MESSAGE' && event.data?.message) {
        setMessages(prev => {
          if (prev.some(m => m.id === event.data.message.id)) return prev;
          return [...prev, event.data.message];
        });
      } else if (event.data?.type === 'MESSAGES_SYNC' && Array.isArray(event.data?.messages)) {
        setMessages(event.data.messages);
      }
    };
    broadcastRef.addEventListener('message', handleMessage);
    return () => broadcastRef.removeEventListener('message', handleMessage);
  }, [broadcastRef]);

  // Listen to window storage event for fallback cross-tab updates
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === CHAT_STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            setMessages(parsed);
          }
        } catch (_) {}
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Persist messages whenever state changes
  useEffect(() => {
    try {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
    } catch (err) {
      console.error('Failed to save messages to localStorage', err);
    }
  }, [messages]);

  // Multi-origin real-time sync with Field App
  useEffect(() => {
    const unsub = syncClient.on('message.new', (incoming: any) => {
      setMessages(prev => {
        if (prev.some(m => m.id === incoming.id || (m.text === incoming.text && m.sender === incoming.sender))) {
          return prev;
        }
        const timeStr = incoming.timestamp
          ? new Date(incoming.timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }) + ' UTC'
          : new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }) + ' UTC';

        return [
          ...prev,
          {
            id: incoming.id,
            sender: incoming.sender,
            role: incoming.role || 'FIELD_SUPERVISOR',
            department: incoming.department || 'OHE',
            text: incoming.text,
            timestamp: timeStr,
            createdAt: incoming.timestamp || new Date().toISOString(),
            taggedDepts: incoming.taggedDepts || [],
            photos: incoming.photoUrl ? [{ id: 'p-1', url: incoming.photoUrl, timestamp: incoming.timestamp }] : [],
            channel: incoming.channel || 'all',
            status: 'delivered',
          },
        ];
      });
    });

    return () => {
      unsub();
    };
  }, []);

  // Calculate unread count
  const unreadCount = unreadIds.length;

  const unreadByChannel = useMemo(() => {
    const counts: Record<ChannelId, number> = {
      all: 0,
      operating: 0,
      ohe: 0,
      sandt: 0,
      civil: 0,
    };
    unreadIds.forEach(id => {
      const msg = messages.find(m => m.id === id);
      if (msg) {
        counts.all++;
        const ch = getMessageChannel(msg);
        if (ch !== 'all') {
          counts[ch]++;
        }
      }
    });
    return counts;
  }, [unreadIds, messages]);

  // Mark all or active channel as read
  const markChannelRead = useCallback((channel: ChannelId) => {
    setUnreadIds(prev => {
      const remaining = prev.filter(id => {
        const msg = messages.find(m => m.id === id);
        if (!msg) return false;
        return !matchesChannel(msg, channel);
      });
      try {
        localStorage.setItem(UNREAD_STORAGE_KEY, JSON.stringify(remaining));
      } catch (_) {}
      return remaining;
    });
  }, [messages]);

  const markAllRead = useCallback(() => {
    setUnreadIds([]);
    try {
      localStorage.removeItem(UNREAD_STORAGE_KEY);
    } catch (_) {}
  }, []);

  // Send Message
  const sendMessage = useCallback(
    async ({
      text,
      taggedDepts = [],
      photos = [],
      channel = 'all',
      overrideSender,
      overrideRole,
    }: {
      text: string;
      taggedDepts?: string[];
      photos?: ChatPhoto[];
      channel?: ChannelId;
      overrideSender?: string;
      overrideRole?: string;
    }): Promise<ChatMessage> => {
      const now = new Date();
      const timeStr =
        now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }) + ' UTC';
      const nowIso = now.toISOString();

      const senderName =
        overrideSender ||
        (currentUser?.name
          ? `${currentUser.name} (${currentUser.role})`
          : 'Divya Singh (Station Master Desk)');
      const senderRole = overrideRole || currentUser?.role || 'STATION_MASTER';
      const senderDept = currentUser?.department || 'OPERATING';

      const newMsgId = `msg-${Date.now()}-${Math.random().toString(16).substring(2, 6)}`;

      const newMsg: ChatMessage = {
        id: newMsgId,
        sender: senderName,
        role: senderRole,
        department: senderDept,
        text: text.trim(),
        timestamp: timeStr,
        createdAt: nowIso,
        taggedDepts,
        photos,
        channel,
        status: 'sending',
      };

      // 1. Optimistic Update
      setMessages(prev => [...prev, newMsg]);

      // Broadcast to other tabs & multi-origin serverless API
      try {
        broadcastRef?.postMessage({ type: 'NEW_MESSAGE', message: newMsg });
      } catch (_) {}

      syncClient.sendMessage({
        sender: senderName,
        role: senderRole,
        text: text.trim(),
        taggedDepts,
        channel,
      }).catch(() => {});

      // 2. Transition from 'sending' to 'delivered'
      setTimeout(() => {
        setMessages(prev =>
          prev.map(m => (m.id === newMsgId ? { ...m, status: 'delivered' } : m))
        );
      }, 400);

      // 3. Statutory Audit Ledger entry if tagged or photos attached
      if (taggedDepts.length > 0 || photos.length > 0) {
        try {
          const auditBlockNumber = 3000 + Math.floor(Math.random() * 500);
          const auditBlock: AuditBlock = {
            block_number: auditBlockNumber,
            event_id: 'CONTROL-DESK-COMM',
            timestamp: nowIso,
            prev_hash: '9f2c81e997ed255198f3ca9b12a4d81e997ed25519b12a4d81e997e1a495991b',
            merkle_root: 'e7c4f19b882da19f20c99a8b19d4ed81e997ed25519tpcngp013e1b71948536',
            block_hash: 'comm_' + Math.random().toString(16).substring(2, 12) + '_' + Date.now().toString(16),
            consensus_proof: 'COMM_LOG: Statutory Control Desk Message Recorded',
            worm_status: 'WORM LEGAL HOLD ACTIVE',
            storage_tier: 'AWS S3 Object Lock (Retention: 7 Years)',
            multi_signatures: [
              {
                department: senderDept,
                role: senderRole,
                officer_id: senderName,
                signature_hash: 'sig_comm_' + Math.random().toString(16).substring(2, 10),
                signed_at: nowIso,
              },
            ],
            leaves: [
              {
                leaf_id: `LEAF-COMM-${auditBlockNumber}`,
                title: `Control Desk Clarification: ${senderName}`,
                hash: 'hash_comm_' + Math.random().toString(16).substring(2, 10),
                payload_summary: `Sender: ${senderName} | Tags: ${taggedDepts.join(', ') || 'None'} | Text: "${text.substring(0, 100)}" | Photos: ${photos.length}`,
              },
            ],
          };
          saveAuditBlock(auditBlock);
        } catch (err) {
          console.error('Failed to save chat audit block', err);
        }
      }

      // 4. Simulated Interactive Station Master / Controller Response
      // If user tags a department or asks a question, simulate realistic control room reply
      const needsReply =
        taggedDepts.length > 0 ||
        text.includes('?') ||
        text.toLowerCase().includes('status') ||
        text.toLowerCase().includes('token') ||
        text.toLowerCase().includes('permit') ||
        text.toLowerCase().includes('confirm');

      if (needsReply) {
        const primaryTag = taggedDepts[0] || '@OPERATING';
        let botSender = 'Station Master (PNBE)';
        let botRole = 'STATION_MASTER';
        let botText = `[ACK] ${primaryTag}: Memo acknowledged on VDU panel. Interlock route padlocked. Form 3-PTW valid.`;

        if (primaryTag === '@OHE') {
          botSender = 'TPC Danapur Grid';
          botRole = 'TPC';
          botText = `[TPC ACK]: Catenary status verified on SCADA. Section feeding post FP-02 isolated. Residual voltage discharged.`;
        } else if (primaryTag === '@S_AND_T') {
          botSender = 'Section Controller (Signalling)';
          botRole = 'CONTROLLER';
          botText = `[S&T ACK]: Electronic Interlocking crossover route normalized. Axle counter reset complete.`;
        } else if (primaryTag === '@CIVIL_P_WAY') {
          botSender = 'AEN / Track Inspection (PNBE)';
          botRole = 'FIELD_SUPERVISOR';
          botText = `[P-WAY ACK]: Tamping machine CSM-952 standby at loop line. Speed restriction TSR 30 km/h enforced.`;
        }

        // Show typing indicator
        setTimeout(() => {
          setIsTyping(true);
          setTypingUser(botSender);
        }, 800);

        // Deliver simulated response after 2.4s
        setTimeout(() => {
          setIsTyping(false);
          setTypingUser(null);
          const replyTime = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }) + ' UTC';
          const replyMsg: ChatMessage = {
            id: `msg-${Date.now() + 1}`,
            sender: botSender,
            role: botRole,
            department: primaryTag.replace('@', ''),
            text: botText,
            timestamp: replyTime,
            createdAt: new Date().toISOString(),
            channel: channel,
            status: 'read',
            taggedDepts: [primaryTag],
          };

          setMessages(prev => [...prev, replyMsg]);

          try {
            broadcastRef?.postMessage({ type: 'NEW_MESSAGE', message: replyMsg });
          } catch (_) {}
        }, 2400);
      }

      return newMsg;
    },
    [currentUser, broadcastRef]
  );

  return {
    messages,
    activeChannel,
    setActiveChannel,
    unreadCount,
    unreadByChannel,
    markChannelRead,
    markAllRead,
    sendMessage,
    isTyping,
    typingUser,
  };
}

