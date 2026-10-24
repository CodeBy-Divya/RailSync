import React, { useState, useEffect, useRef } from 'react';
import { OctagonX, AlertTriangle, X, ShieldAlert, Loader2 } from 'lucide-react';
import { isUserAuthorized } from '../hooks/useEmergencyStop';

interface EmergencyStopButtonProps {
  ongoingCount: number;
  currentUser: { username: string; name: string; role: string; station: string } | null;
  onActivate: (reason: string) => Promise<boolean> | boolean;
}

export const EmergencyStopButton: React.FC<EmergencyStopButtonProps> = ({
  ongoingCount,
  currentUser,
  onActivate,
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const isDisabled = ongoingCount === 0;

  // Check role authorization:
  // Authorized: Station Master Desk, Station Master, Section Controller, Admin
  const authorized = currentUser ? isUserAuthorized(currentUser.role) : true;

  // Reset form when modal opens
  useEffect(() => {
    if (modalOpen) {
      setReason('');
      setIsSubmitting(false);
      setAuthError(null);
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 50);
    }
  }, [modalOpen]);

  // Handle ESC key and focus trap
  useEffect(() => {
    if (!modalOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        setModalOpen(false);
        triggerRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modalOpen, isSubmitting]);

  const handleOpenModal = () => {
    if (isDisabled) return;
    setModalOpen(true);
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!authorized) {
      setAuthError('You are not authorized to trigger an emergency stop. Only Station Master Desk, Section Controller, and Division Safety Admin possess executive suspension override.');
      return;
    }

    if (reason.trim().length < 10) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onActivate(reason);
      setModalOpen(false);
      triggerRef.current?.focus();
    } catch (err: any) {
      setAuthError(err.message || 'Failed to activate emergency stop.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={handleOpenModal}
        disabled={isDisabled}
        id="emergency-stop-btn"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 20px',
          borderRadius: 8,
          border: 'none',
          background: isDisabled
            ? '#94A3B8'
            : 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
          color: '#FFFFFF',
          fontSize: 13,
          fontWeight: 700,
          cursor: isDisabled ? 'not-allowed' : 'pointer',
          opacity: isDisabled ? 0.65 : 1,
          boxShadow: isDisabled
            ? 'none'
            : '0 2px 10px rgba(220,38,38,0.35)',
          transition: 'all 0.15s ease',
          position: 'relative',
        }}
        title={isDisabled ? 'No ongoing work to stop' : 'Activate Emergency Stop across all track sections'}
        className={!isDisabled ? 'ring-2 ring-red-400/40 ring-offset-1 ring-offset-white' : ''}
      >
        <OctagonX size={17} color="#FFFFFF" className={!isDisabled ? 'animate-pulse' : ''} />
        <span>Emergency Stop</span>
      </button>

      {/* ── Confirmation Modal ────────────────────────────────────────── */}
      {modalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="emergency-modal-title"
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
            if (e.target === e.currentTarget && !isSubmitting) {
              setModalOpen(false);
              triggerRef.current?.focus();
            }
          }}
        >
          <div
            ref={modalRef}
            style={{
              width: '100%',
              maxWidth: 520,
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
                padding: '20px 24px 16px',
                background: '#FEF2F2',
                borderBottom: '1px solid #FCA5A5',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 16,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    background: '#FEE2E2',
                    border: '2px solid #F87171',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#DC2626',
                    flexShrink: 0,
                  }}
                >
                  <OctagonX size={22} />
                </div>
                <div>
                  <h3
                    id="emergency-modal-title"
                    style={{
                      margin: 0,
                      fontSize: 18,
                      fontWeight: 800,
                      color: '#991B1B',
                      letterSpacing: '-0.01em',
                    }}
                  >
                    Activate Emergency Stop?
                  </h3>
                  <div style={{ fontSize: 12, color: '#B91C1C', marginTop: 2, fontWeight: 500 }}>
                    Immediate statutory safety suspension protocol
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => !isSubmitting && setModalOpen(false)}
                disabled={isSubmitting}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  color: '#991B1B',
                  padding: 4,
                  borderRadius: 6,
                }}
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <form onSubmit={handleConfirm} style={{ padding: '20px 24px' }}>
              <div
                style={{
                  padding: '12px 14px',
                  background: '#FFF1F2',
                  border: '1px solid #FFE4E6',
                  borderRadius: 8,
                  marginBottom: 16,
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                }}
              >
                <AlertTriangle size={18} color="#E11D48" style={{ flexShrink: 0, marginTop: 1 }} />
                <div style={{ fontSize: 12.5, color: '#9F1239', lineHeight: 1.4, fontWeight: 500 }}>
                  <strong>Warning:</strong> All ongoing work across all sections ({ongoingCount} active block{ongoingCount > 1 ? 's' : ''}) will be immediately suspended and moved to Pending Approvals for safety review.
                </div>
              </div>

              {/* Role Check Warning if not authorized */}
              {authError && (
                <div
                  style={{
                    padding: '10px 14px',
                    background: '#FEF2F2',
                    border: '1.5px solid #DC2626',
                    borderRadius: 8,
                    marginBottom: 16,
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#991B1B',
                    lineHeight: 1.4,
                  }}
                >
                  ⚠️ {authError}
                </div>
              )}

              {/* Reason Field */}
              <div style={{ marginBottom: 20 }}>
                <label
                  htmlFor="emergency-reason"
                  style={{
                    display: 'block',
                    fontSize: 12,
                    fontWeight: 700,
                    color: '#0F172A',
                    marginBottom: 6,
                  }}
                >
                  Suspension Reason <span style={{ color: '#DC2626' }}>*</span>
                  <span style={{ fontSize: 11, fontWeight: 400, color: '#64748B', marginLeft: 6 }}>
                    (Minimum 10 characters required)
                  </span>
                </label>
                <textarea
                  ref={textareaRef}
                  id="emergency-reason"
                  rows={3}
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  disabled={isSubmitting}
                  placeholder="Enter reason, e.g. Track buckling reported at KM 548/12, urgent safety audit required..."
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: reason.trim().length > 0 && reason.trim().length < 10
                      ? '1.5px solid #F87171'
                      : '1px solid #CBD5E1',
                    outline: 'none',
                    fontSize: 12.5,
                    fontFamily: 'inherit',
                    color: '#0F172A',
                    background: '#FFFFFF',
                    resize: 'vertical',
                    boxSizing: 'border-box',
                  }}
                />
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: 4,
                  }}
                >
                  <span style={{ fontSize: 11, color: reason.trim().length >= 10 ? '#16A34A' : '#94A3B8' }}>
                    {reason.trim().length >= 10 ? '✓ Valid justification' : `${10 - reason.trim().length} more characters needed`}
                  </span>
                  <span style={{ fontSize: 11, color: '#94A3B8' }}>
                    Authorized: {currentUser?.name || 'Divya Singh'} ({currentUser?.role || 'Station Master Desk'})
                  </span>
                </div>
              </div>

              {/* Footer Buttons */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: 10,
                  borderTop: '1px solid #E2E8F0',
                  paddingTop: 16,
                }}
              >
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  disabled={isSubmitting}
                  style={{
                    padding: '9px 18px',
                    borderRadius: 8,
                    border: '1px solid #CBD5E1',
                    background: '#FFFFFF',
                    color: '#475569',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  id="confirm-emergency-stop-btn"
                  disabled={reason.trim().length < 10 || isSubmitting}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '9px 20px',
                    borderRadius: 8,
                    border: 'none',
                    background: reason.trim().length < 10 || isSubmitting
                      ? '#94A3B8'
                      : 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
                    color: '#FFFFFF',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: reason.trim().length < 10 || isSubmitting ? 'not-allowed' : 'pointer',
                    boxShadow: reason.trim().length >= 10 && !isSubmitting
                      ? '0 2px 8px rgba(220,38,38,0.3)'
                      : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Suspending Works...</span>
                    </>
                  ) : (
                    <>
                      <OctagonX size={16} />
                      <span>Confirm Emergency Stop</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

