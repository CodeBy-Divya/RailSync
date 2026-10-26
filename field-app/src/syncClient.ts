import {
  WorkRequest,
  WorkPhoto,
  SharedMessage,
  SharedNotification,
  AuditBlock,
  SosAlert,
  OperationalEvent,
} from './shared/types';
import { SyncBridge } from './syncBridge';

export type ConnectionState = 'CONNECTED' | 'RECONNECTING' | 'OFFLINE';

export type ClientEventType =
  | 'work.created'
  | 'work.updated'
  | 'work.approved'
  | 'work.commenced'
  | 'work.completed'
  | 'photo.added'
  | 'message.new'
  | 'emergency.stop'
  | 'emergency.resume'
  | 'sos.raised'
  | 'connection.change'
  | 'queue.change';

type EventCallback = (data: any) => void;

interface QueuedAction {
  id: string;
  type: string;
  payload: any;
  timestamp: number;
  retries: number;
}

const OFFLINE_QUEUE_KEY = 'railsync_offline_queue_v2';

// ---------------------------------------------------------------------------
// Resolve API Base URL
// ---------------------------------------------------------------------------
export function getApiBaseUrl(): string {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/+$/, '') + '/api/v1';
  }

  if (typeof window !== 'undefined') {
    const origin = window.location.origin;
    // If running on field-app on vercel, connect to the portal backend
    if (window.location.hostname.includes('field-app-railsync.vercel.app')) {
      return 'https://railsync-green.vercel.app/api/v1';
    }
    // If running on field app on localhost:5174, connect to portal on 5173 or proxy /api
    if (window.location.port === '5174') {
      return '/api/v1'; // Proxied by Vite to 5173 or 8000
    }
    return `${origin}/api/v1`;
  }

  return 'https://railsync-green.vercel.app/api/v1';
}

// ---------------------------------------------------------------------------
// RailSync Unified Client
// ---------------------------------------------------------------------------
export class RailSyncClient {
  private static instance: RailSyncClient | null = null;
  private apiBase: string;
  private connectionState: ConnectionState = 'RECONNECTING';
  private listeners: Map<string, Set<EventCallback>> = new Map();
  private lastSyncTimestamp: number = 0;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private eventSource: EventSource | null = null;
  private isOfflineForced: boolean = false;
  private isSyncingQueue: boolean = false;
  private localBridge: SyncBridge;

  private constructor() {
    this.apiBase = getApiBaseUrl();
    this.localBridge = SyncBridge.getInstance();

    // Listen to local bridge events as cross-tab fallback
    this.localBridge.subscribe((msg: any) => {
      this.emit(msg.type as any, msg.data);
    });

    this.initRealtime();
    this.processOfflineQueue();

    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        if (!this.isOfflineForced) {
          this.setConnectionState('RECONNECTING');
          this.initRealtime();
          this.processOfflineQueue();
        }
      });
      window.addEventListener('offline', () => {
        this.setConnectionState('OFFLINE');
      });
    }
  }

  static getInstance(): RailSyncClient {
    if (!RailSyncClient.instance) {
      RailSyncClient.instance = new RailSyncClient();
    }
    return RailSyncClient.instance;
  }

  // -------------------------------------------------------------------------
  // Event Emitter
  // -------------------------------------------------------------------------
  on(event: ClientEventType, callback: EventCallback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    return () => this.off(event, callback);
  }

  off(event: ClientEventType, callback: EventCallback) {
    this.listeners.get(event)?.delete(callback);
  }

  private emit(event: ClientEventType, data: any) {
    this.listeners.get(event)?.forEach((cb) => {
      try {
        cb(data);
      } catch (err) {
        console.error(`Error in ${event} listener:`, err);
      }
    });
  }

  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  setForceOffline(force: boolean) {
    this.isOfflineForced = force;
    if (force) {
      this.setConnectionState('OFFLINE');
      if (this.eventSource) {
        this.eventSource.close();
        this.eventSource = null;
      }
      if (this.pollTimer) {
        clearInterval(this.pollTimer);
        this.pollTimer = null;
      }
    } else {
      this.setConnectionState('RECONNECTING');
      this.initRealtime();
      this.processOfflineQueue();
    }
  }

  private setConnectionState(state: ConnectionState) {
    if (this.connectionState !== state) {
      this.connectionState = state;
      this.emit('connection.change', state);
    }
  }

  // -------------------------------------------------------------------------
  // Real-time Engine: SSE with Fallback Short Polling (3s)
  // -------------------------------------------------------------------------
  private initRealtime() {
    if (this.isOfflineForced) return;

    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    try {
      const sseUrl = `${this.apiBase.replace(/\/v1$/, '')}/v1/events-stream`;
      const es = new EventSource(sseUrl);
      this.eventSource = es;

      es.onopen = () => {
        this.setConnectionState('CONNECTED');
      };

      es.onmessage = (e) => {
        try {
          const payload = JSON.parse(e.data);
          if (payload.type === 'SYNC_UPDATE' && Array.isArray(payload.items)) {
            this.lastSyncTimestamp = payload.ts;
            for (const item of payload.items) {
              this.emit('work.updated', item);
            }
            if (payload.emergency) {
              if (payload.emergency.isEmergencyStop) {
                this.emit('emergency.stop', payload.emergency);
              } else {
                this.emit('emergency.resume', payload.emergency);
              }
            }
          }
        } catch (_) {}
      };

      es.onerror = () => {
        es.close();
        this.eventSource = null;
        this.setConnectionState('RECONNECTING');
        // Fall back to polling
        this.startPolling();
      };
    } catch {
      this.startPolling();
    }

    // Always keep short-polling active as resilient backup
    this.startPolling();
  }

  private startPolling() {
    if (this.pollTimer) return;
    this.pollTimer = setInterval(async () => {
      if (this.isOfflineForced) return;
      try {
        const sinceParam = this.lastSyncTimestamp ? `?updatedSince=${this.lastSyncTimestamp}` : '';
        const res = await fetch(`${this.apiBase}/work-requests${sinceParam}`, {
          headers: { 'Cache-Control': 'no-cache' },
        });
        if (res.ok) {
          this.setConnectionState('CONNECTED');
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            this.lastSyncTimestamp = Date.now();
            for (const item of data) {
              this.emit('work.updated', item);
            }
          }
        }
      } catch {
        this.setConnectionState('OFFLINE');
      }
    }, 3000);
  }

  // -------------------------------------------------------------------------
  // Offline Action Queue
  // -------------------------------------------------------------------------
  private getQueue(): QueuedAction[] {
    try {
      const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private saveQueue(queue: QueuedAction[]) {
    try {
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
      this.emit('queue.change', queue.length);
    } catch {}
  }

  getPendingQueueCount(): number {
    return this.getQueue().length;
  }

  getQueuedCount(): number {
    return this.getQueue().length;
  }

  private enqueueAction(type: string, payload: any): QueuedAction {
    const action: QueuedAction = {
      id: `queue-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type,
      payload,
      timestamp: Date.now(),
      retries: 0,
    };
    const queue = this.getQueue();
    queue.push(action);
    this.saveQueue(queue);
    return action;
  }

  async processOfflineQueue() {
    if (this.isSyncingQueue || this.isOfflineForced || this.connectionState === 'OFFLINE') return;
    const queue = this.getQueue();
    if (queue.length === 0) return;

    this.isSyncingQueue = true;
    const remaining: QueuedAction[] = [];

    for (const action of queue) {
      try {
        if (action.type === 'CREATE_WORK') {
          await this.createWorkRequest(action.payload, true);
        } else if (action.type === 'UPLOAD_PHOTO') {
          await this.uploadPhoto(action.payload.workRequestId, action.payload.photoData, action.payload.meta, true);
        } else if (action.type === 'COMMENCE_WORK') {
          await this.commenceWork(action.payload.id, action.payload.fencingToken, true);
        } else if (action.type === 'COMPLETE_WORK') {
          await this.completeWork(action.payload.id, action.payload.handedBackBy, true);
        } else if (action.type === 'SEND_MESSAGE') {
          await this.sendMessage(action.payload, true);
        }
      } catch (err) {
        action.retries++;
        if (action.retries < 5) remaining.push(action);
      }
    }

    this.saveQueue(remaining);
    this.isSyncingQueue = false;
  }

  // -------------------------------------------------------------------------
  // API Methods
  // -------------------------------------------------------------------------
  async fetchWorkRequests(filter?: { status?: string; source?: string; section?: string }): Promise<OperationalEvent[]> {
    const params = new URLSearchParams();
    if (filter?.status) params.set('status', filter.status);
    if (filter?.source) params.set('source', filter.source);
    if (filter?.section) params.set('section', filter.section);

    try {
      const res = await fetch(`${this.apiBase}/work-requests?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch work requests');
      const data = await res.json();
      this.setConnectionState('CONNECTED');
      return data;
    } catch (err) {
      this.setConnectionState('OFFLINE');
      throw err;
    }
  }

  async createWorkRequest(payload: any, isQueueReplay = false): Promise<OperationalEvent> {
    const idempotencyKey = payload.idempotencyKey || `IDEM-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const fullPayload = { ...payload, idempotencyKey };

    if (this.isOfflineForced || this.connectionState === 'OFFLINE') {
      if (!isQueueReplay) this.enqueueAction('CREATE_WORK', fullPayload);
      // Local optimistic return
      const optimistic: OperationalEvent = {
        ...fullPayload,
        id: fullPayload.id || `EVT-OFFLINE-${Date.now().toString().slice(-4)}`,
        status: 'AWAITING_APPROVAL',
        fsm_stage: 2,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        source: 'FIELD',
      };
      this.localBridge.broadcast('EVENT_CREATED', optimistic);
      this.emit('work.created', optimistic);
      return optimistic;
    }

    try {
      const res = await fetch(`${this.apiBase}/work-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify(fullPayload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to submit work request');
      }

      const created: OperationalEvent = await res.json();
      this.localBridge.broadcast('EVENT_CREATED', created);
      this.emit('work.created', created);
      return created;
    } catch (err) {
      if (!isQueueReplay) this.enqueueAction('CREATE_WORK', fullPayload);
      throw err;
    }
  }

  async submitApproval(
    id: string,
    role: 'FIELD_SUPERVISOR' | 'TPC' | 'STATION_MASTER' | 'SECTION_CONTROLLER',
    signedBy: string,
    decision: 'APPROVED' | 'REJECTED' = 'APPROVED',
    rejectionReason?: string
  ): Promise<OperationalEvent> {
    const res = await fetch(`${this.apiBase}/work-requests/${id}/approvals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, signedBy, decision, rejectionReason }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Approval failed');
    }

    const updated: OperationalEvent = await res.json();
    this.localBridge.broadcast('APPROVAL_RECORDED', { eventId: id, updated });
    this.emit('work.approved', updated);
    this.emit('work.updated', updated);
    return updated;
  }

  async commenceWork(id: string, fencingToken: number, isQueueReplay = false): Promise<OperationalEvent> {
    if (this.isOfflineForced || this.connectionState === 'OFFLINE') {
      if (!isQueueReplay) this.enqueueAction('COMMENCE_WORK', { id, fencingToken });
      const optimisticUpdate: any = { id, status: 'ACTIVE_IN_PROGRESS', fsm_stage: 6 };
      this.localBridge.broadcast('WORK_ACTIVATED', optimisticUpdate);
      this.emit('work.commenced', optimisticUpdate);
      return optimisticUpdate;
    }

    const res = await fetch(`${this.apiBase}/work-requests/${id}/commence`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fencingToken }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to commence work on track');
    }

    const updated: OperationalEvent = await res.json();
    this.localBridge.broadcast('WORK_ACTIVATED', { eventId: id, updated });
    this.emit('work.commenced', updated);
    this.emit('work.updated', updated);
    return updated;
  }

  async completeWork(id: string, handedBackBy: string, isQueueReplay = false): Promise<OperationalEvent> {
    if (this.isOfflineForced || this.connectionState === 'OFFLINE') {
      if (!isQueueReplay) this.enqueueAction('COMPLETE_WORK', { id, handedBackBy });
      const optimisticUpdate: any = { id, status: 'WORK_COMPLETED', fsm_stage: 6 };
      this.localBridge.broadcast('WORK_COMPLETED', optimisticUpdate);
      this.emit('work.completed', optimisticUpdate);
      return optimisticUpdate;
    }

    const res = await fetch(`${this.apiBase}/work-requests/${id}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ handedBackBy }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to hand back track');
    }

    const updated: OperationalEvent = await res.json();
    this.localBridge.broadcast('WORK_COMPLETED', { eventId: id, updated });
    this.emit('work.completed', updated);
    this.emit('work.updated', updated);
    return updated;
  }

  async uploadPhoto(
    workRequestId: string,
    photoData: string,
    meta: Partial<WorkPhoto>,
    isQueueReplay = false
  ): Promise<WorkPhoto> {
    const payload = {
      workRequestId,
      url: photoData,
      photoData,
      ...meta,
    };

    if (this.isOfflineForced || this.connectionState === 'OFFLINE') {
      if (!isQueueReplay) this.enqueueAction('UPLOAD_PHOTO', { workRequestId, photoData, meta });
      const optimisticPhoto: WorkPhoto = {
        id: `photo-local-${Date.now()}`,
        workRequestId,
        url: photoData,
        capturedBy: meta.capturedBy || 'Divya Singh (SSE/OHE)',
        capturedAt: meta.capturedAt || new Date().toISOString(),
        gps: meta.gps || { lat: 25.6028, lng: 85.1211, accuracyM: 3.2 },
        chainage: meta.chainage || 'KM 548.10 UP MAIN',
        geofenceStatus: meta.geofenceStatus || 'MATCH VERIFIED',
        crewPresent: meta.crewPresent || 6,
        caption: meta.caption || 'Field evidence',
        stage: meta.stage || 'DURING_WORK',
        sha256: `SHA-${Date.now()}`,
      };
      this.emit('photo.added', optimisticPhoto);
      return optimisticPhoto;
    }

    const res = await fetch(`${this.apiBase}/photos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to upload photo');
    }

    const photo: WorkPhoto = await res.json();
    this.emit('photo.added', photo);
    return photo;
  }

  async activateEmergencyStop(reason = 'URGENT TRACK SAFETY INTERVENTION', by = 'Divya Singh (Station Master)') {
    const res = await fetch(`${this.apiBase}/emergency-stop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason, by }),
    });

    if (!res.ok) throw new Error('Emergency stop failed');
    const result = await res.json();
    this.emit('emergency.stop', { reason, by, ...result });
    return result;
  }

  async resumeEmergency(workRequestId?: string) {
    const res = await fetch(`${this.apiBase}/resume`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workRequestId }),
    });

    if (!res.ok) throw new Error('Resume failed');
    const result = await res.json();
    this.emit('emergency.resume', result);
    return result;
  }

  async raiseSos(alert: Partial<SosAlert>): Promise<SosAlert> {
    const res = await fetch(`${this.apiBase}/sos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(alert),
    });

    if (!res.ok) throw new Error('Failed to raise SOS alert');
    const result: SosAlert = await res.json();
    this.emit('sos.raised', result);
    return result;
  }

  async fetchMessages(channel = 'all'): Promise<SharedMessage[]> {
    const res = await fetch(`${this.apiBase}/messages?channel=${channel}`);
    if (!res.ok) return [];
    return res.json();
  }

  async sendMessage(msg: Partial<SharedMessage>, isQueueReplay = false): Promise<SharedMessage> {
    if (this.isOfflineForced || this.connectionState === 'OFFLINE') {
      if (!isQueueReplay) this.enqueueAction('SEND_MESSAGE', msg);
      const optimisticMsg: SharedMessage = {
        id: `msg-${Date.now()}`,
        sender: msg.sender || 'Divya Singh (SSE/OHE)',
        role: msg.role || 'FIELD_SUPERVISOR',
        text: msg.text || '',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' UTC',
        taggedDepts: msg.taggedDepts || ['@OPERATING'],
        photoUrl: msg.photoUrl,
        channel: msg.channel || 'all',
      };
      this.emit('message.new', optimisticMsg);
      return optimisticMsg;
    }

    const res = await fetch(`${this.apiBase}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(msg),
    });

    if (!res.ok) throw new Error('Failed to send message');
    const saved: SharedMessage = await res.json();
    this.emit('message.new', saved);
    return saved;
  }

  async fetchNotifications(): Promise<SharedNotification[]> {
    const res = await fetch(`${this.apiBase}/notifications`);
    if (!res.ok) return [];
    return res.json();
  }

  async fetchAuditBlocks(): Promise<AuditBlock[]> {
    const res = await fetch(`${this.apiBase}/audit`);
    if (!res.ok) return [];
    return res.json();
  }
}

export const syncClient = RailSyncClient.getInstance();

export function workRequestToOperationalEvent(wr: WorkRequest): OperationalEvent {
  const stakeholders: OperationalEvent['stakeholders'] = [];

  if (wr.approvals.fieldSupervisor) {
    stakeholders.push({
      id: `stk-${wr.id}-fs`,
      event_id: wr.id,
      department: (wr.department as any) || 'OHE',
      role: 'FIELD_SUPERVISOR',
      officer_id: wr.approvals.fieldSupervisor.signedBy || wr.supervisor || 'Divya Singh (SSE/OHE)',
      approval_status: wr.approvals.fieldSupervisor.approvalStatus,
      signature_hash: wr.approvals.fieldSupervisor.signatureHash,
      signed_at: wr.approvals.fieldSupervisor.signedAt,
      rejection_reason: wr.approvals.fieldSupervisor.rejectionReason,
    });
  }

  if (wr.approvals.tpc) {
    stakeholders.push({
      id: `stk-${wr.id}-tpc`,
      event_id: wr.id,
      department: 'OHE',
      role: 'TPC',
      officer_id: wr.approvals.tpc.signedBy || 'TPC_DDU_01',
      approval_status: wr.approvals.tpc.approvalStatus,
      signature_hash: wr.approvals.tpc.signatureHash,
      signed_at: wr.approvals.tpc.signedAt,
    });
  }

  if (wr.approvals.stationMaster) {
    stakeholders.push({
      id: `stk-${wr.id}-sm`,
      event_id: wr.id,
      department: 'OPERATING',
      role: 'STATION_MASTER',
      officer_id: wr.approvals.stationMaster.signedBy || 'SM_PNBE_01',
      approval_status: wr.approvals.stationMaster.approvalStatus,
      signature_hash: wr.approvals.stationMaster.signatureHash,
      signed_at: wr.approvals.stationMaster.signedAt,
    });
  }

  if (wr.approvals.sectionController) {
    stakeholders.push({
      id: `stk-${wr.id}-coa`,
      event_id: wr.id,
      department: 'OPERATING',
      role: 'SECTION_CONTROLLER',
      officer_id: wr.approvals.sectionController.signedBy || 'CTRL_SEC_DNR_02',
      approval_status: wr.approvals.sectionController.approvalStatus,
      signature_hash: wr.approvals.sectionController.signatureHash,
      signed_at: wr.approvals.sectionController.signedAt,
    });
  }

  const primaryPhoto = wr.photos?.[0];

  return {
    id: wr.id,
    division: wr.division,
    section: wr.section,
    track_id: wr.trackId,
    km_start: wr.kmStart,
    km_end: wr.kmEnd,
    status: wr.status,
    requested_start: wr.startTime,
    requested_end: wr.endTime,
    fencing_token: wr.fencingToken,
    impact_vector: {
      catenary_25kv_power_trip: wr.safetyImpacts?.power25kvCut ?? false,
      absolute_traffic_block: wr.safetyImpacts?.trafficBlock ?? false,
      speed_restriction_kmh: wr.safetyImpacts?.tsr30 ? 30 : 0,
      feeding_posts: wr.safetyImpacts?.feedingPosts || ['FP-02 (Danapur TSS)'],
      points_clamping_required: wr.safetyImpacts?.pointClamp ?? true,
      track_bonding_notice: wr.safetyImpacts?.trackBondingNotice ?? true,
    },
    description: wr.description,
    originator_id: wr.createdBy?.id || 'FIELD_USER',
    stakeholders,
    permits: [],
    fsm_stage: wr.fsmStage,
    created_at: wr.createdAt,
    updated_at: wr.updatedAt,
    photos: wr.photos,
    field_photo: primaryPhoto
      ? {
          photo_url: primaryPhoto.url,
          lat: primaryPhoto.gps.lat,
          lng: primaryPhoto.gps.lng,
          km_chainage: primaryPhoto.chainage,
          uploaded_at: primaryPhoto.capturedAt,
          accuracy_meters: primaryPhoto.gps.accuracyM,
          geofence_verified: primaryPhoto.geofenceStatus === 'MATCH VERIFIED',
          gang_supervisor: primaryPhoto.capturedBy,
          crew_count: primaryPhoto.crewPresent,
          sha256: primaryPhoto.sha256,
          stage: primaryPhoto.stage,
        }
      : undefined,
    is_suspended: wr.suspension?.isSuspended,
    suspended_at: wr.suspension?.suspendedAt,
    suspended_by: wr.suspension?.suspendedBy,
    suspension_reason: wr.suspension?.reason,
    previous_status: wr.suspension?.previousStatus,
    previous_fsm_stage: wr.suspension?.previousFsmStage,
    source: wr.source,
    created_by: wr.createdBy,
  };
}
