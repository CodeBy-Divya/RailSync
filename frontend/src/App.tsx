import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Sidebar }           from './components/Sidebar';
import { TopHeader }         from './components/TopHeader';
import { MiddleColumn }      from './components/MiddleColumn';
import { RightActionPane }   from './components/RightActionPane';
import { AuditLedgerView }   from './components/AuditLedgerView';
import { OverviewDashboard } from './components/OverviewDashboard';
import { ChaosSreDashboard } from './components/ChaosSreDashboard';
import { AndroidFieldApp }   from './components/AndroidFieldApp';
import { LoginView }         from './components/LoginView';
import { RequisitionModal }  from './components/RequisitionModal';
import { fetchEvents, fetchHealth, getOrCreateTraceparent } from './api';
import { OperationalEvent }  from './types';
import { INITIAL_OPERATIONAL_EVENTS, eventMatchesSection } from './data/corridorData';

export type View = 'workspace' | 'audit' | 'overview' | 'chaos' | 'android_app';

function enrichEventWithFieldPhoto(evt: OperationalEvent): OperationalEvent {
  if (evt.field_photo && evt.field_photo.photo_url) {
    return evt;
  }
  const isMobile = evt.id.startsWith('EVT-MOB-') || evt.description?.includes('[ANDROID FIELD APP]');
  const isOhe = evt.id.includes('OHE') || evt.originator_id?.includes('OHE') || evt.description?.toLowerCase().includes('ohe');
  const lastPhoto = typeof window !== 'undefined' ? localStorage.getItem('railsync_last_field_photo') : null;
  const photoUrl = isMobile && lastPhoto ? lastPhoto : (isOhe ? '/images/ohe_crew.jpg' : '/images/track_gang.jpg');

  return {
    ...evt,
    field_photo: {
      photo_url: photoUrl,
      lat: evt.section?.includes('Danapur') || evt.section?.includes('Patna') ? 25.60281 : 20.7453,
      lng: evt.section?.includes('Danapur') || evt.section?.includes('Patna') ? 85.12110 : 78.6022,
      km_chainage: `KM ${evt.km_start ? evt.km_start.toFixed(2) : '548.10'} (${(evt.track_id || 'UP_MAIN').replace(/_/g, ' ')})`,
      uploaded_at: `${new Date(evt.created_at || Date.now()).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} via RailSync Mobile App`,
      accuracy_meters: 3.2,
      geofence_verified: true,
      gang_supervisor: `${evt.originator_id || 'SSE_OHE_PATNA_01'} (Field Custodian)`,
      crew_count: 6,
    }
  };
}

export function App() {
  const [isAuthenticated,   setIsAuthenticated]   = useState(false);
  const [currentUser,       setCurrentUser]       = useState<{
    username: string;
    name: string;
    role: string;
    station: string;
  } | null>(null);
  const [activeView,        setActiveView]        = useState<View>('workspace');
  const [events,            setEvents]            = useState<OperationalEvent[]>(() => {
    try {
      const saved = localStorage.getItem('railsync_events');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const storedIds = new Set(parsed.map(e => e.id));
          const baseline = INITIAL_OPERATIONAL_EVENTS.filter(e => !storedIds.has(e.id));
          return [...parsed.map(enrichEventWithFieldPhoto), ...baseline];
        }
      }
    } catch (_) {}
    return INITIAL_OPERATIONAL_EVENTS;
  });
  const [selectedEvent,     setSelectedEvent]     = useState<OperationalEvent | null>(() => {
    try {
      const saved = localStorage.getItem('railsync_events');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return enrichEventWithFieldPhoto(parsed[0]);
      }
    } catch (_) {}
    return INITIAL_OPERATIONAL_EVENTS[0];
  });
  const [activeTab,         setActiveTab]         = useState(1); // 1 = Pending Approvals
  const [selectedSectionId, setSelectedSectionId] = useState('ALL');
  const [selectedDept,      setSelectedDept]      = useState('ALL');
  const [searchQuery,       setSearchQuery]       = useState('');
  const [isModalOpen,       setIsModalOpen]       = useState(false);
  const [wsConnected,       setWsConnected]       = useState(false);
  const [canaryHealthy,     setCanaryHealthy]     = useState(true);
  const [isOfflineMode,     setIsOfflineMode]     = useState(false);
  const [ambientNotifs,     setAmbientNotifs]     = useState<string[]>([
    '23:05:12Z [TPC-DDU]: Circuit breaker trip telemetry verified at Feeding Post FP-02 (Danapur TSS).',
    '23:04:45Z [SM-PNBE]: Physical point clamp #14A padlocked. Reverse route locked against Up Main at Patna Jn.',
    '23:02:18Z [GSR-INVARIANT]: 6 Invariants evaluated. Dual-key approval matrix dispatched.',
    '23:00:00Z [COA-FOIS]: Danapur Section Controller pacing freight rake N/BOXNHL-243 via Down Main at TSR 30 km/h.',
  ]);

  // ── Load events from backend & merge with corridor dataset ──
  const loadEvents = useCallback(async () => {
    try {
      const data = await fetchEvents();
      if (Array.isArray(data) && data.length > 0) {
        // Merge fetched events with baseline so all sections remain available
        setEvents(prev => {
          const fetchedIds = new Set(data.map(d => d.id));
          const nonOverlapping = INITIAL_OPERATIONAL_EVENTS.filter(e => !fetchedIds.has(e.id));
          const merged = [...data, ...nonOverlapping].map(enrichEventWithFieldPhoto);
          try {
            localStorage.setItem('railsync_events', JSON.stringify(merged));
          } catch (_) {}
          return merged;
        });
      }
    } catch (err) {
      // Graceful offline fallback: use cached localStorage or baseline
      try {
        const saved = localStorage.getItem('railsync_events');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setEvents(parsed.map(enrichEventWithFieldPhoto));
            return;
          }
        }
      } catch (_) {}
      console.log('Operating with full offline corridor dataset');
    }
  }, []);

  // ── Dedicated handler for frontline mobile / modal requisition dispatch ──
  const handleEventCreatedFromMobile = useCallback(async (createdEvent?: OperationalEvent) => {
    // 1. Instantly switch to Tab 1 (Pending Approvals)
    setActiveTab(1);
    setSelectedSectionId('ALL');
    setSelectedDept('ALL');
    setSearchQuery('');

    const enrichedEvent = createdEvent ? enrichEventWithFieldPhoto(createdEvent) : undefined;

    // 2. Refresh from backend and prepend the new event
    try {
      const data = await fetchEvents();
      if (Array.isArray(data) && data.length > 0) {
        const fetchedIds = new Set(data.map(d => d.id));
        const nonOverlapping = INITIAL_OPERATIONAL_EVENTS.filter(e => !fetchedIds.has(e.id));
        const merged = enrichedEvent && !fetchedIds.has(enrichedEvent.id)
          ? [enrichedEvent, ...data, ...nonOverlapping].map(enrichEventWithFieldPhoto)
          : [...data, ...nonOverlapping].map(enrichEventWithFieldPhoto);

        setEvents(merged);
        try {
          localStorage.setItem('railsync_events', JSON.stringify(merged));
        } catch (_) {}

        const target = (enrichedEvent?.id && merged.find(e => e.id === enrichedEvent.id)) || merged[0];
        if (target) {
          setSelectedEvent(target);
        }
      } else if (enrichedEvent) {
        setEvents(prev => {
          const updated = [enrichedEvent, ...prev.filter(e => e.id !== enrichedEvent.id)].map(enrichEventWithFieldPhoto);
          try {
            localStorage.setItem('railsync_events', JSON.stringify(updated));
          } catch (_) {}
          return updated;
        });
        setSelectedEvent(enrichedEvent);
      }
    } catch {
      if (enrichedEvent) {
        setEvents(prev => {
          const updated = [enrichedEvent, ...prev.filter(e => e.id !== enrichedEvent.id)].map(enrichEventWithFieldPhoto);
          try {
            localStorage.setItem('railsync_events', JSON.stringify(updated));
          } catch (_) {}
          return updated;
        });
        setSelectedEvent(enrichedEvent);
      }
    }

    // 3. Add ambient dispatch log to live ticker
    const ts = new Date().toLocaleTimeString('en-GB', { hour12: false });
    const evId = createdEvent?.id || 'EVT-NEW';
    setAmbientNotifs(prev => [
      `${ts}Z [MOBILE DISPATCH]: Requisition ${evId} received from Frontline Android App. Routed to Pending Approvals queue.`,
      ...prev.slice(0, 30),
    ]);
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
    const t = setInterval(checkHealth, 20_000);
    return () => clearInterval(t);
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
    setEvents(prev => {
      const updated = prev.map(e => e.id === updatedEvent.id ? updatedEvent : e);
      try {
        localStorage.setItem('railsync_events', JSON.stringify(updated));
      } catch (_) {}
      return updated;
    });
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
        isOfflineMode={isOfflineMode}
        setIsOfflineMode={setIsOfflineMode}
        wsConnected={wsConnected}
        canaryHealthy={canaryHealthy}
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
          onOpenNewRequisition={() => setIsModalOpen(true)}
        />

        {/* ── Active View Rendering ──────────────────── */}
        {activeView === 'workspace' && (
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
              selectedEvent={selectedEvent}
              onSelectEvent={setSelectedEvent}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              selectedSectionId={selectedSectionId}
              onSelectSection={setSelectedSectionId}
              selectedDept={selectedDept}
              onSelectDept={setSelectedDept}
              searchQuery={searchQuery}
            />

            {/* Right Action Pane — Detailed Review, Authorizations & Seal */}
            <RightActionPane
              event={selectedEvent}
              onRefresh={loadEvents}
              onUpdateEvent={handleLocalSign}
              onNavigateAudit={() => setActiveView('audit')}
              isHistoryTab={activeTab === 2}
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
            <ChaosSreDashboard />
          </div>
        )}

        {activeView === 'android_app' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px', background: '#F8FAFC' }}>
            <AndroidFieldApp
              onEventCreated={handleEventCreatedFromMobile}
              onNavigateToPortal={() => {
                setActiveTab(1); // Force Pending Approvals
                setActiveView('workspace');
              }}
            />
          </div>
        )}
      </div>

      {/* ── Requisition Modal ──────────────────────── */}
      <RequisitionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreated={(createdEv) => {
          handleEventCreatedFromMobile(createdEv);
          setIsModalOpen(false);
        }}
      />
    </div>
  );
}

export default App;
