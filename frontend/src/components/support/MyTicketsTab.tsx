import React, { useState, useMemo, useRef } from 'react';
import {
  Ticket, Search, Filter, ArrowLeft, Send, CheckCircle2,
  Clock, AlertCircle, AlertOctagon, User, Building, Paperclip,
  Check, RotateCcw, ExternalLink, Image as ImageIcon, X
} from 'lucide-react';
import { SupportTicket, TicketStatus, TicketSeverity } from '../../hooks/useSupportStore';
import { OperationalEvent } from '../../types';

interface MyTicketsTabProps {
  tickets: SupportTicket[];
  onAddReply: (ticketId: string, replyText: string, attachments?: string[]) => void;
  onUpdateStatus: (ticketId: string, status: TicketStatus, reason?: string) => void;
  currentUser?: { name: string; role: string } | null;
  onSelectEvent?: (event: OperationalEvent) => void;
  events?: OperationalEvent[];
  globalSearchQuery?: string;
  onOpenRaiseTicket?: () => void;
}

const STATUS_FILTERS: { id: 'ALL' | TicketStatus; label: string }[] = [
  { id: 'ALL', label: 'All' },
  { id: 'Open', label: 'Open' },
  { id: 'In Progress', label: 'In Progress' },
  { id: 'Waiting for you', label: 'Waiting for you' },
  { id: 'Resolved', label: 'Resolved' },
  { id: 'Closed', label: 'Closed' },
];

export const MyTicketsTab: React.FC<MyTicketsTabProps> = ({
  tickets,
  onAddReply,
  onUpdateStatus,
  currentUser,
  onSelectEvent,
  events = [],
  globalSearchQuery = '',
  onOpenRaiseTicket,
}) => {
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'ALL' | TicketStatus>('ALL');
  const [scopeFilter, setScopeFilter] = useState<'ALL' | 'MINE'>('ALL');
  const [localSearch, setLocalSearch] = useState('');

  // Reply box state inside detail view
  const [replyText, setReplyText] = useState('');
  const [replyAttachments, setReplyAttachments] = useState<string[]>([]);
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const replyFileInputRef = useRef<HTMLInputElement>(null);

  const activeQuery = (globalSearchQuery || localSearch).trim().toLowerCase();

  const selectedTicket = useMemo(() => {
    return tickets.find(t => t.id === selectedTicketId) || null;
  }, [tickets, selectedTicketId]);

  const filteredTickets = useMemo(() => {
    return tickets.filter(ticket => {
      // Scope filter
      if (scopeFilter === 'MINE' && currentUser?.name) {
        if (!ticket.createdBy.toLowerCase().includes(currentUser.name.toLowerCase())) {
          return false;
        }
      }
      // Status filter
      if (statusFilter !== 'ALL' && ticket.status !== statusFilter) {
        return false;
      }
      // Search query
      if (activeQuery) {
        const matchId = ticket.id.toLowerCase().includes(activeQuery);
        const matchSubject = ticket.subject.toLowerCase().includes(activeQuery);
        const matchDesc = ticket.description.toLowerCase().includes(activeQuery);
        const matchCat = ticket.category.toLowerCase().includes(activeQuery);
        const matchCreator = ticket.createdBy.toLowerCase().includes(activeQuery);
        return matchId || matchSubject || matchDesc || matchCat || matchCreator;
      }
      return true;
    });
  }, [tickets, scopeFilter, currentUser, statusFilter, activeQuery]);

  const getStatusBadge = (status: TicketStatus) => {
    switch (status) {
      case 'Open':
        return { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE' };
      case 'In Progress':
        return { bg: '#FEF3C7', text: '#B45309', border: '#FDE68A' };
      case 'Waiting for you':
        return { bg: '#F3E8FF', text: '#7E22CE', border: '#E9D5FF' };
      case 'Resolved':
        return { bg: '#ECFDF5', text: '#047857', border: '#A7F3D0' };
      case 'Closed':
        return { bg: '#F1F5F9', text: '#475569', border: '#CBD5E1' };
      default:
        return { bg: '#F1F5F9', text: '#475569', border: '#E2E8F0' };
    }
  };

  const getSeverityBadge = (severity: TicketSeverity) => {
    switch (severity) {
      case 'Critical':
        return { bg: '#FEE2E2', text: '#B91C1C', border: '#FCA5A5' };
      case 'High':
        return { bg: '#FFEDD5', text: '#C2410C', border: '#FDBA74' };
      case 'Medium':
        return { bg: '#FEF3C7', text: '#B45309', border: '#FDE68A' };
      case 'Low':
        return { bg: '#F1F5F9', text: '#475569', border: '#E2E8F0' };
      default:
        return { bg: '#F1F5F9', text: '#475569', border: '#E2E8F0' };
    }
  };

  const handleReplyImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (replyAttachments.length >= 2) {
      alert('Max 2 photos per reply.');
      return;
    }

    const file = files[0];
    const reader = new FileReader();
    reader.onload = event => {
      if (typeof event.target?.result === 'string') {
        setReplyAttachments(prev => [...prev.slice(0, 1), event.target?.result as string]);
      }
    };
    reader.readAsDataURL(file);
    if (replyFileInputRef.current) replyFileInputRef.current.value = '';
  };

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyText.trim()) return;

    setIsSubmittingReply(true);
    try {
      onAddReply(selectedTicket.id, replyText.trim(), replyAttachments);
      setReplyText('');
      setReplyAttachments([]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const handleToggleResolve = () => {
    if (!selectedTicket) return;
    if (selectedTicket.status === 'Resolved' || selectedTicket.status === 'Closed') {
      onUpdateStatus(selectedTicket.id, 'In Progress', 'Ticket reopened by user');
    } else {
      onUpdateStatus(selectedTicket.id, 'Resolved', 'Resolved by desk operator');
    }
  };

  const handleNavigateToEvent = (evtId: string) => {
    if (!onSelectEvent) return;
    const found = events.find(e => e.id === evtId);
    if (found) {
      onSelectEvent(found);
    }
  };

  // ────────────────────────────────────────────────────────
  // DETAIL VIEW
  // ────────────────────────────────────────────────────────
  if (selectedTicket) {
    const statusStyle = getStatusBadge(selectedTicket.status);
    const sevStyle = getSeverityBadge(selectedTicket.severity);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Back navigation & Quick status toggle */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <button
            type="button"
            onClick={() => setSelectedTicketId(null)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: 'none',
              border: 'none',
              color: '#2563EB',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              padding: 0,
            }}
          >
            <ArrowLeft size={14} />
            <span>Back to all tickets</span>
          </button>

          <button
            type="button"
            onClick={handleToggleResolve}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '4px 9px',
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
              background: selectedTicket.status === 'Resolved' ? '#FEF3C7' : '#ECFDF5',
              color: selectedTicket.status === 'Resolved' ? '#B45309' : '#047857',
              border: selectedTicket.status === 'Resolved' ? '1px solid #FDE68A' : '1px solid #A7F3D0',
            }}
          >
            {selectedTicket.status === 'Resolved' ? (
              <>
                <RotateCcw size={12} />
                <span>Reopen</span>
              </>
            ) : (
              <>
                <Check size={12} />
                <span>Mark Resolved</span>
              </>
            )}
          </button>
        </div>

        {/* Ticket Header Card */}
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: 12,
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          {/* Top chips row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 800, fontFamily: 'monospace', color: '#0F172A' }}>
                {selectedTicket.id}
              </span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '2px 7px',
                  borderRadius: 4,
                  background: sevStyle.bg,
                  color: sevStyle.text,
                  border: `1px solid ${sevStyle.border}`,
                }}
              >
                {selectedTicket.severity}
              </span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '2px 7px',
                  borderRadius: 4,
                  background: statusStyle.bg,
                  color: statusStyle.text,
                  border: `1px solid ${statusStyle.border}`,
                }}
              >
                {selectedTicket.status}
              </span>
            </div>

            <span
              style={{
                fontSize: 10.5,
                fontWeight: 600,
                padding: '2px 7px',
                borderRadius: 4,
                background: '#F1F5F9',
                color: '#475569',
              }}
            >
              {selectedTicket.category}
            </span>
          </div>

          {/* Subject */}
          <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', lineHeight: 1.3 }}>
            {selectedTicket.subject}
          </div>

          {/* Creator & Contact */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: 11,
              color: '#64748B',
              paddingTop: 8,
              borderTop: '1px solid #F1F5F9',
            }}
          >
            <div>
              Logged by: <strong>{selectedTicket.createdBy}</strong> ({selectedTicket.createdByRole})
            </div>
            <div style={{ fontFamily: 'monospace', color: '#2563EB', fontWeight: 600 }}>
              {selectedTicket.contactInfo}
            </div>
          </div>
        </div>

        {/* Related Event Deep-Link */}
        {selectedTicket.relatedEventId && (
          <div
            style={{
              background: '#EFF6FF',
              border: '1px solid #BFDBFE',
              borderRadius: 8,
              padding: '10px 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
            }}
          >
            <div>
              <div style={{ fontSize: 11, color: '#1E40AF', fontWeight: 600 }}>
                Linked Track Possession Memo
              </div>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#1D4ED8', fontFamily: 'monospace' }}>
                {selectedTicket.relatedEventId}
              </div>
            </div>
            {onSelectEvent && (
              <button
                type="button"
                onClick={() => handleNavigateToEvent(selectedTicket.relatedEventId!)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '5px 10px',
                  borderRadius: 6,
                  background: '#2563EB',
                  color: '#FFFFFF',
                  fontSize: 11,
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                <span>View Event</span>
                <ExternalLink size={12} />
              </button>
            )}
          </div>
        )}

        {/* Description & Evidence */}
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: 10,
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Description
          </div>
          <div style={{ fontSize: 12, color: '#1E293B', whiteSpace: 'pre-wrap', lineHeight: 1.45 }}>
            {selectedTicket.description}
          </div>

          {/* Attachments preview */}
          {selectedTicket.attachments && selectedTicket.attachments.length > 0 && (
            <div style={{ marginTop: 6 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 6 }}>
                Attached Evidence ({selectedTicket.attachments.length})
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {selectedTicket.attachments.map((att, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setPreviewImageUrl(att)}
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: 6,
                      overflow: 'hidden',
                      border: '1px solid #CBD5E1',
                      padding: 0,
                      cursor: 'pointer',
                      background: '#F1F5F9',
                    }}
                  >
                    <img src={att} alt="attachment" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Context footnote */}
          {selectedTicket.context && (
            <div
              style={{
                fontSize: 10,
                color: '#94A3B8',
                paddingTop: 8,
                borderTop: '1px solid #F1F5F9',
              }}
            >
              Origin: {selectedTicket.context.route} · Device: {selectedTicket.context.browser?.substring(0, 32)}
            </div>
          )}
        </div>

        {/* Timeline & Discussion */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#1E293B' }}>
            Updates & Discussion ({selectedTicket.timeline.length})
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {selectedTicket.timeline.map(item => (
              <div
                key={item.id}
                style={{
                  background: item.type === 'status_change' ? '#F8FAFC' : '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: 8,
                  padding: '10px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: '#0F172A' }}>
                      {item.author}
                    </span>
                    <span style={{ fontSize: 10, color: '#64748B' }}>
                      ({item.role})
                    </span>
                  </div>
                  <span style={{ fontSize: 10, color: '#94A3B8' }}>{item.timestamp}</span>
                </div>

                <div style={{ fontSize: 11.5, color: '#334155', lineHeight: 1.4 }}>
                  {item.text}
                </div>

                {item.attachments && item.attachments.length > 0 && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                    {item.attachments.map((att, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setPreviewImageUrl(att)}
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: 4,
                          overflow: 'hidden',
                          border: '1px solid #CBD5E1',
                          padding: 0,
                          cursor: 'pointer',
                        }}
                      >
                        <img src={att} alt="reply att" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Reply composer */}
          <form
            onSubmit={handleSendReply}
            style={{
              background: '#FFFFFF',
              border: '1px solid #CBD5E1',
              borderRadius: 8,
              padding: '10px',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              marginTop: 4,
            }}
          >
            <textarea
              rows={2}
              placeholder="Post an update or reply..."
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              style={{
                width: '100%',
                border: 'none',
                outline: 'none',
                fontSize: 11.5,
                color: '#1E293B',
                fontFamily: 'inherit',
                resize: 'none',
              }}
            />

            {/* Attached preview */}
            {replyAttachments.length > 0 && (
              <div style={{ display: 'flex', gap: 6 }}>
                {replyAttachments.map((att, idx) => (
                  <div key={idx} style={{ position: 'relative', width: 44, height: 44 }}>
                    <img src={att} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 4 }} />
                    <button
                      type="button"
                      onClick={() => setReplyAttachments([])}
                      style={{
                        position: 'absolute',
                        top: -4,
                        right: -4,
                        width: 16,
                        height: 16,
                        borderRadius: '50%',
                        background: '#DC2626',
                        color: '#FFF',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                      }}
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 6, borderTop: '1px solid #F1F5F9' }}>
              <div>
                <input
                  type="file"
                  ref={replyFileInputRef}
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleReplyImageUpload}
                />
                <button
                  type="button"
                  onClick={() => replyFileInputRef.current?.click()}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#64748B',
                    fontSize: 11,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    cursor: 'pointer',
                    padding: '4px 6px',
                    borderRadius: 4,
                  }}
                >
                  <ImageIcon size={13} />
                  <span>Attach photo</span>
                </button>
              </div>

              <button
                type="submit"
                disabled={!replyText.trim() || isSubmittingReply}
                style={{
                  padding: '5px 12px',
                  borderRadius: 6,
                  background: !replyText.trim() ? '#93C5FD' : '#2563EB',
                  color: '#FFFFFF',
                  fontSize: 11.5,
                  fontWeight: 600,
                  border: 'none',
                  cursor: !replyText.trim() ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <Send size={12} />
                <span>Send Reply</span>
              </button>
            </div>
          </form>
        </div>

        {/* Lightbox Modal */}
        {previewImageUrl && (
          <div
            onClick={() => setPreviewImageUrl(null)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.85)',
              zIndex: 2000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 20,
            }}
          >
            <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}>
              <img
                src={previewImageUrl}
                alt="Enlarged"
                style={{ maxWidth: '100%', maxHeight: '85vh', objectFit: 'contain', borderRadius: 8 }}
              />
              <button
                type="button"
                onClick={() => setPreviewImageUrl(null)}
                style={{
                  position: 'absolute',
                  top: -12,
                  right: -12,
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: '#FFFFFF',
                  color: '#000000',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <X size={18} />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ────────────────────────────────────────────────────────
  // LIST VIEW
  // ────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Search Bar (if not provided globally) */}
      {!globalSearchQuery && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: '#FFFFFF',
            border: '1px solid #CBD5E1',
            borderRadius: 8,
            padding: '6px 10px',
          }}
        >
          <Search size={14} color="#94A3B8" />
          <input
            type="text"
            placeholder="Search tickets by ID, subject, or description..."
            value={localSearch}
            onChange={e => setLocalSearch(e.target.value)}
            style={{
              border: 'none',
              outline: 'none',
              width: '100%',
              fontSize: 11.5,
              color: '#1E293B',
            }}
          />
        </div>
      )}

      {/* Scope toggle (All vs Mine) & Status Filter pills */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* All / Mine selector */}
          <div style={{ display: 'flex', background: '#F1F5F9', borderRadius: 6, padding: 2 }}>
            <button
              type="button"
              onClick={() => setScopeFilter('ALL')}
              style={{
                padding: '3px 8px',
                borderRadius: 4,
                fontSize: 11,
                fontWeight: scopeFilter === 'ALL' ? 700 : 500,
                background: scopeFilter === 'ALL' ? '#FFFFFF' : 'transparent',
                color: scopeFilter === 'ALL' ? '#0F172A' : '#64748B',
                border: 'none',
                cursor: 'pointer',
                boxShadow: scopeFilter === 'ALL' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
              }}
            >
              All Tickets ({tickets.length})
            </button>
            <button
              type="button"
              onClick={() => setScopeFilter('MINE')}
              style={{
                padding: '3px 8px',
                borderRadius: 4,
                fontSize: 11,
                fontWeight: scopeFilter === 'MINE' ? 700 : 500,
                background: scopeFilter === 'MINE' ? '#FFFFFF' : 'transparent',
                color: scopeFilter === 'MINE' ? '#0F172A' : '#64748B',
                border: 'none',
                cursor: 'pointer',
                boxShadow: scopeFilter === 'MINE' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
              }}
            >
              My Logged Tickets
            </button>
          </div>

          {onOpenRaiseTicket && (
            <button
              type="button"
              onClick={onOpenRaiseTicket}
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: '#2563EB',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              + Raise New
            </button>
          )}
        </div>

        {/* Status Filter Scroll */}
        <div
          style={{
            display: 'flex',
            gap: 6,
            overflowX: 'auto',
            paddingBottom: 2,
            scrollbarWidth: 'none',
          }}
        >
          {STATUS_FILTERS.map(filter => {
            const isSelected = statusFilter === filter.id;
            return (
              <button
                key={filter.id}
                type="button"
                onClick={() => setStatusFilter(filter.id)}
                style={{
                  padding: '3px 8px',
                  borderRadius: 9999,
                  fontSize: 10.5,
                  fontWeight: isSelected ? 700 : 500,
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                  background: isSelected ? '#1E293B' : '#F1F5F9',
                  color: isSelected ? '#FFFFFF' : '#475569',
                  border: isSelected ? '1px solid #1E293B' : '1px solid #E2E8F0',
                  transition: 'all 0.15s ease',
                }}
              >
                {filter.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tickets List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filteredTickets.length === 0 ? (
          <div
            style={{
              padding: '32px 16px',
              textAlign: 'center',
              background: '#FFFFFF',
              borderRadius: 10,
              border: '1px dashed #CBD5E1',
            }}
          >
            <Ticket size={28} color="#94A3B8" style={{ margin: '0 auto 8px' }} />
            <div style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>
              No support tickets found
            </div>
            <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2, marginBottom: 12 }}>
              Try clearing status filters or log a new inquiry.
            </div>
            {onOpenRaiseTicket && (
              <button
                type="button"
                onClick={onOpenRaiseTicket}
                style={{
                  padding: '6px 14px',
                  borderRadius: 6,
                  background: '#2563EB',
                  color: '#FFFFFF',
                  fontSize: 11.5,
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Raise a Ticket
              </button>
            )}
          </div>
        ) : (
          filteredTickets.map(ticket => {
            const statusStyle = getStatusBadge(ticket.status);
            const sevStyle = getSeverityBadge(ticket.severity);

            return (
              <div
                key={ticket.id}
                onClick={() => setSelectedTicketId(ticket.id)}
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: 10,
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  cursor: 'pointer',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                  transition: 'border-color 0.15s ease, transform 0.1s ease',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = '#93C5FD';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = '#E2E8F0';
                }}
              >
                {/* Top line: ID + Badges */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 800, fontFamily: 'monospace', color: '#0F172A' }}>
                      {ticket.id}
                    </span>
                    <span
                      style={{
                        fontSize: 9.5,
                        fontWeight: 700,
                        padding: '1px 6px',
                        borderRadius: 4,
                        background: sevStyle.bg,
                        color: sevStyle.text,
                        border: `1px solid ${sevStyle.border}`,
                      }}
                    >
                      {ticket.severity}
                    </span>
                  </div>

                  <span
                    style={{
                      fontSize: 9.5,
                      fontWeight: 700,
                      padding: '1px 6px',
                      borderRadius: 4,
                      background: statusStyle.bg,
                      color: statusStyle.text,
                      border: `1px solid ${statusStyle.border}`,
                    }}
                  >
                    {ticket.status}
                  </span>
                </div>

                {/* Subject */}
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', lineHeight: 1.3 }}>
                  {ticket.subject}
                </div>

                {/* Description snippet */}
                <div
                  style={{
                    fontSize: 11,
                    color: '#64748B',
                    lineHeight: 1.35,
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                  }}
                >
                  {ticket.description}
                </div>

                {/* Footer line: Author, Category, and Photo indicator */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: 10.5,
                    color: '#94A3B8',
                    paddingTop: 6,
                    borderTop: '1px solid #F8FAFC',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>{ticket.createdBy}</span>
                    <span>·</span>
                    <span style={{ color: '#475569' }}>{ticket.category}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {ticket.attachments && ticket.attachments.length > 0 && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 2, color: '#64748B' }}>
                        <ImageIcon size={11} />
                        <span>{ticket.attachments.length}</span>
                      </span>
                    )}
                    <span>{ticket.timeline.length} updates</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

