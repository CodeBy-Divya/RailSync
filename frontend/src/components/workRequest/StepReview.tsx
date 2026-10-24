import React from 'react';
import {
  FileCheck2,
  MapPin,
  Clock,
  HardHat,
  Shield,
  Zap,
  Gauge,
  Lock,
  Edit2,
  KeyRound,
  CheckCircle2,
  Building2,
  Navigation
} from 'lucide-react';
import { WorkRequestFormData } from './types';
import { StagePlan } from './StagePlan';

interface StepReviewProps {
  formData: WorkRequestFormData;
  onGoToStep: (step: number) => void;
}

export const StepReview: React.FC<StepReviewProps> = ({
  formData,
  onGoToStep,
}) => {
  const startKm = parseFloat(formData.kmStart);
  const endKm = parseFloat(formData.kmEnd);
  const totalSpan = (!isNaN(startKm) && !isNaN(endKm) && endKm > startKm)
    ? (endKm - startKm).toFixed(2)
    : '0.94';

  return (
    <div className="space-y-5">
      {/* Step Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200 pb-3">
        <div>
          <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FileCheck2 className="w-5 h-5 text-blue-600" />
            Review Work Request & Statutory Sign-off Matrix
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Confirm operational parameters before generating immutable event token.
          </p>
        </div>

        {/* Ready to Submit Status Chip */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-full text-xs font-bold self-start sm:self-auto shadow-sm">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>Ready to Submit</span>
        </div>
      </div>

      {/* Summary Cards: 2 Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Division & Location */}
        <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3 shadow-sm relative">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-blue-600" />
              Division & Location
            </span>
            <button
              type="button"
              onClick={() => onGoToStep(1)}
              className="text-[11px] font-bold text-blue-600 hover:text-blue-800 inline-flex items-center gap-1 cursor-pointer"
            >
              <Edit2 className="w-3 h-3" />
              <span>Edit Step 1</span>
            </button>
          </div>

          <div className="space-y-2 text-xs">
            <div>
              <span className="text-[11px] text-slate-400 block font-medium">Railway Division</span>
              <span className="font-semibold text-slate-800">{formData.division}</span>
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block font-medium">Corridor Section</span>
              <span className="font-bold text-blue-700">{formData.sectionLabel}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
              <div>
                <span className="text-[11px] text-slate-400 block font-medium">Target Track</span>
                <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-[11px] inline-block mt-0.5">
                  {formData.trackId}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block font-medium">KM Chainage Span</span>
                <span className="font-mono font-semibold text-slate-800 block mt-0.5">
                  KM {formData.kmStart} – {formData.kmEnd} ({totalSpan} KM)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Timing & Supervisor */}
        <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3 shadow-sm relative">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-blue-600" />
              Timing & Supervisor
            </span>
            <button
              type="button"
              onClick={() => onGoToStep(2)}
              className="text-[11px] font-bold text-blue-600 hover:text-blue-800 inline-flex items-center gap-1 cursor-pointer"
            >
              <Edit2 className="w-3 h-3" />
              <span>Edit Step 2 / 3</span>
            </button>
          </div>

          <div className="space-y-2 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[11px] text-slate-400 block font-medium">Possession Date</span>
                <span className="font-mono font-semibold text-slate-800">{formData.workDate}</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block font-medium">Window (IST)</span>
                <span className="font-mono font-bold text-blue-700">
                  {formData.startTime} – {formData.endTime}
                </span>
              </div>
            </div>
            <div className="pt-1 border-t border-slate-100">
              <span className="text-[11px] text-slate-400 block font-medium">Site Supervisor & Dept</span>
              <span className="font-bold text-slate-900">{formData.supervisorName}</span>
              <span className="text-[11px] text-slate-500 block">
                {formData.supervisorDesignation} • <strong className="font-mono text-blue-700">{formData.department}</strong>
              </span>
            </div>
            {(formData.teamSize || formData.contactNumber) && (
              <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px] text-slate-500 font-mono">
                <span>Gang: {formData.teamSize || '8'} personnel</span>
                <span>CUG: {formData.contactNumber || 'VHF Ch 4'}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Description of Work */}
      <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
          Work Specification & SOP Directive:
        </span>
        <p className="text-xs text-slate-800 leading-relaxed font-sans italic">
          "{formData.description}"
        </p>
      </div>

      {/* Safety Impacts Requested Pills */}
      <div className="space-y-2">
        <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
          Safety Interlocks Requested:
        </span>
        <div className="flex flex-wrap gap-2">
          {formData.powerTrip && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-900 border border-amber-300 rounded-lg text-xs font-semibold">
              <Zap className="w-3.5 h-3.5 text-amber-600" />
              <span>25kV Catenary Power Trip (FP-04 to FP-06)</span>
            </div>
          )}
          {formData.trafficBlock && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-900 border border-rose-300 rounded-lg text-xs font-semibold">
              <Shield className="w-3.5 h-3.5 text-rose-600" />
              <span>Absolute Traffic Block ({formData.trackId})</span>
            </div>
          )}
          {formData.speedRestriction && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-900 border border-blue-300 rounded-lg text-xs font-semibold">
              <Gauge className="w-3.5 h-3.5 text-blue-600" />
              <span>Adjacent Track TSR 30 km/h</span>
            </div>
          )}
          {formData.pointClamping && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-800 border border-slate-300 rounded-lg text-xs font-semibold">
              <Lock className="w-3.5 h-3.5 text-slate-700" />
              <span>Physical Point Clamping (#14A/B Padlocked)</span>
            </div>
          )}
          {!formData.powerTrip && !formData.trafficBlock && !formData.speedRestriction && !formData.pointClamping && (
            <span className="text-xs text-slate-400 italic">No special safety interlocks requested.</span>
          )}
        </div>
      </div>

      {/* 7-Stage Work Plan & Statutory Quorum */}
      <StagePlan
        department={formData.department}
        supervisorName={formData.supervisorName}
      />

      {/* Idempotency Key & Protection Banner */}
      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-slate-500 shrink-0" />
          <div>
            <span className="text-slate-500 font-medium">Idempotency Submission Key:</span>
            <span className="ml-2 font-mono font-bold text-slate-800 select-all">
              {formData.idempotencyKey || 'RS-IDEMP-2026-F9B4E128A'}
            </span>
          </div>
        </div>
        <span className="text-[10.5px] font-mono text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 self-start sm:self-auto">
          DUPLICATE CLICK PROTECTED
        </span>
      </div>
    </div>
  );
};

