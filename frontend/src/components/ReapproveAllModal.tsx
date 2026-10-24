import React, { useEffect, useRef } from 'react';
import { RefreshCw, CheckCircle2, AlertTriangle, X } from 'lucide-react';

interface ReapproveAllModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  suspendedCount: number;
}

export const ReapproveAllModal: React.FC<ReapproveAllModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  suspendedCount,
}) => {
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => confirmBtnRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="reapprove-modal-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(3px)',
      }}
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 480,
          background: '#FFFFFF',
          borderRadius: 14,
          border: '1px solid #CBD5E1',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          animation: 'fadeIn 0.2s ease-out',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 22px 14px',
            background: '#EFF6FF',
            borderBottom: '1px solid #BFDBFE',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: '#DBEAFE',
                border: '1.5px solid #93C5FD',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#1D4ED8',
              }}
            >
              <RefreshCw size={18} />
            </div>
            <div>
              <h3
                id="reapprove-modal-title"
                style={{
                  margin: 0,
                  fontSize: 16,
                  fontWeight: 800,
                  color: '#1E3A8A',
                  letterSpacing: '-0.01em',
                }}
              >
                Re-approve All Suspended Works?
              </h3>
              <div style={{ fontSize: 11.5, color: '#3B82F6', marginTop: 1, fontWeight: 500 }}>
                Resumption of track possession &amp; power cut
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#64748B',
              padding: 4,
              borderRadius: 6,
            }}
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '20px 22px' }}>
          <div
            style={{
              padding: '12px 14px',
              background: '#F0FDF4',
              border: '1px solid #BBF7D0',
              borderRadius: 8,
              marginBottom: 16,
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
            }}
          >
            <CheckCircle2 size={18} color="#16A34A" style={{ flexShrink: 0, marginTop: 1 }} />
            <div style={{ fontSize: 12.5, color: '#166534', lineHeight: 1.4 }}>
              Re-approve and resume <strong>{suspendedCount} suspended work{suspendedCount > 1 ? 's' : ''}</strong>? Track possession and 25kV catenary power cut will be re-instated immediately.
            </div>
          </div>

          <p style={{ margin: 0, fontSize: 12, color: '#64748B', lineHeight: 1.5 }}>
            All safety checks will be marked as verified, and the countdown timers will resume from their paused timestamp.
          </p>
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 10,
            borderTop: '1px solid #E2E8F0',
            padding: '14px 22px',
            background: '#F8FAFC',
          }}
        >
          <button
            type="button"
            onClick={onClose}
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
            ref={confirmBtnRef}
            type="button"
            id="confirm-reapprove-all-btn"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 18px',
              borderRadius: 8,
              border: 'none',
              background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
              color: '#FFFFFF',
              fontSize: 12.5,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(37,99,235,0.3)',
            }}
          >
            <RefreshCw size={14} />
            <span>Confirm &amp; Resume All ({suspendedCount})</span>
          </button>
        </div>
      </div>
    </div>
  );
};

