import React, { useState, useEffect, useCallback } from 'react';
import { AndroidFieldApp } from './components/AndroidFieldApp';
import { MobileLoginView, FieldUser } from './components/MobileLoginView';
import { OperationalEvent } from './types';
import { fetchEvents, onCorridorUpdate, broadcastCorridorUpdate, getOrCreateTraceparent } from './api';
import { INITIAL_OPERATIONAL_EVENTS } from './data/corridorData';

export function App() {
  const [currentUser, setCurrentUser] = useState<FieldUser | null>(() => {
    try {
      const saved = localStorage.getItem('railsync_field_user');
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return null;
  });

  const [events, setEvents] = useState<OperationalEvent[]>(() => {
    try {
      const saved = localStorage.getItem('railsync_events');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (_) {}
    return INITIAL_OPERATIONAL_EVENTS;
  });
  const [loading, setLoading] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  
  // Always show Samsung Galaxy S24 FE phone frame
  const [isDeviceFrame, setIsDeviceFrame] = useState(true);
  // Portal sync pulse — flashes green when data arrives from approval portal
  const [portalSynced, setPortalSynced] = useState(false);

  // Load events from backend / local storage
  const loadEvents = useCallback(async () => {
    try {
      const data = await fetchEvents();
      if (Array.isArray(data) && data.length > 0) {
        setEvents(data);
        localStorage.setItem('railsync_events', JSON.stringify(data));
      }
    } catch (err) {
      console.warn('Field app operating with cached events:', err);
      const cached = localStorage.getItem('railsync_events');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) setEvents(parsed);
        } catch (_) {}
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  // Real-time WebSocket connection to shared backend
  useEffect(() => {
    let ws: WebSocket | null = null;
    let retryTimer: ReturnType<typeof setTimeout>;

    const connect = () => {
      try {
        const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        const tp = encodeURIComponent(getOrCreateTraceparent());
        ws = new WebSocket(`${proto}//${host}/ws/corridor?traceparent=${tp}`);

        ws.onopen = () => setWsConnected(true);
        ws.onclose = () => {
          setWsConnected(false);
          retryTimer = setTimeout(connect, 4000);
        };
        ws.onerror = () => setWsConnected(false);

        ws.onmessage = (ev) => {
          try {
            const data = JSON.parse(ev.data);
            if (data.type === 'EVENT_CREATED' || data.type === 'STAGE_CHANGED' || data.type === 'APPROVAL_RECORDED') {
              loadEvents();
              if (data.event?.is_work_request) {
                setNotification(`⚡ New Work Order assigned by Station Master: ${data.event.id}`);
                setTimeout(() => setNotification(null), 8000);
              }
            }
          } catch (_) {}
        };
      } catch (_) {
        setWsConnected(false);
      }
    };

    connect();
    return () => {
      if (ws) ws.close();
      clearTimeout(retryTimer);
    };
  }, [loadEvents]);

  // Cross-Window / Cross-Port Peer Synchronization (SyncBridge)
  useEffect(() => {
    const unsubscribe = onCorridorUpdate((msg) => {
      if (msg.type === 'EVENT_CREATED' || msg.type === 'WORK_REQUEST_ASSIGNED' || msg.type === 'APPROVAL_RECORDED' || msg.type === 'EVENT_UPDATED') {
        loadEvents();
        // Flash the portal sync indicator
        setPortalSynced(true);
        setTimeout(() => setPortalSynced(false), 2000);
        if (msg.data?.is_work_request || msg.data?.description?.includes('[SM WORK REQUEST]')) {
          setNotification(`⚡ New Work Order from Station Master: ${msg.data.id || 'Assigned Work'}`);
          setTimeout(() => setNotification(null), 8000);
        }
      }
    });
    return unsubscribe;
  }, [loadEvents]);

  // Handle local sign or update from the field app
  const handleUpdateEvent = (updated: OperationalEvent) => {
    setEvents((prev) => {
      const next = prev.map((e) => (e.id === updated.id ? updated : e));
      try {
        localStorage.setItem('railsync_events', JSON.stringify(next));
      } catch (_) {}
      return next;
    });
    broadcastCorridorUpdate('EVENT_UPDATED', updated);
  };

  // Handle event created from field app
  const handleEventCreated = (created?: OperationalEvent) => {
    if (created) {
      setEvents((prev) => {
        const next = [created, ...prev.filter((e) => e.id !== created.id)];
        try {
          localStorage.setItem('railsync_events', JSON.stringify(next));
        } catch (_) {}
        return next;
      });
      broadcastCorridorUpdate('EVENT_CREATED', created);
      setNotification(`✓ Requisition ${created.id} dispatched to Station Master pending approval queue!`);
      setTimeout(() => setNotification(null), 6000);
    }
  };

  return (
    <div style={{ height: '100vh', width: '100vw', background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #0F172A 100%)', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* ── Real-Time Work Order Notification Toast ──────────── */}
      {notification && (
        <div
          style={{
            position: 'fixed',
            top: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            background: 'linear-gradient(135deg, #1E40AF 0%, #1D4ED8 100%)',
            color: '#FFFFFF',
            padding: '10px 20px',
            borderRadius: 12,
            fontSize: 12.5,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
            border: '1px solid rgba(255,255,255,0.2)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#60A5FA', display: 'inline-block' }} />
            <span>{notification}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            style={{ background: 'none', border: 'none', color: '#BFDBFE', cursor: 'pointer', fontSize: 11, fontWeight: 700, textDecoration: 'underline' }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ── Phone Frame Stage — cleanly centers the Samsung Galaxy S24 FE ──────── */}
      <main style={{ flex: 1, overflowY: 'auto', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '32px 16px 48px' }}>
        {!currentUser ? (
          <div style={{ position: 'relative', margin: '0 auto' }}>
            {/* Physical Phone Hardware Buttons (Samsung Galaxy S24 FE) */}
            <div style={{ position: 'absolute', left: -14, top: 160, width: 4, height: 74, background: '#1E293B', borderRadius: '3px 0 0 3px', boxShadow: 'inset 0 0 2px rgba(255,255,255,0.2)' }} />
            <div style={{ position: 'absolute', right: -14, top: 180, width: 4, height: 46, background: '#1E293B', borderRadius: '0 3px 3px 0', boxShadow: 'inset 0 0 2px rgba(255,255,255,0.2)' }} />

            <div
              style={{
                width: 412,
                maxWidth: 412,
                height: 892,
                background: '#0A0F1D',
                borderRadius: 44,
                border: '10px solid #0D1117',
                boxShadow: '0 0 0 1px #1E293B, 0 30px 80px -10px rgba(0,0,0,0.7), inset 0 0 0 1px rgba(255,255,255,0.08)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              {/* S24 FE Status Bar */}
              <div
                style={{
                  height: 36,
                  background: '#0A0F1D',
                  padding: '0 18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  color: '#94A3B8',
                  fontSize: 11,
                  fontWeight: 700,
                  position: 'relative',
                  flexShrink: 0,
                }}
              >
                <span style={{ zIndex: 1, color: '#F8FAFC' }}>
                  {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                {/* S24 FE Punch-hole Camera */}
                <div
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    background: '#0D1117',
                    boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.15)',
                  }}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, zIndex: 1 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#38BDF8' }}>5G</span>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
                </div>
              </div>

              {/* Mobile Login Form */}
              <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                <MobileLoginView onLoginSuccess={(user) => setCurrentUser(user)} />
              </div>

              {/* Android Home Gesture Bar */}
              <div
                style={{
                  height: 16,
                  background: '#0A0F1D',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <div style={{ width: 100, height: 4, borderRadius: 99, background: '#334155' }} />
              </div>
            </div>
          </div>
        ) : (
          <AndroidFieldApp
            events={events}
            onUpdateEvent={handleUpdateEvent}
            onEventCreated={handleEventCreated}
            standalone={true}
            defaultExpanded={false}
            deviceFrame={true}
            onToggleDeviceFrame={() => setIsDeviceFrame(!isDeviceFrame)}
            currentUser={currentUser}
            onLogout={() => {
              try {
                localStorage.removeItem('railsync_field_user');
              } catch (_) {}
              setCurrentUser(null);
            }}
            onNavigateToPortal={() => {
              window.open('http://localhost:5173', '_blank');
            }}
          />
        )}
      </main>
    </div>
  );
}

export default App;
