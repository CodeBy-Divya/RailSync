import React, { useState } from 'react';
import {
  Phone, Copy, Check, AlertOctagon, PhoneCall, ShieldAlert,
  ArrowRight, X, AlertTriangle, Radio
} from 'lucide-react';
import { EMERGENCY_HOTLINES, EmergencyContact } from '../../data/supportData';

interface EmergencyCallCardProps {
  onReportEmergency: (reason: string, location?: string) => void;
}

export const EmergencyCallCard: React.FC<EmergencyCallCardProps> = ({ onReportEmergency }) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [emergencyReason, setEmergencyReason] = useState('');
  const [emergencyLocation, setEmergencyLocation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successReportId, setSuccessReportId] = useState<string | null>(null);

  const mainDcc = EMERGENCY_HOTLINES[0]; // Division Control Center (Ext. 4022)
  const quickChips = EMERGENCY_HOTLINES.slice(1);

  const handleCopy = (text: string, id: string) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (_) {}
  };

  const handleConfirmEmergency = () => {
    if (!emergencyReason.trim()) return;
    setIsSubmitting(true);
    try {
      const ticket: any = onReportEmergency(emergencyReason.trim(), emergencyLocation.trim());
      setSuccessReportId(ticket?.id || 'EMG-LOGGED');
      setTimeout(() => {
        setIsSubmitting(false);
        setIsModalOpen(false);
        setEmergencyReason('');
        setEmergencyLocation('');
        setSuccessReportId(null);
      }, 1800);
    } catch (err) {
      console.error(err);
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        background: '#FEF2F2',
        border: '1.5px solid #FCA5A5',
        borderRadius: 14,
        padding: '16px 18px',
        boxShadow: '0 2px 8px rgba(220, 38, 38, 0.08)',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      {/* Top row: Title & Report Emergency button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: '#FEE2E2',
              border: '1.5px solid #F87171',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#DC2626',
              flexShrink: 0,
            }}
          >
            <AlertOctagon size={18} className="animate-pulse" />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#991B1B', letterSpacing: '-0.01em' }}>
              Division Control Center (DCC)
            </div>
            <div style={{ fontSize: 11, color: '#7F1D1D', fontWeight: 500 }}>
              24x7 Statutory Control Room Hotline
            </div>
          </div>
        </div>

        {/* Report Emergency Action */}
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 12px',
            borderRadius: 7,
            background: '#DC2626',
            color: '#FFFFFF',
            border: 'none',
            fontSize: 11.5,
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(220,38,38,0.25)',
            transition: 'all 0.15s ease',
          }}
          title="Escalate safety incident to Control Room"
        >
          <ShieldAlert size={14} />
          <span>Report Emergency</span>
        </button>
      </div>

      {/* Hero Call Strip: Danapur Ext. 4022 */}
      <div
        style={{
          background: '#FFFFFF',
          border: '1px solid #FECACA',
          borderRadius: 10,
          padding: '12px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 10,
        }}
      >
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#DC2626', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Direct Hotline Extension
          </div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#1E293B', fontFamily: 'JetBrains Mono, monospace' }}>
            {mainDcc.number}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {/* Call Now */}
          <a
            href={mainDcc.telUri}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '7px 14px',
              borderRadius: 7,
              background: 'linear-gradient(135deg, #16A34A 0%, #15803D 100%)',
              color: '#FFFFFF',
              fontSize: 12,
              fontWeight: 700,
              textDecoration: 'none',
              boxShadow: '0 2px 6px rgba(22,163,74,0.3)',
            }}
          >
            <PhoneCall size={14} />
            <span>Call Now</span>
          </a>

          {/* Copy Number */}
          <button
            type="button"
            onClick={() => handleCopy(mainDcc.number, mainDcc.id)}
            aria-label="Copy Division Control Center extension number"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '7px 10px',
              borderRadius: 7,
              background: '#F1F5F9',
              border: '1px solid #CBD5E1',
              color: '#475569',
              fontSize: 11.5,
              fontWeight: 600,
              cursor: 'pointer',
            }}
            title="Copy number to clipboard"
          >
            {copiedId === mainDcc.id ? <Check size={14} color="#16A34A" /> : <Copy size={14} />}
            <span>{copiedId === mainDcc.id ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {/* Quick-Dial Chips */}
      <div>
        <div style={{ fontSize: 10.5, fontWeight: 700, color: '#7F1D1D', marginBottom: 6 }}>
          Quick-Call Extensions &amp; National Helplines:
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {quickChips.map(chip => (
            <div
              key={chip.id}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                background: chip.isNationalHelpline ? '#FFFBEB' : '#FFFFFF',
                border: chip.isNationalHelpline ? '1px solid #FDE68A' : '1px solid #FECACA',
                padding: '4px 8px',
                borderRadius: 6,
                fontSize: 11,
              }}
            >
              <span style={{ fontWeight: 600, color: chip.isNationalHelpline ? '#92400E' : '#334155' }}>
                {chip.title.split('/')[0].trim()}
              </span>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: chip.isNationalHelpline ? '#B45309' : '#DC2626' }}>
                {chip.number}
              </span>
              <a
                href={chip.telUri}
                style={{
                  color: '#2563EB',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '2px',
                }}
                title={`Call ${chip.number}`}
                aria-label={`Call ${chip.title} at ${chip.number}`}
              >
                <Phone size={11} />
              </a>
              <button
                type="button"
                onClick={() => handleCopy(chip.number, chip.id)}
                aria-label={`Copy ${chip.number}`}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 1,
                  color: '#64748B',
                  display: 'flex',
                }}
                title="Copy number"
              >
                {copiedId === chip.id ? <Check size={11} color="#16A34A" /> : <Copy size={11} />}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ── Report Emergency Confirmation Dialog ───── */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="report-emg-title"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 3000,
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            animation: 'fadeIn 0.2s ease-out',
          }}
          onClick={e => {
            if (e.target === e.currentTarget && !isSubmitting) setIsModalOpen(false);
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 480,
              background: '#FFFFFF',
              borderRadius: 14,
              border: '1.5px solid #FCA5A5',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '16px 20px',
                background: '#FEF2F2',
                borderBottom: '1px solid #FECACA',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: '50%',
                    background: '#FEE2E2',
                    border: '1.5px solid #F87171',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#DC2626',
                  }}
                >
                  <AlertTriangle size={18} />
                </div>
                <div>
                  <h3 id="report-emg-title" style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#991B1B' }}>
                    Report Safety Incident / Emergency
                  </h3>
                  <div style={{ fontSize: 11, color: '#7F1D1D', marginTop: 1 }}>
                    Notifies Station Master, TPC &amp; Section Controller immediately
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !isSubmitting && setIsModalOpen(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748B' }}
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div
                style={{
                  padding: '10px 12px',
                  background: '#FFFBEB',
                  border: '1px solid #FDE68A',
                  borderRadius: 8,
                  fontSize: 12,
                  color: '#92400E',
                  lineHeight: 1.4,
                }}
              >
                <strong>Notice:</strong> This action creates a high-priority incident ticket, posts a broadcast alert in Messages to <strong>@OPERATING</strong>, and writes to the statutory audit ledger. It does <em>not</em> issue train-control stops automatically.
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#1E293B', marginBottom: 5 }}>
                  Emergency Description / Reason <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Broken catenary dropper at KM 548/14, ballast washout reported, signal flashover..."
                  value={emergencyReason}
                  onChange={e => setEmergencyReason(e.target.value)}
                  style={{
                    width: '100%',
                    borderRadius: 8,
                    border: '1px solid #CBD5E1',
                    padding: '8px 12px',
                    fontSize: 12.5,
                    outline: 'none',
                    resize: 'none',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#1E293B', marginBottom: 5 }}>
                  Location / Track Details (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Danapur (DNR) Up Main crossover, Pillar #14/B"
                  value={emergencyLocation}
                  onChange={e => setEmergencyLocation(e.target.value)}
                  style={{
                    width: '100%',
                    borderRadius: 8,
                    border: '1px solid #CBD5E1',
                    padding: '8px 12px',
                    fontSize: 12.5,
                    outline: 'none',
                  }}
                />
              </div>

              {successReportId && (
                <div
                  style={{
                    padding: '10px 12px',
                    borderRadius: 8,
                    background: '#F0FDF4',
                    border: '1px solid #BBF7D0',
                    color: '#15803D',
                    fontSize: 12.5,
                    fontWeight: 700,
                  }}
                >
                  ✓ Emergency Incident {successReportId} broadcasted to Control Room!
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: '14px 20px',
                background: '#F8FAFC',
                borderTop: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: 10,
              }}
            >
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                disabled={isSubmitting}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  border: '1px solid #CBD5E1',
                  background: '#FFFFFF',
                  color: '#475569',
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmEmergency}
                disabled={!emergencyReason.trim() || isSubmitting}
                style={{
                  padding: '8px 18px',
                  borderRadius: 8,
                  border: 'none',
                  background: '#DC2626',
                  color: '#FFFFFF',
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: !emergencyReason.trim() || isSubmitting ? 'not-allowed' : 'pointer',
                  opacity: !emergencyReason.trim() || isSubmitting ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  boxShadow: '0 2px 6px rgba(220,38,38,0.3)',
                }}
              >
                <AlertOctagon size={14} />
                <span>{isSubmitting ? 'Escalating...' : 'Confirm & Broadcast Emergency'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
