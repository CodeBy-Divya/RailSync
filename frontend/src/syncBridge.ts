/**
 * RailSync Cross-Window Sync Bridge
 * Provides zero-latency bi-directional sync between:
 *   Approval Portal (localhost:5173) <-> Field Mobile App (localhost:5174)
 *
 * Three-layer strategy:
 *  1. BroadcastChannel  - instantaneous, same-browser broadcast
 *  2. localStorage      - cross-tab via storage event
 *  3. Polling fallback  - reads localStorage every 3s
 */

export type SyncEventType =
  | 'EVENT_CREATED'
  | 'EVENT_UPDATED'
  | 'WORK_ACTIVATED'
  | 'WORK_COMPLETED'
  | 'PHOTO_UPDATED'
  | 'APPROVAL_RECORDED'
  | 'WORK_REQUEST_ASSIGNED'
  | 'REFRESH';

export interface SyncMessage {
  type: SyncEventType | string;
  data: any;
  ts: number;
  src: 'field' | 'portal' | 'unknown';
  id: string;
}

type SyncCallback = (msg: SyncMessage) => void;

const CHANNEL_NAME = 'railsync_corridor_channel';
const LS_PULSE_KEY = 'railsync_last_sync_pulse';
const LS_EVENTS_KEY = 'railsync_events';
const POLL_INTERVAL_MS = 3000;

function detectSource(): 'field' | 'portal' {
  try {
    const port = window.location.port;
    if (port === '5174') return 'field';
    if (port === '5173') return 'portal';
    if (window.location.pathname.includes('field') || document.title.toLowerCase().includes('field')) return 'field';
  } catch (_) {}
  return 'portal';
}

function makeId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export class SyncBridge {
  private static _instance: SyncBridge | null = null;
  private channel: BroadcastChannel | null = null;
  private callbacks: Set<SyncCallback> = new Set();
  private source: 'field' | 'portal';
  private lastPulseId: string = '';
  private pollTimer: ReturnType<typeof setInterval> | null = null;

  private constructor() {
    this.source = detectSource();
    this._initChannel();
    this._initStorageListener();
    this._initPolling();
  }

  static getInstance(): SyncBridge {
    if (!SyncBridge._instance) {
      SyncBridge._instance = new SyncBridge();
    }
    return SyncBridge._instance;
  }

  private _initChannel() {
    try {
      this.channel = new BroadcastChannel(CHANNEL_NAME);
      this.channel.onmessage = (ev) => {
        if (ev.data && ev.data.id) this._dispatch(ev.data);
      };
    } catch (_) {
      this.channel = null;
    }
  }

  private _initStorageListener() {
    window.addEventListener('storage', (e: StorageEvent) => {
      if (e.key === LS_PULSE_KEY && e.newValue) {
        try {
          const msg: SyncMessage = JSON.parse(e.newValue);
          if (msg && msg.id) this._dispatch(msg);
        } catch (_) {}
      }
    });
  }

  private _initPolling() {
    this.pollTimer = setInterval(() => {
      try {
        const raw = localStorage.getItem(LS_PULSE_KEY);
        if (!raw) return;
        const msg: SyncMessage = JSON.parse(raw);
        if (msg && msg.id && msg.id !== this.lastPulseId && msg.src !== this.source) {
          this._dispatch(msg);
        }
      } catch (_) {}
    }, POLL_INTERVAL_MS);
  }

  private _dispatch(msg: SyncMessage) {
    if (msg.id === this.lastPulseId) return;
    if (msg.src === this.source) return;
    this.lastPulseId = msg.id;
    this.callbacks.forEach(cb => { try { cb(msg); } catch (_) {} });
  }

  broadcast(type: SyncEventType | string, data: any): void {
    const msg: SyncMessage = {
      type,
      data,
      ts: Date.now(),
      src: this.source,
      id: makeId(),
    };
    try { if (this.channel) this.channel.postMessage(msg); } catch (_) {}
    try { localStorage.setItem(LS_PULSE_KEY, JSON.stringify(msg)); } catch (_) {}
    
    // Automatically update cached events in localStorage for instant local reactivity
    if (type === 'EVENT_CREATED' || type === 'EVENT_UPDATED' || type === 'WORK_ACTIVATED' || type === 'WORK_COMPLETED' || type === 'PHOTO_UPDATED') {
      try {
        const raw = localStorage.getItem(LS_EVENTS_KEY);
        if (raw) {
          const events = JSON.parse(raw);
          if (Array.isArray(events)) {
            const evId = data?.id || data?.eventId;
            if (evId) {
              const updated = events.map((e: any) => {
                if (e.id === evId) {
                  if (type === 'WORK_ACTIVATED') {
                    return { ...e, status: 'ACTIVE_IN_PROGRESS', fsm_stage: 6, status_color: '#DC2626' };
                  }
                  if (type === 'WORK_COMPLETED') {
                    return { ...e, status: 'WORK_COMPLETED', fsm_stage: 6, status_color: '#2563EB' };
                  }
                  if (type === 'PHOTO_UPDATED' && data.photo) {
                    return { ...e, field_photo: data.photo };
                  }
                  return { ...e, ...data };
                }
                return e;
              });
              if (type === 'EVENT_CREATED' && !events.some((e: any) => e.id === evId)) {
                updated.unshift(data);
              }
              localStorage.setItem(LS_EVENTS_KEY, JSON.stringify(updated));
            }
          }
        }
      } catch (_) {}
    }
  }

  subscribe(callback: SyncCallback): () => void {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  readCachedEvents(): any[] | null {
    try {
      const raw = localStorage.getItem(LS_EVENTS_KEY);
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    return null;
  }

  writeCachedEvents(events: any[]): void {
    try { localStorage.setItem(LS_EVENTS_KEY, JSON.stringify(events)); } catch (_) {}
  }

  destroy() {
    if (this.channel) { this.channel.close(); this.channel = null; }
    if (this.pollTimer) { clearInterval(this.pollTimer); this.pollTimer = null; }
    this.callbacks.clear();
    SyncBridge._instance = null;
  }
}
