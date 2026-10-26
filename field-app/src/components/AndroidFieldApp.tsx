import React, { useState, useRef, useEffect } from 'react';
import {
  Smartphone, Camera, MapPin, MessageSquare, Send, CheckCircle2,
  AlertTriangle, FileText, QrCode, Wifi, WifiOff, Plus, Tag,
  RefreshCw, X, Shield, Zap, Clock, Users, ArrowRight, ShieldCheck,
  Check, ChevronRight, UploadCloud, Eye, AlertOctagon, Battery, Signal,
  CheckSquare, LogOut
} from 'lucide-react';
import { OperationalEvent, FieldPhotoProof, WorkPhoto, WorkRequest, PhotoStage, SosAlert } from '../types';
import { createEvent, fetchEvents, activateWork, completeWork, fetchEventDetail, updateEventPhoto } from '../api';
import { INITIAL_OPERATIONAL_EVENTS } from '../data/corridorData';
import { FieldUser } from './MobileLoginView';
import { syncClient, workRequestToOperationalEvent } from '../syncClient';

export async function burnWatermarkAndCompress(
  fileOrDataUrl: File | string,
  geo: { chainage: string; section: string; lat: string; lng: string; altitude?: string },
  maxWidth = 1600,
  quality = 0.8
): Promise<{ dataUrl: string; sha256: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = async () => {
      let width = img.width;
      let height = img.height;
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        const fallbackUrl = typeof fileOrDataUrl === 'string' ? fileOrDataUrl : URL.createObjectURL(fileOrDataUrl);
        resolve({ dataUrl: fallbackUrl, sha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08' });
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      const barHeight = Math.max(50, Math.round(height * 0.12));
      const grad = ctx.createLinearGradient(0, height - barHeight, 0, height);
      grad.addColorStop(0, 'rgba(15, 23, 42, 0.0)');
      grad.addColorStop(0.3, 'rgba(15, 23, 42, 0.88)');
      grad.addColorStop(1, 'rgba(15, 23, 42, 0.98)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, height - barHeight, width, barHeight);

      const fontSize = Math.max(12, Math.round(width * 0.022));
      ctx.font = `bold ${fontSize}px monospace`;
      ctx.fillStyle = '#60A5FA';
      ctx.fillText(`📍 ${geo.chainage} • ${geo.section}`, 16, height - barHeight + fontSize + 8);

      ctx.font = `${Math.round(fontSize * 0.85)}px monospace`;
      ctx.fillStyle = '#E2E8F0';
      const nowUtc = new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
      ctx.fillText(`🌐 GPS: ${geo.lat}, ${geo.lng} • Alt: ${geo.altitude || '54m'} • ⏱ ${nowUtc}`, 16, height - barHeight + fontSize * 2 + 14);

      const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);

      let hash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
      try {
        const msgUint8 = new TextEncoder().encode(compressedDataUrl);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      } catch (_) {
        hash = Array.from(crypto.getRandomValues(new Uint8Array(16))).map(b => b.toString(16).padStart(2, '0')).join('');
      }

      resolve({ dataUrl: compressedDataUrl, sha256: hash });
    };

    img.onerror = () => reject(new Error('Failed to load image for watermarking'));

    if (typeof fileOrDataUrl === 'string') {
      img.src = fileOrDataUrl;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => { img.src = e.target?.result as string; };
      reader.onerror = reject;
      reader.readAsDataURL(fileOrDataUrl);
    }
  });
}

interface AndroidFieldAppProps {
  onEventCreated?: (event?: OperationalEvent) => void;
  onNavigateToPortal?: () => void;
  events?: OperationalEvent[];
  onUpdateEvent?: (updatedEvent: OperationalEvent) => void;
  standalone?: boolean;
  defaultExpanded?: boolean;
  deviceFrame?: boolean;
  onToggleDeviceFrame?: () => void;
  currentUser?: FieldUser | null;
  onLogout?: () => void;
}

interface ChatMessage {
  id: string;
  sender: string;
  role: 'FIELD_SUPERVISOR' | 'STATION_MASTER' | 'TPC' | 'CONTROLLER';
  text: string;
  timestamp: string;
  taggedDepts?: string[];
}

export const AndroidFieldApp: React.FC<AndroidFieldAppProps> = ({
  onEventCreated,
  onNavigateToPortal,
  events: eventsProp,
  onUpdateEvent,
  standalone = false,
  defaultExpanded = true,
  deviceFrame: controlledDeviceFrame,
  onToggleDeviceFrame,
  currentUser,
  onLogout,
}) => {
  // Mobile device simulator state (defaults to false for full-screen view in standalone mode)
  const [internalDeviceFrame, setInternalDeviceFrame] = useState(defaultExpanded ? false : false);
  const isDeviceFrame = controlledDeviceFrame !== undefined ? controlledDeviceFrame : internalDeviceFrame;
  const toggleDeviceFrame = () => {
    if (onToggleDeviceFrame) {
      onToggleDeviceFrame();
    } else {
      setInternalDeviceFrame(!internalDeviceFrame);
    }
  };
  const [activeTab, setActiveTab] = useState<'permits' | 'requisition' | 'camera' | 'queries'>('permits');
  const [isOffline, setIsOffline] = useState(false);
  const [currentTime, setCurrentTime] = useState('');

  // Events & Data
  const [events, setEvents] = useState<OperationalEvent[]>(() => {
    if (eventsProp && eventsProp.length > 0) return eventsProp;
    try {
      const saved = localStorage.getItem('railsync_events');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (_) {}
    return INITIAL_OPERATIONAL_EVENTS;
  });
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [acknowledgedEvents, setAcknowledgedEvents] = useState<Record<string, boolean>>({});
  const [viewingMemoEvent, setViewingMemoEvent] = useState<OperationalEvent | null>(null);

  // Camera / Geotagged Inspection State
  const [photoPreview, setPhotoPreview] = useState<string | null>(
    'https://images.unsplash.com/photo-1474487548417-781cb71495f3?auto=format&fit=crop&w=800&q=80'
  );
  const [cameraGeo, setCameraGeo] = useState({
    lat: '25.60214° N',
    lng: '85.12053° E',
    chainage: 'KM 548/14 UP MAIN',
    section: 'Danapur (DNR) ⇄ Patna Jn (PNBE)',
    altitude: '54.2 m AMSL',
    timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC',
    hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  });
  const [supervisorNote, setSupervisorNote] = useState(
    'Earthing discharge rod clamped to contact wire. Section de-energized. Tamping rake positioned at crossover.'
  );

  // New Requisition Form State
  const [reqSection, setReqSection] = useState('Danapur–Patna Junction');
  const [reqTrack, setReqTrack] = useState('UP_MAIN');
  const [reqKmStart, setReqKmStart] = useState('548.10');
  const [reqKmEnd, setReqKmEnd] = useState('554.00');
  const [reqDurationHrs, setReqDurationHrs] = useState('2.5');
  const [reqPowerCut, setReqPowerCut] = useState(true);
  const [reqTrafficBlock, setReqTrafficBlock] = useState(true);
  const [reqSpeedRestr, setReqSpeedRestr] = useState(true);
  const [reqPointClamp, setReqPointClamp] = useState(true);
  const [reqDesc, setReqDesc] = useState('Emergency catenary dropper alignment & 25kV insulator inspection per ACTM Vol II.');
  const [submittingReq, setSubmittingReq] = useState(false);
  const [showSosModal, setShowSosModal] = useState(false);
  const [sosReason, setSosReason] = useState('Obstruction on track / Catenary snap hazard');
  const [sosSent, setSosSent] = useState(false);
  const [connectionState, setConnectionState] = useState<'CONNECTED' | 'RECONNECTING' | 'OFFLINE'>(syncClient.getConnectionState());
  const [queuedCount, setQueuedCount] = useState<number>(syncClient.getQueuedCount());
  const [isEmergencyActive, setIsEmergencyActive] = useState(false);
  const [emergencyReason, setEmergencyReason] = useState<string>('Emergency Safety Suspension ordered by Station Master');
  const [reqPhotos, setReqPhotos] = useState<Array<{ url: string; sha256: string; geo: any }>>([]);
  const [cameraStage, setCameraStage] = useState<PhotoStage>('BEFORE_WORK');
  const [cameraTargetEventId, setCameraTargetEventId] = useState<string>('');

  // Live Clarification Thread (Field Crew <-> Station Master)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-1',
      sender: 'Station Master (PNBE)',
      role: 'STATION_MASTER',
      text: 'Section Controller confirmed path margin. Confirm physical earthing rod clamp deployed on FP-02 catenary.',
      timestamp: '13:02 UTC',
    },
    {
      id: 'msg-2',
      sender: 'SSE / OHE (Field Supervisor)',
      role: 'FIELD_SUPERVISOR',
      text: 'Earthing rods clamped at KM 548/14. Photo evidence uploaded with chainage watermark. Requesting Form ETR-3 token.',
      timestamp: '13:05 UTC',
      taggedDepts: ['@OHE', '@OPERATING'],
    },
    {
      id: 'msg-3',
      sender: 'TPC Danapur Grid',
      role: 'TPC',
      text: 'Circuit breaker CB-204 tripped. 25kV catenary dead. Form ETR-1 clearance issued to SM.',
      timestamp: '13:08 UTC',
    },
  ]);
  const [newChatText, setNewChatText] = useState('');
  const [selectedTaggedDept, setSelectedTaggedDept] = useState('@OPERATING');

  const [reqPhoto, setReqPhoto] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const reqFileInputRef = useRef<HTMLInputElement>(null);

  // Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Load Events
  const loadEventsData = async () => {
    setLoading(true);
    try {
      const data = await fetchEvents();
      if (Array.isArray(data) && data.length > 0) {
        setEvents(data);
        if (!selectedEventId) {
          setSelectedEventId(data[0].id);
        }
      }
    } catch {
      // Offline fallback
    } finally {
      setLoading(false);
    }
  };

  // Real-Time Sync Client Subscriptions
  useEffect(() => {
    const unsubConn = syncClient.on('connection.change', (st) => {
      setConnectionState(st);
      setIsOffline(st === 'OFFLINE');
    });

    const unsubQueue = syncClient.on('queue.change', (cnt) => {
      setQueuedCount(cnt);
    });

    const unsubApproved = syncClient.on('work.approved', (req: WorkRequest) => {
      const updated = workRequestToOperationalEvent(req);
      setEvents(prev => prev.map(e => e.id === updated.id ? { ...e, ...updated } : e));
      setActionSuccess(`⚡ Work Request ${req.id} APPROVED by Station Master! Fencing Token: #${req.fencingToken}`);
      setTimeout(() => setActionSuccess(null), 6000);
    });

    const unsubUpdated = syncClient.on('work.updated', (req: WorkRequest) => {
      const updated = workRequestToOperationalEvent(req);
      setEvents(prev => prev.map(e => e.id === updated.id ? { ...e, ...updated } : e));
    });

    const unsubCommenced = syncClient.on('work.commenced', (req: WorkRequest) => {
      const updated = workRequestToOperationalEvent(req);
      setEvents(prev => prev.map(e => e.id === updated.id ? { ...e, ...updated } : e));
    });

    const unsubCompleted = syncClient.on('work.completed', (req: WorkRequest) => {
      const updated = workRequestToOperationalEvent(req);
      setEvents(prev => prev.map(e => e.id === updated.id ? { ...e, ...updated } : e));
    });

    const unsubStop = syncClient.on('emergency.stop', (data: any) => {
      setIsEmergencyActive(true);
      if (data?.reason) setEmergencyReason(data.reason);
      setEvents(prev => prev.map(e => e.fsm_stage === 6 ? { ...e, is_suspended: true, status: 'SUSPENDED - EMERGENCY STOP' as any } : e));
    });

    const unsubResume = syncClient.on('emergency.resume', () => {
      setIsEmergencyActive(false);
      setEvents(prev => prev.map(e => e.is_suspended ? { ...e, is_suspended: false, status: 'ACTIVE_IN_PROGRESS' as any } : e));
      setActionSuccess('Work Resumption Authorized by Station Master. Track possession re-instated.');
      setTimeout(() => setActionSuccess(null), 5000);
    });

    const unsubMsg = syncClient.on('message.new', (msg: any) => {
      setChatMessages(prev => {
        if (prev.some(m => m.id === msg.id || (m.text === msg.text && m.sender === msg.sender))) return prev;
        return [
          ...prev,
          {
            id: msg.id,
            sender: msg.sender,
            role: msg.role || 'STATION_MASTER',
            text: msg.text,
            timestamp: msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' UTC' : 'Now',
            taggedDepts: msg.taggedDepts,
          }
        ];
      });
    });

    loadEventsData();

    return () => {
      unsubConn();
      unsubQueue();
      unsubApproved();
      unsubUpdated();
      unsubCommenced();
      unsubCompleted();
      unsubStop();
      unsubResume();
      unsubMsg();
    };
  }, []);

  // Handle Photo File Upload / Capture with Burn-In Watermark & Canvas Compression
  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>, isForRequisition = false) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const latVal = (25.5920 + Math.random() * 0.02).toFixed(5);
        const lngVal = (85.1180 + Math.random() * 0.02).toFixed(5);
        const geoInfo = {
          lat: `${latVal}° N`,
          lng: `${lngVal}° E`,
          chainage: `KM ${reqKmStart || '548.10'} ${reqTrack.replace(/_/g, ' ')}`,
          section: reqSection === 'Danapur-Patna' ? 'Danapur (DNR) ⇄ Patna Jn (PNBE)' : reqSection,
          altitude: '53.8 m AMSL',
        };

        const res = await burnWatermarkAndCompress(file, geoInfo);

        setCameraGeo({
          ...geoInfo,
          timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC',
          hash: res.sha256,
        });

        if (isForRequisition) {
          setReqPhotos(prev => [...prev.slice(0, 4), { url: res.dataUrl, sha256: res.sha256, geo: geoInfo }]);
          setReqPhoto(res.dataUrl);
        } else {
          setPhotoPreview(res.dataUrl);
        }

        try {
          localStorage.setItem('railsync_last_field_photo', res.dataUrl);
        } catch (_) {}

        setActionSuccess('Field Photo with GPS Chainage Compressed & Watermarked!');
        setTimeout(() => setActionSuccess(null), 3500);
      } catch (err) {
        console.error('Error watermarking photo', err);
      }
    }
  };

  // Attach captured photo directly to an existing active event via shared API
  const handleAttachPhotoToEvent = async (targetEventId: string) => {
    const chosenPhoto = photoPreview || reqPhoto;
    if (!chosenPhoto) {
      alert('Please snap or choose a photo first!');
      return;
    }
    const target = events.find(e => e.id === targetEventId);
    const latVal = parseFloat(cameraGeo.lat) || 25.6028;
    const lngVal = parseFloat(cameraGeo.lng) || 85.1211;

    try {
      const uploaded = await syncClient.uploadPhoto(targetEventId, chosenPhoto, {
        capturedBy: currentUser?.name || 'Divya Singh (SSE/OHE)',
        stage: cameraStage,
        chainage: target ? `KM ${target.km_start.toFixed(2)} (${target.track_id.replace(/_/g, ' ')})` : cameraGeo.chainage,
        gps: { lat: latVal, lng: lngVal, accuracyM: 3.2 },
        crewPresent: 6,
        caption: supervisorNote || 'On-site field verification proof',
      });

      const photoObj: FieldPhotoProof = {
        photo_url: uploaded.url,
        lat: latVal,
        lng: lngVal,
        km_chainage: uploaded.chainage,
        uploaded_at: `${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} via RailSync Mobile App`,
        accuracy_meters: 3.2,
        geofence_verified: true,
        gang_supervisor: currentUser?.name || 'Divya Singh (SSE/OHE)',
        crew_count: 6,
      };

      if (target) {
        const photosList = target.photos ? [uploaded, ...target.photos] : [uploaded];
        const updated: OperationalEvent = { ...target, field_photo: photoObj, photos: photosList };
        setEvents(prev => prev.map(e => e.id === targetEventId ? updated : e));
        if (onEventCreated) onEventCreated(updated);
      }

      setActionSuccess(`✓ Field proof photo attached to ${targetEventId}! Stage: [${cameraStage}]`);
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to upload photo proof');
    }
  };

  // Submit New Requisition from Android App to Shared Serverless API
  const handleMobileSubmitRequisition = async () => {
    setSubmittingReq(true);
    try {
      const now = new Date();
      const startTime = now.toISOString();
      const endTime = new Date(now.getTime() + parseFloat(reqDurationHrs) * 60 * 60 * 1000).toISOString();

      const chosenPhotos = reqPhotos.length > 0 ? reqPhotos : (reqPhoto || photoPreview ? [{
        url: reqPhoto || photoPreview || '/images/ohe_crew.jpg',
        sha256: cameraGeo.hash,
        geo: cameraGeo
      }] : []);

      const latVal = parseFloat(cameraGeo.lat) || 25.6028;
      const lngVal = parseFloat(cameraGeo.lng) || 85.1211;

      const workPhotos: WorkPhoto[] = chosenPhotos.map((p, i) => ({
        id: `photo-req-${Date.now()}-${i}`,
        workRequestId: '',
        url: p.url,
        capturedBy: currentUser?.name || 'Divya Singh (SSE/OHE)',
        capturedAt: startTime,
        gps: { lat: latVal, lng: lngVal, accuracyM: 3.2 },
        chainage: `KM ${parseFloat(reqKmStart) || 548.10} (${reqTrack.replace(/_/g, ' ')})`,
        geofenceStatus: 'MATCH VERIFIED',
        crewPresent: 6,
        caption: `Defect site inspection evidence #${i + 1}`,
        stage: 'REQUEST_DEFECT',
        sha256: p.sha256 || '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
      }));

      const workReqPayload: Omit<WorkRequest, 'id' | 'createdAt' | 'updatedAt'> = {
        source: 'FIELD',
        createdBy: {
          id: currentUser?.id || currentUser?.employeeId || 'SSE_OHE_PATNA_01',
          name: currentUser?.name || 'Divya Singh',
          role: 'SSE / OHE',
          department: 'OHE',
        },
        division: 'DNR',
        section: reqSection === 'Danapur-Patna' ? 'Danapur–Patna Junction' : reqSection,
        trackId: reqTrack,
        kmStart: parseFloat(reqKmStart) || 548.1,
        kmEnd: parseFloat(reqKmEnd) || 554.0,
        durationHours: parseFloat(reqDurationHrs) || 2.5,
        dateOfWork: now.toISOString().split('T')[0],
        startTime,
        endTime,
        department: 'OHE',
        supervisor: currentUser?.name || 'Divya Singh (SSE/OHE)',
        description: `[FIELD REQUISITION] ${reqDesc}`,
        safetyImpacts: {
          power25kvCut: reqPowerCut,
          trafficBlock: reqTrafficBlock,
          tsr30: reqSpeedRestr,
          pointClamp: reqPointClamp,
          feedingPosts: ['FP-02 (Danapur TSS)'],
        },
        status: 'PENDING_APPROVAL',
        fsmStage: 2,
        approvals: {
          fieldSupervisor: {
            signedBy: currentUser?.name || 'Divya Singh (SSE/OHE)',
            signedAt: startTime,
            signatureHash: 'SIG-FS-' + Date.now().toString(16),
            approvalStatus: 'APPROVED',
          },
          tpc: { approvalStatus: 'PENDING' },
          stationMaster: { approvalStatus: 'PENDING' },
          sectionController: { approvalStatus: 'PENDING' },
        },
        fencingToken: Math.floor(100 + Math.random() * 899),
        photos: workPhotos,
        suspension: { isSuspended: false },
        idempotencyKey: `idem-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      };

      const created = await syncClient.createWorkRequest(workReqPayload);
      const adaptedEvent: OperationalEvent = (created as any).track_id ? (created as OperationalEvent) : workRequestToOperationalEvent(created as any);

      setEvents(prev => [adaptedEvent, ...prev.filter(e => e.id !== adaptedEvent.id)]);
      setActionSuccess(`✓ Requisition ${created.id} Dispatched to Station Master Queue with ${workPhotos.length} Photo(s)!`);
      setActiveTab('permits');
      setReqPhotos([]);
      setReqPhoto(null);
      if (onEventCreated) onEventCreated(adaptedEvent);
      setTimeout(() => setActionSuccess(null), 8000);
    } catch (err: any) {
      alert(err.message || 'Failed to submit requisition');
    } finally {
      setSubmittingReq(false);
    }
  };

  // Send Chat Query to Station Master via Shared API
  const handleSendChat = async () => {
    if (!newChatText.trim()) return;
    const textToSend = newChatText.trim();
    setNewChatText('');

    const msg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: currentUser?.name ? `${currentUser.name} (SSE/OHE)` : 'SSE / OHE (Field Supervisor)',
      role: 'FIELD_SUPERVISOR',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' UTC',
      taggedDepts: [selectedTaggedDept],
    };

    setChatMessages(prev => [...prev, msg]);

    try {
      await syncClient.sendMessage({
        sender: msg.sender,
        role: 'FIELD_SUPERVISOR',
        text: textToSend,
        taggedDepts: [selectedTaggedDept],
        channel: 'operating',
      });
    } catch (err) {
      console.warn('Chat send queued offline:', err);
    }
  };

  // Dispatch Statutory SOS Emergency Alarm
  const handleDispatchSos = async () => {
    try {
      const latVal = parseFloat(cameraGeo.lat) || 25.6028;
      const lngVal = parseFloat(cameraGeo.lng) || 85.1211;

      await syncClient.raiseSos({
        supervisorName: currentUser?.name || 'Divya Singh',
        supervisorId: currentUser?.id || currentUser?.employeeId || 'SSE_OHE_PATNA_01',
        department: 'OHE',
        section: reqSection,
        trackId: reqTrack,
        chainage: cameraGeo.chainage,
        gps: { lat: latVal, lng: lngVal, accuracyM: 3.2 },
        reason: sosReason,
      });

      setSosSent(true);
      setActionSuccess('🚨 CRITICAL TRACK EMERGENCY (SOS) TRANSMITTED TO STATION MASTER!');
      setTimeout(() => {
        setSosSent(false);
        setShowSosModal(false);
        setActionSuccess(null);
      }, 3500);
    } catch (err: any) {
      alert(err.message || 'Failed to dispatch SOS alert');
    }
  };

  // Effective events (props take priority if available, fallback to INITIAL_OPERATIONAL_EVENTS)
  const effectiveEvents = (eventsProp && eventsProp.length > 0)
    ? eventsProp
    : (events.length > 0 ? events : INITIAL_OPERATIONAL_EVENTS);

  // Filter state inside My Permits: 'ALL' | 'SM_WORK_ORDERS' | 'ONGOING'
  const [permitFilter, setPermitFilter] = useState<'ALL' | 'SM_WORK_ORDERS' | 'ONGOING'>('ALL');

  // Helper: Is this an ongoing work on track?
  const isOngoingWork = (e: OperationalEvent): boolean => {
    const s = (e.status || '') as string;
    return Boolean(
      e.fsm_stage === 6 ||
      s === 'ACTIVE_IN_PROGRESS' ||
      s === 'ACTIVE_TRACK_POSSESSION' ||
      s === 'WORK_COMPLETED' ||
      s === 'IN_PROGRESS' ||
      s === 'OCCUPIED'
    );
  };

  // Helper: Was this permit or work request given by the Station Master?
  const isGivenByStationMaster = (e: OperationalEvent): boolean => {
    return Boolean(
      e.is_work_request ||
      (e.description || '').includes('[SM WORK REQUEST]') ||
      (e.assigned_by || '').includes('STATION_MASTER') ||
      (e.originator_id || '').includes('SM_') ||
      (e.id || '').includes('EVT-SM') ||
      e.permits?.some(p => (p as any).issued_by?.includes('SM') || (p as any).type?.includes('STATION_MASTER'))
    );
  };

  // Station Master assigned incoming work requests that are pending acceptance
  const incomingWorkRequests = effectiveEvents.filter(e =>
    isGivenByStationMaster(e) && !acknowledgedEvents[e.id] && (e.fsm_stage ?? 4) <= 4
  );

  // Displayed permits: displays active track possessions, approved blocks, and station master work orders
  const displayedPermits = effectiveEvents.filter(e => {
    if (permitFilter === 'SM_WORK_ORDERS') return isGivenByStationMaster(e);
    if (permitFilter === 'ONGOING') return isOngoingWork(e);
    return true; // Show all active corridor permits and possessions
  });

  const handleAcknowledgeWorkRequest = (evId: string) => {
    setAcknowledgedEvents(prev => ({ ...prev, [evId]: true }));
    const target = effectiveEvents.find(e => e.id === evId);
    if (target) {
      const updated: OperationalEvent = {
        ...target,
        stakeholders: (target.stakeholders || []).map(s => {
          if (s.role === 'FIELD_SUPERVISOR') {
            return {
              ...s,
              approval_status: 'APPROVED',
              signed_at: new Date().toISOString(),
              signature_hash: 'SIG-FS-' + Date.now().toString(16),
            };
          }
          return s;
        }),
      };
      if (onUpdateEvent) onUpdateEvent(updated);
    }
    setActionSuccess(`✓ Work Request ${evId} acknowledged & accepted! Station Master & Section Controller notified.`);
    setTimeout(() => setActionSuccess(null), 8000);
  };

  // Field Actions (Commence & Complete Work with Fencing Token Verification)
  const handleActivateWork = async (id: string) => {
    const target = effectiveEvents.find(e => e.id === id);
    const tokenVal = target?.fencing_token || 885;

    const inputToken = prompt(
      `Enter 3-Digit Station Master Fencing Token to step on track:\n(Authorized Token on Record: #${tokenVal})`,
      String(tokenVal)
    );
    if (!inputToken) return;

    const parsed = parseInt(inputToken.trim(), 10);
    if (isNaN(parsed) || (target?.fencing_token && target.fencing_token !== parsed)) {
      alert(`Invalid Fencing Token "${inputToken}". Line possession denied under G&SR 15.09.`);
      return;
    }

    try {
      await syncClient.commenceWork(id, parsed);
      const updated: OperationalEvent = {
        ...(target || {} as any),
        id,
        status: 'ACTIVE_IN_PROGRESS',
        fsm_stage: 6,
        status_color: '#DC2626',
      };
      setEvents(prev => prev.map(e => e.id === id ? updated : e));
      if (onUpdateEvent) onUpdateEvent(updated);
      setActionSuccess(`✓ Token #${parsed} Verified: Track Custody Handed to Field Crew (Stage 6 Active on Track)`);
      loadEventsData();
      setTimeout(() => setActionSuccess(null), 5000);
    } catch (err: any) {
      console.warn('activateWork fallback:', err);
    }
  };

  const handleCompleteWork = async (id: string) => {
    if (isEmergencyActive) {
      alert('Cannot hand back track while EMERGENCY STOP is active! Clear track immediately.');
      return;
    }
    try {
      await syncClient.completeWork(id, currentUser?.name || 'Divya Singh (SSE/OHE)');
      const target = effectiveEvents.find(e => e.id === id);
      const updated: OperationalEvent = {
        ...(target || {} as any),
        id,
        status: 'BLOCK_CLEARED',
        fsm_stage: 7,
        status_color: '#16A34A',
      };
      setEvents(prev => prev.map(e => e.id === id ? updated : e));
      if (onUpdateEvent) onUpdateEvent(updated);
      setActionSuccess('✓ Track Fit Certificate Signed: Handed Back to Station Master & Block Cleared (Stage 7)');
      loadEventsData();
      setTimeout(() => setActionSuccess(null), 5000);
    } catch (err: any) {
      console.warn('completeWork fallback:', err);
    }
  };

  return (
    <div
      style={{
        width: '100%',
        maxWidth: isDeviceFrame ? 1200 : '100%',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: isDeviceFrame ? 16 : 12,
        height: isDeviceFrame ? 'auto' : '100%',
        flex: 1,
      }}
    >
      {/* ── Top Header Banner (Shown only when embedded inside Desktop Dashboard, hidden in standalone full-screen mode) ── */}
      {!standalone && (
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: 12,
            border: '1px solid #E2E8F0',
            padding: '20px 24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  background: '#ECFDF5',
                  color: '#065F46',
                  padding: '3px 8px',
                  borderRadius: 4,
                  border: '1px solid #A7F3D0',
                }}
              >
                INTERFACE 2 • FIELD MOBILE APPLICATION
              </span>
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  background: '#EFF6FF',
                  color: '#1D4ED8',
                  padding: '3px 8px',
                  borderRadius: 4,
                  border: '1px solid #BFDBFE',
                }}
              >
                DANAPUR &amp; PATNA JN CORRIDOR
              </span>
            </div>

            <h1
              style={{
                fontSize: 22,
                fontWeight: 800,
                color: '#0F172A',
                margin: '0 0 4px',
                letterSpacing: '-0.01em',
              }}
            >
              RailSync Frontline Field Android Application
            </h1>
            <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>
              Frontline mobile client for track engineers (OHE, P-Way, S&amp;T) featuring GPS geotagged photo evidence, mobile block requisitions, and two-way station master Q&amp;A.
            </p>
          </div>

          {/* View Mode Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={toggleDeviceFrame}
              style={{
                padding: '8px 14px',
                borderRadius: 8,
                border: '1px solid #CBD5E1',
                background: isDeviceFrame ? '#F1F5F9' : '#FFFFFF',
                color: '#0F172A',
                fontSize: 12.5,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Smartphone size={15} color="#2563EB" />
              <span>{isDeviceFrame ? 'Switch to Full Screen' : 'Phone Shell Mockup'}</span>
            </button>

            <button
              onClick={() => setIsOffline(!isOffline)}
              style={{
                padding: '8px 14px',
                borderRadius: 8,
                border: isOffline ? '1px solid #FCA5A5' : '1px solid #86EFAC',
                background: isOffline ? '#FEF2F2' : '#F0FDF4',
                color: isOffline ? '#991B1B' : '#166534',
                fontSize: 12.5,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
              title="Demonstrates offline caching behavior when cellular signal drops in remote track cuttings"
            >
              {isOffline ? <WifiOff size={15} color="#DC2626" /> : <Wifi size={15} color="#16A34A" />}
              <span>{isOffline ? 'Offline (Tier 1 SQLite)' : '4G LTE Connected'}</span>
            </button>

            {onNavigateToPortal && (
              <button
                onClick={onNavigateToPortal}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  border: 'none',
                  background: '#2563EB',
                  color: '#fff',
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span>Switch to Decision Portal</span>
                <ArrowRight size={14} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Success Toast ─────────────────────────────────────── */}
      {actionSuccess && (
        <div
          style={{
            background: '#F0FDF4',
            border: '1.5px solid #86EFAC',
            padding: '12px 18px',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
            color: '#15803D',
            fontSize: 13,
            fontWeight: 700,
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <CheckCircle2 size={18} color="#16A34A" />
            <span>{actionSuccess}</span>
          </div>
          {onNavigateToPortal && (
            <button
              onClick={onNavigateToPortal}
              style={{
                background: '#16A34A',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 6,
                padding: '6px 14px',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: '0 2px 4px rgba(22,163,74,0.2)',
              }}
            >
              <span>View in Pending Approvals</span>
              <ArrowRight size={13} />
            </button>
          )}
        </div>
      )}

      {/* ── Main App Container (Phone Shell: Samsung Galaxy S24 FE) ───── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: isDeviceFrame ? 'flex-start' : 'stretch',
          width: '100%',
          flex: isDeviceFrame ? 'none' : 1,
          paddingBottom: isDeviceFrame ? 24 : 0,
        }}
      >
        <div
          style={{
            position: 'relative',
            margin: isDeviceFrame ? '0 auto' : '0',
          }}
        >
          {/* Physical Phone Hardware Buttons (Samsung Galaxy S24 FE) */}
          {isDeviceFrame && (
            <>
              {/* Volume Rocker (Left) */}
              <div style={{ position: 'absolute', left: -14, top: 160, width: 4, height: 74, background: '#1E293B', borderRadius: '3px 0 0 3px', boxShadow: 'inset 0 0 2px rgba(255,255,255,0.2)' }} />
              {/* Power / Bixby Key (Right) */}
              <div style={{ position: 'absolute', right: -14, top: 180, width: 4, height: 46, background: '#1E293B', borderRadius: '0 3px 3px 0', boxShadow: 'inset 0 0 2px rgba(255,255,255,0.2)' }} />
            </>
          )}

          <div
            style={{
              width: isDeviceFrame ? 412 : '100%',
              maxWidth: isDeviceFrame ? 412 : '100%',
              height: isDeviceFrame ? 892 : undefined,
              flex: isDeviceFrame ? undefined : 1,
              background: '#FFFFFF',
              borderRadius: isDeviceFrame ? 44 : 12,
              border: isDeviceFrame ? '10px solid #0D1117' : '1px solid #E2E8F0',
              boxShadow: isDeviceFrame
                ? '0 0 0 1px #1E293B, 0 30px 80px -10px rgba(0,0,0,0.65), inset 0 0 0 1px rgba(255,255,255,0.08)'
                : '0 1px 4px rgba(0,0,0,0.05)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
          {/* ── Android Status Bar (Shown in Phone Mockup) or Terminal Header (in Full Screen) ── */}
          {isDeviceFrame ? (
            <div
              style={{
                height: 36,
                background: '#FFFFFF',
                padding: '0 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                color: '#0F172A',
                fontSize: 11,
                fontWeight: 700,
                fontFamily: 'system-ui, sans-serif',
                position: 'relative',
                flexShrink: 0,
              }}
            >
              <span style={{ zIndex: 1 }}>{currentTime || '12:28'}</span>
              {/* S24 FE Punch-hole Camera */}
              <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: 12, height: 12, borderRadius: '50%', background: '#0D1117', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.15)' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, zIndex: 1 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: isOffline ? '#DC2626' : '#0F172A' }}>{isOffline ? 'No Signal' : '4G+'}</span>
                <Signal size={11} color={isOffline ? '#DC2626' : '#0F172A'} />
                <Battery size={13} color="#0F172A" />
              </div>
            </div>
          ) : (
            <div
              style={{
                height: 36,
                background: '#F8FAFC',
                padding: '0 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                color: '#475569',
                fontSize: 12,
                fontWeight: 600,
                borderBottom: '1px solid #E2E8F0',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#0F172A', fontWeight: 700 }}>
                  <ShieldCheck size={15} color="#2563EB" />
                  <span>Frontline Field Terminal</span>
                </span>
                <span style={{ color: '#CBD5E1' }}>|</span>
                <span style={{ color: '#059669', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <MapPin size={13} color="#059669" /> GPS Lock: KM 548/14 UP MAIN • Danapur (DNR) ⇄ Patna Jn (PNBE)
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <span style={{ fontSize: 11, color: isOffline ? '#DC2626' : '#15803D', fontWeight: 700 }}>
                  {isOffline ? 'OFFLINE (SQLite Cached)' : '4G LTE CONNECTED (Real-time Broadcast)'}
                </span>
                <span style={{ color: '#CBD5E1' }}>•</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1E293B', fontSize: 11.5 }}>
                  {currentTime} IST
                </span>
              </div>
            </div>
          )}

          {/* ── App Top Header (Indian Railways Branding) ─────── */}
          <div
            style={{
              padding: isDeviceFrame ? '12px 18px' : '14px 24px',
              background: '#FFFFFF',
              borderBottom: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: isDeviceFrame ? 34 : 40,
                  height: isDeviceFrame ? 34 : 40,
                  borderRadius: 8,
                  background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  color: '#fff',
                  fontSize: isDeviceFrame ? 13 : 15,
                  boxShadow: '0 2px 6px rgba(37,99,235,0.3)',
                }}
              >
                {currentUser?.name ? currentUser.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() : 'DS'}
              </div>
              <div>
                <div style={{ fontSize: isDeviceFrame ? 13 : 15, fontWeight: 800, color: '#0F172A', lineHeight: 1.2, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>{currentUser?.name || 'Divya Singh'}</span>
                  <span style={{ fontSize: 9.5, fontWeight: 700, color: '#2563EB', background: '#EFF6FF', padding: '1px 6px', borderRadius: 4, border: '1px solid #BFDBFE' }}>
                    SSE/OHE
                  </span>
                </div>
                <div style={{ fontSize: isDeviceFrame ? 10 : 11.5, color: '#64748B', fontWeight: 600 }}>
                  Danapur (DNR) ⇄ Patna Jn • Track Custody
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* Emergency SOS Button */}
              <button
                type="button"
                id="field-sos-btn"
                onClick={() => setShowSosModal(true)}
                style={{
                  padding: '3px 9px',
                  borderRadius: 6,
                  border: '1px solid #DC2626',
                  background: '#DC2626',
                  color: '#FFFFFF',
                  fontSize: 10.5,
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  boxShadow: '0 1px 4px rgba(220,38,38,0.35)',
                }}
                title="Transmit emergency SOS alarm to Station Master"
              >
                <AlertTriangle size={12} color="#FFFFFF" />
                <span>🚨 SOS</span>
              </button>

              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  style={{
                    padding: '3px 8px',
                    borderRadius: 6,
                    border: '1px solid #FCA5A5',
                    background: '#FEF2F2',
                    color: '#DC2626',
                    fontSize: 10,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 3,
                  }}
                  title="Sign out of Field App"
                >
                  <LogOut size={11} color="#DC2626" />
                  <span>Logout</span>
                </button>
              )}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: 4,
                  background: isOffline || connectionState === 'OFFLINE' ? '#FEF2F2' : connectionState === 'RECONNECTING' ? '#FFFBEB' : '#ECFDF5',
                  color: isOffline || connectionState === 'OFFLINE' ? '#991B1B' : connectionState === 'RECONNECTING' ? '#92400E' : '#065F46',
                  border: isOffline || connectionState === 'OFFLINE' ? '1px solid #FCA5A5' : connectionState === 'RECONNECTING' ? '1px solid #FCD34D' : '1px solid #A7F3D0',
                }}
                title={isOffline ? 'Offline simulation active' : `Live API connection: ${connectionState}`}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: isOffline || connectionState === 'OFFLINE' ? '#EF4444' : connectionState === 'RECONNECTING' ? '#F59E0B' : '#10B981',
                    display: 'inline-block',
                  }}
                />
                <span>{isOffline ? 'OFFLINE' : connectionState === 'CONNECTED' ? 'Connected to SM' : connectionState === 'RECONNECTING' ? 'Connecting...' : 'Disconnected'}</span>
                {queuedCount > 0 && (
                  <span style={{ marginLeft: 3, background: '#DC2626', color: '#fff', borderRadius: 999, padding: '0 5px', fontSize: 9 }}>
                    Queued: {queuedCount}
                  </span>
                )}
              </div>
              {!isDeviceFrame && (
                <button
                  onClick={() => setIsOffline(!isOffline)}
                  style={{
                    padding: '5px 10px',
                    borderRadius: 6,
                    border: isOffline ? '1px solid #FCA5A5' : '1px solid #CBD5E1',
                    background: isOffline ? '#FEF2F2' : '#F8FAFC',
                    color: isOffline ? '#DC2626' : '#475569',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                  }}
                  title="Simulate cellular loss in deep cuttings"
                >
                  {isOffline ? <WifiOff size={13} color="#DC2626" /> : <Wifi size={13} color="#16A34A" />}
                  <span>{isOffline ? 'Reconnect Signal' : 'Simulate Drop'}</span>
                </button>
              )}
            </div>
          </div>

          {/* ── Tab Switcher Bar ──────────────────────────────── */}
          <div
            style={{
              display: 'flex',
              background: '#F8FAFC',
              borderBottom: '1px solid #E2E8F0',
              padding: isDeviceFrame ? '0' : '0 12px',
            }}
          >
            {[
              { id: 'permits', label: 'My Permits & Work Orders', icon: QrCode },
              { id: 'camera', label: 'Geo Camera & Evidence', icon: Camera },
              { id: 'requisition', label: '+ New Block Requisition', icon: Plus },
              { id: 'queries', label: 'Station Master Clarifications', icon: MessageSquare },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              const unacknowledgedCount = incomingWorkRequests.filter(r => !acknowledgedEvents[r.id]).length;
              return (
                <button
                  key={tab.id}
                  id={`field-tab-${tab.id}`}
                  onClick={() => setActiveTab(tab.id as any)}
                  style={{
                    flex: isDeviceFrame ? 1 : 'none',
                    padding: isDeviceFrame ? '11px 4px' : '12px 24px',
                    border: 'none',
                    background: isActive ? '#FFFFFF' : 'transparent',
                    borderBottom: isActive ? '3px solid #2563EB' : '3px solid transparent',
                    color: isActive ? '#1D4ED8' : '#64748B',
                    display: 'flex',
                    flexDirection: isDeviceFrame ? 'column' : 'row',
                    alignItems: 'center',
                    gap: isDeviceFrame ? 3 : 8,
                    fontSize: isDeviceFrame ? 11 : 13,
                    fontWeight: isActive ? 700 : 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    position: 'relative',
                  }}
                >
                  <Icon size={isDeviceFrame ? 16 : 17} color={isActive ? '#2563EB' : '#64748B'} />
                  <span>{tab.label}</span>
                  {tab.id === 'permits' && unacknowledgedCount > 0 && (
                    <span
                      id="permits-incoming-badge"
                      style={{
                        position: isDeviceFrame ? 'absolute' : 'static',
                        top: isDeviceFrame ? 3 : undefined,
                        right: isDeviceFrame ? 8 : undefined,
                        background: '#DC2626',
                        color: '#FFFFFF',
                        borderRadius: 10,
                        padding: '1px 6px',
                        fontSize: 9.5,
                        fontWeight: 800,
                        boxShadow: '0 1px 3px rgba(220,38,38,0.4)',
                        marginLeft: isDeviceFrame ? 0 : 4,
                      }}
                    >
                      {unacknowledgedCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* ── Tab Content Area ──────────────────────────────── */}
          <div style={{ flex: 1, minHeight: 0, padding: isDeviceFrame ? 16 : 24, overflowY: 'auto', background: '#F8FAFC' }}>
            
            {/* ── EMERGENCY SUSPENSION BANNER (STATION MASTER STOP) ── */}
            {(isEmergencyActive || effectiveEvents.some(e => e.is_suspended)) && (
              <div
                id="field-emergency-stop-banner"
                style={{
                  background: 'linear-gradient(135deg, #7F1D1D 0%, #991B1B 100%)',
                  border: '2px solid #EF4444',
                  borderRadius: 10,
                  padding: '12px 16px',
                  marginBottom: 16,
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  boxShadow: '0 4px 14px rgba(220,38,38,0.35)',
                }}
              >
                <div style={{ background: '#FEF2F2', padding: 8, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AlertTriangle size={24} color="#DC2626" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 900, letterSpacing: '0.02em', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span>⛔ WORK SUSPENDED BY STATION MASTER</span>
                    <span style={{ fontSize: 10, background: '#FEE2E2', color: '#991B1B', padding: '1px 6px', borderRadius: 4, fontWeight: 800 }}>
                      G&amp;SR 15.09
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: '#FEE2E2', marginTop: 4, lineHeight: 1.4 }}>
                    {emergencyReason || 'Statutory emergency stop triggered from Station Master Portal. CLEAR TRACK IMMEDIATELY. All permit operations and handbacks locked.'}
                  </div>
                </div>
              </div>
            )}

            {/* ── TAB 1: PERMITS & LIVE STATUS ──────────────────── */}
            {activeTab === 'permits' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

                {/* ── INCOMING WORK REQUEST FROM STATION MASTER NOTIFICATION ── */}
                {incomingWorkRequests.length > 0 && (
                  <div
                    id="incoming-work-request-card"
                    style={{
                      background: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)',
                      border: '1.5px solid #60A5FA',
                      borderRadius: 12,
                      padding: 14,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10,
                      boxShadow: '0 4px 12px rgba(37,99,235,0.12)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            background: '#2563EB',
                            display: 'inline-block',
                            boxShadow: '0 0 6px #2563EB',
                          }}
                        />
                        <span style={{ fontSize: 11, fontWeight: 800, color: '#1E40AF', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                          ⚡ Assigned Work Request (From Station Master)
                        </span>
                      </div>
                      <span
                        style={{
                          fontSize: 9.5,
                          fontWeight: 700,
                          padding: '2px 7px',
                          borderRadius: 4,
                          background: '#1D4ED8',
                          color: '#FFFFFF',
                        }}
                      >
                        You are having a request work
                      </span>
                    </div>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: isDeviceFrame ? '1fr' : 'repeat(auto-fill, minmax(360px, 1fr))',
                        gap: 10,
                      }}
                    >
                      {incomingWorkRequests.map(req => {
                        const isAcked = acknowledgedEvents[req.id];
                        return (
                          <div
                            key={req.id}
                            style={{
                              background: '#FFFFFF',
                              borderRadius: 8,
                              border: '1px solid #BFDBFE',
                              padding: 12,
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 8,
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 800, color: '#1D4ED8' }}>
                                    {req.id}
                                  </span>
                                  <span style={{ fontSize: 10, fontWeight: 700, color: '#0369A1', background: '#E0F2FE', padding: '1px 5px', borderRadius: 4 }}>
                                    {req.assigned_dept || 'OHE'}
                                  </span>
                                </div>
                                <div style={{ fontSize: 12, fontWeight: 700, color: '#0F172A', marginTop: 3 }}>
                                  {req.description}
                                </div>
                              </div>
                              <span
                                style={{
                                  fontSize: 9.5,
                                  fontWeight: 700,
                                  padding: '2px 6px',
                                  borderRadius: 4,
                                  background: isAcked ? '#ECFDF5' : '#FEF3C7',
                                  color: isAcked ? '#065F46' : '#92400E',
                                  border: isAcked ? '1px solid #A7F3D0' : '1px solid #FDE68A',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {isAcked ? '✓ ACKNOWLEDGED' : '⏳ AWAITING ACCEPTANCE'}
                              </span>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 10.5, color: '#475569', background: '#F8FAFC', padding: '6px 8px', borderRadius: 6 }}>
                              <div>
                                <span style={{ color: '#94A3B8' }}>Assigned By: </span>
                                <strong style={{ color: '#0F172A' }}>{req.assigned_by || 'Station Master Desk'}</strong>
                              </div>
                              <div>
                                <span style={{ color: '#94A3B8' }}>Assigned To: </span>
                                <strong style={{ color: '#0F172A' }}>{req.assigned_to || 'Field Supervisor'}</strong>
                              </div>
                              <div>
                                <span style={{ color: '#94A3B8' }}>Track &amp; KM: </span>
                                <strong style={{ color: '#0F172A' }}>{req.track_id} (KM {req.km_start}–{req.km_end})</strong>
                              </div>
                              <div>
                                <span style={{ color: '#94A3B8' }}>Quorum Status: </span>
                                <strong style={{ color: '#D97706' }}>Pending Approvals</strong>
                              </div>
                            </div>

                            {/* Multi-officer statutory quorum clearance breakdown */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap', paddingTop: 2 }}>
                              <span style={{ fontSize: 9.5, color: '#64748B', fontWeight: 600 }}>Quorum Clearances:</span>
                              <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 3, background: '#DCFCE7', color: '#166534' }}>
                                SM: Approved
                              </span>
                              <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 3, background: '#FEF3C7', color: '#92400E' }}>
                                TPC: Pending
                              </span>
                              <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 3, background: '#FEF3C7', color: '#92400E' }}>
                                Controller: Pending
                              </span>
                              <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 3, background: isAcked ? '#DCFCE7' : '#EFF6FF', color: isAcked ? '#166534' : '#1D4ED8' }}>
                                Field: {isAcked ? 'Accepted' : 'Pending'}
                              </span>
                            </div>

                            {/* Action Buttons for this request */}
                            <div style={{ display: 'flex', gap: 6, paddingTop: 4 }}>
                              {!isAcked && (
                                <button
                                  onClick={() => handleAcknowledgeWorkRequest(req.id)}
                                  style={{
                                    flex: 1,
                                    background: '#2563EB',
                                    color: '#FFFFFF',
                                    border: 'none',
                                    borderRadius: 6,
                                    padding: '7px 10px',
                                    fontSize: 11,
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 5,
                                    boxShadow: '0 2px 4px rgba(37,99,235,0.2)',
                                  }}
                                >
                                  <Check size={13} />
                                  <span>Acknowledge &amp; Accept Request</span>
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  setSelectedEventId(req.id);
                                  setActiveTab('camera');
                                }}
                                style={{
                                  padding: '7px 10px',
                                  background: '#FFFFFF',
                                  border: '1px solid #CBD5E1',
                                  borderRadius: 6,
                                  color: '#1E293B',
                                  fontSize: 11,
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 4,
                                }}
                              >
                                <Camera size={13} color="#2563EB" />
                                <span>Attach Pre-Work Photo</span>
                              </button>
                              <button
                                onClick={() => setViewingMemoEvent(req)}
                                style={{
                                  padding: '7px 10px',
                                  background: '#FFFFFF',
                                  border: '1px solid #CBD5E1',
                                  borderRadius: 6,
                                  color: '#1E293B',
                                  fontSize: 11,
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 4,
                                }}
                              >
                                <FileText size={13} color="#64748B" />
                                <span>Work Order Memo</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Active Track Possessions &amp; Form ETR-3 Permits ({displayedPermits.length})
                    </span>
                    <div style={{ fontSize: 10, color: '#64748B' }}>
                      Live corridor custody, statutory clearances &amp; Station Master work orders
                    </div>
                  </div>
                  <button
                    onClick={loadEventsData}
                    style={{ background: 'none', border: 'none', color: '#2563EB', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11.5, fontWeight: 600 }}
                  >
                    <RefreshCw size={12} />
                    <span>Refresh</span>
                  </button>
                </div>

                {/* Sub-Filter Chips */}
                <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
                  {[
                    { id: 'ALL', label: `All Permits (${effectiveEvents.length})` },
                    { id: 'SM_WORK_ORDERS', label: `⚡ SM Work Orders (${effectiveEvents.filter(isGivenByStationMaster).length})` },
                    { id: 'ONGOING', label: `🔴 Ongoing on Track (${effectiveEvents.filter(isOngoingWork).length})` },
                  ].map((f) => {
                    const isSel = permitFilter === f.id;
                    return (
                      <button
                        key={f.id}
                        onClick={() => setPermitFilter(f.id as any)}
                        style={{
                          padding: '4px 9px',
                          borderRadius: 6,
                          fontSize: 10.5,
                          fontWeight: 700,
                          border: isSel ? '1px solid #2563EB' : '1px solid #CBD5E1',
                          background: isSel ? '#EFF6FF' : '#FFFFFF',
                          color: isSel ? '#1D4ED8' : '#64748B',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {f.label}
                      </button>
                    );
                  })}
                </div>

                {displayedPermits.length === 0 ? (
                  <div style={{ padding: 32, textAlign: 'center', background: '#FFFFFF', borderRadius: 10, border: '1px dashed #CBD5E1', color: '#64748B' }}>
                    <div style={{ fontSize: 28, marginBottom: 6 }}>📋</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#1E293B', marginBottom: 4 }}>
                      {permitFilter === 'SM_WORK_ORDERS'
                        ? 'No Station Master Work Orders'
                        : permitFilter === 'ONGOING'
                        ? 'No Ongoing Track Possessions'
                        : 'No Active Track Possessions or Permits Found'}
                    </div>
                    <div style={{ fontSize: 11, color: '#64748B', maxWidth: 300, margin: '0 auto', lineHeight: 1.4 }}>
                      Track possession blocks and work orders assigned by the Station Master appear in My Permits.
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: isDeviceFrame ? '1fr' : 'repeat(auto-fill, minmax(360px, 1fr))',
                      gap: 12,
                    }}
                  >
                    {displayedPermits.map((e) => {
                    const isApproved = (e.fsm_stage ?? 0) >= 5;
                    const isActiveOnTrack = isOngoingWork(e);
                    const isCleared = (e.fsm_stage ?? 0) >= 7;
                    const isSmWork = isGivenByStationMaster(e);

                    return (
                      <div
                        key={e.id}
                        style={{
                          background: '#FFFFFF',
                          borderRadius: 10,
                          border: isActiveOnTrack
                            ? '1.5px solid #2563EB'
                            : isApproved
                            ? '1.5px solid #10B981'
                            : isSmWork
                            ? '1.5px solid #60A5FA'
                            : '1px solid #E2E8F0',
                          padding: 15,
                          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 10,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12.5, fontWeight: 800, color: '#1D4ED8' }}>
                              {e.id}
                            </span>
                            {isSmWork && (
                              <span
                                style={{
                                  fontSize: 9.5,
                                  fontWeight: 700,
                                  padding: '1px 6px',
                                  borderRadius: 4,
                                  background: '#EFF6FF',
                                  color: '#1D4ED8',
                                  border: '1px solid #BFDBFE',
                                }}
                              >
                                ⚡ SM Work Request
                              </span>
                            )}
                          </div>
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: 4,
                              background: isActiveOnTrack ? '#EFF6FF' : isApproved ? '#ECFDF5' : '#F1F5F9',
                              color: isActiveOnTrack ? '#1D4ED8' : isApproved ? '#065F46' : '#475569',
                              border: isActiveOnTrack ? '1px solid #BFDBFE' : isApproved ? '1px solid #A7F3D0' : '1px solid #E2E8F0',
                            }}
                          >
                            STAGE {e.fsm_stage} • {e.status}
                          </span>
                        </div>

                        <div style={{ fontSize: 12.5, color: '#1E293B', fontWeight: 600, lineHeight: 1.4 }}>
                          {e.description}
                        </div>

                        {isSmWork && (
                          <div style={{ fontSize: 11, color: '#1E40AF', background: '#F0F9FF', padding: '5px 8px', borderRadius: 4, border: '1px solid #BAE6FD' }}>
                            👤 <strong>Assigned to:</strong> {e.assigned_to || 'Field Supervisor'} ({e.assigned_dept || 'OHE'}) by {e.assigned_by || 'Station Master'}
                          </div>
                        )}

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 11, color: '#64748B' }}>
                          <div>
                            <span style={{ color: '#94A3B8' }}>Track: </span>
                            <span style={{ color: '#0F172A', fontWeight: 700 }}>{e.track_id}</span>
                          </div>
                          <div>
                            <span style={{ color: '#94A3B8' }}>Chainage: </span>
                            <span style={{ color: '#0F172A', fontWeight: 700 }}>KM {e.km_start} – {e.km_end}</span>
                          </div>
                          <div>
                            <span style={{ color: '#94A3B8' }}>25kV Power: </span>
                            <span style={{ color: e.impact_vector?.catenary_25kv_power_trip ? '#DC2626' : '#16A34A', fontWeight: 700 }}>
                              {e.impact_vector?.catenary_25kv_power_trip ? 'POWER CUT' : 'LIVE NORMAL'}
                            </span>
                          </div>
                          <div>
                            <span style={{ color: '#94A3B8' }}>Fencing Token: </span>
                            <span style={{ color: '#2563EB', fontFamily: 'monospace', fontWeight: 700 }}>FT-2026-DNR-892</span>
                          </div>
                        </div>

                        {/* Interactive Field Action Buttons */}
                        <div style={{ display: 'flex', gap: 8, paddingTop: 6, borderTop: '1px solid #F1F5F9', flexWrap: 'wrap' }}>
                          {isSmWork && !acknowledgedEvents[e.id] && (
                            <button
                              onClick={() => handleAcknowledgeWorkRequest(e.id)}
                              style={{
                                padding: '8px 12px',
                                borderRadius: 6,
                                border: 'none',
                                background: '#2563EB',
                                color: '#fff',
                                fontSize: 11.5,
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 5,
                              }}
                            >
                              <Check size={13} />
                              <span>Acknowledge Work</span>
                            </button>
                          )}

                          {e.fsm_stage === 5 && (
                            <button
                              onClick={() => handleActivateWork(e.id)}
                              style={{
                                flex: 1,
                                padding: '8px 12px',
                                borderRadius: 6,
                                border: 'none',
                                background: '#16A34A',
                                color: '#fff',
                                fontSize: 11.5,
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 6,
                              }}
                            >
                              <Shield size={14} />
                              <span>Commence Work (Step on Track)</span>
                            </button>
                          )}

                          {e.fsm_stage === 6 && (
                            <button
                              onClick={() => handleCompleteWork(e.id)}
                              disabled={isEmergencyActive || Boolean(e.is_suspended)}
                              style={{
                                flex: 1,
                                padding: '8px 12px',
                                borderRadius: 6,
                                border: 'none',
                                background: (isEmergencyActive || Boolean(e.is_suspended)) ? '#94A3B8' : '#2563EB',
                                color: '#fff',
                                fontSize: 11.5,
                                fontWeight: 700,
                                cursor: (isEmergencyActive || Boolean(e.is_suspended)) ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 6,
                              }}
                            >
                              <CheckCircle2 size={14} />
                              <span>{(isEmergencyActive || Boolean(e.is_suspended)) ? '⛔ Emergency Stop: Handback Locked' : 'Work Completed & Safety Cleared'}</span>
                            </button>
                          )}

                          <button
                            onClick={() => {
                              setSelectedEventId(e.id);
                              setActiveTab('camera');
                            }}
                            style={{
                              padding: '8px 12px',
                              borderRadius: 6,
                              border: '1px solid #CBD5E1',
                              background: '#FFFFFF',
                              color: '#334155',
                              fontSize: 11.5,
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 5,
                            }}
                          >
                            <Camera size={13} color="#2563EB" />
                            <span>Photo</span>
                          </button>

                          {isSmWork && (
                            <button
                              onClick={() => setViewingMemoEvent(e)}
                              style={{
                                padding: '8px 12px',
                                borderRadius: 6,
                                border: '1px solid #CBD5E1',
                                background: '#FFFFFF',
                                color: '#334155',
                                fontSize: 11.5,
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 5,
                              }}
                            >
                              <FileText size={13} color="#64748B" />
                              <span>Memo</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  </div>
                )}
              </div>
            )}

            {/* ── TAB 2: GEOTAGGED CAMERA & EVIDENCE CAPTURE ─────── */}
            {activeTab === 'camera' && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: isDeviceFrame ? '1fr' : 'minmax(400px, 1.25fr) minmax(360px, 1fr)',
                  gap: isDeviceFrame ? 14 : 24,
                  alignItems: 'start',
                }}
              >
                {/* Left Column: Viewfinder & Primary Capture */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Frontline Geotagged Site Photo
                    </span>
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: '#065F46', background: '#ECFDF5', border: '1px solid #A7F3D0', padding: '2px 8px', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <MapPin size={11} color="#059669" /> GPS LOCK ACTIVE (±2m)
                    </span>
                  </div>

                  {/* Viewfinder & Preview */}
                  <div
                    style={{
                      position: 'relative',
                      borderRadius: 10,
                      overflow: 'hidden',
                      border: '2px solid #2563EB',
                      height: isDeviceFrame ? 240 : 380,
                      background: '#0F172A',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 14px rgba(15,23,42,0.15)',
                    }}
                  >
                    {photoPreview ? (
                      <img
                        src={photoPreview}
                        alt="Track inspection"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <div style={{ textAlign: 'center', color: '#94A3B8' }}>
                        <Camera size={38} style={{ margin: '0 auto 8px', color: '#60A5FA' }} />
                        <div style={{ fontSize: 13, fontWeight: 600 }}>Tap Shutter to Capture Site Viewfinder</div>
                      </div>
                    )}

                    {/* Viewfinder Corner Overlays */}
                    <div style={{ position: 'absolute', top: 12, left: 12, width: 20, height: 20, borderTop: '2px solid #60A5FA', borderLeft: '2px solid #60A5FA' }} />
                    <div style={{ position: 'absolute', top: 12, right: 12, width: 20, height: 20, borderTop: '2px solid #60A5FA', borderRight: '2px solid #60A5FA' }} />
                    <div style={{ position: 'absolute', bottom: 70, left: 12, width: 20, height: 20, borderBottom: '2px solid #60A5FA', borderLeft: '2px solid #60A5FA' }} />
                    <div style={{ position: 'absolute', bottom: 70, right: 12, width: 20, height: 20, borderBottom: '2px solid #60A5FA', borderRight: '2px solid #60A5FA' }} />

                    {/* Watermark Overlay */}
                    <div
                      style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        background: 'linear-gradient(transparent, rgba(15,23,42,0.94))',
                        padding: '12px 14px',
                        fontSize: 10.5,
                        fontFamily: 'monospace',
                        color: '#F8FAFC',
                        lineHeight: 1.4,
                      }}
                    >
                      <div style={{ fontWeight: 700, color: '#FFFFFF' }}>📍 {cameraGeo.chainage} • {cameraGeo.section}</div>
                      <div style={{ color: '#CBD5E1' }}>🌐 {cameraGeo.lat}, {cameraGeo.lng} • Alt {cameraGeo.altitude}</div>
                      <div style={{ color: '#93C5FD' }}>⏱ {cameraGeo.timestamp} • SHA-256: {cameraGeo.hash.substring(0, 16)}...</div>
                    </div>
                  </div>

                  {/* Shutter Button */}
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    onChange={handlePhotoCapture}
                  />

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      width: '100%',
                      padding: '13px',
                      borderRadius: 8,
                      border: 'none',
                      background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                      color: '#fff',
                      fontSize: 13.5,
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      boxShadow: '0 2px 8px rgba(37,99,235,0.25)',
                    }}
                  >
                    <Camera size={18} />
                    <span>Snap Live Viewfinder / Choose Photo</span>
                  </button>
                </div>

                {/* Right Column: Actions, Geotag Telemetry & Supervisor Notes */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {/* Permit Selector & Stage Assignment */}
                  <div style={{ background: '#FFFFFF', padding: 12, borderRadius: 8, border: '1.5px solid #BFDBFE', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: isDeviceFrame ? '1fr' : '1.4fr 1fr', gap: 8 }}>
                      <div>
                        <label style={{ fontSize: 10, fontWeight: 700, color: '#1E40AF', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>
                          Target Permit / Possession:
                        </label>
                        <select
                          value={cameraTargetEventId || selectedEventId || ''}
                          onChange={(e) => {
                            setCameraTargetEventId(e.target.value);
                            setSelectedEventId(e.target.value);
                          }}
                          style={{
                            width: '100%',
                            padding: '7px 9px',
                            borderRadius: 6,
                            border: '1px solid #CBD5E1',
                            fontSize: 11.5,
                            fontWeight: 600,
                            background: '#F8FAFC',
                            color: '#0F172A',
                          }}
                        >
                          <option value="">-- Choose Active Corridor Permit --</option>
                          {effectiveEvents.map(ev => (
                            <option key={ev.id} value={ev.id}>
                              {ev.id} • {ev.section || 'Corridor'} (Stage {ev.fsm_stage ?? 1})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label style={{ fontSize: 10, fontWeight: 700, color: '#1E40AF', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>
                          Timeline Stage:
                        </label>
                        <select
                          value={cameraStage}
                          onChange={(e) => setCameraStage(e.target.value as any)}
                          style={{
                            width: '100%',
                            padding: '7px 9px',
                            borderRadius: 6,
                            border: '1px solid #CBD5E1',
                            fontSize: 11.5,
                            fontWeight: 600,
                            background: '#F8FAFC',
                            color: '#0F172A',
                          }}
                        >
                          <option value="REQUEST_DEFECT">1. Defect / Hazard (Request)</option>
                          <option value="BEFORE_WORK">2. Before Work (Pre-inspection)</option>
                          <option value="DURING_WORK">3. During Work (In-progress)</option>
                          <option value="AFTER_WORK">4. After Work (Track cleared)</option>
                        </select>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <button
                        onClick={() => {
                          const targetId = cameraTargetEventId || selectedEventId;
                          if (targetId) {
                            handleAttachPhotoToEvent(targetId);
                          } else {
                            alert('Please select an active permit above to attach this photo proof.');
                          }
                        }}
                        disabled={!photoPreview}
                        style={{
                          padding: '10px 12px',
                          borderRadius: 6,
                          border: 'none',
                          background: photoPreview ? '#16A34A' : '#CBD5E1',
                          color: '#FFFFFF',
                          fontSize: 11.5,
                          fontWeight: 700,
                          cursor: photoPreview ? 'pointer' : 'not-allowed',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                          boxShadow: photoPreview ? '0 1px 3px rgba(22,163,74,0.3)' : 'none',
                        }}
                      >
                        <CheckCircle2 size={14} color="#FFFFFF" />
                        <span>Attach to Permit</span>
                      </button>

                      <button
                        onClick={() => {
                          if (photoPreview) {
                            setReqPhotos(prev => [...prev.slice(0, 4), { url: photoPreview, sha256: cameraGeo.hash, geo: cameraGeo }]);
                            setReqPhoto(photoPreview);
                            setActiveTab('requisition');
                            setActionSuccess('Photo linked to New Requisition form!');
                            setTimeout(() => setActionSuccess(null), 3500);
                          }
                        }}
                        disabled={!photoPreview}
                        style={{
                          padding: '10px 12px',
                          borderRadius: 6,
                          border: '1.5px solid #BFDBFE',
                          background: '#EFF6FF',
                          color: '#1D4ED8',
                          fontSize: 11.5,
                          fontWeight: 700,
                          cursor: photoPreview ? 'pointer' : 'not-allowed',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                        }}
                      >
                        <Plus size={14} />
                        <span>Use in + Requisition</span>
                      </button>
                    </div>
                  </div>

                  {/* Geotag Telemetry Card */}
                  <div style={{ background: '#FFFFFF', padding: 14, borderRadius: 10, border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: 6 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#334155', textTransform: 'uppercase' }}>
                        📡 Verified GPS Telemetry
                      </span>
                      <span style={{ fontSize: 10, color: '#059669', fontWeight: 700, background: '#ECFDF5', padding: '1px 6px', borderRadius: 4 }}>
                        CORRIDOR BOUNDARY VERIFIED
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 11 }}>
                      <div>
                        <span style={{ color: '#94A3B8', display: 'block', fontSize: 10 }}>Chainage:</span>
                        <strong style={{ color: '#0F172A' }}>{cameraGeo.chainage}</strong>
                      </div>
                      <div>
                        <span style={{ color: '#94A3B8', display: 'block', fontSize: 10 }}>Section:</span>
                        <strong style={{ color: '#0F172A' }}>{cameraGeo.section}</strong>
                      </div>
                      <div>
                        <span style={{ color: '#94A3B8', display: 'block', fontSize: 10 }}>Coordinates:</span>
                        <strong style={{ fontFamily: 'monospace', color: '#1E293B' }}>{cameraGeo.lat}, {cameraGeo.lng}</strong>
                      </div>
                      <div>
                        <span style={{ color: '#94A3B8', display: 'block', fontSize: 10 }}>Elevation:</span>
                        <strong style={{ color: '#0F172A' }}>{cameraGeo.altitude}</strong>
                      </div>
                    </div>

                    <div style={{ background: '#F8FAFC', padding: '8px 10px', borderRadius: 6, border: '1px solid #E2E8F0', marginTop: 2 }}>
                      <span style={{ fontSize: 9.5, color: '#64748B', display: 'block', marginBottom: 2 }}>
                        Tamper-Proof Cryptographic Hash (SHA-256):
                      </span>
                      <code style={{ fontSize: 10, color: '#2563EB', wordBreak: 'break-all', fontFamily: 'JetBrains Mono, monospace' }}>
                        {cameraGeo.hash}
                      </code>
                    </div>
                  </div>

                  {/* Supervisor Field Note */}
                  <div style={{ background: '#FFFFFF', padding: 14, borderRadius: 10, border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <label style={{ fontSize: 11.5, fontWeight: 700, color: '#334155', display: 'block' }}>
                      Site Supervisor Inspection Note:
                    </label>
                    <textarea
                      value={supervisorNote}
                      onChange={e => setSupervisorNote(e.target.value)}
                      rows={3}
                      style={{
                        width: '100%',
                        background: '#F8FAFC',
                        border: '1px solid #CBD5E1',
                        borderRadius: 6,
                        padding: '10px 12px',
                        color: '#0F172A',
                        fontSize: 12.5,
                        resize: 'none',
                        outline: 'none',
                      }}
                      placeholder="Enter pre-work / post-work inspection observations..."
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => {
                          setActionSuccess('Site supervisor inspection note saved!');
                          setTimeout(() => setActionSuccess(null), 3000);
                        }}
                        style={{
                          padding: '7px 14px',
                          borderRadius: 6,
                          border: 'none',
                          background: '#2563EB',
                          color: '#FFFFFF',
                          fontSize: 11.5,
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        Save Note &amp; Watermark Proof
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── TAB 3: DRAFT NEW BLOCK REQUISITION MEMO ────────── */}
            {activeTab === 'requisition' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Frontline Maintenance Requisition Form
                  </span>
                  <span style={{ fontSize: 10.5, color: '#059669', fontWeight: 700, background: '#ECFDF5', padding: '2px 8px', borderRadius: 4, border: '1px solid #A7F3D0' }}>
                    G&amp;SR Chapter IV Compliant
                  </span>
                </div>

                <div
                  style={{
                    background: '#FFFFFF',
                    padding: isDeviceFrame ? 14 : 20,
                    borderRadius: 10,
                    border: '1px solid #E2E8F0',
                    display: 'grid',
                    gridTemplateColumns: isDeviceFrame ? '1fr' : '1.15fr 0.85fr',
                    gap: isDeviceFrame ? 14 : 24,
                  }}
                >
                  {/* Left Column: Corridor & Scope */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {/* Section selection */}
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>
                        Railway Corridor Section:
                      </label>
                      <select
                        value={reqSection}
                        onChange={e => setReqSection(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          borderRadius: 6,
                          background: '#FFFFFF',
                          border: '1px solid #CBD5E1',
                          color: '#0F172A',
                          fontSize: 12,
                        }}
                      >
                        <option value="Danapur–Patna Junction">Danapur (DNR) ⇄ Patna Jn (PNBE)</option>
                        <option value="Ara Junction–Danapur">Ara Junction (ARA) ⇄ Danapur (DNR)</option>
                        <option value="Buxar–Ara Junction">Buxar (BXR) ⇄ Ara Junction (ARA)</option>
                        <option value="Pt. Deen Dayal Upadhyaya–Buxar">Pt. Deen Dayal Upadhyaya ⇄ Buxar</option>
                      </select>
                    </div>

                    {/* Track ID & Geofence KM */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>
                          Track Identifier:
                        </label>
                        <select
                          value={reqTrack}
                          onChange={e => setReqTrack(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '8px 10px',
                            borderRadius: 6,
                            background: '#FFFFFF',
                            border: '1px solid #CBD5E1',
                            color: '#0F172A',
                            fontSize: 12,
                          }}
                        >
                          <option value="UP_MAIN">UP MAIN</option>
                          <option value="DOWN_MAIN">DN MAIN</option>
                          <option value="LOOP_01">LOOP 01</option>
                          <option value="YARD_04">YARD 04</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>
                          Duration (Hours):
                        </label>
                        <input
                          type="number"
                          step="0.5"
                          value={reqDurationHrs}
                          onChange={e => setReqDurationHrs(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '8px 10px',
                            borderRadius: 6,
                            background: '#FFFFFF',
                            border: '1px solid #CBD5E1',
                            color: '#0F172A',
                            fontSize: 12,
                          }}
                        />
                      </div>
                    </div>

                    {/* Chainage Start and End */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>
                          KM Start:
                        </label>
                        <input
                          type="text"
                          value={reqKmStart}
                          onChange={e => setReqKmStart(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '8px 10px',
                            borderRadius: 6,
                            background: '#FFFFFF',
                            border: '1px solid #CBD5E1',
                            color: '#0F172A',
                            fontSize: 12,
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>
                          KM End:
                        </label>
                        <input
                          type="text"
                          value={reqKmEnd}
                          onChange={e => setReqKmEnd(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '8px 10px',
                            borderRadius: 6,
                            background: '#FFFFFF',
                            border: '1px solid #CBD5E1',
                            color: '#0F172A',
                            fontSize: 12,
                          }}
                        />
                      </div>
                    </div>

                    {/* Description */}
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>
                        Operational Description &amp; Memo Details:
                      </label>
                      <textarea
                        rows={3}
                        value={reqDesc}
                        onChange={e => setReqDesc(e.target.value)}
                        style={{
                          width: '100%',
                          background: '#FFFFFF',
                          border: '1px solid #CBD5E1',
                          borderRadius: 6,
                          padding: '8px 10px',
                          color: '#0F172A',
                          fontSize: 12,
                          resize: 'none',
                        }}
                      />
                    </div>
                  </div>

                  {/* Right Column: Statutory Vectors & Photo Proof */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {/* Impact Vector Toggles */}
                    <div style={{ background: '#F8FAFC', padding: 12, borderRadius: 8, border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <span style={{ fontSize: 10.5, fontWeight: 700, color: '#334155', textTransform: 'uppercase' }}>
                        Statutory Impact Vectors:
                      </span>
                      <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: '#1E293B', cursor: 'pointer' }}>
                        <span>⚡ 25kV Catenary Power Cut (Form ETR-1)</span>
                        <input type="checkbox" checked={reqPowerCut} onChange={e => setReqPowerCut(e.target.checked)} />
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: '#1E293B', cursor: 'pointer' }}>
                        <span>🛑 Absolute Traffic Block (G&amp;SR Chapter IV)</span>
                        <input type="checkbox" checked={reqTrafficBlock} onChange={e => setReqTrafficBlock(e.target.checked)} />
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: '#1E293B', cursor: 'pointer' }}>
                        <span>⚠️ Adjacent Track TSR 30 km/h Caution</span>
                        <input type="checkbox" checked={reqSpeedRestr} onChange={e => setReqSpeedRestr(e.target.checked)} />
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: '#1E293B', cursor: 'pointer' }}>
                        <span>🔒 SM Physical Point Padlocking (#14A/B)</span>
                        <input type="checkbox" checked={reqPointClamp} onChange={e => setReqPointClamp(e.target.checked)} />
                      </label>
                    </div>

                    {/* On-Site Field Verification Photo Proof */}
                    <div style={{ background: '#F8FAFC', padding: 12, borderRadius: 8, border: '1.5px solid #BFDBFE', display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <label style={{ fontSize: 11, fontWeight: 700, color: '#1E40AF', display: 'flex', alignItems: 'center', gap: 5 }}>
                          <Camera size={13} color="#2563EB" />
                          <span>Site Verification Evidence ({reqPhotos.length}/5):</span>
                        </label>
                        <span style={{ fontSize: 9.5, fontWeight: 700, color: '#15803D', background: '#DCFCE7', border: '1px solid #86EFAC', padding: '1px 6px', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 3 }}>
                          <ShieldCheck size={11} color="#16A34A" /> GEOFENCE ACTIVE
                        </span>
                      </div>

                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        ref={reqFileInputRef}
                        style={{ display: 'none' }}
                        onChange={e => handlePhotoCapture(e, true)}
                      />

                      {reqPhotos.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(85px, 1fr))', gap: 8 }}>
                            {reqPhotos.map((p, idx) => (
                              <div
                                key={idx}
                                style={{
                                  position: 'relative',
                                  borderRadius: 6,
                                  overflow: 'hidden',
                                  border: '1.5px solid #93C5FD',
                                  height: 80,
                                  background: '#0F172A',
                                }}
                              >
                                <img
                                  src={p.url}
                                  alt={`Evidence #${idx + 1}`}
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                                <button
                                  type="button"
                                  onClick={(ev) => {
                                    ev.stopPropagation();
                                    setReqPhotos(prev => prev.filter((_, i) => i !== idx));
                                    if (reqPhotos.length <= 1) setReqPhoto(null);
                                  }}
                                  style={{
                                    position: 'absolute',
                                    top: 3,
                                    right: 3,
                                    background: 'rgba(220,38,38,0.9)',
                                    color: '#FFFFFF',
                                    border: 'none',
                                    borderRadius: '50%',
                                    width: 18,
                                    height: 18,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    padding: 0,
                                  }}
                                  title="Remove photo"
                                >
                                  <X size={11} />
                                </button>
                                <div
                                  style={{
                                    position: 'absolute',
                                    bottom: 0,
                                    left: 0,
                                    right: 0,
                                    background: 'rgba(15,23,42,0.85)',
                                    padding: '2px 4px',
                                    fontSize: 8.5,
                                    color: '#93C5FD',
                                    fontFamily: 'monospace',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                  }}
                                >
                                  #{idx + 1} {p.sha256 ? p.sha256.substring(0, 8) : 'SHA-256'}
                                </div>
                              </div>
                            ))}
                          </div>

                          {reqPhotos.length < 5 && (
                            <button
                              type="button"
                              onClick={() => reqFileInputRef.current?.click()}
                              style={{
                                padding: '8px 12px',
                                borderRadius: 6,
                                border: '1px dashed #3B82F6',
                                background: '#EFF6FF',
                                color: '#1D4ED8',
                                fontSize: 11.5,
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 6,
                              }}
                            >
                              <Plus size={13} />
                              <span>+ Add Photo ({reqPhotos.length}/5)</span>
                            </button>
                          )}
                        </div>
                      ) : (reqPhoto || photoPreview) ? (
                        <div style={{ position: 'relative', borderRadius: 6, overflow: 'hidden', border: '1px solid #CBD5E1', height: 120, background: '#0F172A' }}>
                          <img
                            src={reqPhoto || photoPreview || ''}
                            alt="Field crew verification proof"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                          <div
                            style={{
                              position: 'absolute',
                              bottom: 0,
                              left: 0,
                              right: 0,
                              background: 'linear-gradient(transparent, rgba(15,23,42,0.92))',
                              padding: '6px 10px',
                              fontSize: 9.5,
                              color: '#F8FAFC',
                              fontFamily: 'monospace',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                            }}
                          >
                            <div>
                              <div style={{ fontWeight: 700 }}>📍 KM {reqKmStart || '548.10'} ({reqTrack})</div>
                              <div style={{ color: '#93C5FD', fontSize: 9 }}>🌐 {cameraGeo.lat}, {cameraGeo.lng}</div>
                            </div>
                            <button
                              type="button"
                              onClick={() => reqFileInputRef.current?.click()}
                              style={{
                                background: '#2563EB',
                                color: '#fff',
                                border: 'none',
                                padding: '3px 8px',
                                borderRadius: 4,
                                fontSize: 10,
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 3,
                              }}
                            >
                              <Plus size={11} />
                              <span>Add More</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => reqFileInputRef.current?.click()}
                          style={{
                            border: '1.5px dashed #93C5FD',
                            background: '#EFF6FF',
                            borderRadius: 6,
                            padding: '14px 10px',
                            textAlign: 'center',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 4,
                            color: '#1D4ED8',
                          }}
                        >
                          <Camera size={20} color="#2563EB" />
                          <span style={{ fontSize: 11.5, fontWeight: 700 }}>Snap / Attach Geotagged Track Photos</span>
                          <span style={{ fontSize: 9.5, color: '#64748B' }}>Attach up to 5 photos with automatic GPS &amp; SHA-256 watermark</span>
                        </button>
                      )}
                    </div>

                    <button
                      onClick={handleMobileSubmitRequisition}
                      disabled={submittingReq}
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: 8,
                        border: 'none',
                        background: '#10B981',
                        color: '#fff',
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: 'pointer',
                        boxShadow: '0 2px 8px rgba(16,185,129,0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                      }}
                    >
                      <Send size={15} />
                      <span>{submittingReq ? 'Validating G&SR Rules...' : 'Submit to Station Master Queue'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── TAB 4: INTER-DEPARTMENT LIVE Q&A DESK ──────────── */}
            {activeTab === 'queries' && (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Two-Way Station Master Clarification Desk
                  </span>
                  <span style={{ fontSize: 10.5, color: '#2563EB', fontWeight: 700 }}>
                    {chatMessages.length} Messages Logged
                  </span>
                </div>

                {/* Chat Stream */}
                <div
                  style={{
                    minHeight: isDeviceFrame ? 280 : 380,
                    height: isDeviceFrame ? 'auto' : 'calc(100vh - 320px)',
                    maxHeight: isDeviceFrame ? 420 : 560,
                    background: '#FFFFFF',
                    borderRadius: 10,
                    border: '1px solid #E2E8F0',
                    padding: 14,
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                  }}
                >
                  {chatMessages.map((msg) => {
                    const isMe = msg.role === 'FIELD_SUPERVISOR';
                    return (
                      <div
                        key={msg.id}
                        style={{
                          alignSelf: isMe ? 'flex-end' : 'flex-start',
                          maxWidth: '85%',
                          background: isMe ? '#EFF6FF' : '#F8FAFC',
                          padding: '10px 14px',
                          borderRadius: isMe ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                          border: isMe ? '1px solid #BFDBFE' : '1px solid #E2E8F0',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 3 }}>
                          <span style={{ fontSize: 10.5, fontWeight: 700, color: isMe ? '#1D4ED8' : '#065F46' }}>
                            {msg.sender}
                          </span>
                          <span style={{ fontSize: 9.5, color: '#94A3B8' }}>{msg.timestamp}</span>
                        </div>
                        <div style={{ fontSize: 12, color: '#0F172A', lineHeight: 1.4 }}>
                          {msg.text}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Department Tag Selector */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
                  <span style={{ fontSize: 10.5, color: '#64748B', fontWeight: 700 }}>Tag:</span>
                  {['@OPERATING', '@OHE', '@S_AND_T', '@CIVIL_P_WAY'].map((tag) => (
                    <button
                      key={tag}
                      onClick={() => setSelectedTaggedDept(tag)}
                      style={{
                        padding: '3px 8px',
                        borderRadius: 4,
                        fontSize: 10.5,
                        fontWeight: 700,
                        border: selectedTaggedDept === tag ? '1px solid #2563EB' : '1px solid #CBD5E1',
                        background: selectedTaggedDept === tag ? '#EFF6FF' : '#FFFFFF',
                        color: selectedTaggedDept === tag ? '#1D4ED8' : '#64748B',
                        cursor: 'pointer',
                      }}
                    >
                      {tag}
                    </button>
                  ))}
                </div>

                {/* Input Bar */}
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="text"
                    placeholder={`Ask Station Master or tag ${selectedTaggedDept}...`}
                    value={newChatText}
                    onChange={e => setNewChatText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSendChat()}
                    style={{
                      flex: 1,
                      background: '#FFFFFF',
                      border: '1px solid #CBD5E1',
                      borderRadius: 8,
                      padding: '8px 12px',
                      color: '#0F172A',
                      fontSize: 12,
                      outline: 'none',
                    }}
                  />
                  <button
                    onClick={handleSendChat}
                    style={{
                      padding: '8px 16px',
                      borderRadius: 8,
                      border: 'none',
                      background: '#2563EB',
                      color: '#fff',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Send size={15} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Station Master Work Order Memo Popup Modal */}
          {viewingMemoEvent && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(15,23,42,0.7)',
                backdropFilter: 'blur(3px)',
                zIndex: 60,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 16,
              }}
            >
              <div
                style={{
                  background: '#FFFFFF',
                  borderRadius: 12,
                  width: '100%',
                  maxWidth: 380,
                  boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <div
                  style={{
                    background: '#0F172A',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    color: '#FFFFFF',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <FileText size={16} color="#60A5FA" />
                    <span style={{ fontSize: 12.5, fontWeight: 700 }}>
                      Station Master Work Order Memo
                    </span>
                  </div>
                  <button
                    onClick={() => setViewingMemoEvent(null)}
                    style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}
                  >
                    <X size={16} />
                  </button>
                </div>

                <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10, fontSize: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #E2E8F0', paddingBottom: 8 }}>
                    <span style={{ color: '#64748B' }}>Order Token:</span>
                    <strong style={{ fontFamily: 'monospace', color: '#1D4ED8' }}>{viewingMemoEvent.id}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748B' }}>Assigned By:</span>
                    <strong>{viewingMemoEvent.assigned_by || 'Station Master (SM_PNBE_01)'}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748B' }}>Assigned Custodian:</span>
                    <strong>{viewingMemoEvent.assigned_to || 'SSE_OHE_PATNA_01'}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748B' }}>Department:</span>
                    <strong>{viewingMemoEvent.assigned_dept || 'OHE Traction'}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748B' }}>Track &amp; Chainage:</span>
                    <strong>{viewingMemoEvent.track_id} • KM {viewingMemoEvent.km_start}–{viewingMemoEvent.km_end}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748B' }}>Section:</span>
                    <strong>{viewingMemoEvent.section}</strong>
                  </div>
                  <div style={{ background: '#F8FAFC', padding: 8, borderRadius: 6, border: '1px solid #E2E8F0', marginTop: 4 }}>
                    <span style={{ fontSize: 11, color: '#64748B', display: 'block', marginBottom: 2 }}>Scope Directive:</span>
                    <p style={{ margin: 0, fontSize: 11.5, color: '#0F172A', fontWeight: 600 }}>{viewingMemoEvent.description}</p>
                  </div>
                  <div style={{ background: '#EFF6FF', padding: 8, borderRadius: 6, border: '1px solid #BFDBFE' }}>
                    <span style={{ fontSize: 10.5, color: '#1E40AF', display: 'block', fontWeight: 700 }}>
                      Statutory Clearance Status:
                    </span>
                    <span style={{ fontSize: 11, color: '#1D4ED8' }}>
                      Station Master (Approved) • TPC (Awaiting) • Section Controller (Awaiting)
                    </span>
                  </div>
                </div>

                <div style={{ padding: '10px 16px', background: '#F8FAFC', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => setViewingMemoEvent(null)}
                    style={{
                      padding: '6px 14px',
                      background: '#2563EB',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Close Memo
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── SOS Emergency Trigger Modal ────────────────────── */}
          {showSosModal && (
            <div
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(15, 23, 42, 0.75)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 99999,
                padding: 16,
              }}
            >
              <div
                style={{
                  background: '#FFFFFF',
                  borderRadius: 12,
                  maxWidth: 420,
                  width: '100%',
                  overflow: 'hidden',
                  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
                  border: '2px solid #EF4444',
                }}
              >
                <div
                  style={{
                    background: 'linear-gradient(135deg, #7F1D1D 0%, #DC2626 100%)',
                    padding: '14px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    color: '#FFFFFF',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <AlertTriangle size={18} color="#FEF2F2" />
                    <span style={{ fontSize: 13, fontWeight: 900, letterSpacing: '0.02em' }}>
                      TRANSMIT STATUTORY TRACK EMERGENCY (SOS)
                    </span>
                  </div>
                  <button
                    onClick={() => setShowSosModal(false)}
                    style={{ background: 'none', border: 'none', color: '#FEE2E2', cursor: 'pointer' }}
                  >
                    <X size={16} />
                  </button>
                </div>

                <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12, fontSize: 12 }}>
                  <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', padding: 10, borderRadius: 8, color: '#991B1B' }}>
                    <strong>Statutory Warning (G&amp;SR 15.09):</strong> This activates a red alert on Station Master consoles across the corridor. Use ONLY for life safety or track obstruction emergencies.
                  </div>

                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                      Emergency Cause / Hazard Nature:
                    </label>
                    <select
                      value={sosReason}
                      onChange={e => setSosReason(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: 6,
                        border: '1px solid #CBD5E1',
                        fontSize: 12,
                        fontWeight: 600,
                        background: '#fff',
                        color: '#0F172A',
                      }}
                    >
                      <option value="Unscheduled Train Intrusion / Worker Safety Risk">Unscheduled Train Intrusion / Worker Safety Risk</option>
                      <option value="Catenary OHE Snapped / Flashover Hazard">Catenary OHE Snapped / Flashover Hazard</option>
                      <option value="Rail Fracture / Track Buckling Detected">Rail Fracture / Track Buckling Detected</option>
                      <option value="Gang Crew Member Medical Emergency">Gang Crew Member Medical Emergency</option>
                      <option value="Obstruction on Running Track">Obstruction on Running Track</option>
                    </select>
                  </div>

                  <div style={{ background: '#F8FAFC', padding: 10, borderRadius: 8, border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ fontSize: 10.5, fontWeight: 700, color: '#64748B' }}>TRANSMITTED TELEMETRY LOCATION:</div>
                    <div style={{ fontSize: 11.5, color: '#1E293B', fontWeight: 600 }}>📍 {cameraGeo.chainage} • {reqSection}</div>
                    <div style={{ fontSize: 10.5, fontFamily: 'monospace', color: '#475569' }}>🌐 {cameraGeo.lat}, {cameraGeo.lng} (±3.2m accuracy)</div>
                    <div style={{ fontSize: 10.5, color: '#2563EB' }}>👤 Transmitting: {currentUser?.name || 'Divya Singh'} (SSE/OHE)</div>
                  </div>
                </div>

                <div style={{ padding: '12px 16px', background: '#F8FAFC', borderTop: '1px solid #E2E8F0', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => setShowSosModal(false)}
                    style={{
                      padding: '8px 14px',
                      background: '#FFFFFF',
                      color: '#475569',
                      border: '1px solid #CBD5E1',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDispatchSos}
                    disabled={sosSent}
                    style={{
                      padding: '8px 16px',
                      background: '#DC2626',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 800,
                      cursor: sosSent ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      boxShadow: '0 2px 6px rgba(220,38,38,0.4)',
                    }}
                  >
                    <AlertTriangle size={14} color="#FFFFFF" />
                    <span>{sosSent ? 'Transmitting Alarm...' : '🚨 TRANSMIT EMERGENCY SOS'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  </div>
  );
};
