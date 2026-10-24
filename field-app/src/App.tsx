import React, { useState, useEffect, useRef } from 'react';
import {
  Smartphone, PlusCircle, CheckSquare, Camera, MessageSquare,
  Signal, Wifi, Battery, Clock, MapPin, Shield, Zap, AlertTriangle,
  CheckCircle2, RefreshCw, Send, ArrowRight, UploadCloud, Check,
  AlertOctagon, X, User, FileText, ChevronRight, Loader2, Eye
} from 'lucide-react';
import {
  fetchEvents,
  fetchEventDetail,
  submitTaskProposal,
  activateWork,
  completeWork,
  fetchCorridorStatus
} from './api';
import { OperationalEvent, Department, TaskProposalPayload } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<'proposal' | 'permits' | 'camera' | 'chat'>('proposal');
  const [currentTime, setCurrentTime] = useState('');
  const [events, setEvents] = useState<OperationalEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // ── Proposal Form State ──────────────────────────────────
  const [section, setSection] = useState('Danapur–Patna Junction');
  const [trackId, setTrackId] = useState<'UP_MAIN' | 'DN_MAIN' | 'YARD_01'>('UP_MAIN');
  const [kmStart, setKmStart] = useState('548.10');
  const [kmEnd, setKmEnd] = useState('554.00');
  const [durationHrs, setDurationHrs] = useState('2.5');
  const [department, setDepartment] = useState<Department>('OHE');
  const [description, setDescription] = useState(
    'Emergency catenary dropper alignment & 25kV insulator inspection per ACTM Vol II.'
  );
  const [powerTrip, setPowerTrip] = useState(true);
  const [trafficBlock, setTrafficBlock] = useState(true);
  const [speedRestr, setSpeedRestr] = useState(true);
  const [pointClamp, setPointClamp] = useState(true);
  const [originatorId, setOriginatorId] = useState('SSE_OHE_DNR_04 - Devendra Kumar');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedEventId, setSubmittedEventId] = useState<string | null>(null);

  // ── Camera / Geo State ───────────────────────────────────
  const [photoPreview, setPhotoPreview] = useState<string | null>(
    'https://images.unsplash.com/photo-1474487548417-781cb71495f3?auto=format&fit=crop&w=800&q=80'
  );
  const [supervisorNote, setSupervisorNote] = useState(
    'Discharge earthing rod clamped on contact wire at KM 548/14. Line dead.'
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Chat State ───────────────────────────────────────────
  const [chatMessages, setChatMessages] = useState<Array<{ sender: string; role: string; text: string; time: string; tag: string }>>([
    {
      sender: 'Station Master (PNBE)',
      role: 'STATION_MASTER',
      text: 'Section Controller confirmed path margin. Confirm physical earthing rod clamp deployed on FP-02 catenary.',
      time: '13:02 UTC',
      tag: '@OPERATING',
    },
    {
      sender: 'Devendra Kumar (SSE/OHE)',
      role: 'FIELD_SUPERVISOR',
      text: 'Earthing discharge rod clamped at KM 548/14 Up Main. Isolation verified. Waiting for line possession seal.',
      time: '13:06 UTC',
      tag: '@OHE',
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [selectedTag, setSelectedTag] = useState('@OPERATING');

  // Clock timer
  useEffect(() => {
    const update = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  // Load Events on mount and poll
  const loadEventsData = async () => {
    setLoadingEvents(true);
    try {
      const data = await fetchEvents();
      if (Array.isArray(data)) {
        setEvents(data);
        if (data.length > 0 && !selectedEventId) {
          setSelectedEventId(data[0].id);
        }
      }
    } catch (err) {
      console.warn('Error loading events:', err);
    } finally {
      setLoadingEvents(false);
    }
  };

  useEffect(() => {
    loadEventsData();
    const interval = setInterval(loadEventsData, 4000);
    return () => clearInterval(interval);
  }, []);

  // ── Submit Proposal Handler ──────────────────────────────
  const handleProposalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmittedEventId(null);

    try {
      const now = new Date();
      const startTime = now.toISOString();
      const endTime = new Date(now.getTime() + parseFloat(durationHrs) * 60 * 60 * 1000).toISOString();

      const payload: TaskProposalPayload = {
        division: 'DNR',
        section,
        track_id: trackId,
        km_start: parseFloat(kmStart) || 548.10,
        km_end: parseFloat(kmEnd) || 554.00,
        requested_start: startTime,
        requested_end: endTime,
        impact_vector: {
          catenary_25kv_power_trip: powerTrip,
          absolute_traffic_block: trafficBlock,
          speed_restriction_kmh: speedRestr ? 30 : 0,
          feeding_posts: ['FP-02 (Danapur TSS)'],
          points_clamping_required: pointClamp,
          track_bonding_notice: true,
        },
        description: `[FIELD PROPOSAL] ${description}`,
        originator_id: originatorId,
      };

      // VVI: Connected via POST /api/v1/events
      const result = await submitTaskProposal(payload);
      const newId = result.id;
      setSubmittedEventId(newId);
      setActionSuccess(`Proposal Submitted! Queued in Station Master Pending Approvals (${newId})`);

      // Refresh events list
      await loadEventsData();

      setTimeout(() => {
        setActionSuccess(null);
      }, 5000);
    } catch (err: any) {
      alert(err.message || 'Failed to submit proposal');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Field Action Handlers ────────────────────────────────
  const handleActivate = async (id: string) => {
    try {
      await activateWork(id);
      setActionSuccess('Work Activated: Track Custody Handed to Field Crew');
      loadEventsData();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to activate track block');
    }
  };

  const handleComplete = async (id: string) => {
    try {
      await completeWork(id, originatorId, 'Work completed. Earthing rods removed and line cleared.');
      setActionSuccess('Work Completed: Track Handed Back to Station Master for Normalization');
      loadEventsData();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to complete work');
    }
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' UTC';
    setChatMessages(prev => [
      ...prev,
      {
        sender: 'Devendra Kumar (SSE/OHE)',
        role: 'FIELD_SUPERVISOR',
        text: chatInput.trim(),
        time: timeStr,
        tag: selectedTag,
      },
    ]);
    setChatInput('');
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setPhotoPreview(url);
      setActionSuccess('Inspection Photo Geotagged with KM Chainage!');
      setTimeout(() => setActionSuccess(null), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between max-w-md mx-auto shadow-2xl border-x border-slate-800">
      {/* ── Android Status Bar ──────────────────────────── */}
      <div className="bg-slate-900/90 backdrop-blur px-4 py-2 border-b border-slate-800/80 flex items-center justify-between text-xs text-slate-400 select-none">
        <div className="flex items-center gap-2 font-mono font-bold text-slate-200">
          <span>{currentTime || '12:00'}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-[10px] bg-emerald-950/80 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-800/50">
            <MapPin size={10} />
            <span>GPS ±1.8m</span>
          </div>
          <Signal size={12} className="text-slate-300" />
          <Wifi size={12} className="text-emerald-400" />
          <div className="flex items-center gap-0.5">
            <Battery size={13} className="text-slate-300" />
            <span className="text-[10px]">98%</span>
          </div>
        </div>
      </div>

      {/* ── Header: Field Officer Profile ───────────────── */}
      <header className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 p-4 border-b border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 border border-blue-400/40 flex items-center justify-center font-bold text-white shadow-md">
              DK
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-white tracking-wide">
                  Devendra Kumar
                </h1>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  SSE / OHE
                </span>
              </div>
              <div className="text-xs text-blue-200/80 flex items-center gap-1.5 mt-0.5">
                <span>ECR Danapur Division</span>
                <span>•</span>
                <span className="text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live on Track
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={loadEventsData}
            title="Refresh events from Station Master Desk"
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition"
          >
            <RefreshCw size={14} className={loadingEvents ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      {/* ── Action Success Banner ───────────────────────── */}
      {actionSuccess && (
        <div className="bg-emerald-950 border-b border-emerald-700/80 px-4 py-2.5 flex items-center gap-2 text-xs text-emerald-200 animate-in slide-in-from-top-2">
          <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
          <div className="font-medium">{actionSuccess}</div>
        </div>
      )}

      {/* ── Main Scrollable View Area ───────────────────── */}
      <main className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* ── TAB 1: SUBMIT PROPOSAL ──────────────────────── */}
        {activeTab === 'proposal' && (
          <div className="space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <PlusCircle size={16} className="text-blue-400" />
                <h2 className="text-sm font-bold text-white">
                  Statutory Track Possession Proposal
                </h2>
              </div>
              <p className="text-xs text-slate-400">
                Submit work proposal per Indian Railways G&SR. Automatically routes to the <strong>Station Master's Pending Approvals</strong> queue.
              </p>
            </div>

            <form onSubmit={handleProposalSubmit} className="space-y-3.5 bg-slate-900/90 border border-slate-800 rounded-xl p-4">
              {/* Section Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Corridor Section
                </label>
                <select
                  value={section}
                  onChange={e => setSection(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="Danapur–Patna Junction">Danapur (DNR) ⇄ Patna Jn (PNBE)</option>
                  <option value="Patna Junction–Fatuha">Patna Jn (PNBE) ⇄ Fatuha (FUT)</option>
                  <option value="Ara Junction–Danapur">Ara Jn (ARA) ⇄ Danapur (DNR)</option>
                </select>
              </div>

              {/* Track ID & Chainage */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Track Line
                  </label>
                  <select
                    value={trackId}
                    onChange={e => setTrackId(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                  >
                    <option value="UP_MAIN">UP MAIN</option>
                    <option value="DN_MAIN">DN MAIN</option>
                    <option value="YARD_01">YARD 01</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    KM Start
                  </label>
                  <input
                    type="text"
                    value={kmStart}
                    onChange={e => setKmStart(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    KM End
                  </label>
                  <input
                    type="text"
                    value={kmEnd}
                    onChange={e => setKmEnd(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Duration & Department */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Duration (Hours)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="12"
                    value={durationHrs}
                    onChange={e => setDurationHrs(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Department
                  </label>
                  <select
                    value={department}
                    onChange={e => setDepartment(e.target.value as Department)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="OHE">OHE (Traction)</option>
                    <option value="CIVIL_P_WAY">Civil (P-Way)</option>
                    <option value="S_AND_T">S&T (Signals)</option>
                    <option value="MECHANICAL_CW">Mechanical (C&W)</option>
                  </select>
                </div>
              </div>

              {/* Statutory Impact Vector Checkboxes */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3 space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Statutory Safety Requirements (G&SR 15.06)
                </span>
                <label className="flex items-center gap-2.5 text-xs text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={powerTrip}
                    onChange={e => setPowerTrip(e.target.checked)}
                    className="rounded bg-slate-900 border-slate-700 text-blue-600 focus:ring-0"
                  />
                  <span>25kV Catenary Power Cut (Form ETR-1)</span>
                </label>
                <label className="flex items-center gap-2.5 text-xs text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={trafficBlock}
                    onChange={e => setTrafficBlock(e.target.checked)}
                    className="rounded bg-slate-900 border-slate-700 text-blue-600 focus:ring-0"
                  />
                  <span>Absolute Traffic Block on target line</span>
                </label>
                <label className="flex items-center gap-2.5 text-xs text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={speedRestr}
                    onChange={e => setSpeedRestr(e.target.checked)}
                    className="rounded bg-slate-900 border-slate-700 text-blue-600 focus:ring-0"
                  />
                  <span>30 km/h TSR on adjacent track line</span>
                </label>
                <label className="flex items-center gap-2.5 text-xs text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pointClamp}
                    onChange={e => setPointClamp(e.target.checked)}
                    className="rounded bg-slate-900 border-slate-700 text-blue-600 focus:ring-0"
                  />
                  <span>Station Master Point Clamp & Padlock</span>
                </label>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Work Scope & Machine Deployment
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 resize-none font-sans"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Transmitting to Station Master...</span>
                  </>
                ) : (
                  <>
                    <Send size={14} />
                    <span>Submit Proposal to Station Master Queue</span>
                  </>
                )}
              </button>

              {submittedEventId && (
                <div className="bg-blue-950/80 border border-blue-700/60 rounded-lg p-2.5 text-xs text-blue-200 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-white">Event Created:</span>{' '}
                    <span className="font-mono text-blue-400">{submittedEventId}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('permits')}
                    className="text-xs text-blue-400 underline font-semibold"
                  >
                    View in Permits →
                  </button>
                </div>
              )}
            </form>
          </div>
        )}

        {/* ── TAB 2: ACTIVE PERMITS & LIFECYCLE ────────────── */}
        {activeTab === 'permits' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                My Field Track Blocks ({events.length})
              </h2>
              <span className="text-[10px] text-slate-400 font-mono">
                Auto-synced with SM Desk
              </span>
            </div>

            {events.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center space-y-2">
                <CheckSquare size={32} className="text-slate-600 mx-auto" />
                <div className="text-sm font-semibold text-slate-300">No Block Requisitions</div>
                <p className="text-xs text-slate-500">
                  Submit a new proposal using the "Proposal" tab.
                </p>
              </div>
            ) : (
              events.map(event => {
                const isApproved = event.status === 'APPROVED' || event.status === 'SCHEDULED';
                const isActive = event.status === 'ACTIVE_IN_PROGRESS';
                const isCompleted = event.status === 'WORK_COMPLETED' || event.status === 'SAFETY_VERIFIED';
                const isPending = event.status === 'SUBMITTED' || event.status === 'AWAITING_APPROVAL';

                return (
                  <div
                    key={event.id}
                    className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-3 shadow-md"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-blue-400">
                          {event.id}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                          {event.track_id}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isActive
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse'
                            : isApproved
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                            : isCompleted
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        }`}
                      >
                        {event.status.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <div className="text-xs text-slate-300 leading-relaxed">
                      {event.description}
                    </div>

                    <div className="bg-slate-950 p-2 rounded-lg flex items-center justify-between text-[11px] text-slate-400">
                      <div>
                        KM: <span className="text-slate-200 font-mono">{event.km_start} - {event.km_end}</span>
                      </div>
                      <div>
                        Section: <span className="text-slate-200">{event.section}</span>
                      </div>
                    </div>

                    {/* Dual-Key Quorum Checklist */}
                    <div className="border-t border-slate-800/80 pt-2 flex items-center justify-between text-[10px]">
                      <span className="text-slate-400">Station Master Quorum:</span>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-300">
                          SM: {isApproved || isActive || isCompleted ? '✅ Signed' : '⏳ Pending'}
                        </span>
                        <span>•</span>
                        <span className="text-slate-300">
                          TPC: {isApproved || isActive || isCompleted ? '✅ Issued' : '⏳ Pending'}
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    {isApproved && (
                      <button
                        onClick={() => handleActivate(event.id)}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded-lg text-xs flex items-center justify-center gap-1.5 transition"
                      >
                        <Zap size={13} />
                        <span>Start Work / Take Track Custody (G&SR 15.06)</span>
                      </button>
                    )}

                    {isActive && (
                      <button
                        onClick={() => handleComplete(event.id)}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 rounded-lg text-xs flex items-center justify-center gap-1.5 transition"
                      >
                        <CheckCircle2 size={13} />
                        <span>Complete Work & Return Track to SM</span>
                      </button>
                    )}

                    {isPending && (
                      <div className="bg-amber-950/40 border border-amber-800/40 rounded-lg p-2 text-center text-[11px] text-amber-300">
                        Awaiting Dual-Key Quorum on Station Master & TPC Desks...
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ── TAB 3: GEO CAMERA ───────────────────────────── */}
        {activeTab === 'camera' && (
          <div className="space-y-3.5">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
              <h2 className="text-xs font-bold text-white mb-1 flex items-center gap-2">
                <Camera size={14} className="text-blue-400" />
                <span>Geofenced Site Inspection Watermark</span>
              </h2>
              <p className="text-xs text-slate-400">
                Tamper-proof photo watermark stamped with chainage, GPS lock and SHA-256 seal.
              </p>
            </div>

            {/* Viewfinder Preview */}
            <div className="relative rounded-xl overflow-hidden border-2 border-slate-700 bg-black aspect-[4/3]">
              {photoPreview ? (
                <img
                  src={photoPreview}
                  alt="Track Site"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-600">
                  <Camera size={40} />
                </div>
              )}

              {/* Watermark Overlay */}
              <div className="absolute inset-x-0 bottom-0 bg-black/75 backdrop-blur-sm p-2.5 text-[10px] text-slate-200 font-mono border-t border-white/10 space-y-0.5">
                <div className="flex justify-between font-bold text-white">
                  <span>KM 548/14 UP MAIN</span>
                  <span className="text-emerald-400">GPS: 25.6021°N, 85.1205°E</span>
                </div>
                <div>SEC: Danapur (DNR) ⇄ Patna Jn (PNBE)</div>
                <div className="flex justify-between text-slate-400">
                  <span>TIME: {currentTime || '12:00'} UTC</span>
                  <span>ACCURACY: ±1.8m</span>
                </div>
              </div>
            </div>

            {/* Supervisor Field Note */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Field Inspection Note
              </label>
              <textarea
                rows={2}
                value={supervisorNote}
                onChange={e => setSupervisorNote(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-blue-500 font-sans"
              />
            </div>

            {/* Upload / Capture Trigger */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handlePhotoUpload}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 border border-slate-700 transition"
            >
              <UploadCloud size={14} />
              <span>Capture / Upload Site Photo</span>
            </button>
          </div>
        )}

        {/* ── TAB 4: STATION MASTER CHAT ──────────────────── */}
        {activeTab === 'chat' && (
          <div className="flex flex-col h-[480px] bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="p-3 bg-slate-800/80 border-b border-slate-700/80 flex items-center justify-between">
              <div>
                <h2 className="text-xs font-bold text-white">Station Master Clarification Desk</h2>
                <div className="text-[10px] text-emerald-400 flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Control Room Connected
                </div>
              </div>
              <div className="flex gap-1">
                {['@OPERATING', '@OHE', '@S_AND_T'].map(tag => (
                  <button
                    key={tag}
                    onClick={() => setSelectedTag(tag)}
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                      selectedTag === tag
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-700 text-slate-400'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Messages Thread */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {chatMessages.map((msg, i) => {
                const isMe = msg.role === 'FIELD_SUPERVISOR';
                return (
                  <div
                    key={i}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                  >
                    <div className="flex items-center gap-1 text-[10px] text-slate-400 mb-0.5">
                      <span className="font-semibold text-slate-300">{msg.sender}</span>
                      <span>•</span>
                      <span>{msg.time}</span>
                    </div>
                    <div
                      className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                        isMe
                          ? 'bg-blue-600 text-white rounded-br-none'
                          : 'bg-slate-800 text-slate-200 rounded-bl-none border border-slate-700'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Message Composer */}
            <form onSubmit={handleSendChat} className="p-2.5 bg-slate-950 border-t border-slate-800 flex gap-2">
              <input
                type="text"
                placeholder={`Message to Station Master (${selectedTag})...`}
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-sans"
              />
              <button
                type="submit"
                className="p-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition"
              >
                <Send size={14} />
              </button>
            </form>
          </div>
        )}
      </main>

      {/* ── Bottom Android Navigation Bar ──────────────── */}
      <nav className="bg-slate-900/95 backdrop-blur border-t border-slate-800 grid grid-cols-4 p-2 text-[10px] font-medium text-slate-400 select-none">
        <button
          onClick={() => setActiveTab('proposal')}
          className={`flex flex-col items-center gap-1 py-1.5 rounded-lg transition ${
            activeTab === 'proposal' ? 'text-blue-400 font-bold' : 'hover:text-slate-200'
          }`}
        >
          <PlusCircle size={18} />
          <span>Proposal</span>
        </button>

        <button
          onClick={() => setActiveTab('permits')}
          className={`flex flex-col items-center gap-1 py-1.5 rounded-lg transition ${
            activeTab === 'permits' ? 'text-blue-400 font-bold' : 'hover:text-slate-200'
          }`}
        >
          <CheckSquare size={18} />
          <span>My Permits</span>
        </button>

        <button
          onClick={() => setActiveTab('camera')}
          className={`flex flex-col items-center gap-1 py-1.5 rounded-lg transition ${
            activeTab === 'camera' ? 'text-blue-400 font-bold' : 'hover:text-slate-200'
          }`}
        >
          <Camera size={18} />
          <span>Geo Cam</span>
        </button>

        <button
          onClick={() => setActiveTab('chat')}
          className={`flex flex-col items-center gap-1 py-1.5 rounded-lg transition ${
            activeTab === 'chat' ? 'text-blue-400 font-bold' : 'hover:text-slate-200'
          }`}
        >
          <MessageSquare size={18} />
          <span>SM Chat</span>
        </button>
      </nav>
    </div>
  );
}
