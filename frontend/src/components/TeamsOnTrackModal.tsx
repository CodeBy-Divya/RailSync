import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Search,
  Bell,
  Clock,
  MapPin,
  AlertCircle,
  Users,
  RotateCcw
} from 'lucide-react';
import { OperationalEvent } from '../types';
import { CORRIDOR_SECTIONS, eventMatchesSection } from '../data/corridorData';
import { getEventCategory, getEventDept } from './MiddleColumn';
import { TeamProfile, INITIAL_TEAM_PROFILES, getTeamProfile, TeamNotification } from '../data/teamsOnTrackData';
import { TeamDetailPanel } from './TeamDetailPanel';
import { TeamNotificationPanel } from './TeamNotificationPanel';
import { useCountdown } from '../hooks/useCountdown';

interface TeamsOnTrackModalProps {
  isOpen: boolean;
  onClose: () => void;
  events: OperationalEvent[];
  currentUser: {
    username: string;
    name: string;
    role: string;
    station: string;
  } | null;
  onAddAmbientNotification?: (msg: string) => void;
  onUpdateEvent?: (updated: OperationalEvent) => void;
  returnFocusRef?: React.RefObject<HTMLElement | null>;
}

// ── Subcomponent for individual card with live countdown ──────────────────────
const TeamTrackCard: React.FC<{
  item: OperationalEvent;
  isSelected: boolean;
  profile: TeamProfile;
  onClick: () => void;
  onOpenNotifications: () => void;
}> = ({ item, isSelected, profile, onClick, onOpenNotifications }) => {
  const countdown = useCountdown(
    profile.status,
    item.requested_start,
    item.requested_end,
    item.updated_at,
    item.id
  );
  const deptLabel = getEventDept(item);
  const notifCount = profile.notifications.length;

  return (
    <div
      id={`queue-card-${item.id}`}
      onClick={onClick}
      style={{
        textAlign: 'left',
        width: '100%',
        padding: '12px 14px',
        borderRadius: 9,
        background: isSelected ? '#EFF6FF' : '#FFFFFF',
        border: isSelected ? '1.5px solid #2563EB' : '1px solid #E2E8F0',
        cursor: 'pointer',
        boxShadow: isSelected ? '0 2px 8px rgba(37,99,235,0.08)' : '0 1px 2px rgba(0,0,0,0.02)',
        transition: 'all 0.15s ease',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      {/* Row 1: ID, Department Chip & Bell */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            fontFamily: 'JetBrains Mono, monospace',
            color: isSelected ? '#1D4ED8' : '#0F172A',
          }}
        >
          {item.id}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span
            style={{
              fontSize: 9.5,
              fontWeight: 700,
              padding: '2px 7px',
              borderRadius: 4,
              background: isSelected ? '#BFDBFE' : '#F1F5F9',
              color: isSelected ? '#1E3A8A' : '#475569',
              border: `1px solid ${isSelected ? '#93C5FD' : '#E2E8F0'}`,
              letterSpacing: '0.04em',
            }}
          >
            {deptLabel}
          </span>
          {/* Bell icon on card */}
          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              onOpenNotifications();
            }}
            title="View team notifications & logs"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: 2,
              display: 'flex',
              alignItems: 'center',
              position: 'relative',
              color: '#64748B',
            }}
          >
            <Bell size={13} />
            {notifCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: -3,
                  right: -3,
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: '#2563EB',
                }}
              />
            )}
          </button>
        </div>
      </div>

      {/* Row 2: Location & Line */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <MapPin size={11} color={isSelected ? '#2563EB' : '#64748B'} />
        <span style={{ fontSize: 11.5, fontWeight: 600, color: isSelected ? '#1E40AF' : '#334155' }}>
          {item.section}
        </span>
        <span style={{ fontSize: 10.5, color: '#94A3B8' }}>
          ({item.track_id.replace(/_/g, ' ')})
        </span>
      </div>

      {/* Row 3: Team Leader & Work Description */}
      <div style={{ fontSize: 11, color: '#334155', fontWeight: 600 }}>
        Lead: <span style={{ color: '#0F172A' }}>{profile.team_leader_name}</span>
      </div>
      <div
        style={{
          fontSize: 11,
          color: isSelected ? '#334155' : '#64748B',
          lineHeight: 1.3,
          display: '-webkit-box',
          WebkitLineClamp: 1,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {item.description}
      </div>

      {/* Row 4: Red chips (ACTIVE ON TRACK + Track Possession Active) & Status */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4, flexWrap: 'wrap', marginTop: 2 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
          <span
            style={{
              fontSize: 9.5,
              fontWeight: 700,
              padding: '1px 6px',
              borderRadius: 4,
              background: '#FEF2F2',
              color: '#DC2626',
              border: '1px solid #FCA5A5',
            }}
          >
            🔴 ACTIVE ON TRACK
          </span>
          <span
            style={{
              fontSize: 9.5,
              fontWeight: 600,
              padding: '1px 6px',
              borderRadius: 4,
              background: '#FEF2F2',
              color: '#B91C1C',
              border: '1px solid #FCA5A5',
            }}
          >
            Track Possession Active
          </span>
        </div>

        <span
          style={{
            fontSize: 9.5,
            fontWeight: 700,
            padding: '1px 6px',
            borderRadius: 9999,
            background:
              profile.status === 'Completed'
                ? '#DCFCE7'
                : profile.status === 'Delayed'
                ? '#FEF2F2'
                : '#EFF6FF',
            color:
              profile.status === 'Completed'
                ? '#166534'
                : profile.status === 'Delayed'
                ? '#DC2626'
                : '#1D4ED8',
            border: `1px solid ${
              profile.status === 'Completed'
                ? '#86EFAC'
                : profile.status === 'Delayed'
                ? '#FECACA'
                : '#BFDBFE'
            }`,
          }}
        >
          {profile.status}
        </span>
      </div>

      {/* Row 5: Start Time & Live Countdown */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 10.5, fontFamily: 'JetBrains Mono, monospace', marginTop: 2, paddingTop: 4, borderTop: '1px dashed #F1F5F9' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#64748B' }}>
          <Clock size={11} />
          <span>Start: {countdown.startTimeText}</span>
        </div>
        <div
          style={{
            fontWeight: 700,
            color:
              countdown.mode === 'OVERDUE'
                ? '#DC2626'
                : countdown.mode === 'COMPLETED'
                ? '#166534'
                : '#2563EB',
          }}
        >
          {countdown.cardCountdownText}
        </div>
      </div>
    </div>
  );
};

export const TeamsOnTrackModal: React.FC<TeamsOnTrackModalProps> = ({
  isOpen,
  onClose,
  events,
  currentUser,
  onAddAmbientNotification,
  returnFocusRef,
}) => {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedSection, setSelectedSection] = useState('ALL');
  const [activeNotifEvent, setActiveNotifEvent] = useState<OperationalEvent | null>(null);
  const [teamProfiles, setTeamProfiles] = useState<Record<string, TeamProfile>>(INITIAL_TEAM_PROFILES);
  const [isMobileView, setIsMobileView] = useState(false);
  const [showMobileDetail, setShowMobileDetail] = useState(false);
  const modalContainerRef = useRef<HTMLDivElement>(null);

  // Responsive mobile listener
  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth < 840);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Filter only the exact 4 ongoing track blocks that appear in the Ongoing Work tab (category 0)
  const ongoingEvents = useMemo(() => {
    return events.filter(e => getEventCategory(e) === 0);
  }, [events]);

  // Set default selection when modal opens
  useEffect(() => {
    if (isOpen) {
      if (!selectedEventId || !ongoingEvents.some(e => e.id === selectedEventId)) {
        if (ongoingEvents.length > 0) {
          setSelectedEventId(ongoingEvents[0].id);
        }
      }
    }
  }, [isOpen, ongoingEvents, selectedEventId]);

  // Keyboard navigation: Escape key closes modal & focus management
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (activeNotifEvent) {
          setActiveNotifEvent(null);
        } else if (isMobileView && showMobileDetail) {
          setShowMobileDetail(false);
        } else {
          handleClose();
        }
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, activeNotifEvent, isMobileView, showMobileDetail]);

  const handleClose = () => {
    onClose();
    // Return focus to the trigger button
    setTimeout(() => {
      if (returnFocusRef?.current) {
        returnFocusRef.current.focus();
      } else {
        const btn = document.getElementById('teams-on-track-card');
        btn?.focus();
      }
    }, 50);
  };

  // Filtered teams list based on search, dept, status, section
  const filteredEvents = useMemo(() => {
    return ongoingEvents.filter(event => {
      const profile = teamProfiles[event.id] || getTeamProfile(event.id);

      // Section filter
      if (selectedSection !== 'ALL' && !eventMatchesSection(event.section, selectedSection)) {
        return false;
      }

      // Dept filter
      if (selectedDept !== 'ALL') {
        const d = getEventDept(event);
        if (d !== selectedDept) return false;
      }

      // Work status filter
      if (selectedStatus !== 'ALL') {
        if (profile.status !== selectedStatus) return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesId = (event.id || '').toLowerCase().includes(q);
        const matchesDesc = (event.description || '').toLowerCase().includes(q);
        const matchesSection = (event.section || '').toLowerCase().includes(q);
        const matchesTrack = (event.track_id || '').toLowerCase().includes(q);
        const matchesLeader = (profile.team_leader_name || '').toLowerCase().includes(q);
        const matchesTeamId = (profile.team_id || '').toLowerCase().includes(q);
        const matchesJe = (profile.je_name || '').toLowerCase().includes(q);

        if (
          !matchesId &&
          !matchesDesc &&
          !matchesSection &&
          !matchesTrack &&
          !matchesLeader &&
          !matchesTeamId &&
          !matchesJe
        ) {
          return false;
        }
      }

      return true;
    });
  }, [ongoingEvents, selectedSection, selectedDept, selectedStatus, searchQuery, teamProfiles]);

  const selectedEvent = useMemo(() => {
    return ongoingEvents.find(e => e.id === selectedEventId) || ongoingEvents[0] || null;
  }, [ongoingEvents, selectedEventId]);

  const currentProfile = useMemo(() => {
    if (!selectedEvent) return null;
    return teamProfiles[selectedEvent.id] || getTeamProfile(selectedEvent.id);
  }, [selectedEvent, teamProfiles]);

  // Handle publishing a new telemetry update
  const handlePublishUpdate = (
    eventId: string,
    update: {
      type: TeamNotification['type'];
      remarks: string;
      percentage?: number;
    }
  ) => {
    const timestamp = new Date().toISOString();
    const newNotif: TeamNotification = {
      id: `NOTIF-${Date.now()}`,
      type: update.type,
      remarks: update.remarks,
      user: currentUser?.name ? `${currentUser.name} (${currentUser.role})` : 'Authorized Station Master',
      timestamp,
      progress_percent: update.percentage,
    };

    setTeamProfiles(prev => {
      const existing = prev[eventId] || getTeamProfile(eventId);
      const updatedStatus =
        update.type === 'Work Completed'
          ? 'Completed'
          : update.type === 'Work Delayed'
          ? 'Delayed'
          : update.type === 'Work Started'
          ? 'In Progress'
          : existing.status;

      return {
        ...prev,
        [eventId]: {
          ...existing,
          status: updatedStatus,
          progress_percent: typeof update.percentage === 'number' ? update.percentage : existing.progress_percent,
          last_updated: timestamp,
          notifications: [newNotif, ...existing.notifications],
        },
      };
    });

    // Add to ambient telemetry feed in TopHeader/App
    if (onAddAmbientNotification) {
      const timeStr = new Date().toLocaleTimeString('en-GB', { hour12: false });
      onAddAmbientNotification(
        `${timeStr}Z [TEAM-UPDATE]: ${eventId} — ${update.type}: ${update.remarks}`
      );
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(3px)',
        padding: isMobileView ? '10px' : '20px 28px',
        animation: 'fadeIn 0.18s ease both',
      }}
      onClick={handleClose}
    >
      <div
        ref={modalContainerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="teams-on-track-title"
        style={{
          width: '100%',
          maxWidth: 1240,
          height: '92vh',
          maxHeight: 880,
          background: '#FFFFFF',
          borderRadius: 14,
          boxShadow: '0 20px 50px rgba(15, 23, 42, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid #E2E8F0',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── MODAL HEADER ── */}
        <div
          style={{
            padding: '16px 22px',
            borderBottom: '1px solid #E2E8F0',
            background: '#FFFFFF',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          {/* Top Row: Title + Close Button */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 9,
                  background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF',
                  boxShadow: '0 2px 6px rgba(15, 23, 42, 0.2)',
                }}
              >
                <Users size={18} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <h2
                    id="teams-on-track-title"
                    style={{
                      fontSize: 18,
                      fontWeight: 800,
                      color: '#0F172A',
                      margin: 0,
                      letterSpacing: '-0.02em',
                    }}
                  >
                    Teams on Track
                  </h2>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: 9999,
                      background: '#DBEAFE',
                      color: '#1E40AF',
                    }}
                  >
                    {ongoingEvents.length} Teams
                  </span>
                </div>
                <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
                  Active maintenance gangs on track with live possession across Danapur &amp; DDU Divisions (ECR)
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleClose}
              aria-label="Close Teams on Track modal"
              style={{
                width: 32,
                height: 32,
                borderRadius: 7,
                border: '1px solid #E2E8F0',
                background: '#F8FAFC',
                color: '#64748B',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = '#F1F5F9';
                e.currentTarget.style.color = '#0F172A';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = '#F8FAFC';
                e.currentTarget.style.color = '#64748B';
              }}
            >
              <X size={17} />
            </button>
          </div>

          {/* Bottom Row: Search Bar & Filters */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isMobileView ? '1fr' : 'minmax(240px, 1.2fr) repeat(3, minmax(140px, 1fr))',
              gap: 10,
              alignItems: 'center',
            }}
          >
            {/* Search Input */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: '#F8FAFC',
                border: '1px solid #CBD5E1',
                borderRadius: 8,
                padding: '6px 12px',
              }}
            >
              <Search size={14} color="#64748B" />
              <input
                type="text"
                placeholder="Search event ID, supervisor, section, line..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  fontSize: 12,
                  color: '#0F172A',
                  outline: 'none',
                  width: '100%',
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: 2 }}
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Department Filter */}
            <select
              className="rs-select"
              value={selectedDept}
              onChange={e => setSelectedDept(e.target.value)}
              style={{ fontSize: 11.5, height: 34, padding: '4px 24px 4px 10px' }}
            >
              <option value="ALL">All Departments</option>
              <option value="CIVIL_P_WAY">Civil (P-Way)</option>
              <option value="OHE">Electrical (OHE)</option>
              <option value="S_AND_T">Signal &amp; Telecom</option>
              <option value="MECHANICAL_CW">Mechanical (C&amp;W)</option>
              <option value="SAFETY">Safety Directorate</option>
            </select>

            {/* Work Status Filter */}
            <select
              className="rs-select"
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value)}
              style={{ fontSize: 11.5, height: 34, padding: '4px 24px 4px 10px' }}
            >
              <option value="ALL">All Work Statuses</option>
              <option value="In Progress">In Progress</option>
              <option value="Delayed">Delayed</option>
              <option value="Completed">Completed</option>
              <option value="Not Started">Not Started</option>
            </select>

            {/* Section Filter */}
            <select
              className="rs-select"
              value={selectedSection}
              onChange={e => setSelectedSection(e.target.value)}
              style={{ fontSize: 11.5, height: 34, padding: '4px 24px 4px 10px' }}
            >
              {CORRIDOR_SECTIONS.map(s => (
                <option key={s.id} value={s.id}>
                  {s.shortName}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ── MODAL BODY: SPLIT VIEW (LIST ON LEFT, DETAIL ON RIGHT) ── */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden', background: '#F8FAFC' }}>
          {/* LEFT LIST PANEL (Hidden on mobile if showing detail) */}
          {(!isMobileView || !showMobileDetail) && (
            <div
              style={{
                width: isMobileView ? '100%' : '370px',
                minWidth: isMobileView ? '100%' : '340px',
                maxWidth: isMobileView ? '100%' : '400px',
                borderRight: isMobileView ? 'none' : '1px solid #E2E8F0',
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                background: '#FFFFFF',
              }}
            >
              {/* List Header Count */}
              <div
                style={{
                  padding: '12px 16px 8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderBottom: '1px solid #F1F5F9',
                }}
              >
                <span style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Teams ({filteredEvents.length})
                </span>
                {(selectedDept !== 'ALL' || selectedStatus !== 'ALL' || selectedSection !== 'ALL' || searchQuery) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDept('ALL');
                      setSelectedStatus('ALL');
                      setSelectedSection('ALL');
                      setSearchQuery('');
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#2563EB',
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <RotateCcw size={11} /> Reset
                  </button>
                )}
              </div>

              {/* Scrollable Cards List */}
              <div
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                {filteredEvents.length === 0 ? (
                  <div
                    style={{
                      padding: '36px 16px',
                      textAlign: 'center',
                      background: '#F8FAFC',
                      borderRadius: 8,
                      border: '1px dashed #CBD5E1',
                      margin: '12px 4px',
                    }}
                  >
                    <AlertCircle size={28} color="#94A3B8" style={{ margin: '0 auto 8px' }} />
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                      No teams match your filters
                    </div>
                    <div style={{ fontSize: 11.5, color: '#64748B', lineHeight: 1.4, marginBottom: 12 }}>
                      Try clearing your search query or reset the Department / Status / Section filters.
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDept('ALL');
                        setSelectedStatus('ALL');
                        setSelectedSection('ALL');
                        setSearchQuery('');
                      }}
                      style={{
                        fontSize: 11.5,
                        fontWeight: 600,
                        color: '#2563EB',
                        background: '#EFF6FF',
                        border: '1px solid #BFDBFE',
                        padding: '6px 14px',
                        borderRadius: 6,
                        cursor: 'pointer',
                      }}
                    >
                      Reset All Filters
                    </button>
                  </div>
                ) : (
                  filteredEvents.map(item => {
                    const isSelected = selectedEventId === item.id;
                    const profile = teamProfiles[item.id] || getTeamProfile(item.id);

                    return (
                      <TeamTrackCard
                        key={item.id}
                        item={item}
                        isSelected={isSelected}
                        profile={profile}
                        onClick={() => {
                          setSelectedEventId(item.id);
                          if (isMobileView) setShowMobileDetail(true);
                        }}
                        onOpenNotifications={() => setActiveNotifEvent(item)}
                      />
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* RIGHT DETAIL PANEL */}
          {(!isMobileView || showMobileDetail) && selectedEvent && currentProfile && (
            <div style={{ flex: 1, height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <TeamDetailPanel
                event={selectedEvent}
                teamProfile={currentProfile}
                onOpenNotifications={() => setActiveNotifEvent(selectedEvent)}
                onBackToList={() => setShowMobileDetail(false)}
                isMobile={isMobileView}
              />
            </div>
          )}
        </div>
      </div>

      {/* Slide-over Notification Panel */}
      {activeNotifEvent && (
        <TeamNotificationPanel
          event={activeNotifEvent}
          teamProfile={teamProfiles[activeNotifEvent.id] || getTeamProfile(activeNotifEvent.id)}
          isOpen={Boolean(activeNotifEvent)}
          onClose={() => setActiveNotifEvent(null)}
          currentUser={currentUser}
          onPublishUpdate={handlePublishUpdate}
        />
      )}
    </div>
  );
};

export default TeamsOnTrackModal;
