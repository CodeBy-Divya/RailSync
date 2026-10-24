import React, { useState } from 'react';
import {
  Clock,
  MapPin,
  Users,
  Camera,
  Eye,
  ShieldCheck,
  CheckCircle2,
  Bell,
  ArrowLeft,
  X,
  Zap,
  ShieldAlert,
  FileText,
  Lock,
  Printer,
  FileSignature
} from 'lucide-react';
import { OperationalEvent } from '../types';
import { TeamProfile } from '../data/teamsOnTrackData';
import { useCountdown } from '../hooks/useCountdown';

interface TeamDetailPanelProps {
  event: OperationalEvent;
  teamProfile: TeamProfile;
  onOpenNotifications: () => void;
  onBackToList?: () => void;
  isMobile?: boolean;
}

export const TeamDetailPanel: React.FC<TeamDetailPanelProps> = ({
  event,
  teamProfile,
  onOpenNotifications,
  onBackToList,
  isMobile = false,
}) => {
  const [showEnlargedPhoto, setShowEnlargedPhoto] = useState(false);
  const [showPermitModal, setShowPermitModal] = useState(false);

  // Time remaining countdown computation
  const countdown = useCountdown(
    teamProfile.status,
    event.requested_start,
    event.requested_end,
    event.updated_at,
    event.id
  );

  // Photo resolution
  const photoUrl =
    event.field_photo?.photo_url ||
    (event.id.includes('OHE') ? '/images/ohe_crew.jpg' : '/images/track_gang.jpg');
  const photoKm =
    event.field_photo?.km_chainage ||
    `KM ${event.km_start.toFixed(2)} (${event.track_id.replace(/_/g, ' ')})`;
  const photoUploaded =
    event.field_photo?.uploaded_at || '10:14 AM via RailSync Field App';
  const supervisorName =
    teamProfile.team_leader_name ||
    event.field_photo?.gang_supervisor ||
    `${event.originator_id} (Field Custodian)`;

  const notificationCount = teamProfile.notifications.length;

  return (
    <div
      style={{
        flex: 1,
        background: '#FFFFFF',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflowY: 'auto',
      }}
    >
      {/* ── TOP NAV BAR (With back button on mobile & Bell button) ── */}
      <div
        style={{
          padding: '14px 20px',
          borderBottom: '1px solid #E2E8F0',
          background: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {isMobile && onBackToList && (
            <button
              type="button"
              onClick={onBackToList}
              style={{
                background: '#F1F5F9',
                border: '1px solid #CBD5E1',
                borderRadius: 6,
                padding: '6px 10px',
                fontSize: 12,
                fontWeight: 600,
                color: '#1E293B',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <ArrowLeft size={14} /> Back to Teams
            </button>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span
              style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 13,
                fontWeight: 800,
                color: '#1D4ED8',
                background: '#EFF6FF',
                padding: '2px 8px',
                borderRadius: 4,
                border: '1px solid #BFDBFE',
              }}
            >
              {event.id}
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 4,
                background: '#F1F5F9',
                color: '#334155',
                border: '1px solid #CBD5E1',
              }}
            >
              {event.section} ({event.track_id.replace(/_/g, ' ')})
            </span>
          </div>
        </div>

        {/* Bell notification button */}
        <button
          type="button"
          onClick={onOpenNotifications}
          aria-label={`View updates for ${teamProfile.team_id}`}
          style={{
            position: 'relative',
            background: '#EFF6FF',
            border: '1px solid #BFDBFE',
            borderRadius: 8,
            padding: '7px 12px',
            color: '#1D4ED8',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = '#DBEAFE';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = '#EFF6FF';
          }}
        >
          <Bell size={15} color="#2563EB" />
          <span>Updates</span>
          {notificationCount > 0 && (
            <span
              style={{
                background: '#DC2626',
                color: '#FFFFFF',
                borderRadius: 9999,
                padding: '1px 6px',
                fontSize: 10,
                fontWeight: 800,
                lineHeight: 1.2,
              }}
            >
              {notificationCount}
            </span>
          )}
        </button>
      </div>

      <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* ── SECTION A: HEADER STRUCTURE ── */}
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: 12,
            padding: '20px 22px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>
                  {teamProfile.team_leader_name}
                </h1>
                <span style={{ fontSize: 11, fontWeight: 700, background: '#DCFCE7', color: '#166534', padding: '2px 8px', borderRadius: 4, border: '1px solid #86EFAC' }}>
                  Team Leader • {teamProfile.team_leader_designation}
                </span>
              </div>
              {teamProfile.je_name && (
                <div style={{ fontSize: 12, color: '#475569', fontWeight: 600, marginBottom: 6 }}>
                  Site In-Charge / Junior Engineer: <span style={{ color: '#0F172A' }}>{teamProfile.je_name}</span>
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 11.5, color: '#64748B', fontFamily: 'JetBrains Mono, monospace', flexWrap: 'wrap' }}>
                <span>Team ID: <strong style={{ color: '#1D4ED8' }}>{teamProfile.team_id}</strong></span>
                <span>•</span>
                <span>Work Requisition: <strong style={{ color: '#334155' }}>{teamProfile.work_request_id}</strong></span>
                <span>•</span>
                <span>Dept: <strong style={{ color: '#0F172A' }}>{teamProfile.department}</strong></span>
                <span>•</span>
                <span>Section: <strong style={{ color: '#0F172A' }}>{event.section}</strong></span>
              </div>
            </div>

            {/* Red Badge: ACTIVE ON TRACK • Track Possession Active */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: '#FEF2F2',
                border: '1.5px solid #FCA5A5',
                padding: '6px 12px',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 700,
                color: '#DC2626',
              }}
            >
              <span>🔴 ACTIVE ON TRACK • Track Possession Active</span>
            </div>
          </div>

          {/* Full Work Description */}
          <div style={{ marginTop: 14, fontSize: 13, color: '#1E293B', lineHeight: 1.5, background: '#F8FAFC', padding: '10px 14px', borderRadius: 8, border: '1px solid #E2E8F0' }}>
            <strong>Work Description:</strong> {event.description}
          </div>

          {/* Status & Progress Bar Row */}
          <div style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    padding: '3px 10px',
                    borderRadius: 9999,
                    background: teamProfile.status === 'Completed' ? '#DCFCE7' : '#EFF6FF',
                    color: teamProfile.status === 'Completed' ? '#166534' : '#1D4ED8',
                    border: `1px solid ${teamProfile.status === 'Completed' ? '#86EFAC' : '#BFDBFE'}`,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  {teamProfile.status === 'Completed' ? '✓ ' : '● '}{teamProfile.status}
                </span>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: '#334155' }}>
                  {teamProfile.current_stage}
                </span>
              </div>
              <div style={{ fontSize: 11, color: '#64748B' }}>
                Last updated:{' '}
                <strong>
                  {new Date(teamProfile.last_updated).toLocaleString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false,
                  })}{' '}
                  IST
                </strong>
              </div>
            </div>

            {/* Progress bar */}
            <div style={{ width: '100%', height: 8, background: '#E2E8F0', borderRadius: 9999, overflow: 'hidden' }}>
              <div
                style={{
                  width: `${teamProfile.progress_percent}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #2563EB 0%, #10B981 100%)',
                  borderRadius: 9999,
                  transition: 'width 0.4s ease',
                }}
              />
            </div>
          </div>
        </div>

        {/* ── SECTION B: TIME BLOCK WITH THREE SEPARATE FIELDS ── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
            gap: 14,
          }}
        >
          {/* Field 1: Start Time */}
          <div
            style={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: 10,
              padding: '16px 18px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
            }}
          >
            <div style={{ fontSize: 10.5, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
              Start Time
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', fontFamily: 'JetBrains Mono, monospace' }}>
              {countdown.startTimeText}{' '}
              <span style={{ fontSize: 11, color: '#64748B', fontWeight: 500 }}>
                (Planned: {countdown.plannedDurationText})
              </span>
            </div>
            <div style={{ fontSize: 11, color: '#475569', marginTop: 4 }}>
              Shift: Day Track Possession Block
            </div>
          </div>

          {/* Field 2: Estimated Completion */}
          <div
            style={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: 10,
              padding: '16px 18px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
            }}
          >
            <div style={{ fontSize: 10.5, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
              Estimated Completion
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', fontFamily: 'JetBrains Mono, monospace' }}>
              {countdown.endTimeText}{' '}
              <span style={{ fontSize: 11, color: '#64748B', fontWeight: 500 }}>
                ({countdown.targetWindowText})
              </span>
            </div>
            <div style={{ fontSize: 11, color: '#475569', marginTop: 4 }}>
              Target Window: KM {event.km_start.toFixed(2)}–{event.km_end.toFixed(2)}
            </div>
          </div>

          {/* Field 3: Time Remaining */}
          <div
            style={{
              background: countdown.mode === 'OVERDUE' ? '#FEF2F2' : countdown.mode === 'COMPLETED' ? '#F0FDF4' : '#EFF6FF',
              border: `1.5px solid ${countdown.mode === 'OVERDUE' ? '#FCA5A5' : countdown.mode === 'COMPLETED' ? '#86EFAC' : '#93C5FD'}`,
              borderRadius: 10,
              padding: '16px 18px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
            }}
          >
            <div style={{ fontSize: 10.5, fontWeight: 800, color: countdown.mode === 'OVERDUE' ? '#DC2626' : countdown.mode === 'COMPLETED' ? '#166534' : '#1D4ED8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
              Time Remaining
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: countdown.mode === 'OVERDUE' ? '#DC2626' : countdown.mode === 'COMPLETED' ? '#166534' : '#1D4ED8', fontFamily: 'JetBrains Mono, monospace' }}>
              {countdown.timeRemainingText}
            </div>
            <div style={{ fontSize: 11, color: countdown.mode === 'OVERDUE' ? '#B91C1C' : countdown.mode === 'COMPLETED' ? '#15803D' : '#1E40AF', marginTop: 4, fontWeight: 600 }}>
              Elapsed Duration: {countdown.elapsedHHMMSS} elapsed
            </div>
          </div>
        </div>

        {/* ── SECTION C: TEAM MEMBERS TABLE ── */}
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: 10,
            padding: '18px 20px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>
                On-Track Maintenance Gang ({teamProfile.members.length} Members)
              </div>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  padding: '2px 7px',
                  borderRadius: 4,
                  background: '#FEF3C7',
                  color: '#92400E',
                  border: '1px solid #FCD34D',
                  letterSpacing: '0.04em',
                }}
              >
                DEMO ROSTER DATA
              </span>
            </div>
            <span style={{ fontSize: 11, color: '#64748B' }}>
              Statutory Biometric / Field GPS Checked
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1.5px solid #CBD5E1', textAlign: 'left' }}>
                  <th style={{ padding: '8px 12px', fontWeight: 700, color: '#334155' }}>Name</th>
                  <th style={{ padding: '8px 12px', fontWeight: 700, color: '#334155' }}>Designation / Role</th>
                  <th style={{ padding: '8px 12px', fontWeight: 700, color: '#334155' }}>Department</th>
                  <th style={{ padding: '8px 12px', fontWeight: 700, color: '#334155' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {teamProfile.members.map((member, idx) => (
                  <tr
                    key={idx}
                    style={{
                      borderBottom: '1px solid #E2E8F0',
                      background: idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC',
                    }}
                  >
                    <td style={{ padding: '9px 12px', fontWeight: 600, color: '#0F172A' }}>
                      {member.name}
                    </td>
                    <td style={{ padding: '9px 12px', color: '#475569' }}>
                      {member.role}
                    </td>
                    <td style={{ padding: '9px 12px' }}>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: '1px 6px',
                          borderRadius: 4,
                          background: '#EFF6FF',
                          color: '#1D4ED8',
                          border: '1px solid #BFDBFE',
                        }}
                      >
                        {member.department}
                      </span>
                    </td>
                    <td style={{ padding: '9px 12px' }}>
                      <span
                        style={{
                          fontSize: 10.5,
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: 9999,
                          background: member.status === 'Completed' ? '#DCFCE7' : '#EFF6FF',
                          color: member.status === 'Completed' ? '#166534' : '#1D4ED8',
                          border: `1px solid ${member.status === 'Completed' ? '#86EFAC' : '#BFDBFE'}`,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: member.status === 'Completed' ? '#16A34A' : '#2563EB' }} />
                        {member.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── SECTION D: ONGOING WORK DETAILS (PRESERVED FULLY) ── */}

        {/* 1. Permits (Form3-PTW) */}
        <div
          style={{
            background: '#FFFFFF',
            border: '1.5px solid #BFDBFE',
            borderRadius: 10,
            padding: '16px 20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 6,
                  background: '#EFF6FF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#2563EB',
                }}
              >
                <FileText size={16} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>
                  Digital Statutory Permit Memo (Form 3-PTW)
                </div>
                <div style={{ fontSize: 11, color: '#64748B' }}>
                  Permit Number: PTW-ECR-{event.id.replace('EVT-', '')} • Form 3-PTW / IR-OPR-4 Active Authorization
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowPermitModal(true)}
              style={{
                fontSize: 11.5,
                fontWeight: 700,
                color: '#2563EB',
                background: '#EFF6FF',
                border: '1px solid #BFDBFE',
                padding: '6px 12px',
                borderRadius: 6,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <FileSignature size={13} /> View Digital Permit (Form 3)
            </button>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
              gap: 10,
              background: '#F8FAFC',
              padding: '12px 14px',
              borderRadius: 8,
              border: '1px solid #E2E8F0',
            }}
          >
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Token ID</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#1D4ED8', fontFamily: 'JetBrains Mono, monospace', marginTop: 2 }}>
                TOKEN-UP-MAIN-{event.km_start.toFixed(0)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Line Possession</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#166534', marginTop: 2 }}>
                ✓ Authorized under G&amp;SR 15.06
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Issuing Authority</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#0F172A', marginTop: 2 }}>
                SM Desk &amp; Section Control
              </div>
            </div>
          </div>
        </div>

        {/* 2. Safety & Speed Restrictions */}
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: 10,
            padding: '16px 20px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>
            Safety Protocols &amp; Speed Restrictions
          </div>
          <div style={{ fontSize: 11.5, color: '#64748B', marginBottom: 12 }}>
            Active physical and electrical interlocks enforced for this ongoing track block
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: 10 }}>
            {/* 25kV Power Cut */}
            <div style={{ padding: '10px 12px', borderRadius: 8, background: '#F0FDF4', border: '1px solid #BBF7D0', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: 6, background: '#DCFCE7', color: '#15803D', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Zap size={15} />
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#0F172A' }}>
                  25kV Traction Catenary Electricity Cut
                </div>
                <div style={{ fontSize: 11, color: '#166534', marginTop: 1 }}>
                  ✓ Isolated at Feeding Post FP-04 to FP-06 via TPC SCADA
                </div>
              </div>
            </div>

            {/* Traffic Block */}
            <div style={{ padding: '10px 12px', borderRadius: 8, background: '#F0FDF4', border: '1px solid #BBF7D0', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: 6, background: '#DCFCE7', color: '#15803D', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <ShieldAlert size={15} />
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#0F172A' }}>
                  Traffic Block &amp; Train Diversion
                </div>
                <div style={{ fontSize: 11, color: '#166534', marginTop: 1 }}>
                  ✓ Up Main Block Active • Freight Diverted via Down Loop
                </div>
              </div>
            </div>

            {/* Point Clamping */}
            <div style={{ padding: '10px 12px', borderRadius: 8, background: '#F0FDF4', border: '1px solid #BBF7D0', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: 6, background: '#DCFCE7', color: '#15803D', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Lock size={15} />
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#0F172A' }}>
                  Mechanical Point Padlocking &amp; Clamping
                </div>
                <div style={{ fontSize: 11, color: '#166534', marginTop: 1 }}>
                  ✓ Point #14A Padlocked &amp; Clamped against Up Main route
                </div>
              </div>
            </div>

            {/* Speed Restriction TSR 30 */}
            <div style={{ padding: '10px 12px', borderRadius: 8, background: '#FFFBEB', border: '1px solid #FCD34D', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: 6, background: '#FEF3C7', color: '#B45309', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <ShieldCheck size={15} />
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#0F172A' }}>
                  Temporary Speed Restriction (TSR 30 km/h)
                </div>
                <div style={{ fontSize: 11, color: '#92400E', marginTop: 1 }}>
                  Enforced on Adjacent Line • Caution Order #DNR-CO-412
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3. On-Site Field Verification Photo Proof */}
        <div
          style={{
            border: '1.5px solid #BFDBFE',
            background: '#F8FAFC',
            padding: 18,
            borderRadius: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  background: '#DBEAFE',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#1D4ED8',
                }}
              >
                <Camera size={15} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>
                  On-Site Field Verification Photo Proof
                </div>
                <div style={{ fontSize: 10.5, color: '#64748B' }}>
                  Replaces informal WhatsApp photos — GPS &amp; Geofence Tamper-Proof Verification
                </div>
              </div>
            </div>

            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                padding: '3px 8px',
                borderRadius: 4,
                background: '#DCFCE7',
                color: '#166534',
                border: '1px solid #86EFAC',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <ShieldCheck size={12} color="#16A34A" />
              GEOFENCE MATCH VERIFIED
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : '180px 1fr',
              gap: 16,
              alignItems: 'center',
              background: '#FFFFFF',
              padding: 12,
              borderRadius: 8,
              border: '1px solid #E2E8F0',
            }}
          >
            {/* Thumbnail */}
            <div
              style={{
                position: 'relative',
                width: isMobile ? '100%' : 180,
                height: 120,
                borderRadius: 6,
                overflow: 'hidden',
                cursor: 'pointer',
                border: '1px solid #CBD5E1',
              }}
              onClick={() => setShowEnlargedPhoto(true)}
              title="Click to enlarge field photo"
            >
              <img
                src={photoUrl}
                alt="Field Crew On Track"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 60%)',
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'center',
                  padding: 6,
                }}
              >
                <span style={{ fontSize: 10, color: '#fff', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Eye size={11} /> Click to Enlarge
                </span>
              </div>
            </div>

            {/* Metadata */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 11.5 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#0F172A', fontWeight: 600 }}>
                <MapPin size={13} color="#2563EB" />
                <span>Location: {photoKm} (GPS: 25.6100° N, 85.0400° E)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#475569' }}>
                <Clock size={13} color="#64748B" />
                <span>Timestamp: {photoUploaded} • Precision: ±3.8m</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#475569' }}>
                <Users size={13} color="#64748B" />
                <span>Team Present: <strong>{teamProfile.members.length} Personnel on Track</strong> (Safety Gear &amp; Helmets Verified)</span>
              </div>
              <div style={{ marginTop: 4 }}>
                <button
                  type="button"
                  onClick={() => setShowEnlargedPhoto(true)}
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: '#2563EB',
                    background: '#EFF6FF',
                    border: '1px solid #BFDBFE',
                    padding: '4px 10px',
                    borderRadius: 6,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <Eye size={12} /> Inspect Full-Resolution Photo &amp; EXIF Metadata
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 4. Statutory Approvals & Signatures (Dual-Key Quorum) */}
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: 10,
            padding: '16px 20px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>
                Statutory Approvals &amp; Multi-Officer Clearances
              </div>
              <div style={{ fontSize: 11, color: '#64748B' }}>
                Dual-Key Digital Quorum signed and authorized under Indian Railways G&amp;SR Rules
              </div>
            </div>
            <span style={{ fontSize: 10.5, fontWeight: 700, background: '#DCFCE7', color: '#166534', border: '1px solid #86EFAC', padding: '2px 8px', borderRadius: 4 }}>
              ✓ Quorum Completed
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {/* TPC */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 6, background: '#F8FAFC', border: '1px solid #E2E8F0', fontSize: 11.5 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle2 size={14} color="#16A34A" />
                <span style={{ fontWeight: 700, color: '#0F172A' }}>Traction Power Controller (TPC / DDU SCADA)</span>
                <span style={{ color: '#64748B' }}>• TPC_DDU_01</span>
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, background: '#DCFCE7', color: '#166534', padding: '2px 6px', borderRadius: 4 }}>
                ✓ SIGNED (Form ETR-1)
              </span>
            </div>

            {/* Section Controller */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 6, background: '#F8FAFC', border: '1px solid #E2E8F0', fontSize: 11.5 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle2 size={14} color="#16A34A" />
                <span style={{ fontWeight: 700, color: '#0F172A' }}>Section Controller (SCR / Danapur Control)</span>
                <span style={{ color: '#64748B' }}>• CTRL_SEC_DNR_02</span>
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, background: '#DCFCE7', color: '#166534', padding: '2px 6px', borderRadius: 4 }}>
                ✓ SIGNED (Control Order #421)
              </span>
            </div>

            {/* Station Master */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 6, background: '#F8FAFC', border: '1px solid #E2E8F0', fontSize: 11.5 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle2 size={14} color="#16A34A" />
                <span style={{ fontWeight: 700, color: '#0F172A' }}>Station Master (SM / Danapur Desk)</span>
                <span style={{ color: '#64748B' }}>• SM_PNBE_01</span>
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, background: '#DCFCE7', color: '#166534', padding: '2px 6px', borderRadius: 4 }}>
                ✓ SIGNED (Block Key #14A)
              </span>
            </div>

            {/* Field Supervisor */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 6, background: '#F8FAFC', border: '1px solid #E2E8F0', fontSize: 11.5 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle2 size={14} color="#16A34A" />
                <span style={{ fontWeight: 700, color: '#0F172A' }}>Field Supervisor (SSE / Site Custodian)</span>
                <span style={{ color: '#64748B' }}>• {teamProfile.team_leader_name}</span>
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, background: '#DCFCE7', color: '#166534', padding: '2px 6px', borderRadius: 4 }}>
                ✓ SIGNED (Site Possession Token)
              </span>
            </div>
          </div>
        </div>

        {/* 5. Corridor Directive */}
        <div
          style={{
            background: '#FEF2F2',
            border: '1.5px solid #FCA5A5',
            borderRadius: 8,
            padding: '12px 16px',
            fontSize: 12,
            color: '#991B1B',
            lineHeight: 1.5,
          }}
        >
          <strong>Station Master Directive (G&amp;SR 15.06):</strong> Line possession is active under Form 3-PTW. 25kV catenary isolated. Points clamped against target track. Train movements into this block section are prohibited under Section Controller Order #421.
        </div>
      </div>

      {/* Enlarged Photo Modal */}
      {showEnlargedPhoto && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 110,
            background: 'rgba(0, 0, 0, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
          onClick={() => setShowEnlargedPhoto(false)}
        >
          <div
            style={{
              position: 'relative',
              maxWidth: 760,
              width: '100%',
              background: '#0F172A',
              borderRadius: 12,
              overflow: 'hidden',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ color: '#FFFFFF', fontSize: 13, fontWeight: 700 }}>
                {event.id} • On-Site Field GPS Photo Proof
              </div>
              <button
                type="button"
                onClick={() => setShowEnlargedPhoto(false)}
                style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: 4 }}
              >
                <X size={18} />
              </button>
            </div>
            <div style={{ maxHeight: '70vh', overflow: 'hidden' }}>
              <img src={photoUrl} alt="Enlarged field proof" style={{ width: '100%', height: 'auto', display: 'block' }} />
            </div>
            <div style={{ padding: '12px 18px', background: '#1E293B', color: '#CBD5E1', fontSize: 11, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
              <span>Location: {photoKm} • GPS 25.6100° N, 85.0400° E</span>
              <span>SHA-256 Verified • Tamper Proof</span>
            </div>
          </div>
        </div>
      )}

      {/* Digital Permit Memo (Form3-PTW) Modal */}
      {showPermitModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 110,
            background: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
          onClick={() => setShowPermitModal(false)}
        >
          <div
            style={{
              position: 'relative',
              maxWidth: 680,
              width: '100%',
              background: '#FFFFFF',
              borderRadius: 12,
              overflow: 'hidden',
              boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
              border: '1px solid #CBD5E1',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ padding: '16px 20px', background: '#0F172A', color: '#FFFFFF', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800 }}>INDIAN RAILWAYS — EAST CENTRAL RAILWAY</div>
                <div style={{ fontSize: 11, color: '#94A3B8', fontFamily: 'JetBrains Mono, monospace' }}>
                  Form 3-PTW • Operational Requisition Permit Memo
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPermitModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: 4 }}
              >
                <X size={18} />
              </button>
            </div>
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 14, fontSize: 12 }}>
              <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: 8, border: '1px solid #E2E8F0' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                  <div><strong>Permit ID:</strong> PTW-ECR-{event.id.replace('EVT-', '')}</div>
                  <div><strong>Work Request ID:</strong> {teamProfile.work_request_id}</div>
                  <div><strong>Corridor Section:</strong> {event.section}</div>
                  <div><strong>Line Affected:</strong> {event.track_id.replace(/_/g, ' ')}</div>
                  <div><strong>Chainage:</strong> KM {event.km_start.toFixed(2)} to {event.km_end.toFixed(2)}</div>
                  <div><strong>Authority:</strong> G&amp;SR 15.06 Dual-Key Approval</div>
                </div>
              </div>
              <div style={{ background: '#F0FDF4', padding: '12px 14px', borderRadius: 8, border: '1px solid #BBF7D0', color: '#166534' }}>
                <strong>Authorized Field In-Charge:</strong> {teamProfile.team_leader_name} ({teamProfile.team_leader_designation})<br />
                <strong>Roster Crew Size:</strong> {teamProfile.members.length} personnel on site with full PPE &amp; lookout protection.
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 6 }}>
                <button
                  type="button"
                  onClick={() => window.print()}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 6,
                    background: '#2563EB',
                    color: '#fff',
                    border: 'none',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <Printer size={13} /> Print Memo
                </button>
                <button
                  type="button"
                  onClick={() => setShowPermitModal(false)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 6,
                    background: '#F1F5F9',
                    color: '#334155',
                    border: '1px solid #CBD5E1',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
