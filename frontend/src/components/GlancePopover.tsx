import React, { useEffect, useRef } from 'react';
import { Clock, CheckCircle2, Users, X } from 'lucide-react';

export const GLANCE_DATA = {
  pendingApprovals: 10,
  pendingForWardha: 4,
  workInProgress: 4,
  teamsOnTrack: 4,
  savedTime: '3h 15m',
} as const;

export interface GlancePopoverProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTab: (tab: 0 | 1) => void;
  onOpenTeamsOnTrack: () => void;
  liveCounts?: {
    pending: number;
    ongoing: number;
    teamsOnTrack?: number;
    history?: number;
  };
  anchorRef?: React.RefObject<HTMLElement | null>;
}

export const GlancePopover: React.FC<GlancePopoverProps> = ({
  isOpen,
  onClose,
  onSelectTab,
  onOpenTeamsOnTrack,
  liveCounts,
  anchorRef,
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const pending = liveCounts?.pending ?? GLANCE_DATA.pendingApprovals;
  const ongoing = liveCounts?.ongoing ?? GLANCE_DATA.workInProgress;
  const teamsOnTrack = liveCounts?.teamsOnTrack ?? liveCounts?.ongoing ?? GLANCE_DATA.teamsOnTrack;

  // Handle Escape key and focus management
  useEffect(() => {
    if (!isOpen) return;

    // Focus the close button when opened
    closeButtonRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        anchorRef?.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, anchorRef]);

  if (!isOpen) return null;

  const handlePendingClick = () => {
    onClose();
    onSelectTab(1); // Pending Approvals tab
  };

  const handleOngoingClick = () => {
    onClose();
    onSelectTab(0); // Ongoing Work tab
  };

  const handleTeamsClick = () => {
    onClose();
    onOpenTeamsOnTrack(); // Teams on Track modal
  };

  return (
    <>
      {/* Light dim backdrop to capture outside clicks while keeping the page visible */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 40,
          background: 'rgba(15, 23, 42, 0.15)',
          backdropFilter: 'blur(1px)',
        }}
        onClick={() => {
          onClose();
          anchorRef?.current?.focus();
        }}
        aria-hidden="true"
      />

      {/* Floating Popover Card */}
      <div
        ref={popoverRef}
        role="dialog"
        aria-label="Today at a glance"
        aria-modal="true"
        className="glance-popover-container"
        style={{
          position: 'fixed',
          zIndex: 41,
          width: 'calc(100vw - 24px)',
          maxWidth: 350,
          background: '#FFFFFF',
          borderRadius: 16,
          border: '1px solid #E2E8F0',
          boxShadow: '0 12px 36px -4px rgba(15, 23, 42, 0.16), 0 4px 12px -2px rgba(15, 23, 42, 0.08)',
          padding: '16px',
          animation: 'glanceScaleIn 0.18s cubic-bezier(0.16, 1, 0.3, 1) both',
          fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 14,
            paddingBottom: 10,
            borderBottom: '1px solid #F1F5F9',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#2563EB',
                display: 'inline-block',
              }}
            />
            <h2
              style={{
                fontSize: 15,
                fontWeight: 800,
                color: '#0F172A',
                letterSpacing: '-0.02em',
                margin: 0,
              }}
            >
              Today at a glance
            </h2>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={() => {
              onClose();
              anchorRef?.current?.focus();
            }}
            aria-label="Close Today at a glance popover"
            style={{
              width: 26,
              height: 26,
              borderRadius: 6,
              border: 'none',
              background: '#F1F5F9',
              color: '#64748B',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.15s, color 0.15s',
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
            <X size={14} />
          </button>
        </div>

        {/* Vertical Stack of 3 Compact Rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Row 1: Pending Approvals */}
          <button
            type="button"
            className="glance-popover-row"
            onClick={handlePendingClick}
            aria-label={`Pending Approvals: ${pending}. Click to open Approval Portal.`}
            style={{
              width: '100%',
              textAlign: 'left',
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: 12,
              padding: '10px 12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
              transition: 'all 0.15s ease',
              outline: 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 8,
                  background: '#FFFBEB',
                  border: '1px solid #FEF3C7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Clock size={18} color="#E27300" strokeWidth={2.2} />
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <span
                    style={{
                      fontSize: 20,
                      fontWeight: 800,
                      color: '#E27300',
                      lineHeight: 1,
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    {pending}
                  </span>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: '#0F172A',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    Pending Approvals
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 10.5,
                    color: '#94A3B8',
                    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                    letterSpacing: '0.01em',
                    marginTop: 2,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {GLANCE_DATA.pendingForWardha} need Wardha Station Master
                </div>
              </div>
            </div>

            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 9999,
                background: '#FEF3C7',
                color: '#92400E',
                flexShrink: 0,
                whiteSpace: 'nowrap',
              }}
            >
              Waiting
            </span>
          </button>

          {/* Row 2: Work in Progress */}
          <button
            type="button"
            className="glance-popover-row"
            onClick={handleOngoingClick}
            aria-label={`Work in Progress: ${ongoing}. Click to open Approval Portal Ongoing Work.`}
            style={{
              width: '100%',
              textAlign: 'left',
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: 12,
              padding: '10px 12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
              transition: 'all 0.15s ease',
              outline: 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 8,
                  background: '#ECFDF5',
                  border: '1px solid #D1FAE5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <CheckCircle2 size={18} color="#059669" strokeWidth={2.2} />
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <span
                    style={{
                      fontSize: 20,
                      fontWeight: 800,
                      color: '#059669',
                      lineHeight: 1,
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    {ongoing}
                  </span>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: '#0F172A',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    Work in Progress
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 10.5,
                    color: '#94A3B8',
                    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                    letterSpacing: '0.01em',
                    marginTop: 2,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  OHE Catenary &amp; Point Padlock
                </div>
              </div>
            </div>

            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 9999,
                background: '#D1FAE5',
                color: '#065F46',
                flexShrink: 0,
                whiteSpace: 'nowrap',
              }}
            >
              Active
            </span>
          </button>

          {/* Row 3: Teams on Track */}
          <button
            type="button"
            className="glance-popover-row"
            onClick={handleTeamsClick}
            aria-label={`Teams on Track: ${teamsOnTrack}. Click to open Teams on Track modal.`}
            style={{
              width: '100%',
              textAlign: 'left',
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: 12,
              padding: '10px 12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
              transition: 'all 0.15s ease',
              outline: 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 8,
                  background: '#F1F5F9',
                  border: '1px solid #E2E8F0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Users size={18} color="#0F172A" strokeWidth={2.2} />
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <span
                    style={{
                      fontSize: 20,
                      fontWeight: 800,
                      color: '#0F172A',
                      lineHeight: 1,
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    {teamsOnTrack}
                  </span>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: '#0F172A',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    Teams on Track
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 10.5,
                    color: '#94A3B8',
                    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                    letterSpacing: '0.01em',
                    marginTop: 2,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  Joint possession saved {GLANCE_DATA.savedTime}
                </div>
              </div>
            </div>

            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 9999,
                background: '#F1F5F9',
                color: '#475569',
                flexShrink: 0,
                whiteSpace: 'nowrap',
              }}
            >
              Co-utilized
            </span>
          </button>
        </div>
      </div>
    </>
  );
};

export default GlancePopover;

