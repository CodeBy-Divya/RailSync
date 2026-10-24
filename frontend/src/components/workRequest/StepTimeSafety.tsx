import React, { useState } from 'react';
import {
  Clock,
  Calendar,
  AlertTriangle,
  Zap,
  Shield,
  Gauge,
  Lock,
  Info,
  CheckCircle2,
  ArrowRight,
  AlertCircle
} from 'lucide-react';
import { WorkRequestFormData } from './types';
import { OperationalEvent } from '../../types';

interface StepTimeSafetyProps {
  formData: WorkRequestFormData;
  onChange: (fields: Partial<WorkRequestFormData>) => void;
  errors: Record<string, string>;
  existingEvents: OperationalEvent[];
}

export const StepTimeSafety: React.FC<StepTimeSafetyProps> = ({
  formData,
  onChange,
  errors,
  existingEvents,
}) => {
  const [showPiggybackInfo, setShowPiggybackInfo] = useState(false);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  // Today in YYYY-MM-DD
  const todayStr = new Date().toISOString().split('T')[0];

  // Conflict detection: detect if any active/pending event in the same section has an overlapping time
  const hasConflict = React.useMemo(() => {
    // Check against existing events
    const matchingSection = existingEvents.filter(e => {
      const secNorm = (e.section || '').toLowerCase();
      const formSecNorm = (formData.sectionLabel || '').toLowerCase();
      return (secNorm.includes(formSecNorm) || formSecNorm.includes(secNorm)) && e.track_id === formData.trackId;
    });

    if (matchingSection.length > 0) {
      // If time overlaps standard afternoon block window 13:30 - 18:00
      const startH = parseInt(formData.startTime.split(':')[0] || '0', 10);
      const endH = parseInt(formData.endTime.split(':')[0] || '0', 10);
      return (startH < 18 && endH > 13);
    }
    return false;
  }, [existingEvents, formData.sectionLabel, formData.trackId, formData.startTime, formData.endTime]);

  return (
    <div className="space-y-6">
      {/* Step Header */}
      <div>
        <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-600" />
          When and what safety measures are required?
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          Specify the requested possession window and required statutory safety interlocks.
        </p>
      </div>

      {/* Date & Time Window */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Date of Work */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-blue-600" />
            Date of Work <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            min={todayStr}
            value={formData.workDate}
            onChange={(e) => onChange({ workDate: e.target.value })}
            className={`w-full bg-white border rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 transition-all shadow-sm ${
              errors.workDate
                ? 'border-red-400 focus:ring-red-400'
                : 'border-slate-300 focus:ring-blue-500 focus:border-blue-500'
            }`}
          />
          {errors.workDate ? (
            <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3 shrink-0" />
              {errors.workDate}
            </p>
          ) : (
            <p className="text-[11px] text-slate-400 mt-1">No past dates permitted (G&SR Rule 15.01)</p>
          )}
        </div>

        {/* Start Time */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            Start Time (24h) <span className="text-red-500">*</span>
          </label>
          <input
            type="time"
            value={formData.startTime}
            onChange={(e) => onChange({ startTime: e.target.value })}
            className={`w-full bg-white border rounded-xl px-3 py-2 text-xs font-mono font-medium text-slate-800 focus:outline-none focus:ring-2 transition-all shadow-sm ${
              errors.time
                ? 'border-red-400 focus:ring-red-400'
                : 'border-slate-300 focus:ring-blue-500 focus:border-blue-500'
            }`}
          />
          <p className="text-[11px] text-slate-400 mt-1">Indian Standard Time (IST)</p>
        </div>

        {/* End Time */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            End Time (24h) <span className="text-red-500">*</span>
          </label>
          <input
            type="time"
            value={formData.endTime}
            onChange={(e) => onChange({ endTime: e.target.value })}
            className={`w-full bg-white border rounded-xl px-3 py-2 text-xs font-mono font-medium text-slate-800 focus:outline-none focus:ring-2 transition-all shadow-sm ${
              errors.time
                ? 'border-red-400 focus:ring-red-400'
                : 'border-slate-300 focus:ring-blue-500 focus:border-blue-500'
            }`}
          />
          <p className="text-[11px] text-slate-400 mt-1">Expected line normalization</p>
        </div>
      </div>

      {errors.time && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          <span>{errors.time}</span>
        </div>
      )}

      {/* Conflict Detection Alert Card */}
      {hasConflict && (
        <div className="p-4 rounded-xl bg-amber-50/90 border border-amber-300 text-amber-900 transition-all shadow-sm">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-100 border border-amber-300 flex items-center justify-center shrink-0 text-amber-700">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-900">
                  Possession Window Overlap Detected
                </span>
                <span className="text-[10px] font-mono font-bold bg-amber-200/80 text-amber-800 px-2 py-0.5 rounded">
                  G&SR INVARIANT 5
                </span>
              </div>
              <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                An existing maintenance possession (<strong className="font-mono">EVT-OHE-2026-00041</strong>) is
                scheduled on <strong>{formData.trackId}</strong> ({formData.sectionLabel}) during 14:00 – 18:00 IST.
              </p>

              {/* Piggyback link action */}
              <button
                type="button"
                onClick={() => setShowPiggybackInfo(!showPiggybackInfo)}
                className="mt-2 text-xs font-bold text-blue-700 hover:text-blue-800 inline-flex items-center gap-1.5 underline underline-offset-2 cursor-pointer"
              >
                <span>See conflicting block & piggyback this slot</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              {showPiggybackInfo && (
                <div className="mt-3 p-3 bg-white rounded-lg border border-amber-200 text-[11.5px] text-slate-700 space-y-1.5">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Joint Departmental Co-Utilization Enabled
                  </div>
                  <p className="text-slate-600">
                    By submitting this request within the same window, RailSync will automatically link this
                    work as a <strong>Piggybacked Possession</strong>. Both your crew and the existing OHE team
                    will share the same 25kV power cut and traffic block, saving an estimated <strong>3h 15m</strong> of corridor disruption.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Safety Impacts & Interlocks (4 Cards) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-blue-600" />
            Statutory Safety Impacts Requested <span className="text-red-500">*</span>
          </label>
          <span className="text-[11px] text-slate-400 font-medium">Toggle required interlocks</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* 1. 25kV Catenary Power Trip */}
          <div
            onClick={() => onChange({ powerTrip: !formData.powerTrip })}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start justify-between relative ${
              formData.powerTrip
                ? 'bg-amber-50/60 border-amber-300 ring-1 ring-amber-400/30'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  formData.powerTrip
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-400'
                }`}
              >
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900">25kV Catenary Power Trip</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveTooltip(activeTooltip === 'power' ? null : 'power');
                    }}
                    className="text-slate-400 hover:text-slate-600"
                    title="Learn more"
                  >
                    <Info className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-[11.5px] text-slate-600 mt-0.5 leading-snug">
                  De-energize overhead 25kV contact wire & isolate Feeding Posts (FP-04 to FP-06) via TPC remote SCADA trip.
                </p>
                {activeTooltip === 'power' && (
                  <div className="mt-2 p-2 bg-slate-900 text-white rounded text-[10.5px] leading-tight">
                    Mandatory for ladder trolley work, contact wire renewal, and field earthing rod placement under ACTM Vol. II.
                  </div>
                )}
              </div>
            </div>

            {/* Toggle Switch */}
            <div className="shrink-0 pt-0.5 ml-2">
              <div
                className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors ${
                  formData.powerTrip ? 'bg-amber-500' : 'bg-slate-200'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    formData.powerTrip ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* 2. Absolute Traffic Block */}
          <div
            onClick={() => onChange({ trafficBlock: !formData.trafficBlock })}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start justify-between relative ${
              formData.trafficBlock
                ? 'bg-rose-50/60 border-rose-300 ring-1 ring-rose-400/30'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  formData.trafficBlock
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-400'
                }`}
              >
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900">Absolute Traffic Block</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveTooltip(activeTooltip === 'traffic' ? null : 'traffic');
                    }}
                    className="text-slate-400 hover:text-slate-600"
                    title="Learn more"
                  >
                    <Info className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-[11.5px] text-slate-600 mt-0.5 leading-snug">
                  Total track possession. Stop all passenger & freight train movements on {formData.trackId}.
                </p>
                {activeTooltip === 'traffic' && (
                  <div className="mt-2 p-2 bg-slate-900 text-white rounded text-[10.5px] leading-tight">
                    Signals placed to danger, route locked against entrance, lever collars placed by Station Master.
                  </div>
                )}
              </div>
            </div>

            {/* Toggle Switch */}
            <div className="shrink-0 pt-0.5 ml-2">
              <div
                className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors ${
                  formData.trafficBlock ? 'bg-rose-600' : 'bg-slate-200'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    formData.trafficBlock ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* 3. Adjacent Track TSR 30 km/h */}
          <div
            onClick={() => onChange({ speedRestriction: !formData.speedRestriction })}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start justify-between relative ${
              formData.speedRestriction
                ? 'bg-blue-50/70 border-blue-300 ring-1 ring-blue-400/30'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  formData.speedRestriction
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-400'
                }`}
              >
                <Gauge className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900">Adjacent Track TSR 30 km/h</span>
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded">
                    TSR 30
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveTooltip(activeTooltip === 'tsr' ? null : 'tsr');
                    }}
                    className="text-slate-400 hover:text-slate-600"
                    title="Learn more"
                  >
                    <Info className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-[11.5px] text-slate-600 mt-0.5 leading-snug">
                  Impose 30 km/h caution order on parallel running lines for on-site personnel safety.
                </p>
                {activeTooltip === 'tsr' && (
                  <div className="mt-2 p-2 bg-slate-900 text-white rounded text-[10.5px] leading-tight">
                    Issued under G&SR 15.08. Approaching trains receive caution orders via Section Controller COA broadcast.
                  </div>
                )}
              </div>
            </div>

            {/* Toggle Switch */}
            <div className="shrink-0 pt-0.5 ml-2">
              <div
                className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors ${
                  formData.speedRestriction ? 'bg-blue-600' : 'bg-slate-200'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    formData.speedRestriction ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* 4. Physical Point Clamping */}
          <div
            onClick={() => onChange({ pointClamping: !formData.pointClamping })}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start justify-between relative ${
              formData.pointClamping
                ? 'bg-slate-100 border-slate-300 ring-1 ring-slate-400/30'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  formData.pointClamping
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-400'
                }`}
              >
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900">Physical Point Clamping</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveTooltip(activeTooltip === 'clamp' ? null : 'clamp');
                    }}
                    className="text-slate-400 hover:text-slate-600"
                    title="Learn more"
                  >
                    <Info className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-[11.5px] text-slate-600 mt-0.5 leading-snug">
                  Station Master physically padlocks crossover points (#14A/B) against the possession line.
                </p>
                {activeTooltip === 'clamp' && (
                  <div className="mt-2 p-2 bg-slate-900 text-white rounded text-[10.5px] leading-tight">
                    Requires Station Master to affix mechanical clamp & lock with master key retained at the station desk.
                  </div>
                )}
              </div>
            </div>

            {/* Toggle Switch */}
            <div className="shrink-0 pt-0.5 ml-2">
              <div
                className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors ${
                  formData.pointClamping ? 'bg-slate-800' : 'bg-slate-200'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    formData.pointClamping ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

