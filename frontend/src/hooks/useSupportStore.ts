import { useState, useEffect, useCallback, useMemo } from 'react';
import { AuditBlock } from '../types';
import { saveAuditBlock } from './useEmergencyStop';

export type TicketCategory =
  | 'Software / App issue'
  | 'Data mismatch'
  | 'Approval or Quorum issue'
  | 'Field App or Geo Camera'
  | 'Safety concern'
  | 'Access / Login'
  | 'Feedback'
  | 'Emergency'
  | 'Other';

export type TicketSeverity = 'Low' | 'Medium' | 'High' | 'Critical';

export type TicketStatus = 'Open' | 'In Progress' | 'Waiting for you' | 'Resolved' | 'Closed';

export interface TicketTimelineItem {
  id: string;
  author: string;
  role: string;
  text: string;
  timestamp: string;
  type: 'creation' | 'reply' | 'status_change';
  attachments?: string[];
}

export interface SupportTicket {
  id: string;
  category: TicketCategory;
  severity: TicketSeverity;
  relatedEventId?: string;
  subject: string;
  description: string;
  attachments: string[];
  contactInfo: string;
  status: TicketStatus;
  createdBy: string;
  createdByRole: string;
  createdAt: string;
  updatedAt: string;
  context: {
    route: string;
    user: string;
    role: string;
    browser: string;
    timestamp: string;
  };
  timeline: TicketTimelineItem[];
  isUnreadForUser?: boolean;
}

export const SUPPORT_TICKETS_STORAGE_KEY = 'railsync_support_tickets_v1';
export const GUIDE_FEEDBACK_STORAGE_KEY = 'railsync_guide_feedback_v1';

export const INITIAL_DEMO_TICKETS: SupportTicket[] = [
  {
    id: 'SUP-2026-0001',
    category: 'Data mismatch',
    severity: 'Medium',
    relatedEventId: 'EVT-ENG-2026-00132',
    subject: 'Axle counter telemetry delay at Danapur Up Main crossover',
    description: 'During CSM-952 tamping pass, axle counter section 14A showed occupied for 180s after rake clear.',
    attachments: [
      'https://images.unsplash.com/photo-1474487548417-781cb71495f3?auto=format&fit=crop&w=800&q=80',
    ],
    contactInfo: 'Ravi Amish (Ext. 4050)',
    status: 'In Progress',
    createdBy: 'Ravi Amish',
    createdByRole: 'Station Master Desk',
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    updatedAt: new Date(Date.now() - 1800000).toISOString(),
    context: {
      route: '/workspace',
      user: 'Ravi Amish',
      role: 'Station Master Desk',
      browser: 'Chrome 128 / Windows',
      timestamp: new Date(Date.now() - 7200000).toISOString(),
    },
    timeline: [
      {
        id: 'tl-1',
        author: 'Ravi Amish',
        role: 'Station Master Desk',
        text: 'Ticket created with attached axle counter log evidence.',
        timestamp: '11:15 UTC',
        type: 'creation',
      },
      {
        id: 'tl-2',
        author: 'Sunil Sahay (SSE Signal)',
        role: 'S&T In-Charge',
        text: 'Inspected Danapur relay room rack #3. Resetting axle counter transducer bias voltage to 4.2V nominal.',
        timestamp: '12:45 UTC',
        type: 'reply',
      },
    ],
  },
  {
    id: 'SUP-2026-0002',
    category: 'Approval or Quorum issue',
    severity: 'Low',
    relatedEventId: 'EVT-OHE-2026-00104',
    subject: 'Form ETR-3 token printing margin alignment',
    description: 'When generating PDF statutory permit on thermal ticket printer, QR code cut off by 2mm on right margin.',
    attachments: [],
    contactInfo: 'Devendra Kumar (Ext. 4124)',
    status: 'Resolved',
    createdBy: 'Devendra Kumar',
    createdByRole: 'SSE / OHE (Field Supervisor)',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 43200000).toISOString(),
    context: {
      route: '/android_app',
      user: 'Devendra Kumar',
      role: 'FIELD_SUPERVISOR',
      browser: 'Android Webview / RailSync Mobile',
      timestamp: new Date(Date.now() - 86400000).toISOString(),
    },
    timeline: [
      {
        id: 'tl-10',
        author: 'Devendra Kumar',
        role: 'FIELD_SUPERVISOR',
        text: 'Ticket logged from field tablet.',
        timestamp: 'Yesterday 09:20 UTC',
        type: 'creation',
      },
      {
        id: 'tl-11',
        author: 'RailSync IT Desk',
        role: 'System Administrator',
        text: 'Updated CSS page print media query @page margins to 12mm. Issue verified resolved.',
        timestamp: 'Yesterday 14:10 UTC',
        type: 'status_change',
      },
    ],
  },
];

export function useSupportStore(
  currentUser?: { name: string; role: string; department?: string } | null,
  onNotifyAmbient?: (msg: string) => void,
  onSendChatMessage?: (data: { text: string; taggedDepts: string[] }) => Promise<any> | void
) {
  const [tickets, setTickets] = useState<SupportTicket[]>(() => {
    try {
      const saved = localStorage.getItem(SUPPORT_TICKETS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (_) {}
    return INITIAL_DEMO_TICKETS;
  });

  const [guideFeedback, setGuideFeedback] = useState<Record<string, { helpful: number; unhelpful: number; userVoted?: 'yes' | 'no' }>>(() => {
    try {
      const saved = localStorage.getItem(GUIDE_FEEDBACK_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return {
      'guide-01': { helpful: 24, unhelpful: 1 },
      'guide-02': { helpful: 38, unhelpful: 0 },
      'guide-03': { helpful: 45, unhelpful: 2 },
      'guide-04': { helpful: 19, unhelpful: 0 },
      'guide-05': { helpful: 22, unhelpful: 1 },
      'guide-06': { helpful: 31, unhelpful: 0 },
      'guide-07': { helpful: 16, unhelpful: 1 },
      'guide-08': { helpful: 27, unhelpful: 0 },
    };
  });

  // Save tickets on change
  useEffect(() => {
    try {
      localStorage.setItem(SUPPORT_TICKETS_STORAGE_KEY, JSON.stringify(tickets));
    } catch (err) {
      console.error('Failed to save tickets to localStorage', err);
    }
  }, [tickets]);

  // Save guide feedback on change
  useEffect(() => {
    try {
      localStorage.setItem(GUIDE_FEEDBACK_STORAGE_KEY, JSON.stringify(guideFeedback));
    } catch (_) {}
  }, [guideFeedback]);

  // Unread tickets count
  const unreadCount = useMemo(() => {
    return tickets.filter(t => t.isUnreadForUser || t.status === 'Open').length;
  }, [tickets]);

  // Create Ticket
  const createTicket = useCallback(
    (data: {
      category: TicketCategory;
      severity: TicketSeverity;
      relatedEventId?: string;
      subject: string;
      description: string;
      attachments?: string[];
      contactInfo?: string;
      currentRoute?: string;
    }): SupportTicket => {
      const nowIso = new Date().toISOString();
      const timeShort = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }) + ' UTC';
      const userDisplay = currentUser?.name || 'Divya Singh';
      const userRole = currentUser?.role || 'Station Master Desk';

      const ticketSeq = 1000 + tickets.length + 1;
      const newId = `SUP-2026-${String(ticketSeq).padStart(4, '0')}`;

      const newTicket: SupportTicket = {
        id: newId,
        category: data.category,
        severity: data.severity,
        relatedEventId: data.relatedEventId?.trim() || undefined,
        subject: data.subject.trim(),
        description: data.description.trim(),
        attachments: data.attachments || [],
        contactInfo: data.contactInfo?.trim() || `${userDisplay} (Ext. 4022)`,
        status: 'Open',
        createdBy: userDisplay,
        createdByRole: userRole,
        createdAt: nowIso,
        updatedAt: nowIso,
        context: {
          route: data.currentRoute || window.location.pathname || '/workspace',
          user: userDisplay,
          role: userRole,
          browser: `${navigator.userAgent.substring(0, 50)}...`,
          timestamp: nowIso,
        },
        timeline: [
          {
            id: `tl-${Date.now()}`,
            author: userDisplay,
            role: userRole,
            text: `Ticket logged under category "${data.category}" with severity ${data.severity}.`,
            timestamp: timeShort,
            type: 'creation',
            attachments: data.attachments,
          },
        ],
      };

      setTickets(prev => [newTicket, ...prev]);

      // If critical, notify via ambient alert and post to Messages
      if (data.severity === 'Critical' || data.category === 'Safety concern' || data.category === 'Emergency') {
        const notifText = `🚨 [SUPPORT-DESK]: High-priority ticket ${newId} logged by ${userDisplay}: "${data.subject.substring(0, 60)}"`;
        if (onNotifyAmbient) {
          onNotifyAmbient(notifText);
        }
        if (onSendChatMessage) {
          onSendChatMessage({
            text: `[SUPPORT TICKET ${newId}] (${data.severity}): ${data.subject} — Details: ${data.description.substring(0, 120)}`,
            taggedDepts: ['@OPERATING'],
          });
        }
      }

      // Write immutable statutory entry to Audit & History
      try {
        const auditBlockNumber = 3500 + Math.floor(Math.random() * 500);
        const auditBlock: AuditBlock = {
          block_number: auditBlockNumber,
          event_id: data.relatedEventId || newId,
          timestamp: nowIso,
          prev_hash: '9f2c81e997ed255198f3ca9b12a4d81e997ed25519b12a4d81e997e1a495991b',
          merkle_root: 'e7c4f19b882da19f20c99a8b19d4ed81e997ed25519tpcngp013e1b71948536',
          block_hash: 'sup_' + Math.random().toString(16).substring(2, 12) + '_' + Date.now().toString(16),
          consensus_proof: 'SUPPORT_TICKET_LOG: Statutory Query/Incident Registered',
          worm_status: 'WORM LEGAL HOLD ACTIVE',
          storage_tier: 'AWS S3 Object Lock (Retention: 7 Years)',
          multi_signatures: [
            {
              department: currentUser?.department || 'OPERATING',
              role: userRole,
              officer_id: userDisplay,
              signature_hash: 'sig_sup_' + Math.random().toString(16).substring(2, 10),
              signed_at: nowIso,
            },
          ],
          leaves: [
            {
              leaf_id: `LEAF-TICKET-${auditBlockNumber}`,
              title: `Support Ticket ${newId}: ${data.subject.substring(0, 50)}`,
              hash: 'hash_sup_' + Math.random().toString(16).substring(2, 10),
              payload_summary: `Ticket: ${newId} | Category: ${data.category} | Severity: ${data.severity} | By: ${userDisplay} (${userRole})`,
            },
          ],
        };
        saveAuditBlock(auditBlock);
      } catch (err) {
        console.error('Failed to save ticket audit block', err);
      }

      return newTicket;
    },
    [currentUser, tickets.length, onNotifyAmbient, onSendChatMessage]
  );

  // Add Reply to Ticket
  const addTicketReply = useCallback(
    (ticketId: string, replyText: string, attachments: string[] = []) => {
      const nowIso = new Date().toISOString();
      const timeShort = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }) + ' UTC';
      const userDisplay = currentUser?.name || 'Divya Singh';
      const userRole = currentUser?.role || 'Station Master Desk';

      setTickets(prev =>
        prev.map(t => {
          if (t.id === ticketId) {
            const newTimelineItem: TicketTimelineItem = {
              id: `tl-${Date.now()}`,
              author: userDisplay,
              role: userRole,
              text: replyText.trim(),
              timestamp: timeShort,
              type: 'reply',
              attachments,
            };
            return {
              ...t,
              status: t.status === 'Resolved' || t.status === 'Closed' ? 'In Progress' : t.status,
              updatedAt: nowIso,
              timeline: [...t.timeline, newTimelineItem],
            };
          }
          return t;
        })
      );
    },
    [currentUser]
  );

  // Update Status
  const updateTicketStatus = useCallback(
    (ticketId: string, newStatus: TicketStatus, reason?: string) => {
      const nowIso = new Date().toISOString();
      const timeShort = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }) + ' UTC';
      const userDisplay = currentUser?.name || 'Divya Singh';
      const userRole = currentUser?.role || 'Station Master Desk';

      setTickets(prev =>
        prev.map(t => {
          if (t.id === ticketId) {
            const newTimelineItem: TicketTimelineItem = {
              id: `tl-${Date.now()}`,
              author: userDisplay,
              role: userRole,
              text: reason ? `Status changed to ${newStatus}: ${reason}` : `Status marked as ${newStatus}`,
              timestamp: timeShort,
              type: 'status_change',
            };
            return {
              ...t,
              status: newStatus,
              updatedAt: nowIso,
              timeline: [...t.timeline, newTimelineItem],
            };
          }
          return t;
        })
      );
    },
    [currentUser]
  );

  // Report Emergency Action (Notifications & Audit only - no train control)
  const reportEmergency = useCallback(
    (emergencyReason: string, locationNotes?: string) => {
      const userDisplay = currentUser?.name || 'Divya Singh';
      const userRole = currentUser?.role || 'Station Master Desk';
      const timeShort = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }) + ' UTC';

      const subject = `EMERGENCY ALERT: ${emergencyReason.trim()}`;
      const description = `Emergency escalated by ${userDisplay} (${userRole}) via Support Desk.\nLocation/Notes: ${locationNotes || 'General Section'}\nTime: ${timeShort}\nAction required: Immediate Section Controller and DCC verification.`;

      // 1. Create high priority ticket
      const ticket = createTicket({
        category: 'Emergency',
        severity: 'Critical',
        subject,
        description,
        contactInfo: `${userDisplay} (Ext. 4022)`,
      });

      // 2. Post alert to Messages page group with @OPERATING
      if (onSendChatMessage) {
        onSendChatMessage({
          text: `🚨 [STATUTORY EMERGENCY ALERT]: ${emergencyReason.trim()} reported at ${timeShort} by ${userDisplay} (${userRole}). Location: ${locationNotes || 'Danapur Division Section'}. Control Desk Standby!`,
          taggedDepts: ['@OPERATING', '@OHE', '@S_AND_T'],
        });
      }

      // 3. Ambient bell notification
      if (onNotifyAmbient) {
        onNotifyAmbient(
          `${timeShort} [EMERGENCY-DISPATCH]: Critical Support Incident ${ticket.id} broadcast to Control Room by ${userDisplay}`
        );
      }

      return ticket;
    },
    [createTicket, currentUser, onNotifyAmbient, onSendChatMessage]
  );

  // Vote on Help Guide
  const voteGuide = useCallback((guideId: string, isHelpful: boolean) => {
    setGuideFeedback(prev => {
      const current = prev[guideId] || { helpful: 0, unhelpful: 0 };
      if (current.userVoted) return prev; // already voted

      const next = {
        ...prev,
        [guideId]: {
          helpful: current.helpful + (isHelpful ? 1 : 0),
          unhelpful: current.unhelpful + (!isHelpful ? 1 : 0),
          userVoted: isHelpful ? ('yes' as const) : ('no' as const),
        },
      };
      return next;
    });
  }, []);

  return {
    tickets,
    unreadCount,
    createTicket,
    addTicketReply,
    updateTicketStatus,
    reportEmergency,
    guideFeedback,
    voteGuide,
  };
}
