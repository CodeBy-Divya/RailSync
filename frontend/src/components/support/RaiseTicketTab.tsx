import React, { useState, useRef } from 'react';
import {
  Send, AlertTriangle, Paperclip, X, Image as ImageIcon,
  CheckCircle2, Info, Loader2, Sparkles, ShieldAlert
} from 'lucide-react';
import { TicketCategory, TicketSeverity, SupportTicket } from '../../hooks/useSupportStore';
import { OperationalEvent } from '../../types';

interface RaiseTicketTabProps {
  onCreateTicket: (data: {
    category: TicketCategory;
    severity: TicketSeverity;
    relatedEventId?: string;
    subject: string;
    description: string;
    attachments?: string[];
    contactInfo?: string;
    currentRoute?: string;
  }) => SupportTicket;
  events?: OperationalEvent[];
  currentUser?: { name: string; role: string; department?: string; station?: string } | null;
  onSwitchTab?: (tab: 'contacts' | 'raise' | 'tickets' | 'guides') => void;
  preselectedCategory?: TicketCategory;
}

const CATEGORIES: TicketCategory[] = [
  'Software / App issue',
  'Data mismatch',
  'Approval or Quorum issue',
  'Field App or Geo Camera',
  'Safety concern',
  'Access / Login',
  'Feedback',
  'Other',
];

const SEVERITIES: { id: TicketSeverity; label: string; desc: string; color: string; bg: string; border: string }[] = [
  { id: 'Low', label: 'Low', desc: 'Cosmetic or minor inquiry', color: '#475569', bg: '#F1F5F9', border: '#CBD5E1' },
  { id: 'Medium', label: 'Medium', desc: 'Operational workaround exists', color: '#B45309', bg: '#FEF3C7', border: '#FDE68A' },
  { id: 'High', label: 'High', desc: 'Blocks ongoing track clearance', color: '#C2410C', bg: '#FFEDD5', border: '#FDBA74' },
  { id: 'Critical', label: 'Critical', desc: 'Immediate safety or service halt', color: '#B91C1C', bg: '#FEE2E2', border: '#FCA5A5' },
];

export const RaiseTicketTab: React.FC<RaiseTicketTabProps> = ({
  onCreateTicket,
  events = [],
  currentUser,
  onSwitchTab,
  preselectedCategory,
}) => {
  const [category, setCategory] = useState<TicketCategory>(preselectedCategory || 'Software / App issue');
  const [severity, setSeverity] = useState<TicketSeverity>('Medium');
  const [relatedEventId, setRelatedEventId] = useState<string>('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [contactInfo, setContactInfo] = useState(
    currentUser ? `${currentUser.name} (${currentUser.role}) Ext. 4022` : 'Ravi Amish (SM Desk) Ext. 4022'
  );
  const [attachments, setAttachments] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successTicketId, setSuccessTicketId] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const isSafetyOrCritical = severity === 'Critical' || category === 'Safety concern';

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (attachments.length >= 3) {
      alert('Maximum 3 photo attachments allowed per ticket.');
      return;
    }

    const file = files[0];
    const reader = new FileReader();
    reader.onload = event => {
      const img = new Image();
      img.onload = () => {
        // Compress using canvas
        const canvas = document.createElement('canvas');
        const maxDim = 1000;
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.82);
          setAttachments(prev => [...prev.slice(0, 2), compressedDataUrl]);
        }
      };
      if (typeof event.target?.result === 'string') {
        img.src = event.target.result;
      }
    };
    reader.readAsDataURL(file);

    // reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!subject.trim()) {
      setValidationError('Please enter a brief subject.');
      return;
    }
    if (!description.trim()) {
      setValidationError('Please provide a description of the issue or concern.');
      return;
    }

    setIsSubmitting(true);
    try {
      const ticket = onCreateTicket({
        category,
        severity,
        relatedEventId: relatedEventId.trim() || undefined,
        subject: subject.trim(),
        description: description.trim(),
        attachments,
        contactInfo: contactInfo.trim(),
        currentRoute: window.location.pathname || '/workspace',
      });

      setSuccessTicketId(ticket.id);

      setTimeout(() => {
        setIsSubmitting(false);
        // Switch to tickets tab so user sees the newly logged ticket
        if (onSwitchTab) {
          onSwitchTab('tickets');
        }
      }, 1200);
    } catch (err) {
      console.error(err);
      setValidationError('Failed to log ticket. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* ── Success Banner ─────────────────────────────── */}
      {successTicketId && (
        <div
          style={{
            background: '#ECFDF5',
            border: '1.5px solid #6EE7B7',
            borderRadius: 10,
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            color: '#065F46',
          }}
        >
          <CheckCircle2 size={18} color="#059669" className="shrink-0" />
          <div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>
              Ticket Created: {successTicketId}
            </div>
            <div style={{ fontSize: 11, color: '#047857' }}>
              Logged into the statutory support register. Redirecting to My Tickets...
            </div>
          </div>
        </div>
      )}

      {/* ── Urgent Safety Warning Banner ───────────────── */}
      {isSafetyOrCritical && (
        <div
          style={{
            background: '#FEF2F2',
            border: '1.5px solid #FCA5A5',
            borderRadius: 10,
            padding: '10px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            color: '#991B1B',
          }}
        >
          <ShieldAlert size={18} color="#DC2626" className="shrink-0 animate-pulse" />
          <div style={{ fontSize: 11.5, lineHeight: 1.35 }}>
            <strong style={{ fontWeight: 700 }}>Immediate Safety Notice:</strong> For live track hazards, runaway vehicles, or catenary parting, also call Division Control Center directly at{' '}
            <a href="tel:+916122584022" style={{ color: '#DC2626', fontWeight: 800, textDecoration: 'underline' }}>
              Ext. 4022
            </a>.
          </div>
        </div>
      )}

      {/* ── Validation Error ───────────────────────────── */}
      {validationError && (
        <div
          style={{
            background: '#FEF2F2',
            border: '1px solid #FECDD3',
            borderRadius: 8,
            padding: '8px 12px',
            fontSize: 12,
            color: '#991B1B',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <AlertTriangle size={14} color="#DC2626" />
          <span>{validationError}</span>
        </div>
      )}

      {/* ── Category & Severity ────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label style={{ fontSize: 11.5, fontWeight: 700, color: '#1E293B' }}>
          Issue Category <span style={{ color: '#DC2626' }}>*</span>
        </label>
        <select
          value={category}
          onChange={e => setCategory(e.target.value as TicketCategory)}
          style={{
            padding: '8px 10px',
            borderRadius: 8,
            border: '1px solid #CBD5E1',
            background: '#FFFFFF',
            fontSize: 12,
            color: '#1E293B',
            outline: 'none',
            cursor: 'pointer',
          }}
        >
          {CATEGORIES.map(cat => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {/* ── Severity Selector ──────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <label style={{ fontSize: 11.5, fontWeight: 700, color: '#1E293B' }}>
            Severity Level <span style={{ color: '#DC2626' }}>*</span>
          </label>
          <span style={{ fontSize: 10.5, color: '#64748B' }}>
            {SEVERITIES.find(s => s.id === severity)?.desc}
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
          {SEVERITIES.map(sev => {
            const isSelected = severity === sev.id;
            return (
              <button
                key={sev.id}
                type="button"
                onClick={() => setSeverity(sev.id)}
                style={{
                  padding: '6px 4px',
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: isSelected ? 800 : 600,
                  cursor: 'pointer',
                  border: isSelected ? `2px solid ${sev.color}` : '1px solid #E2E8F0',
                  background: isSelected ? sev.bg : '#F8FAFC',
                  color: isSelected ? sev.color : '#64748B',
                  textAlign: 'center',
                  transition: 'all 0.15s ease',
                }}
              >
                {sev.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Related Event ID (Optional) ────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <label style={{ fontSize: 11.5, fontWeight: 700, color: '#1E293B' }}>
            Related Block Event (Optional)
          </label>
          <span style={{ fontSize: 10, color: '#94A3B8' }}>Links to Approval Portal</span>
        </div>
        <select
          value={relatedEventId}
          onChange={e => setRelatedEventId(e.target.value)}
          style={{
            padding: '8px 10px',
            borderRadius: 8,
            border: '1px solid #CBD5E1',
            background: '#FFFFFF',
            fontSize: 11.5,
            color: '#1E293B',
            outline: 'none',
            cursor: 'pointer',
          }}
        >
          <option value="">None / General Inquiry</option>
          {events.map(evt => (
            <option key={evt.id} value={evt.id}>
              {evt.id} — {(evt.description || evt.section).substring(0, 45)} ({evt.section})
            </option>
          ))}
        </select>
      </div>

      {/* ── Subject Input ──────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label style={{ fontSize: 11.5, fontWeight: 700, color: '#1E293B' }}>
          Subject <span style={{ color: '#DC2626' }}>*</span>
        </label>
        <input
          type="text"
          placeholder="e.g. Signal clamp telemetry delay on Danapur Up Loop"
          value={subject}
          onChange={e => setSubject(e.target.value)}
          maxLength={100}
          required
          style={{
            padding: '8px 10px',
            borderRadius: 8,
            border: '1px solid #CBD5E1',
            background: '#FFFFFF',
            fontSize: 12,
            color: '#1E293B',
            outline: 'none',
          }}
        />
      </div>

      {/* ── Description Textarea with Char Counter ──────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <label style={{ fontSize: 11.5, fontWeight: 700, color: '#1E293B' }}>
            Description <span style={{ color: '#DC2626' }}>*</span>
          </label>
          <span style={{ fontSize: 10.5, color: description.length > 450 ? '#DC2626' : '#94A3B8' }}>
            {description.length} / 500
          </span>
        </div>
        <textarea
          rows={4}
          placeholder="Detailed observations, equipment IDs, chainage KM, or steps to reproduce..."
          value={description}
          onChange={e => setDescription(e.target.value.substring(0, 500))}
          required
          style={{
            padding: '8px 10px',
            borderRadius: 8,
            border: '1px solid #CBD5E1',
            background: '#FFFFFF',
            fontSize: 12,
            color: '#1E293B',
            outline: 'none',
            resize: 'vertical',
            fontFamily: 'inherit',
          }}
        />
      </div>

      {/* ── Photo Attachments (Max 3) ──────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <label style={{ fontSize: 11.5, fontWeight: 700, color: '#1E293B' }}>
            Photo Evidence (Max 3)
          </label>
          <span style={{ fontSize: 10.5, color: '#94A3B8' }}>
            {attachments.length} / 3 attached
          </span>
        </div>

        {/* Thumbnails Row */}
        {attachments.length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {attachments.map((dataUrl, idx) => (
              <div
                key={idx}
                style={{
                  position: 'relative',
                  width: 64,
                  height: 64,
                  borderRadius: 6,
                  overflow: 'hidden',
                  border: '1px solid #CBD5E1',
                  background: '#F1F5F9',
                }}
              >
                <img
                  src={dataUrl}
                  alt={`Attachment ${idx + 1}`}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <button
                  type="button"
                  onClick={() => handleRemoveAttachment(idx)}
                  title="Remove photo"
                  style={{
                    position: 'absolute',
                    top: 2,
                    right: 2,
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    background: 'rgba(0,0,0,0.7)',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Upload Button */}
        {attachments.length < 3 && (
          <div>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleImageUpload}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 12px',
                borderRadius: 7,
                background: '#F8FAFC',
                border: '1px dashed #CBD5E1',
                color: '#475569',
                fontSize: 11.5,
                fontWeight: 600,
                cursor: 'pointer',
                width: '100%',
                justifyContent: 'center',
              }}
            >
              <ImageIcon size={14} color="#64748B" />
              <span>Attach Photo / Screenshot</span>
            </button>
          </div>
        )}
      </div>

      {/* ── Contact Info ──────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label style={{ fontSize: 11.5, fontWeight: 700, color: '#1E293B' }}>
          Contact Me On
        </label>
        <input
          type="text"
          value={contactInfo}
          onChange={e => setContactInfo(e.target.value)}
          placeholder="Name and telephone / extension"
          style={{
            padding: '8px 10px',
            borderRadius: 8,
            border: '1px solid #CBD5E1',
            background: '#FFFFFF',
            fontSize: 11.5,
            color: '#1E293B',
            outline: 'none',
          }}
        />
      </div>

      {/* ── Silent Context Badge ───────────────────────── */}
      <div
        style={{
          background: '#F8FAFC',
          border: '1px solid #E2E8F0',
          borderRadius: 8,
          padding: '8px 10px',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 10.5,
          color: '#64748B',
        }}
      >
        <Info size={13} color="#94A3B8" className="shrink-0" />
        <div>
          <strong>Auto-attached context:</strong> Route ({window.location.pathname || '/workspace'}), User ({currentUser?.name || 'Ravi Amish'}), Timestamp (UTC).
        </div>
      </div>

      {/* ── Submit Action ──────────────────────────────── */}
      <button
        type="submit"
        disabled={isSubmitting || !subject.trim() || !description.trim()}
        style={{
          marginTop: 6,
          padding: '10px 16px',
          borderRadius: 8,
          background: isSubmitting ? '#93C5FD' : '#2563EB',
          color: '#FFFFFF',
          fontSize: 12.5,
          fontWeight: 700,
          border: 'none',
          cursor: isSubmitting ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          boxShadow: '0 2px 6px rgba(37,99,235,0.25)',
          transition: 'background 0.15s ease',
        }}
      >
        {isSubmitting ? (
          <>
            <Loader2 size={15} className="animate-spin" />
            <span>Registering Ticket...</span>
          </>
        ) : (
          <>
            <Send size={14} />
            <span>Submit Ticket</span>
          </>
        )}
      </button>
    </form>
  );
};
