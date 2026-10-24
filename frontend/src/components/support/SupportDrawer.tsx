import React, { useState, useEffect, useRef } from 'react';
import {
  X, HelpCircle, Phone, PlusCircle, Ticket, BookOpen,
  Search, MessageSquare, HeartHandshake, CheckCircle2,
  Wifi, Activity, Radio, AlertCircle
} from 'lucide-react';
import { ContactsTab } from './ContactsTab';
import { RaiseTicketTab } from './RaiseTicketTab';
import { MyTicketsTab } from './MyTicketsTab';
import { HelpGuidesTab } from './HelpGuidesTab';
import { TicketCategory, SupportTicket, TicketStatus } from '../../hooks/useSupportStore';
import { OperationalEvent } from '../../types';

export interface SupportDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  events?: OperationalEvent[];
  currentUser?: { name: string; role: string; department?: string; station?: string } | null;
  onSelectEvent?: (event: OperationalEvent) => void;
  onNavigateMessages?: (dept?: string) => void;
  supportStore: {
    tickets: SupportTicket[];
    unreadCount: number;
    createTicket: (data: {
      category: TicketCategory;
      severity: any;
      relatedEventId?: string;
      subject: string;
      description: string;
      attachments?: string[];
      contactInfo?: string;
      currentRoute?: string;
    }) => SupportTicket;
    addTicketReply: (ticketId: string, replyText: string, attachments?: string[]) => void;
    updateTicketStatus: (ticketId: string, newStatus: TicketStatus, reason?: string) => void;
    reportEmergency: (reason: string, location?: string) => SupportTicket;
    guideFeedback: Record<string, { helpful: number; unhelpful: number; userVoted?: 'yes' | 'no' }>;
    voteGuide: (guideId: string, isHelpful: boolean) => void;
  };
  isOfflineMode?: boolean;
  wsConnected?: boolean;
  canaryHealthy?: boolean;
  initialTab?: 'contacts' | 'raise' | 'tickets' | 'guides';
}

export const SupportDrawer: React.FC<SupportDrawerProps> = ({
  isOpen,
  onClose,
  events = [],
  currentUser,
  onSelectEvent,
  onNavigateMessages,
  supportStore,
  isOfflineMode = false,
  wsConnected = true,
  canaryHealthy = true,
  initialTab = 'contacts',
}) => {
  const [activeTab, setActiveTab] = useState<'contacts' | 'raise' | 'tickets' | 'guides'>(initialTab);
  const [globalSearch, setGlobalSearch] = useState('');
  const [raiseCategory, setRaiseCategory] = useState<TicketCategory | undefined>(undefined);
  const drawerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Sync initial tab when drawer opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      // Keyboard Esc handler
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, initialTab, onClose]);

  if (!isOpen) return null;

  const handleOpenFeedback = () => {
    setRaiseCategory('Feedback');
    setActiveTab('raise');
  };

  const handleOpenMessagesFromDrawer = (dept?: string) => {
    onClose();
    if (onNavigateMessages) {
      onNavigateMessages(dept);
    }
  };

  const handleSelectEventFromTicket = (evt: OperationalEvent) => {
    onClose();
    if (onSelectEvent) {
      onSelectEvent(evt);
    }
  };

  return (
    <>
      {/* ── Soft Dark Overlay ───────────────────────── */}
      <div
        role="presentation"
        aria-hidden="true"
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          zIndex: 1049,
          animation: 'fadeIn 0.2s ease-out',
        }}
      />

      {/* ── Slide-Over Drawer Container ────────────── */}
      <aside
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Support Desk"
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          maxWidth: 450,
          background: '#F8FAFC',
          zIndex: 1050,
          boxShadow: '-8px 0 28px rgba(0, 0, 0, 0.22)',
          display: 'flex',
          flexDirection: 'column',
          borderLeft: '1px solid #CBD5E1',
          animation: 'slideInRight 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* ── Drawer Header ──────────────────────────── */}
        <header
          style={{
            background: '#FFFFFF',
            padding: '16px 20px 14px',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            flexShrink: 0,
          }}
        >
          {/* Top Row: Title, Online Dot, Close Button */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: 'linear-gradient(135deg, #1E40AF 0%, #2563EB 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF',
                  boxShadow: '0 2px 6px rgba(37,99,235,0.3)',
                  flexShrink: 0,
                }}
              >
                <HelpCircle size={20} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.01em' }}>
                    Support Desk
                  </h2>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '2px 7px',
                      borderRadius: 9999,
                      background: '#ECFDF5',
                      color: '#047857',
                      border: '1px solid #A7F3D0',
                    }}
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: '#10B981',
                      }}
                      className="animate-pulse"
                    />
                    <span>Control Room Online</span>
                  </span>
                </div>
                <div style={{ fontSize: 11, color: '#64748B', marginTop: 2, fontWeight: 500 }}>
                  ECR Danapur Division · Division Control Center
                </div>
              </div>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Support Desk"
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: '#F1F5F9',
                border: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#64748B',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = '#E2E8F0';
                e.currentTarget.style.color = '#0F172A';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = '#F1F5F9';
                e.currentTarget.style.color = '#64748B';
              }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Sticky Global Search Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: '#F8FAFC',
              border: '1px solid #CBD5E1',
              borderRadius: 8,
              padding: '7px 12px',
              transition: 'border-color 0.15s ease',
            }}
          >
            <Search size={15} color="#64748B" className="shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search contacts, guides, tickets..."
              value={globalSearch}
              onChange={e => setGlobalSearch(e.target.value)}
              style={{
                border: 'none',
                outline: 'none',
                width: '100%',
                fontSize: 12,
                background: 'transparent',
                color: '#0F172A',
              }}
            />
            {globalSearch && (
              <button
                type="button"
                onClick={() => setGlobalSearch('')}
                aria-label="Clear search"
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  color: '#94A3B8',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* 4 Tabs Navigation Bar */}
          <nav
            role="tablist"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 4,
              background: '#F1F5F9',
              padding: 3,
              borderRadius: 8,
            }}
          >
            {/* Contacts Tab */}
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'contacts'}
              onClick={() => setActiveTab('contacts')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5,
                padding: '6px 4px',
                borderRadius: 6,
                fontSize: 11,
                fontWeight: activeTab === 'contacts' ? 700 : 500,
                background: activeTab === 'contacts' ? '#FFFFFF' : 'transparent',
                color: activeTab === 'contacts' ? '#1D4ED8' : '#64748B',
                border: 'none',
                cursor: 'pointer',
                boxShadow: activeTab === 'contacts' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <Phone size={12} />
              <span>Contacts</span>
            </button>

            {/* Raise Ticket Tab */}
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'raise'}
              onClick={() => {
                setRaiseCategory(undefined);
                setActiveTab('raise');
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5,
                padding: '6px 4px',
                borderRadius: 6,
                fontSize: 11,
                fontWeight: activeTab === 'raise' ? 700 : 500,
                background: activeTab === 'raise' ? '#FFFFFF' : 'transparent',
                color: activeTab === 'raise' ? '#1D4ED8' : '#64748B',
                border: 'none',
                cursor: 'pointer',
                boxShadow: activeTab === 'raise' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <PlusCircle size={12} />
              <span>Raise Ticket</span>
            </button>

            {/* My Tickets Tab with Unread Badge */}
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'tickets'}
              onClick={() => setActiveTab('tickets')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                padding: '6px 4px',
                borderRadius: 6,
                fontSize: 11,
                fontWeight: activeTab === 'tickets' ? 700 : 500,
                background: activeTab === 'tickets' ? '#FFFFFF' : 'transparent',
                color: activeTab === 'tickets' ? '#1D4ED8' : '#64748B',
                border: 'none',
                cursor: 'pointer',
                boxShadow: activeTab === 'tickets' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                position: 'relative',
                transition: 'all 0.15s ease',
              }}
            >
              <Ticket size={12} />
              <span>Tickets</span>
              {supportStore.unreadCount > 0 && (
                <span
                  style={{
                    minWidth: 16,
                    height: 16,
                    borderRadius: 9999,
                    background: '#DC2626',
                    color: '#FFFFFF',
                    fontSize: 9.5,
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 4px',
                  }}
                >
                  {supportStore.unreadCount}
                </span>
              )}
            </button>

            {/* Help & Guides Tab */}
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'guides'}
              onClick={() => setActiveTab('guides')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5,
                padding: '6px 4px',
                borderRadius: 6,
                fontSize: 11,
                fontWeight: activeTab === 'guides' ? 700 : 500,
                background: activeTab === 'guides' ? '#FFFFFF' : 'transparent',
                color: activeTab === 'guides' ? '#1D4ED8' : '#64748B',
                border: 'none',
                cursor: 'pointer',
                boxShadow: activeTab === 'guides' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <BookOpen size={12} />
              <span>Guides</span>
            </button>
          </nav>
        </header>

        {/* ── Scrollable Tab Content Area ────────────── */}
        <main
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px 20px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {activeTab === 'contacts' && (
            <ContactsTab
              onReportEmergency={supportStore.reportEmergency}
              onOpenMessages={handleOpenMessagesFromDrawer}
              globalSearchQuery={globalSearch}
            />
          )}

          {activeTab === 'raise' && (
            <RaiseTicketTab
              onCreateTicket={supportStore.createTicket}
              events={events}
              currentUser={currentUser}
              onSwitchTab={tab => setActiveTab(tab)}
              preselectedCategory={raiseCategory}
            />
          )}

          {activeTab === 'tickets' && (
            <MyTicketsTab
              tickets={supportStore.tickets}
              onAddReply={supportStore.addTicketReply}
              onUpdateStatus={supportStore.updateTicketStatus}
              currentUser={currentUser}
              onSelectEvent={handleSelectEventFromTicket}
              events={events}
              globalSearchQuery={globalSearch}
              onOpenRaiseTicket={() => {
                setRaiseCategory(undefined);
                setActiveTab('raise');
              }}
            />
          )}

          {activeTab === 'guides' && (
            <HelpGuidesTab
              guideFeedback={supportStore.guideFeedback}
              onVoteGuide={supportStore.voteGuide}
              globalSearchQuery={globalSearch}
              onOpenRaiseTicket={() => {
                setRaiseCategory(undefined);
                setActiveTab('raise');
              }}
            />
          )}
        </main>

        {/* ── Drawer Footer: System Status & Quick Actions ─── */}
        <footer
          style={{
            background: '#FFFFFF',
            borderTop: '1px solid #E2E8F0',
            padding: '12px 18px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            flexShrink: 0,
          }}
        >
          {/* Mini System Status Card */}
          <div
            style={{
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: 8,
              padding: '8px 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: 10.5,
              color: '#64748B',
            }}
          >
            {/* Live Station Feed */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981' }} />
              <span style={{ fontWeight: 600, color: '#334155' }}>Feed: Live</span>
            </div>

            {/* WebSocket */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: wsConnected ? '#10B981' : '#F59E0B',
                }}
              />
              <span style={{ fontWeight: 600, color: '#334155' }}>
                {wsConnected ? 'WSS: Connected' : 'WSS: Reconnecting'}
              </span>
            </div>

            {/* API Health */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: canaryHealthy ? '#10B981' : '#EF4444',
                }}
              />
              <span style={{ fontWeight: 600, color: '#334155' }}>
                {canaryHealthy ? 'API: Healthy' : 'API: Degraded'}
              </span>
            </div>
          </div>

          {/* Quick Buttons Row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              onClick={() => handleOpenMessagesFromDrawer()}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                padding: '7px 10px',
                borderRadius: 8,
                background: '#EFF6FF',
                color: '#1D4ED8',
                border: '1px solid #BFDBFE',
                fontSize: 11.5,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <MessageSquare size={13} />
              <span>Open Messages</span>
            </button>

            <button
              type="button"
              onClick={handleOpenFeedback}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                padding: '7px 10px',
                borderRadius: 8,
                background: '#F1F5F9',
                color: '#334155',
                border: '1px solid #CBD5E1',
                fontSize: 11.5,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <HeartHandshake size={13} />
              <span>Give Feedback</span>
            </button>
          </div>
        </footer>
      </aside>
    </>
  );
};

