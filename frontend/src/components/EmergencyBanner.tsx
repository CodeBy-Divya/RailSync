import React from 'react';
import { OctagonX, ArrowRight } from 'lucide-react';
import { EmergencyStopState } from '../hooks/useEmergencyStop';

interface EmergencyBannerProps {
  emergencyState: EmergencyStopState;
  suspendedCount: number;
  onViewInPending: () => void;
}

export const EmergencyBanner: React.FC<EmergencyBannerProps> = ({
  emergencyState,
  suspendedCount,
  onViewInPending,
}) => {
  if (!emergencyState.isActive || suspendedCount === 0) {
    return null;
  }

  const timeFormatted = emergencyState.suspendedAt
    ? new Date(emergencyState.suspendedAt).toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
    : '--:--';

  const userFormatted = emergencyState.suspendedBy || 'Station Master Desk';

  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        background: '#DC2626',
        color: '#FFFFFF',
        padding: '9px 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
        boxShadow: '0 2px 8px rgba(220, 38, 38, 0.25)',
        zIndex: 40,
        borderBottom: '1px solid #B91C1C',
        flexShrink: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 26,
            height: 26,
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.2)',
            flexShrink: 0,
          }}
        >
          <OctagonX size={16} color="#FFFFFF" className="animate-pulse" />
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1.3 }}>
          <span>
            EMERGENCY STOP ACTIVE — {suspendedCount} work{suspendedCount > 1 ? 's' : ''} suspended at {timeFormatted} by {userFormatted}
          </span>
          {emergencyState.reason && (
            <span
              style={{
                display: 'inline-block',
                marginLeft: 8,
                fontSize: 11.5,
                fontWeight: 500,
                opacity: 0.9,
                fontStyle: 'italic',
                maxWidth: 400,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                verticalAlign: 'bottom',
              }}
              title={emergencyState.reason}
            >
              • &ldquo;{emergencyState.reason}&rdquo;
            </span>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={onViewInPending}
        id="view-suspended-pending-btn"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          background: '#FFFFFF',
          color: '#DC2626',
          border: 'none',
          padding: '6px 14px',
          borderRadius: 6,
          fontSize: 12,
          fontWeight: 700,
          cursor: 'pointer',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.12)',
          transition: 'all 0.15s ease',
          flexShrink: 0,
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = '#FEF2F2';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = '#FFFFFF';
        }}
      >
        <span>View in Pending Approvals</span>
        <ArrowRight size={13} color="#DC2626" />
      </button>
    </div>
  );
};

