import { createHash } from 'crypto';
import {
  WorkRequest,
  WorkPhoto,
  SharedMessage,
  SharedNotification,
  AuditBlock,
  SosAlert,
  OperationalEvent,
} from './types';

// Compute SHA-256 hash helper
export function computeSha256(data: string | Buffer): string {
  return createHash('sha256').update(data).digest('hex');
}

// Global in-memory storage (persists across warm serverless invocations)
interface StorageState {
  workRequests: Map<string, WorkRequest>;
  photos: Map<string, WorkPhoto>;
  messages: SharedMessage[];
  notifications: SharedNotification[];
  auditBlocks: AuditBlock[];
  emergencyState: {
    isEmergencyStop: boolean;
    suspendedCount: number;
    activatedAt?: string;
    reason?: string;
    by?: string;
  };
  sosAlerts: SosAlert[];
  lastUpdated: number;
}

// ---------------------------------------------------------------------------
// Seed Data Generator
// ---------------------------------------------------------------------------
function getSeedWorkRequests(): WorkRequest[] {
  const now = new Date();
  const startTime = now.toISOString();
  const endTime = new Date(now.getTime() + 2.5 * 3600 * 1000).toISOString();

  return [
    {
      id: 'EVT-01',
      source: 'PORTAL',
      createdBy: {
        id: 'SM_PNBE_01',
        name: 'Divya Singh',
        role: 'Station Master',
        department: 'OPERATING',
      },
      division: 'DNR',
      section: 'Danapur — Patna Junction',
      trackId: 'UP_MAIN',
      kmStart: 548.1,
      kmEnd: 554.0,
      durationHours: 2.5,
      dateOfWork: now.toISOString().split('T')[0],
      startTime,
      endTime,
      department: 'OHE',
      supervisor: 'Divya Singh (SSE/OHE)',
      description: 'Emergency catenary dropper alignment & 25kV insulator inspection per ACTM Vol II.',
      safetyImpacts: {
        power25kvCut: true,
        trafficBlock: true,
        tsr30: true,
        pointClamp: true,
        feedingPosts: ['FP-02 (Danapur TSS)'],
      },
      status: 'AWAITING_APPROVAL',
      fsmStage: 2,
      approvals: {
        fieldSupervisor: {
          signedBy: 'Divya Singh (SSE/OHE)',
          signedAt: startTime,
          signatureHash: 'SIG-FS-885A1',
          approvalStatus: 'APPROVED',
        },
        tpc: { approvalStatus: 'PENDING' },
        stationMaster: { approvalStatus: 'PENDING' },
        sectionController: { approvalStatus: 'PENDING' },
      },
      fencingToken: 885,
      photos: [
        {
          id: 'photo-seed-1',
          workRequestId: 'EVT-01',
          url: '/images/ohe_crew.jpg',
          capturedBy: 'Divya Singh (SSE/OHE)',
          capturedAt: `${now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} UTC+5:30`,
          gps: { lat: 25.6028, lng: 85.1211, accuracyM: 3.2 },
          chainage: 'KM 548.10 UP MAIN',
          geofenceStatus: 'MATCH VERIFIED',
          crewPresent: 6,
          caption: 'Pre-work inspection of 25kV dropper and bracket insulator.',
          stage: 'REQUEST_DEFECT',
          sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        },
      ],
      suspension: { isSuspended: false },
      createdAt: startTime,
      updatedAt: startTime,
    },
    {
      id: 'EVT-02',
      source: 'PORTAL',
      createdBy: {
        id: 'AEN_TRACK_DNR',
        name: 'K. S. Verma',
        role: 'Assistant Divisional Engineer',
        department: 'CIVIL_P_WAY',
      },
      division: 'DNR',
      section: 'Patna Junction — Rajendra Nagar',
      trackId: 'DOWN_MAIN',
      kmStart: 554.0,
      kmEnd: 558.5,
      durationHours: 3.0,
      dateOfWork: now.toISOString().split('T')[0],
      startTime,
      endTime,
      department: 'CIVIL_P_WAY',
      supervisor: 'Amit Kumar (SSE/P-Way)',
      description: 'Continuous deep screening & ballast tamping on Down Main track #2.',
      safetyImpacts: {
        power25kvCut: false,
        trafficBlock: true,
        tsr30: true,
        pointClamp: false,
      },
      status: 'ACTIVE_IN_PROGRESS',
      fsmStage: 6,
      approvals: {
        fieldSupervisor: { signedBy: 'Amit Kumar', signedAt: startTime, signatureHash: 'SIG-FS-334', approvalStatus: 'APPROVED' },
        tpc: { signedBy: 'TPC Danapur Grid', signedAt: startTime, signatureHash: 'SIG-TPC-112', approvalStatus: 'APPROVED' },
        stationMaster: { signedBy: 'Divya Singh', signedAt: startTime, signatureHash: 'SIG-SM-902', approvalStatus: 'APPROVED' },
        sectionController: { signedBy: 'COA Danapur Control', signedAt: startTime, signatureHash: 'SIG-COA-441', approvalStatus: 'APPROVED' },
      },
      fencingToken: 412,
      photos: [
        {
          id: 'photo-seed-2',
          workRequestId: 'EVT-02',
          url: '/images/track_gang.jpg',
          capturedBy: 'Amit Kumar (SSE/P-Way)',
          capturedAt: `${now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} UTC+5:30`,
          gps: { lat: 25.6035, lng: 85.123, accuracyM: 2.8 },
          chainage: 'KM 554.20 DOWN MAIN',
          geofenceStatus: 'MATCH VERIFIED',
          crewPresent: 8,
          caption: 'Track tamping machine in position with caution flag deployed.',
          stage: 'DURING_WORK',
          sha256: '8b43690d96d2994f3b7308d27a4d46e01a4fb42da14545d6560ef73b64082531',
        },
      ],
      suspension: { isSuspended: false },
      createdAt: startTime,
      updatedAt: startTime,
      commencedAt: startTime,
    },
  ];
}

// Global state across function re-use
const globalState: StorageState = {
  workRequests: new Map(getSeedWorkRequests().map(w => [w.id, w])),
  photos: new Map(getSeedWorkRequests().flatMap(w => w.photos.map(p => [p.id, p]))),
  messages: [
    {
      id: 'msg-seed-1',
      sender: 'Station Master (PNBE)',
      role: 'STATION_MASTER',
      text: 'Up Main track block confirmed. Point #14A clamped in normal reverse. TSR 30 km/h active.',
      timestamp: '23:04 UTC',
      taggedDepts: ['@OPERATING', '@OHE'],
      channel: 'all',
    },
    {
      id: 'msg-seed-2',
      sender: 'SSE / OHE (Field Supervisor)',
      role: 'FIELD_SUPERVISOR',
      text: 'Catenary discharge rod earthed at mast #548/12. Crew entering track possession.',
      timestamp: '23:05 UTC',
      taggedDepts: ['@OHE'],
      channel: 'ohe',
    },
    {
      id: 'msg-seed-3',
      sender: 'TPC Danapur Grid',
      role: 'TPC',
      text: 'FP-02 circuit breaker locked open. Auxiliary relay trip telemetry verified healthy.',
      timestamp: '23:06 UTC',
      taggedDepts: ['@OHE'],
      channel: 'ohe',
    },
  ],
  notifications: [
    {
      id: 'notif-seed-1',
      type: 'INFO',
      title: 'Corridor Online',
      message: 'Danapur Division Mesh Active. 6 Invariants Evaluated.',
      timestamp: new Date().toISOString(),
      read: false,
    },
  ],
  auditBlocks: [
    {
      block_number: 1,
      event_id: 'GENESIS',
      timestamp: new Date().toISOString(),
      prev_hash: '0000000000000000000000000000000000000000000000000000000000000000',
      merkle_root: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      block_hash: '3a479b1287c8a6b2c5d1e4f901a2b3c4d5e6f708192a3b4c5d6e7f8091a2b3c4',
      consensus_proof: 'SHA256_DUAL_KEY_WORM_V1',
      multi_signatures: [
        {
          department: 'OPERATING',
          role: 'STATION_MASTER',
          officer_id: 'SM_PNBE_01',
          signature_hash: 'SIG-SM-GENESIS',
          signed_at: new Date().toISOString(),
        },
      ],
      leaves: [{ leaf_id: 'leaf-1', title: 'System Genesis Block Initialized', hash: 'GENESIS_HASH' }],
      worm_status: 'IMMUTABLE_LOCKED',
      storage_tier: 'HOT_EDGE_WORM',
    },
  ],
  emergencyState: {
    isEmergencyStop: false,
    suspendedCount: 0,
  },
  sosAlerts: [],
  lastUpdated: Date.now(),
};

// ---------------------------------------------------------------------------
// Upstash / Vercel KV Optional Cloud Persistence
// ---------------------------------------------------------------------------
const KV_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

async function kvGet<T>(key: string): Promise<T | null> {
  if (!KV_URL || !KV_TOKEN) return null;
  try {
    const res = await fetch(`${KV_URL}/get/${key}`, {
      headers: { Authorization: `Bearer ${KV_TOKEN}` },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.result ? JSON.parse(json.result) : null;
  } catch {
    return null;
  }
}

async function kvSet(key: string, value: any): Promise<void> {
  if (!KV_URL || !KV_TOKEN) return;
  try {
    await fetch(`${KV_URL}/set/${key}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${KV_TOKEN}` },
      body: JSON.stringify(value),
    });
  } catch {}
}

// ---------------------------------------------------------------------------
// DB Operations
// ---------------------------------------------------------------------------
export class RailSyncDB {
  static async getWorkRequests(filter?: { status?: string; source?: string; section?: string; updatedSince?: number }): Promise<WorkRequest[]> {
    let list = Array.from(globalState.workRequests.values());

    if (filter?.status) {
      list = list.filter(w => w.status === filter.status);
    }
    if (filter?.source) {
      list = list.filter(w => w.source === filter.source);
    }
    if (filter?.section && filter.section !== 'ALL') {
      const sec = filter.section.toLowerCase();
      list = list.filter(w => w.section.toLowerCase().includes(sec));
    }
    if (filter?.updatedSince) {
      const since = Number(filter.updatedSince);
      list = list.filter(w => new Date(w.updatedAt).getTime() > since);
    }

    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  static async getWorkRequestById(id: string): Promise<WorkRequest | null> {
    return globalState.workRequests.get(id) || null;
  }

  static async createWorkRequest(req: Partial<WorkRequest>): Promise<WorkRequest> {
    // Generate sequential ID if not given
    const dept = (req.department || 'OPERATING').toString().toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
    const seq = String(globalState.workRequests.size + 1).padStart(3, '0');
    const id = req.id || `EVT-${dept}-2026-${seq}`;

    // Deduplicate on idempotencyKey
    if (req.idempotencyKey) {
      for (const existing of globalState.workRequests.values()) {
        if (existing.idempotencyKey === req.idempotencyKey) {
          return existing;
        }
      }
    }

    const now = new Date().toISOString();
    const isField = req.source === 'FIELD';

    const fullRecord: WorkRequest = {
      id,
      source: req.source || 'FIELD',
      createdBy: req.createdBy || {
        id: isField ? 'SSE_OHE_PATNA_01' : 'SM_PNBE_01',
        name: isField ? 'Divya Singh' : 'Divya Singh',
        role: isField ? 'Senior Section Engineer (OHE)' : 'Station Master',
        department: req.department || (isField ? 'OHE' : 'OPERATING'),
      },
      division: req.division || 'DNR',
      section: req.section || 'Danapur — Patna Junction',
      trackId: req.trackId || 'UP_MAIN',
      kmStart: Number(req.kmStart) || 548.1,
      kmEnd: Number(req.kmEnd) || 554.0,
      durationHours: Number(req.durationHours) || 2.5,
      dateOfWork: req.dateOfWork || now.split('T')[0],
      startTime: req.startTime || now,
      endTime: req.endTime || new Date(Date.now() + 2.5 * 3600 * 1000).toISOString(),
      department: req.department || 'OHE',
      supervisor: req.supervisor || (isField ? 'Divya Singh (SSE/OHE)' : 'Divya Singh (Station Master)'),
      description: req.description || '[FIELD REQUISITION] Statutory Track Possession',
      safetyImpacts: req.safetyImpacts || {
        power25kvCut: true,
        trafficBlock: true,
        tsr30: true,
        pointClamp: true,
        feedingPosts: ['FP-02 (Danapur TSS)'],
      },
      status: req.status || 'AWAITING_APPROVAL',
      fsmStage: req.fsmStage || (isField ? 2 : 1),
      approvals: req.approvals || {
        fieldSupervisor: isField
          ? {
              signedBy: 'Divya Singh (SSE/OHE)',
              signedAt: now,
              signatureHash: `SIG-FS-${Date.now().toString(16)}`,
              approvalStatus: 'APPROVED',
            }
          : { approvalStatus: 'PENDING' },
        tpc: { approvalStatus: 'PENDING' },
        stationMaster: { approvalStatus: 'PENDING' },
        sectionController: { approvalStatus: 'PENDING' },
      },
      fencingToken: req.fencingToken || Math.floor(100 + Math.random() * 899),
      photos: req.photos || [],
      suspension: req.suspension || { isSuspended: false },
      idempotencyKey: req.idempotencyKey,
      createdAt: now,
      updatedAt: now,
    };

    globalState.workRequests.set(id, fullRecord);
    for (const p of fullRecord.photos) {
      globalState.photos.set(p.id, p);
    }

    // Add Audit Entry
    await this.appendAuditBlock(id, `Work Request Created: ${id} (${fullRecord.source})`, [
      {
        department: fullRecord.department.toString(),
        role: fullRecord.createdBy.role,
        officer_id: fullRecord.createdBy.id,
        signature_hash: `HASH-${Date.now()}`,
        signed_at: now,
      },
    ]);

    // Add Notification
    globalState.notifications.unshift({
      id: `notif-${Date.now()}`,
      type: 'WORK_CREATED',
      title: isField ? '⚡ New Field Requisition' : 'Station Master Work Order Created',
      message: `${id}: ${fullRecord.section} (${fullRecord.trackId}) by ${fullRecord.createdBy.name}`,
      timestamp: now,
      read: false,
      workRequestId: id,
      gps: fullRecord.photos[0]?.gps,
    });

    globalState.lastUpdated = Date.now();
    await kvSet(`work_request_${id}`, fullRecord);
    return fullRecord;
  }

  static async updateWorkRequest(id: string, updates: Partial<WorkRequest>): Promise<WorkRequest | null> {
    const existing = globalState.workRequests.get(id);
    if (!existing) return null;

    const updated: WorkRequest = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    globalState.workRequests.set(id, updated);
    globalState.lastUpdated = Date.now();
    await kvSet(`work_request_${id}`, updated);
    return updated;
  }

  static async recordApproval(
    id: string,
    role: 'FIELD_SUPERVISOR' | 'TPC' | 'STATION_MASTER' | 'SECTION_CONTROLLER',
    signedBy: string,
    decision: 'APPROVED' | 'REJECTED' = 'APPROVED',
    rejectionReason?: string
  ): Promise<WorkRequest | null> {
    const existing = globalState.workRequests.get(id);
    if (!existing) return null;

    const now = new Date().toISOString();
    const sigHash = `SIG-${role}-${Date.now().toString(16)}`;

    const approvals = { ...existing.approvals };
    const approvalData = {
      signedBy,
      signedAt: now,
      signatureHash: sigHash,
      approvalStatus: decision,
      rejectionReason,
    };

    if (role === 'FIELD_SUPERVISOR') approvals.fieldSupervisor = approvalData;
    if (role === 'TPC') approvals.tpc = approvalData;
    if (role === 'STATION_MASTER') approvals.stationMaster = approvalData;
    if (role === 'SECTION_CONTROLLER') approvals.sectionController = approvalData;

    // Check if all 4 signed
    const allApproved =
      approvals.fieldSupervisor?.approvalStatus === 'APPROVED' &&
      approvals.tpc?.approvalStatus === 'APPROVED' &&
      approvals.stationMaster?.approvalStatus === 'APPROVED' &&
      approvals.sectionController?.approvalStatus === 'APPROVED';

    let nextStage = existing.fsmStage;
    let nextStatus = existing.status;

    if (allApproved) {
      nextStage = 5; // Ready for Handover
      nextStatus = 'APPROVED';
    }

    const updated: WorkRequest = {
      ...existing,
      approvals,
      fsmStage: nextStage,
      status: nextStatus,
      updatedAt: now,
    };

    globalState.workRequests.set(id, updated);

    // Audit entry
    await this.appendAuditBlock(id, `Multilateral Sign-off by ${role} (${signedBy}) - Decision: ${decision}`, [
      {
        department: existing.department.toString(),
        role,
        officer_id: signedBy,
        signature_hash: sigHash,
        signed_at: now,
      },
    ]);

    globalState.lastUpdated = Date.now();
    return updated;
  }

  static async commenceWork(id: string, fencingToken: number): Promise<{ success: boolean; workRequest?: WorkRequest; error?: string }> {
    const existing = globalState.workRequests.get(id);
    if (!existing) return { success: false, error: 'Work Request not found' };

    // Validate fencing token
    if (existing.fencingToken && Number(fencingToken) !== Number(existing.fencingToken)) {
      return { success: false, error: `Fencing token mismatch. Provided: #${fencingToken}, Required: #${existing.fencingToken}` };
    }

    const now = new Date().toISOString();
    const updated: WorkRequest = {
      ...existing,
      status: 'ACTIVE_IN_PROGRESS',
      fsmStage: 6, // Active On Track
      commencedAt: now,
      updatedAt: now,
    };

    globalState.workRequests.set(id, updated);

    await this.appendAuditBlock(id, `Track Possession Commenced: Fencing Token #${fencingToken} Matched`, [
      {
        department: existing.department.toString(),
        role: 'FIELD_SUPERVISOR',
        officer_id: existing.supervisor,
        signature_hash: `SIG-COMMENCE-${Date.now().toString(16)}`,
        signed_at: now,
      },
    ]);

    globalState.lastUpdated = Date.now();
    return { success: true, workRequest: updated };
  }

  static async completeWork(id: string, handedBackBy: string): Promise<{ success: boolean; workRequest?: WorkRequest; error?: string }> {
    const existing = globalState.workRequests.get(id);
    if (!existing) return { success: false, error: 'Work Request not found' };

    const now = new Date().toISOString();
    const updated: WorkRequest = {
      ...existing,
      status: 'WORK_COMPLETED',
      fsmStage: 6, // Ready for Station Master normalization
      completedAt: now,
      updatedAt: now,
    };

    globalState.workRequests.set(id, updated);

    await this.appendAuditBlock(id, `Work Completed & Track Handed Back by ${handedBackBy}`, [
      {
        department: existing.department.toString(),
        role: 'FIELD_SUPERVISOR',
        officer_id: handedBackBy,
        signature_hash: `SIG-HANDBACK-${Date.now().toString(16)}`,
        signed_at: now,
      },
    ]);

    globalState.lastUpdated = Date.now();
    return { success: true, workRequest: updated };
  }

  static async addPhoto(photo: WorkPhoto): Promise<WorkPhoto> {
    globalState.photos.set(photo.id, photo);

    // Bind to parent WorkRequest
    const existingReq = globalState.workRequests.get(photo.workRequestId);
    if (existingReq) {
      const photos = [photo, ...existingReq.photos.filter(p => p.id !== photo.id)];
      existingReq.photos = photos;
      existingReq.updatedAt = new Date().toISOString();
      globalState.workRequests.set(existingReq.id, existingReq);
    }

    globalState.lastUpdated = Date.now();
    return photo;
  }

  static async getPhotosByWorkRequestId(workRequestId: string): Promise<WorkPhoto[]> {
    const req = globalState.workRequests.get(workRequestId);
    if (req) return req.photos;
    return Array.from(globalState.photos.values()).filter(p => p.workRequestId === workRequestId);
  }

  static async emergencyStop(reason: string, suspendedBy: string): Promise<{ affectedCount: number }> {
    const now = new Date().toISOString();
    let count = 0;

    for (const [id, req] of globalState.workRequests.entries()) {
      if (req.status === 'ACTIVE_IN_PROGRESS' || req.fsmStage === 6) {
        req.status = 'SUSPENDED';
        req.suspension = {
          isSuspended: true,
          suspendedAt: now,
          suspendedBy,
          reason,
          previousStatus: 'ACTIVE_IN_PROGRESS',
          previousFsmStage: 6,
        };
        req.updatedAt = now;
        globalState.workRequests.set(id, req);
        count++;
      }
    }

    globalState.emergencyState = {
      isEmergencyStop: true,
      suspendedCount: count,
      activatedAt: now,
      reason,
      by: suspendedBy,
    };

    await this.appendAuditBlock('ALL_ACTIVE', `🚨 EMERGENCY STOP ACTIVATED: ${reason} (by ${suspendedBy})`, [
      {
        department: 'OPERATING',
        role: 'STATION_MASTER',
        officer_id: suspendedBy,
        signature_hash: `SIG-EMERGENCY-${Date.now()}`,
        signed_at: now,
      },
    ]);

    globalState.lastUpdated = Date.now();
    return { affectedCount: count };
  }

  static async resumeWork(workRequestId?: string): Promise<{ resumedCount: number }> {
    const now = new Date().toISOString();
    let resumed = 0;

    if (workRequestId) {
      const req = globalState.workRequests.get(workRequestId);
      if (req && req.suspension.isSuspended) {
        req.status = 'ACTIVE_IN_PROGRESS';
        req.fsmStage = 6;
        req.suspension = { isSuspended: false };
        req.updatedAt = now;
        globalState.workRequests.set(workRequestId, req);
        resumed = 1;
      }
    } else {
      for (const [id, req] of globalState.workRequests.entries()) {
        if (req.suspension.isSuspended) {
          req.status = 'ACTIVE_IN_PROGRESS';
          req.fsmStage = 6;
          req.suspension = { isSuspended: false };
          req.updatedAt = now;
          globalState.workRequests.set(id, req);
          resumed++;
        }
      }
    }

    // Check remaining suspended
    let remaining = 0;
    for (const req of globalState.workRequests.values()) {
      if (req.suspension.isSuspended) remaining++;
    }

    globalState.emergencyState = {
      isEmergencyStop: remaining > 0,
      suspendedCount: remaining,
    };

    globalState.lastUpdated = Date.now();
    return { resumedCount: resumed };
  }

  static async recordSos(alert: SosAlert): Promise<SosAlert> {
    globalState.sosAlerts.unshift(alert);

    globalState.notifications.unshift({
      id: `notif-sos-${Date.now()}`,
      type: 'SOS',
      title: `🚨 SOS: ${alert.supervisorName} at ${alert.chainage}`,
      message: `${alert.section} (${alert.trackId}) - GPS: ${alert.gps.lat.toFixed(4)}, ${alert.gps.lng.toFixed(4)}`,
      timestamp: alert.timestamp,
      read: false,
      workRequestId: alert.workRequestId,
      gps: alert.gps,
    });

    await this.appendAuditBlock(alert.workRequestId || 'SOS_CORRIDOR', `🚨 SOS ALERT RAISED by ${alert.supervisorName} (${alert.chainage})`, [
      {
        department: alert.department,
        role: 'FIELD_SUPERVISOR',
        officer_id: alert.supervisorId,
        signature_hash: `SIG-SOS-${Date.now()}`,
        signed_at: alert.timestamp,
      },
    ]);

    globalState.lastUpdated = Date.now();
    return alert;
  }

  static async getMessages(channel = 'all'): Promise<SharedMessage[]> {
    if (channel === 'all') return globalState.messages;
    return globalState.messages.filter(m => !m.channel || m.channel === 'all' || m.channel === channel);
  }

  static async addMessage(msg: SharedMessage): Promise<SharedMessage> {
    globalState.messages.push(msg);
    globalState.lastUpdated = Date.now();
    return msg;
  }

  static async getNotifications(): Promise<SharedNotification[]> {
    return globalState.notifications;
  }

  static async getAuditBlocks(): Promise<AuditBlock[]> {
    return globalState.auditBlocks;
  }

  static async appendAuditBlock(
    eventId: string,
    title: string,
    multiSignatures: AuditBlock['multi_signatures']
  ): Promise<AuditBlock> {
    const prevBlock = globalState.auditBlocks[globalState.auditBlocks.length - 1];
    const prevHash = prevBlock ? prevBlock.block_hash : '0000000000000000000000000000000000000000000000000000000000000000';
    const blockNumber = (prevBlock?.block_number || 0) + 1;
    const timestamp = new Date().toISOString();

    const leafHash = computeSha256(`${blockNumber}:${eventId}:${title}:${timestamp}`);
    const blockHash = computeSha256(`${prevHash}:${leafHash}:${timestamp}`);

    const newBlock: AuditBlock = {
      block_number: blockNumber,
      event_id: eventId,
      timestamp,
      prev_hash: prevHash,
      merkle_root: leafHash,
      block_hash: blockHash,
      consensus_proof: 'SHA256_DUAL_KEY_WORM_V1',
      multi_signatures: multiSignatures,
      leaves: [{ leaf_id: `leaf-${blockNumber}`, title, hash: leafHash }],
      worm_status: 'IMMUTABLE_LOCKED',
      storage_tier: 'HOT_EDGE_WORM',
    };

    globalState.auditBlocks.push(newBlock);
    return newBlock;
  }

  static getLastUpdated(): number {
    return globalState.lastUpdated;
  }

  static getEmergencyState() {
    return globalState.emergencyState;
  }
}

// ---------------------------------------------------------------------------
// Adapter: WorkRequest <-> OperationalEvent
// ---------------------------------------------------------------------------
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

  const primaryPhoto = wr.photos[0];

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
      catenary_25kv_power_trip: wr.safetyImpacts.power25kvCut,
      absolute_traffic_block: wr.safetyImpacts.trafficBlock,
      speed_restriction_kmh: wr.safetyImpacts.tsr30 ? 30 : 0,
      feeding_posts: wr.safetyImpacts.feedingPosts || ['FP-02 (Danapur TSS)'],
      points_clamping_required: wr.safetyImpacts.pointClamp,
      track_bonding_notice: wr.safetyImpacts.trackBondingNotice ?? true,
    },
    description: wr.description,
    originator_id: wr.createdBy.id,
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
