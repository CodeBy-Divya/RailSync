import type { IncomingMessage, ServerResponse } from 'http';
import { RailSyncDB, computeSha256, workRequestToOperationalEvent } from './db';
import { WorkPhoto } from '../src/shared/types';

// Read request body helper
function readBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
  });
}

// CORS Middleware
function setCorsHeaders(req: IncomingMessage, res: ServerResponse): boolean {
  const origin = req.headers.origin || '';
  const isAllowed =
    !origin ||
    origin.includes('field-app-railsync.vercel.app') ||
    origin.includes('railsync-green.vercel.app') ||
    origin.includes('localhost') ||
    origin.includes('127.0.0.1') ||
    origin.startsWith('http://192.168.');

  res.setHeader('Access-Control-Allow-Origin', isAllowed && origin ? origin : '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, Idempotency-Key, Traceparent, x-user-role, x-user-id'
  );
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return true;
  }
  return false;
}

// JSON responder helper
function sendJson(res: ServerResponse, status: number, data: any) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(data));
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (setCorsHeaders(req, res)) return;

  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname.replace(/\/+$/, '') || '/';
  const method = req.method?.toUpperCase() || 'GET';

  try {
    // -------------------------------------------------------------------------
    // SSE Stream: GET /api/v1/events-stream
    // -------------------------------------------------------------------------
    if (pathname === '/api/v1/events-stream') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      });

      res.write(`data: ${JSON.stringify({ type: 'CONNECTED', ts: Date.now() })}\n\n`);

      let lastSent = Date.now();
      const interval = setInterval(async () => {
        const lastUpdated = RailSyncDB.getLastUpdated();
        if (lastUpdated > lastSent) {
          lastSent = Date.now();
          const items = await RailSyncDB.getWorkRequests({ updatedSince: lastSent - 5000 });
          const emergency = RailSyncDB.getEmergencyState();
          res.write(
            `data: ${JSON.stringify({
              type: 'SYNC_UPDATE',
              ts: lastSent,
              items: items.map(workRequestToOperationalEvent),
              emergency,
            })}\n\n`
          );
        } else {
          // Keep-alive ping
          res.write(`: ping\n\n`);
        }
      }, 2000);

      req.on('close', () => {
        clearInterval(interval);
      });
      return;
    }

    // -------------------------------------------------------------------------
    // Health Check: GET /healthz or /api/v1/health
    // -------------------------------------------------------------------------
    if (pathname === '/healthz' || pathname === '/api/v1/health') {
      return sendJson(res, 200, {
        status: 'HEALTHY',
        service: 'railsync-shared-api',
        timestamp: new Date().toISOString(),
        totalRequests: (await RailSyncDB.getWorkRequests()).length,
      });
    }

    // -------------------------------------------------------------------------
    // Work Requests / Events: GET & POST /api/v1/work-requests OR /api/v1/events
    // -------------------------------------------------------------------------
    if (pathname === '/api/v1/work-requests' || pathname === '/api/v1/events') {
      if (method === 'GET') {
        const status = url.searchParams.get('status') || undefined;
        const source = url.searchParams.get('source') || undefined;
        const section = url.searchParams.get('section') || undefined;
        const updatedSince = url.searchParams.get('updatedSince')
          ? Number(url.searchParams.get('updatedSince'))
          : undefined;

        const workRequests = await RailSyncDB.getWorkRequests({ status, source, section, updatedSince });
        // Return both WorkRequest and OperationalEvent representations
        const operationalEvents = workRequests.map(workRequestToOperationalEvent);
        return sendJson(res, 200, operationalEvents);
      }

      if (method === 'POST') {
        const body = await readBody(req);
        const idempotencyKey = (req.headers['idempotency-key'] as string) || body.idempotencyKey;

        // Support both payload shapes (WorkRequest & OperationalEvent payload)
        const newRecord = await RailSyncDB.createWorkRequest({
          ...body,
          idempotencyKey,
          trackId: body.trackId || body.track_id,
          kmStart: body.kmStart || body.km_start,
          kmEnd: body.kmEnd || body.km_end,
          durationHours: body.durationHours || body.duration_hours,
          safetyImpacts: body.safetyImpacts || {
            power25kvCut: body.impact_vector?.catenary_25kv_power_trip ?? true,
            trafficBlock: body.impact_vector?.absolute_traffic_block ?? true,
            tsr30: (body.impact_vector?.speed_restriction_kmh ?? 30) > 0,
            pointClamp: body.impact_vector?.points_clamping_required ?? true,
            feedingPosts: body.impact_vector?.feeding_posts || ['FP-02 (Danapur TSS)'],
          },
          photos: body.photos || (body.field_photo ? [{
            id: `photo-${Date.now()}`,
            workRequestId: body.id || 'pending',
            url: body.field_photo.photo_url,
            capturedBy: body.field_photo.gang_supervisor,
            capturedAt: body.field_photo.uploaded_at,
            gps: { lat: body.field_photo.lat, lng: body.field_photo.lng, accuracyM: body.field_photo.accuracy_meters },
            chainage: body.field_photo.km_chainage,
            geofenceStatus: body.field_photo.geofence_verified ? 'MATCH VERIFIED' : 'MISMATCH',
            crewPresent: body.field_photo.crew_count,
            stage: 'REQUEST_DEFECT',
            sha256: computeSha256(body.field_photo.photo_url || ''),
          }] : []),
        });

        return sendJson(res, 201, workRequestToOperationalEvent(newRecord));
      }
    }

    // -------------------------------------------------------------------------
    // Match Detail & Sub-routes: /api/v1/work-requests/:id or /api/v1/events/:id
    // -------------------------------------------------------------------------
    const wrMatch = pathname.match(/^\/api\/v1\/(work-requests|events)\/([^\/]+)(?:\/([^\/]+))?$/);
    if (wrMatch) {
      const id = wrMatch[2];
      const subAction = wrMatch[3];

      // Single item: GET /api/v1/work-requests/:id
      if (!subAction && method === 'GET') {
        const item = await RailSyncDB.getWorkRequestById(id);
        if (!item) return sendJson(res, 404, { detail: 'Work request not found' });
        return sendJson(res, 200, workRequestToOperationalEvent(item));
      }

      // Single item update: PATCH /api/v1/work-requests/:id
      if (!subAction && method === 'PATCH') {
        const body = await readBody(req);
        const updated = await RailSyncDB.updateWorkRequest(id, body);
        if (!updated) return sendJson(res, 404, { detail: 'Work request not found' });
        return sendJson(res, 200, workRequestToOperationalEvent(updated));
      }

      // Multilateral Approval: POST /api/v1/work-requests/:id/approvals OR /events/:id/approve
      if ((subAction === 'approvals' || subAction === 'approve') && method === 'POST') {
        const body = await readBody(req);
        const role = body.role || 'STATION_MASTER';
        const signedBy = body.signedBy || body.officer_id || 'Divya Singh';
        const decision = body.decision || 'APPROVED';
        const rejectionReason = body.rejectionReason || body.rejection_reason;

        const updated = await RailSyncDB.recordApproval(id, role, signedBy, decision, rejectionReason);
        if (!updated) return sendJson(res, 404, { detail: 'Work request not found' });
        return sendJson(res, 200, workRequestToOperationalEvent(updated));
      }

      // Lock / Fencing Token check: POST /events/:id/lock
      if (subAction === 'lock' && method === 'POST') {
        const item = await RailSyncDB.getWorkRequestById(id);
        if (!item) return sendJson(res, 404, { detail: 'Work request not found' });
        return sendJson(res, 200, {
          token: item.fencingToken,
          status: 'LOCKED',
          fencing_token: item.fencingToken,
        });
      }

      // Commence work: POST /api/v1/work-requests/:id/commence OR /events/:id/activate
      if ((subAction === 'commence' || subAction === 'activate') && method === 'POST') {
        const body = await readBody(req);
        const fencingToken = body.fencingToken || body.fencing_token || (await RailSyncDB.getWorkRequestById(id))?.fencingToken;
        const result = await RailSyncDB.commenceWork(id, Number(fencingToken));

        if (!result.success || !result.workRequest) {
          return sendJson(res, 400, { detail: result.error || 'Failed to commence work' });
        }
        return sendJson(res, 200, workRequestToOperationalEvent(result.workRequest));
      }

      // Complete work: POST /api/v1/work-requests/:id/complete
      if (subAction === 'complete' && method === 'POST') {
        const body = await readBody(req);
        const handedBackBy = body.handedBackBy || body.officer_id || 'Divya Singh (SSE/OHE)';
        const result = await RailSyncDB.completeWork(id, handedBackBy);

        if (!result.success || !result.workRequest) {
          return sendJson(res, 400, { detail: result.error || 'Failed to complete work' });
        }
        return sendJson(res, 200, workRequestToOperationalEvent(result.workRequest));
      }

      // Photo upload/attach for this work request: POST /events/:id/photo
      if (subAction === 'photo' && method === 'POST') {
        const body = await readBody(req);
        const photoObj: WorkPhoto = {
          id: `photo-${Date.now()}`,
          workRequestId: id,
          url: body.photo_url || body.url || '/images/ohe_crew.jpg',
          capturedBy: body.gang_supervisor || body.capturedBy || 'Divya Singh (SSE/OHE)',
          capturedAt: body.uploaded_at || new Date().toISOString(),
          gps: {
            lat: Number(body.lat) || 25.6028,
            lng: Number(body.lng) || 85.1211,
            accuracyM: Number(body.accuracy_meters) || 3.2,
          },
          chainage: body.km_chainage || body.chainage || 'KM 548.10 UP MAIN',
          geofenceStatus: body.geofence_verified ? 'MATCH VERIFIED' : 'MISMATCH',
          crewPresent: Number(body.crew_count) || 6,
          caption: body.caption || 'Field evidence attachment',
          stage: body.stage || 'DURING_WORK',
          sha256: computeSha256(body.photo_url || body.url || ''),
        };

        const saved = await RailSyncDB.addPhoto(photoObj);
        return sendJson(res, 201, saved);
      }

      // Get photos for work request: GET /api/v1/work-requests/:id/photos
      if (subAction === 'photos' && method === 'GET') {
        const photos = await RailSyncDB.getPhotosByWorkRequestId(id);
        return sendJson(res, 200, photos);
      }
    }

    // -------------------------------------------------------------------------
    // Standalone Photo Upload: POST /api/v1/photos
    // -------------------------------------------------------------------------
    if (pathname === '/api/v1/photos' && method === 'POST') {
      const body = await readBody(req);
      const photoObj: WorkPhoto = {
        id: `photo-${Date.now()}`,
        workRequestId: body.workRequestId || body.work_request_id || 'PENDING',
        url: body.url || body.photoData || '/images/ohe_crew.jpg',
        thumbnailUrl: body.thumbnailUrl || body.url || body.photoData,
        capturedBy: body.capturedBy || 'Divya Singh (SSE/OHE)',
        capturedAt: body.capturedAt || new Date().toISOString(),
        gps: body.gps || { lat: 25.6028, lng: 85.1211, accuracyM: 3.2 },
        chainage: body.chainage || 'KM 548.10 UP MAIN',
        geofenceStatus: body.geofenceStatus || 'MATCH VERIFIED',
        crewPresent: Number(body.crewPresent) || 6,
        caption: body.caption || 'Field defect evidence',
        stage: body.stage || 'REQUEST_DEFECT',
        sha256: computeSha256(body.url || body.photoData || String(Date.now())),
      };

      const saved = await RailSyncDB.addPhoto(photoObj);
      return sendJson(res, 201, saved);
    }

    // -------------------------------------------------------------------------
    // Two-Way Messages: GET & POST /api/v1/messages
    // -------------------------------------------------------------------------
    if (pathname === '/api/v1/messages') {
      if (method === 'GET') {
        const channel = url.searchParams.get('channel') || 'all';
        const msgs = await RailSyncDB.getMessages(channel);
        return sendJson(res, 200, msgs);
      }

      if (method === 'POST') {
        const body = await readBody(req);
        const newMsg = await RailSyncDB.addMessage({
          id: `msg-${Date.now()}`,
          sender: body.sender || 'Divya Singh (SSE/OHE)',
          role: body.role || 'FIELD_SUPERVISOR',
          text: body.text || '',
          timestamp: body.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' UTC',
          taggedDepts: body.taggedDepts || ['@OPERATING'],
          photoUrl: body.photoUrl,
          channel: body.channel || 'all',
        });
        return sendJson(res, 201, newMsg);
      }
    }

    // -------------------------------------------------------------------------
    // Notifications: GET /api/v1/notifications
    // -------------------------------------------------------------------------
    if (pathname === '/api/v1/notifications' && method === 'GET') {
      const notifs = await RailSyncDB.getNotifications();
      return sendJson(res, 200, notifs);
    }

    // -------------------------------------------------------------------------
    // Audit Blocks: GET & POST /api/v1/audit
    // -------------------------------------------------------------------------
    if (pathname === '/api/v1/audit') {
      if (method === 'GET') {
        const blocks = await RailSyncDB.getAuditBlocks();
        return sendJson(res, 200, blocks);
      }
      if (method === 'POST') {
        const body = await readBody(req);
        const block = await RailSyncDB.appendAuditBlock(
          body.eventId || 'SYSTEM',
          body.title || 'Audit Log Event',
          body.multiSignatures || []
        );
        return sendJson(res, 201, block);
      }
    }

    // -------------------------------------------------------------------------
    // Emergency Actions: POST /api/v1/emergency-stop & /api/v1/resume
    // -------------------------------------------------------------------------
    if (pathname === '/api/v1/emergency-stop' && method === 'POST') {
      const body = await readBody(req);
      const reason = body.reason || 'URGENT TRACK SAFETY INTERVENTION';
      const by = body.by || 'Divya Singh (Station Master)';
      const result = await RailSyncDB.emergencyStop(reason, by);
      return sendJson(res, 200, { status: 'EMERGENCY_STOP_ACTIVE', ...result });
    }

    if (pathname === '/api/v1/resume' && method === 'POST') {
      const body = await readBody(req);
      const result = await RailSyncDB.resumeWork(body.workRequestId);
      return sendJson(res, 200, { status: 'RESUMED', ...result });
    }

    // -------------------------------------------------------------------------
    // SOS Alert: POST /api/v1/sos
    // -------------------------------------------------------------------------
    if (pathname === '/api/v1/sos' && method === 'POST') {
      const body = await readBody(req);
      const alert = await RailSyncDB.recordSos({
        id: `sos-${Date.now()}`,
        workRequestId: body.workRequestId,
        supervisorName: body.supervisorName || 'Divya Singh (SSE/OHE)',
        supervisorId: body.supervisorId || 'IR-SSE-54812',
        department: body.department || 'OHE',
        section: body.section || 'Danapur — Patna Junction',
        trackId: body.trackId || 'UP_MAIN',
        chainage: body.chainage || 'KM 548.10',
        gps: body.gps || { lat: 25.6028, lng: 85.1211, accuracyM: 3.2 },
        timestamp: new Date().toISOString(),
        reason: body.reason || 'Man on Track / Track Obstruction Hazard',
        status: 'ACTIVE',
      });
      return sendJson(res, 201, alert);
    }

    // -------------------------------------------------------------------------
    // 404 Fallback
    // -------------------------------------------------------------------------
    return sendJson(res, 404, { detail: `Route not found: ${method} ${pathname}` });
  } catch (err: any) {
    console.error('API Error:', err);
    return sendJson(res, 500, { detail: err.message || 'Internal Server Error' });
  }
}
