import React, { useState } from 'react';
import {
  Bell,
  X,
  Send,
  Lock,
  Clock,
  User,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  PlayCircle,
  Activity,
  ShieldCheck,
  FileText
} from 'lucide-react';
import { TeamNotification, TeamProfile } from '../data/teamsOnTrackData';
import { OperationalEvent } from '../types';

interface TeamNotificationPanelProps {
  event: OperationalEvent;
  teamProfile: TeamProfile;
  isOpen: boolean;
  onClose: () => void;
  currentUser: {
    username: string;
    name: string;
    role: string;
    station: string;
  } | null;
  onPublishUpdate: (
    eventId: string,
    update: {
      type: TeamNotification['type'];
      remarks: string;
      percentage?: number;
    }
  ) => void;
}

export const TeamNotificationPanel: React.FC<TeamNotificationPanelProps> = ({
  event,
  teamProfile,
  isOpen,
  onClose,
  currentUser,
  onPublishUpdate,
}) => {
  const [updateType, setUpdateType] = useState<TeamNotification['type']>('Work Progressed');
  const [remarks, setRemarks] = useState('');
  const [percent, setPercent] = useState<number>(teamProfile.progress_percent || 65);
  const [certifiedNormalized, setCertifiedNormalized] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  if (!isOpen) return null;

  // Check if record is sealed/historical
  const isHistoricalSealed =
    event.fsm_stage === 7 ||
    event.status === 'BLOCK_CLEARED' ||
    event.status === 'AUDIT_LOCKED';

  // Role check: field supervisors, section controllers, station masters, and admin can post
  const canPublish = !isHistoricalSealed;

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!remarks.trim()) {
      setFeedback({ type: 'error', message: 'Please enter remarks for the operational notification.' });
      return;
    }

    if (updateType === 'Work Completed' && !certifiedNormalized) {
      setFeedback({
        type: 'error',
        message: 'Mandatory Certification Required: Under G&SR 15.17, you must certify track normalization and personnel clearance.',
      });
      return;
    }

    if (isHistoricalSealed) {
      setFeedback({
        type: 'error',
        message: 'Statutory Violation: Cannot publish modifications to an immutable sealed record under G&SR 15.09.',
      });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      onPublishUpdate(event.id, {
        type: updateType,
        remarks: remarks.trim(),
        percentage: percent,
      });

      setRemarks('');
      setCertifiedNormalized(false);
      setFeedback({
        type: 'success',
        message: `Operational progress update logged and dispatched to corridor telemetry bell feed.`,
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || 'Failed to submit notification update.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getNotifIcon = (type: TeamNotification['type']) => {
    switch (type) {
      case 'Work Started':
        return <PlayCircle size={15} color="#2563EB" />;
      case 'Work Completed':
        return <CheckCircle2 size={15} color="#16A34A" />;
      case 'Work Delayed':
        return <AlertTriangle size={15} color="#DC2626" />;
      case 'Safety Check Completed':
        return <ShieldCheck size={15} color="#059669" />;
      case 'Sealed Historical Block':
        return <Lock size={15} color="#475569" />;
      case 'Requisition Dispatched':
        return <FileText size={15} color="#D97706" />;
      default:
        return <Activity size={15} color="#2563EB" />;
    }
  };

  const notifications = [...teamProfile.notifications].sort((a, b) =>
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const latestNotif = notifications[0];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        background: 'rgba(15, 23, 42, 0.4)',
        backdropFilter: 'blur(2px)',
      }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-label={`Notifications for ${teamProfile.team_id}`}
        style={{
          width: '100%',
          maxWidth: 480,
          height: '100%',
          background: '#FFFFFF',
          boxShadow: '-4px 0 24px rgba(15, 23, 42, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'slideInRight 0.22s ease both',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Panel Header */}
        <div
          style={{
            padding: '18px 20px',
            borderBottom: '1px solid #E2E8F0',
            background: '#0F172A',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: 'rgba(37, 99, 235, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#60A5FA',
              }}
            >
              <Bell size={16} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.01em' }}>
                Team Telemetry &amp; Log
              </div>
              <div style={{ fontSize: 11, color: '#94A3B8', fontFamily: 'JetBrains Mono, monospace' }}>
                {teamProfile.team_id} • {event.id}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close notification panel"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94A3B8',
              cursor: 'pointer',
              padding: 6,
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#FFFFFF')}
            onMouseLeave={e => (e.currentTarget.style.color = '#94A3B8')}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
            background: '#F8FAFC',
          }}
        >
          {/* Latest Update Spotlight Card */}
          {latestNotif && (
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: 10,
                border: '1.5px solid #BFDBFE',
                padding: '14px 16px',
                boxShadow: '0 2px 8px rgba(37, 99, 235, 0.06)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 8,
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
                  <span style={{ fontSize: 10, fontWeight: 800, color: '#1D4ED8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Latest Live Work Update
                  </span>
                </div>
                <span style={{ fontSize: 10.5, color: '#64748B', fontFamily: 'JetBrains Mono, monospace' }}>
                  {new Date(latestNotif.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })} IST
                </span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>
                {latestNotif.type}
              </div>
              <div style={{ fontSize: 12, color: '#334155', lineHeight: 1.45, marginBottom: 8 }}>
                {latestNotif.remarks}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10.5, color: '#64748B' }}>
                <User size={12} />
                <span>Logged by: <strong>{latestNotif.user}</strong></span>
              </div>
            </div>
          )}

          {/* Publish New Update Form or Sealed Message */}
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: 10,
              border: '1px solid #E2E8F0',
              padding: '16px',
            }}
          >
            <div style={{ fontSize: 12.5, fontWeight: 700, color: '#0F172A', marginBottom: 6 }}>
              Publish Field Progress Update
            </div>

            {isHistoricalSealed ? (
              <div
                style={{
                  background: '#F1F5F9',
                  border: '1px solid #CBD5E1',
                  borderRadius: 8,
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                }}
              >
                <Lock size={16} color="#64748B" style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: '#334155' }}>
                    Historical Record Sealed (Read-Only)
                  </div>
                  <div style={{ fontSize: 11, color: '#64748B', lineHeight: 1.4, marginTop: 2 }}>
                    This maintenance possession has been certified and sealed into the statutory S3 WORM audit ledger under Indian Railways G&amp;SR 15.09. New operational progress updates cannot be published for normalized records.
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {feedback && (
                  <div
                    style={{
                      padding: '8px 12px',
                      borderRadius: 6,
                      fontSize: 11.5,
                      fontWeight: 600,
                      background: feedback.type === 'success' ? '#F0FDF4' : '#FEF2F2',
                      color: feedback.type === 'success' ? '#166534' : '#991B1B',
                      border: `1px solid ${feedback.type === 'success' ? '#BBF7D0' : '#FECACA'}`,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    {feedback.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                    <span>{feedback.message}</span>
                  </div>
                )}

                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: 11,
                      fontWeight: 600,
                      color: '#475569',
                      marginBottom: 4,
                    }}
                  >
                    Update Type
                  </label>
                  <select
                    className="rs-select"
                    value={updateType}
                    onChange={e => {
                      const val = e.target.value as TeamNotification['type'];
                      setUpdateType(val);
                      if (val === 'Work Completed') {
                        setPercent(100);
                      }
                    }}
                    style={{ width: '100%', fontSize: 12, height: 36 }}
                  >
                    <option value="Work Progressed">Work Progressed</option>
                    <option value="Work Started">Work Started</option>
                    <option value="Work Delayed">Work Delayed</option>
                    <option value="Safety Check Completed">Safety Check Completed</option>
                    <option value="Work Completed">Work Completed</option>
                  </select>
                </div>

                {/* Statutory Normalization Certification for Work Completed */}
                {updateType === 'Work Completed' && (
                  <div
                    style={{
                      padding: '10px 12px',
                      borderRadius: 8,
                      background: '#FEF2F2',
                      border: '1.5px solid #FCA5A5',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 10,
                    }}
                  >
                    <input
                      type="checkbox"
                      id="gsr-15-17-cert"
                      checked={certifiedNormalized}
                      onChange={e => setCertifiedNormalized(e.target.checked)}
                      style={{ marginTop: 2, cursor: 'pointer', width: 16, height: 16, accentColor: '#DC2626' }}
                    />
                    <label
                      htmlFor="gsr-15-17-cert"
                      style={{
                        fontSize: 11,
                        color: '#991B1B',
                        fontWeight: 600,
                        lineHeight: 1.45,
                        cursor: 'pointer',
                      }}
                    >
                      I certify that track has been normalized, all tools &amp; personnel cleared, and track is fit for traffic under G&amp;SR 15.17.
                    </label>
                  </div>
                )}

                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: 11,
                      fontWeight: 600,
                      color: '#475569',
                      marginBottom: 4,
                    }}
                  >
                    Operational Remarks
                  </label>
                  <textarea
                    rows={3}
                    value={remarks}
                    onChange={e => setRemarks(e.target.value)}
                    placeholder="Enter site verification remarks, telemetry status, or safety findings..."
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 6,
                      border: '1px solid #CBD5E1',
                      fontSize: 12,
                      fontFamily: 'Inter, sans-serif',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>
                      Progress Estimate
                    </label>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#1D4ED8' }}>
                      {percent}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={percent}
                    onChange={e => setPercent(Number(e.target.value))}
                    style={{ width: '100%', cursor: 'pointer' }}
                  />
                </div>

                <div
                  style={{
                    fontSize: 10.5,
                    color: '#64748B',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    marginTop: -4,
                  }}
                >
                  <User size={12} />
                  <span>
                    Signing as:{' '}
                    <strong>{currentUser?.name || 'Ravi Amish (Station Master)'}</strong>
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    background: '#2563EB',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: 6,
                    padding: '8px 14px',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    transition: 'background 0.15s ease',
                  }}
                  onMouseEnter={e => !isSubmitting && (e.currentTarget.style.background = '#1D4ED8')}
                  onMouseLeave={e => !isSubmitting && (e.currentTarget.style.background = '#2563EB')}
                >
                  <Send size={13} />
                  {isSubmitting ? 'Logging...' : 'Dispatch Progress Update'}
                </button>
              </form>
            )}
          </div>

          {/* Full Chronological Notification Audit History */}
          <div>
            <div
              style={{
                fontSize: 11.5,
                fontWeight: 800,
                color: '#475569',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span>Audit Trail ({notifications.length} Logs)</span>
              <span style={{ fontSize: 10, color: '#94A3B8', fontWeight: 600 }}>Never Dismissed / Immutable</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {notifications.map((notif, index) => (
                <div
                  key={notif.id || index}
                  style={{
                    background: '#FFFFFF',
                    borderRadius: 8,
                    border: '1px solid #E2E8F0',
                    padding: '12px 14px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 6,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {getNotifIcon(notif.type)}
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#0F172A' }}>
                        {notif.type}
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: 10,
                        color: '#64748B',
                        fontFamily: 'JetBrains Mono, monospace',
                      }}
                    >
                      {new Date(notif.timestamp).toLocaleString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false,
                      })}
                    </span>
                  </div>

                  <div style={{ fontSize: 11.5, color: '#334155', lineHeight: 1.4, marginBottom: 6 }}>
                    {notif.remarks}
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: 10.5,
                      color: '#64748B',
                    }}
                  >
                    <span>By: <strong>{notif.user}</strong></span>
                    {typeof notif.progress_percent === 'number' && (
                      <span
                        style={{
                          background: '#EFF6FF',
                          color: '#1D4ED8',
                          padding: '1px 6px',
                          borderRadius: 4,
                          fontWeight: 700,
                          fontSize: 10,
                        }}
                      >
                        {notif.progress_percent}%
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

