import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Sidebar }           from './components/Sidebar';
import { TopHeader }         from './components/TopHeader';
import { MiddleColumn }      from './components/MiddleColumn';
import { RightActionPane }   from './components/RightActionPane';
import { AuditLedgerView }   from './components/AuditLedgerView';
import { OverviewDashboard } from './components/OverviewDashboard';
import { ChaosSreDashboard } from './components/ChaosSreDashboard';
import { LoginView }         from './components/LoginView';
import { WorkRequestModal }  from './components/WorkRequestModal';
import { TodayAtAGlance }   from './components/TodayAtAGlance';
import { TeamsOnTrackModal } from './components/TeamsOnTrackModal';
import { GlancePopover }     from './components/GlancePopover';
import { fetchEvents, fetchHealth, getOrCreateTraceparent } from './api';
import { OperationalEvent }  from './types';
import { INITIAL_OPERATIONAL_EVENTS, eventMatchesSection } from './data/corridorData';
import { getEventCategory }  from './components/MiddleColumn';
import { EmergencyBanner }   from './components/EmergencyBanner';
import { useEmergencyStop }  from './hooks/useEmergencyStop';
import { MessagesPage }      from './components/MessagesPage';
import { useChatStore }      from './hooks/useChatStore';
import { SupportDrawer }     from './components/support/SupportDrawer';
import { useSupportStore }   from './hooks/useSupportStore';
import { CheckCircle2, X, AlertOctagon }   from 'lucide-react';
import { syncClient, workRequestToOperationalEvent } from './syncClient';
import { WorkRequest, WorkPhoto, SosAlert } from './shared/types';

export type View = 'workspace' | 'audit' | 'overview' | 'today' | 'chaos' | 'messages';

const USER_EVENTS_STORAGE_KEY = 'railsync_created_events_v2';

const getInitialEvents = (): OperationalEvent[] => {
  try {
    const saved = localStorage.getItem(USER_EVENTS_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const savedIds = new Set(parsed.map((p: any) => p.id));
        const filteredInit = INITIAL_OPERATIONAL_EVENTS.filter(e => !savedIds.has(e.id));
        return [...parsed, ...filteredInit];
      }
    }
  } catch (_) {}
  return INITIAL_OPERATIONAL_EVENTS;
};

export function App() {
  const [isAuthenticated,   setIsAuthenticated]   = useState(false);
  const [currentUser,       setCurrentUser]       = useState<{
    username: string;
    name: string;
    role: string;
    station: string;
  } | null>(null);
  const [activeView,        setActiveView]        = useState<View>('workspace');
  const [isGlanceOpen,      setIsGlanceOpen]      = useState(false);
  const [isSupportOpen,     setIsSupportOpen]     = useState(false);
  const logoButtonRef                             = React.useRef<HTMLButtonElement>(null);
  const workRequestBtnRef                         = React.useRef<HTMLButtonElement>(null);
  const supportButtonRef                          = React.useRef<HTMLButtonElement>(null);
  const [events,            setEvents]            = useState<OperationalEvent[]>(getInitialEvents);
  const [selectedEvent,     setSelectedEvent]     = useState<OperationalEvent | null>(() => getInitialEvents()[0]);
  const [activeTab,         setActiveTab]         = useState(1); // 1 = Pending Approvals
  const [selectedSectionId, setSelectedSectionId] = useState('ALL');
  const [selectedDept,      setSelectedDept]      = useState('ALL');
  const [searchQuery,       setSearchQuery]       = useState('');
  const [isModalOpen,       setIsModalOpen]       = useState(false);
  const [isTeamsModalOpen,  setIsTeamsModalOpen]  = useState(false);
  const [toastMessage,      setToastMessage]      = useState<string | null>(null);
  const [highlightedEventId, setHighlightedEventId] = useState<string | null>(null);
  const [wsConnected,       setWsConnected]       = useState(false);
  const [canaryHealthy,     setCanaryHealthy]     = useState(true);
  const [isOfflineMode,     setIsOfflineMode]     = useState(false);
  const [connectionState,   setConnectionState]   = useState<'CONNECTED' | 'RECONNECTING' | 'OFFLINE'>(syncClient.getConnectionState());
  const [activeSosAlert,    setActiveSosAlert]    = useState<SosAlert | null>(null);
  const [ambientNotifs,     setAmbientNotifs]     = useState<string[]>([
    '23:05:12Z [TPC-DDU]: Circuit breaker trip telemetry verified at Feeding Post FP-02 (Danapur TSS).',
    '23:04:45Z [SM-PNBE]: Physical point clamp #14A padlocked. Reverse route locked against Up Main at Patna Jn.',
    '23:02:18Z [GSR-INVARIANT]: 6 Invariants evaluated. Dual-key approval matrix dispatched.',
    '23:00:00Z [COA-FOIS]: Danapur Section Controller pacing freight rake N/BOXNHL-243 via Down Main at TSR 30 km/h.',
  ]);

  const addAmbientNotification = useCallback((msg: string) => {
    setAmbientNotifs(prev => [msg, ...prev.slice(0, 30)]);
  }, []);

  const handleWorkResumed = useCallback((resumedCount: number, remainingCount: number, resumedIds: string[]) => {
    if (remainingCount === 0) {
      setToastMessage(
        `All ${resumedCount} works resumed. Track possession and catenary power re-instated.`
      );
    } else {
      setToastMessage(
        resumedCount === 1
          ? `Work ${resumedIds[0]} resumed. Track possession active (${remainingCount} still suspended).`
          : `${resumedCount} works resumed (${remainingCount} still suspended).`
      );
    }
    setTimeout(() => {
      setToastMessage(null);
    }, 5000);
  }, []);

  // Emergency Stop & Statutory Suspension Hook
  const {
    emergencyState,
    suspendedEvents,
    ongoingCount,
    activateEmergencyStop,
    reapproveEvent,
    reapproveAllSuspended,
  } = useEmergencyStop(events, setEvents, currentUser, addAmbientNotification, handleWorkResumed);

  // Two-Way Control Desk Clarification & Chat Store
  const chatStore = useChatStore(currentUser);

  // Support Desk Store
  const supportStore = useSupportStore(
    currentUser,
    addAmbientNotification,
    chatStore.sendMessage
  );

  // Clear unread badge when Messages view is open
  useEffect(() => {
    if (activeView === 'messages') {
      chatStore.markAllRead();
    }
  }, [activeView, chatStore.markAllRead]);

  // Always derive live, up-to-date selected event from events array
  const currentSelectedEvent = useMemo(() => {
    if (!selectedEvent) return null;
    return events.find(e => e.id === selectedEvent.id) || selectedEvent;
  }, [events, selectedEvent]);

  const handleReapproveSingle = useCallback((eventId: string) => {
    reapproveEvent(eventId);
    setEvents(prev => {
      const match = prev.find(e => e.id === eventId);
      if (match) {
        setSelectedEvent({
          ...match,
          is_suspended: false,
          status: 'ACTIVE_IN_PROGRESS' as any,
          fsm_stage: 6,
        });
      }
      return prev;
    });
  }, [reapproveEvent]);

  const handleReapproveAll = useCallback(() => {
    reapproveAllSuspended();
    setEvents(prev => {
      if (selectedEvent) {
        const match = prev.find(e => e.id === selectedEvent.id);
        if (match) {
          setSelectedEvent({
            ...match,
            is_suspended: false,
            status: 'ACTIVE_IN_PROGRESS' as any,
            fsm_stage: 6,
          });
        }
      }
      return prev;
    });
  }, [reapproveAllSuspended, selectedEvent]);
  const glanceCounts = useMemo(() => {
    const tabCounts = [0, 0, 0];
    events.forEach(event => {
      tabCounts[getEventCategory(event)]++;
    });
    return {
      pendingApprovals: tabCounts[1],
      workInProgress: tabCounts[0],
      // Derive Teams on Track directly from the Ongoing Work tab data (4)
      teamsOnTrack: tabCounts[0],
      pendingForWardha: 4,
      savedTime: '3h 15m',
    };
  }, [events]);

  const openApprovalTab = (tab: 0 | 1 | 2) => {
    setSelectedSectionId('ALL');
    setSelectedDept('ALL');
    setSearchQuery('');
    setActiveTab(tab);
    const firstMatch = events.find(event =>
      getEventCategory(event) === tab && eventMatchesSection(event.section, 'ALL')
    );
    setSelectedEvent(firstMatch || null);
    setActiveView('workspace');
  };

  const handleWorkRequestCreated = (newEvent: OperationalEvent) => {
    setEvents(prev => {
      const updated = [newEvent, ...prev.filter(e => e.id !== newEvent.id)];
      try {
        const customOnly = updated.filter(e => !INITIAL_OPERATIONAL_EVENTS.some(init => init.id === e.id));
        localStorage.setItem(USER_EVENTS_STORAGE_KEY, JSON.stringify(customOnly));
      } catch (_) {}
      return updated;
    });

    // Reset filters to ALL so the newly created event is visible
    setSelectedSectionId('ALL');
    setSelectedDept('ALL');
    setSearchQuery('');
    setActiveView('workspace');
    setActiveTab(1); // 1 = Pending Approvals tab
    setSelectedEvent(newEvent);
    setHighlightedEventId(newEvent.id);

    // Increment ambient notification count (+1)
    const ts = new Date().toLocaleTimeString('en-GB', { hour12: false });
    setAmbientNotifs(prev => [
      `${ts}Z [WORK-REQUEST]: New statutory work request submitted: ${newEvent.id} (${newEvent.section} • ${newEvent.track_id})`,
      ...prev.slice(0, 30),
    ]);

    // Show toast notification
    setToastMessage(`Work Request ${newEvent.id} submitted for statutory approval!`);
    setTimeout(() => {
      setToastMessage(null);
    }, 6000);
  };

  // ── Load events from backend & merge with corridor dataset ──
  const loadEvents = useCallback(async () => {
    try {
      const data = await fetchEvents();
      if (Array.isArray(data) && data.length > 0) {
        // Merge fetched events with baseline so all sections remain available,
        // preserving client-side suspension/resumption state
        setEvents(prev => {
          const prevMap = new Map(prev.map(p => [p.id, p]));
          const mergedFetched = data.map(d => {
            const existing = prevMap.get(d.id);
            if (existing) {
              return {
                ...d,
                ...existing,
                station_actions: existing.station_actions || d.station_actions,
              };
            }
            return d;
          });
          const fetchedIds = new Set(data.map(d => d.id));
          const nonOverlapping = prev.filter(e => !fetchedIds.has(e.id));
          return [...mergedFetched, ...nonOverlapping];
        });
      }
    } catch (err) {
      // Graceful offline fallback: baseline INITIAL_OPERATIONAL_EVENTS remain active
      console.log('Operating with full offline corridor dataset');
    }
  }, []);

  // ── Health canary ─────────────────────────────────
  const checkHealth = useCallback(async () => {
    try {
      const res = await fetchHealth();
      setCanaryHealthy(res.status === 'HEALTHY');
    } catch {
      setCanaryHealthy(true); // default healthy for UI preview
    }
  }, []);

  useEffect(() => {
    loadEvents();
    checkHealth();
    const eventInterval = setInterval(loadEvents, 3000);
    const healthInterval = setInterval(checkHealth, 20_000);

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === USER_EVENTS_STORAGE_KEY) {
        loadEvents();
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      clearInterval(eventInterval);
      clearInterval(healthInterval);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [loadEvents, checkHealth]);

  // ── WebSocket for ambient telemetry ───────────────
  useEffect(() => {
    let ws: WebSocket | null = null;
    let retryTimer: ReturnType<typeof setTimeout>;

    const connect = () => {
      try {
        const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const tp    = encodeURIComponent(getOrCreateTraceparent());
        ws = new WebSocket(`${proto}//${window.location.host}/ws/corridor?traceparent=${tp}`);

        ws.onopen  = () => setWsConnected(true);
        ws.onclose = () => { setWsConnected(false); retryTimer = setTimeout(connect, 5000); };
        ws.onerror = () => setWsConnected(false);

        ws.onmessage = ev => {
          try {
            const data = JSON.parse(ev.data);
            if (data.type && data.type !== 'INITIAL_SNAPSHOT') {
              const ts = new Date().toLocaleTimeString('en-GB', { hour12: false });
              setAmbientNotifs(prev => [
                `${ts}Z [PUB/SUB]: ${data.type} — ${data.event_id ?? data.message ?? 'Telemetry update'}`,
                ...prev.slice(0, 30),
              ]);
              loadEvents();
            }
          } catch (_) { /* ignore */ }
        };
      } catch {
        setWsConnected(false);
        retryTimer = setTimeout(connect, 5000);
      }
    };

    connect();
    return () => {
      if (ws) ws.close();
      clearTimeout(retryTimer);
    };
  }, [loadEvents]);

  // ── Real-Time Multi-Origin Sync Client Subscriptions ────────
  useEffect(() => {
    const unsubConn = syncClient.on('connection.change', (state) => {
      setConnectionState(state);
      setIsOfflineMode(state === 'OFFLINE');
    });

    const unsubCreated = syncClient.on('work.created', (newReq: WorkRequest) => {
      const newEvent = workRequestToOperationalEvent(newReq);
      setEvents(prev => {
        const filtered = prev.filter(e => e.id !== newEvent.id);
        return [newEvent, ...filtered];
      });

      const creatorName = newReq.createdBy?.name || 'Field Crew';
      const ts = new Date().toLocaleTimeString('en-GB', { hour12: false });
      setAmbientNotifs(prev => [
        `${ts}Z [FIELD-REQUISITION]: New requisition received from ${creatorName}: ${newReq.id} (${newReq.section} • ${newReq.trackId}) [${newReq.photos?.length || 0} photo(s)]`,
        ...prev.slice(0, 30),
      ]);
      setHighlightedEventId(newEvent.id);
      setSelectedEvent(newEvent);
      setActiveTab(1); // 1 = Pending Approvals

      setToastMessage(`⚡ New field requisition ${newReq.id} received from ${creatorName}!`);
      setTimeout(() => setToastMessage(null), 6000);
    });

    const unsubUpdated = syncClient.on('work.updated', (updatedReq: WorkRequest) => {
      const updatedEvent = workRequestToOperationalEvent(updatedReq);
      setEvents(prev => prev.map(e => e.id === updatedEvent.id ? { ...e, ...updatedEvent } : e));
    });

    const unsubApproved = syncClient.on('work.approved', (req: WorkRequest) => {
      const updatedEvent = workRequestToOperationalEvent(req);
      setEvents(prev => prev.map(e => e.id === updatedEvent.id ? { ...e, ...updatedEvent } : e));
    });

    const unsubCommenced = syncClient.on('work.commenced', (req: WorkRequest) => {
      const updatedEvent = workRequestToOperationalEvent(req);
      setEvents(prev => prev.map(e => e.id === updatedEvent.id ? { ...e, ...updatedEvent } : e));
      const ts = new Date().toLocaleTimeString('en-GB', { hour12: false });
      setAmbientNotifs(prev => [
        `${ts}Z [FIELD-COMMENCE]: Work commenced on track for ${req.id} (Fencing Token Verified)`,
        ...prev.slice(0, 30),
      ]);
      setToastMessage(`Work Commenced on track for ${req.id}`);
      setTimeout(() => setToastMessage(null), 4000);
    });

    const unsubCompleted = syncClient.on('work.completed', (req: WorkRequest) => {
      const updatedEvent = workRequestToOperationalEvent(req);
      setEvents(prev => prev.map(e => e.id === updatedEvent.id ? { ...e, ...updatedEvent } : e));
      const ts = new Date().toLocaleTimeString('en-GB', { hour12: false });
      setAmbientNotifs(prev => [
        `${ts}Z [FIELD-COMPLETE]: Work completed on track for ${req.id}. Track fit certificate signed.`,
        ...prev.slice(0, 30),
      ]);
      setToastMessage(`Work Completed & Block Cleared for ${req.id}`);
      setTimeout(() => setToastMessage(null), 4000);
    });

    const unsubPhoto = syncClient.on('photo.added', (photo: WorkPhoto) => {
      setEvents(prev => prev.map(e => {
        if (e.id === photo.workRequestId) {
          const currentPhotos = e.photos || [];
          const updatedPhotos = [photo, ...currentPhotos.filter(p => p.id !== photo.id)];
          return {
            ...e,
            photos: updatedPhotos,
            field_photo: {
              photo_url: photo.url,
              lat: photo.gps.lat,
              lng: photo.gps.lng,
              km_chainage: photo.chainage,
              uploaded_at: photo.capturedAt,
              accuracy_meters: photo.gps.accuracyM,
              geofence_verified: photo.geofenceStatus === 'MATCH VERIFIED',
              gang_supervisor: photo.capturedBy,
              crew_count: photo.crewPresent || 6,
              sha256: photo.sha256,
              stage: photo.stage,
            }
          };
        }
        return e;
      }));
    });

    const unsubSos = syncClient.on('sos.raised', (alert: SosAlert) => {
      setActiveSosAlert(alert);
      const ts = new Date().toLocaleTimeString('en-GB', { hour12: false });
      setAmbientNotifs(prev => [
        `🚨 ${ts}Z [EMERGENCY SOS]: CRITICAL ALARM raised by ${alert.supervisorName} (${alert.department}) at ${alert.section} • ${alert.chainage}!`,
        ...prev.slice(0, 30),
      ]);
    });

    return () => {
      unsubConn();
      unsubCreated();
      unsubUpdated();
      unsubApproved();
      unsubCommenced();
      unsubCompleted();
      unsubPhoto();
      unsubSos();
    };
  }, []);

  // ── Ensure selectedEvent always belongs to the current section filter ──
  useEffect(() => {
    if (selectedSectionId !== 'ALL' && selectedEvent) {
      if (!eventMatchesSection(selectedEvent.section, selectedSectionId)) {
        // Find first event matching the new section
        const match = events.find(e => eventMatchesSection(e.section, selectedSectionId));
        setSelectedEvent(match || null);
      }
    }
  }, [selectedSectionId, events]);

  // ── Handle local signing and FSM stage transition to immediately reflect in state ──
  const handleLocalSign = (updatedEvent: OperationalEvent) => {
    setEvents(prev => prev.map(e => e.id === updatedEvent.id ? updatedEvent : e));
    setSelectedEvent(updatedEvent);

    // Auto-navigate tab to follow the event as work progresses
    if (updatedEvent.fsm_stage === 6 && activeTab !== 0) {
      setActiveTab(0); // Switch to Ongoing Work
    } else if (updatedEvent.fsm_stage === 7 && activeTab !== 2) {
      setActiveTab(2); // Switch to History
    } else if (updatedEvent.fsm_stage <= 5 && activeTab === 2) {
      setActiveTab(1); // Switch to Pending Approvals
    }
  };

  if (!isAuthenticated) {
    return (
      <LoginView
        onLoginSuccess={(u) => {
          setCurrentUser(u);
          setIsAuthenticated(true);
        }}
      />
    );
  }

  return (
    <div
      style={{
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
        display: 'flex',
        background: '#F8FAFC',
      }}
    >
      {/* ── Left Sidebar (3 items: Approval Portal, Audit & History, Overview) ── */}
      <Sidebar
        activeView={activeView}
        setActiveView={v => setActiveView(v)}
        onToggleGlance={() => setIsGlanceOpen(prev => !prev)}
        isGlanceOpen={isGlanceOpen}
        logoButtonRef={logoButtonRef}
        isOfflineMode={isOfflineMode}
        setIsOfflineMode={setIsOfflineMode}
        wsConnected={wsConnected}
        canaryHealthy={canaryHealthy}
        unreadMessagesCount={chatStore.unreadCount}
        onOpenSupportDesk={() => setIsSupportOpen(true)}
        supportButtonRef={supportButtonRef}
        unreadTicketsCount={supportStore.unreadCount}
      />

      {/* ── Main Content Area ──────────────────────── */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          minWidth: 0,
        }}
      >
        {/* Dynamic Clutter-Free Top Header */}
        <TopHeader
          events={events}
          selectedEvent={selectedEvent}
          ambientNotifications={ambientNotifs}
          activeView={activeView}
          selectedSectionId={selectedSectionId}
          onSelectSection={setSelectedSectionId}
          onLogout={() => setIsAuthenticated(false)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onOpenWorkRequest={() => setIsModalOpen(true)}
          workRequestBtnRef={workRequestBtnRef}
          unreadMessagesCount={chatStore.unreadCount}
          currentUser={currentUser}
          connectionState={connectionState}
          activeSosCount={activeSosAlert ? 1 : 0}
        />

        {/* ── Real-Time SOS Alert Banner ── */}
        {activeSosAlert && (
          <div
            id="active-sos-alarm-banner"
            style={{
              background: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
              color: '#FFFFFF',
              padding: '12px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 4px 12px rgba(220,38,38,0.4)',
              zIndex: 90,
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AlertOctagon size={20} color="#FFFFFF" />
              </div>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 900, letterSpacing: '0.02em', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>🚨 STATUTORY TRACK EMERGENCY (SOS) ACTIVATED</span>
                  <span style={{ fontSize: 10.5, background: '#FFFFFF', color: '#DC2626', padding: '1px 8px', borderRadius: 4, fontWeight: 800 }}>
                    PRIORITY 1
                  </span>
                </div>
                <div style={{ fontSize: 12, color: '#FEE2E2', marginTop: 2 }}>
                  Raised by <strong>{activeSosAlert.supervisorName}</strong> ({activeSosAlert.department}) at <strong>{activeSosAlert.section} • {activeSosAlert.chainage}</strong> (GPS: {activeSosAlert.gps.lat.toFixed(4)}° N, {activeSosAlert.gps.lng.toFixed(4)}° E)
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                onClick={() => {
                  setSelectedSectionId('ALL');
                  setActiveTab(0); // Ongoing Work
                  setActiveView('workspace');
                }}
                style={{
                  padding: '7px 14px',
                  borderRadius: 6,
                  border: '1px solid rgba(255,255,255,0.4)',
                  background: 'rgba(255,255,255,0.15)',
                  color: '#FFFFFF',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Inspect Section
              </button>
              <button
                onClick={() => setActiveSosAlert(null)}
                style={{
                  padding: '7px 14px',
                  borderRadius: 6,
                  border: 'none',
                  background: '#FFFFFF',
                  color: '#B91C1C',
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                }}
              >
                Acknowledge Alarm
              </button>
            </div>
          </div>
        )}

        {/* ── Persistent Emergency Stop Active Banner ── */}
        <EmergencyBanner
          emergencyState={emergencyState}
          suspendedCount={suspendedEvents.length}
          onViewInPending={() => {
            setSelectedSectionId('ALL');
            setSelectedDept('ALL');
            setSearchQuery('');
            setActiveView('workspace');
            setActiveTab(1); // 1 = Pending Approvals tab
            const firstSuspended = events.find(e => e.is_suspended || (e.status as string) === 'SUSPENDED - EMERGENCY STOP');
            if (firstSuspended) {
              setSelectedEvent(firstSuspended);
            }
          }}
        />

        {/* ── Active View Rendering ──────────────────── */}
        {(activeView === 'workspace' || activeView === 'today') && (
          <div
            style={{
              flex: 1,
              display: 'flex',
              overflow: 'hidden',
              background: '#F8FAFC',
            }}
          >
            {/* Middle Column — Queue with Section & Tab Filtering */}
            <MiddleColumn
              events={events}
              selectedEvent={currentSelectedEvent}
              onSelectEvent={setSelectedEvent}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              selectedSectionId={selectedSectionId}
              onSelectSection={setSelectedSectionId}
              selectedDept={selectedDept}
              onSelectDept={setSelectedDept}
              searchQuery={searchQuery}
              highlightedEventId={highlightedEventId}
              onReapproveAll={handleReapproveAll}
            />

            {/* Right Action Pane — Detailed Review, Authorizations & Seal */}
            <RightActionPane
              event={currentSelectedEvent}
              onRefresh={loadEvents}
              onUpdateEvent={handleLocalSign}
              onNavigateAudit={() => setActiveView('audit')}
              isHistoryTab={activeTab === 2}
              onReapproveEvent={handleReapproveSingle}
            />
          </div>
        )}

        {activeView === 'audit' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px', background: '#F8FAFC' }}>
            <AuditLedgerView />
          </div>
        )}

        {activeView === 'overview' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px', background: '#F8FAFC' }}>
            <OverviewDashboard
              onSelectSectionAndNavigate={(secId) => {
                setSelectedSectionId(secId);
                setActiveView('workspace');
              }}
            />
          </div>
        )}

        {activeView === 'chaos' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px', background: '#F8FAFC' }}>
            <ChaosSreDashboard
              ongoingCount={ongoingCount}
              currentUser={currentUser}
              onActivateEmergencyStop={activateEmergencyStop}
            />
          </div>
        )}

        {activeView === 'messages' && (
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
            <MessagesPage
              currentUser={currentUser}
              chatStore={chatStore}
            />
          </div>
        )}
      </div>

      {/* ── Work Request 4-Step Wizard Modal ───────── */}
      <WorkRequestModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreated={handleWorkRequestCreated}
        existingEvents={events}
        triggerButtonRef={workRequestBtnRef}
      />

      {/* ── Toast Notification for New Work Request ──── */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-900 text-white shadow-2xl border border-slate-700 animate-in slide-in-from-bottom-5 duration-200"
        >
          <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="text-xs font-semibold text-slate-100 pr-2">
            {toastMessage}
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-white transition-colors cursor-pointer"
            aria-label="Dismiss notification"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ── Today at a Glance Compact Popover ───────── */}
      <GlancePopover
        isOpen={isGlanceOpen}
        onClose={() => setIsGlanceOpen(false)}
        onSelectTab={openApprovalTab}
        onOpenTeamsOnTrack={() => setIsTeamsModalOpen(true)}
        liveCounts={{
          pending: glanceCounts.pendingApprovals,
          ongoing: glanceCounts.workInProgress,
          teamsOnTrack: glanceCounts.teamsOnTrack,
          history: glanceCounts.teamsOnTrack,
        }}
        anchorRef={logoButtonRef}
      />

      {/* ── Teams on Track Modal ───────────────────── */}
      <TeamsOnTrackModal
        isOpen={isTeamsModalOpen}
        onClose={() => setIsTeamsModalOpen(false)}
        events={events}
        currentUser={currentUser}
        onUpdateEvent={handleLocalSign}
        onAddAmbientNotification={(msg) => setAmbientNotifs(prev => [msg, ...prev.slice(0, 30)])}
      />

      {/* ── Support Desk Slide-Over Drawer ─────────── */}
      <SupportDrawer
        isOpen={isSupportOpen}
        onClose={() => {
          setIsSupportOpen(false);
          supportButtonRef.current?.focus();
        }}
        events={events}
        currentUser={currentUser}
        onSelectEvent={(evt) => {
          setSelectedEvent(evt);
          setActiveView('workspace');
        }}
        onNavigateMessages={(dept) => {
          setActiveView('messages');
          if (dept) {
            const mapped =
              dept === 'OPERATING' ? 'operating' :
              dept === 'OHE' ? 'ohe' :
              dept === 'S_AND_T' ? 'sandt' :
              dept === 'CIVIL_P_WAY' ? 'civil' : 'all';
            chatStore.setActiveChannel(mapped);
          }
        }}
        supportStore={supportStore}
        isOfflineMode={isOfflineMode}
        wsConnected={wsConnected}
        canaryHealthy={canaryHealthy}
      />
    </div>
  );
}

export default App;
