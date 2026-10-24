import React from 'react';
import {
  MapPin,
  Compass,
  ArrowRight,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Building2,
  Navigation
} from 'lucide-react';
import {
  WorkRequestFormData,
  DIVISION_OPTIONS,
  CORRIDOR_SECTION_METADATA,
  TRACK_OPTIONS
} from './types';

interface StepLocationProps {
  formData: WorkRequestFormData;
  onChange: (fields: Partial<WorkRequestFormData>) => void;
  errors: Record<string, string>;
}

export const StepLocation: React.FC<StepLocationProps> = ({
  formData,
  onChange,
  errors,
}) => {
  const selectedSection = CORRIDOR_SECTION_METADATA.find(
    (s) => s.id === formData.sectionId
  ) || CORRIDOR_SECTION_METADATA[0];

  const handleDivisionChange = (division: string) => {
    // Optionally switch default section to match division if applicable
    const matchingSection = CORRIDOR_SECTION_METADATA.find(s => s.division === division);
    if (matchingSection) {
      onChange({
        division,
        sectionId: matchingSection.id,
        sectionLabel: matchingSection.shortName,
        kmStart: matchingSection.defaultKmStart,
        kmEnd: matchingSection.defaultKmEnd,
      });
    } else {
      onChange({ division });
    }
  };

  const handleSectionChange = (secId: string) => {
    const meta = CORRIDOR_SECTION_METADATA.find((s) => s.id === secId);
    if (meta) {
      onChange({
        sectionId: meta.id,
        sectionLabel: meta.shortName,
        kmStart: meta.defaultKmStart,
        kmEnd: meta.defaultKmEnd,
        division: meta.division,
      });
    }
  };

  const startVal = parseFloat(formData.kmStart);
  const endVal = parseFloat(formData.kmEnd);
  const isValidRange = !isNaN(startVal) && !isNaN(endVal) && endVal > startVal;
  const totalSpan = isValidRange ? (endVal - startVal).toFixed(2) : '0.00';

  return (
    <div className="space-y-6">
      {/* Step Header */}
      <div>
        <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <MapPin className="w-5 h-5 text-blue-600" />
          Where will the work take place?
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          Select the division, corridor section, physical track, and kilometre range.
        </p>
      </div>

      {/* Grid: Division & Corridor Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Railway Division */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-blue-600" />
            Railway Division <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.division}
            onChange={(e) => handleDivisionChange(e.target.value)}
            className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all cursor-pointer shadow-sm"
          >
            {DIVISION_OPTIONS.map((div) => (
              <option key={div} value={div}>
                {div}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-slate-400 mt-1">
            Zonal Railway controlling signal & traction authorities
          </p>
        </div>

        {/* Corridor Section & Junctions */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Navigation className="w-3.5 h-3.5 text-blue-600" />
            Corridor Section & Junctions <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.sectionId}
            onChange={(e) => handleSectionChange(e.target.value)}
            className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all cursor-pointer shadow-sm"
          >
            {CORRIDOR_SECTION_METADATA.map((sec) => (
              <option key={sec.id} value={sec.id}>
                {sec.label} — ({sec.availableSlots} available, {sec.kmRange}, {sec.loadPercent}% load)
              </option>
            ))}
          </select>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1 px-0.5">
            <span className="font-mono text-blue-700 font-medium truncate max-w-[240px]">
              {selectedSection.junctions}
            </span>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 text-blue-700 font-bold rounded text-[10px] border border-blue-200">
              {selectedSection.availableSlots} slots free
            </span>
          </div>
        </div>
      </div>

      {/* Target Track Selection Tiles */}
      <div>
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-blue-600" />
            Target Physical Track <span className="text-red-500">*</span>
          </span>
          <span className="text-[11px] text-slate-400 font-normal">
            Choose directional trunk line or auxiliary loop
          </span>
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {TRACK_OPTIONS.map((track) => {
            const isSelected = formData.trackId === track.id;
            return (
              <button
                key={track.id}
                type="button"
                onClick={() => onChange({ trackId: track.id })}
                className={`text-left p-3.5 rounded-xl border transition-all cursor-pointer relative flex flex-col justify-between ${
                  isSelected
                    ? 'bg-blue-50/80 border-blue-600 shadow-sm ring-1 ring-blue-500/30'
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/70'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className={`font-mono text-xs font-extrabold tracking-wide ${
                        isSelected ? 'text-blue-700' : 'text-slate-800'
                      }`}
                    >
                      {track.label}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        isSelected
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {track.badge}
                    </span>
                  </div>
                  <div className="text-[11.5px] font-semibold text-slate-700 leading-snug">
                    {track.direction}
                  </div>
                </div>
                <div className="text-[10px] text-slate-400 mt-2 font-mono">
                  {track.sublabel}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* KM Chainage Range Inputs & Total Span Display */}
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
            Kilometre Chainage Range (Span) <span className="text-red-500">*</span>
          </label>

          {/* Live Total Span Chip */}
          <div
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold transition-all self-start sm:self-auto ${
              isValidRange
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-sm'
                : 'bg-amber-50 text-amber-800 border border-amber-300'
            }`}
          >
            {isValidRange ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Total Span: {totalSpan} KM</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                <span>Invalid Range</span>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Start KM */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Start Chainage (KM Post)
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                placeholder="e.g. 142.10"
                value={formData.kmStart}
                onChange={(e) => onChange({ kmStart: e.target.value })}
                className={`w-full bg-white border rounded-lg px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 transition-all ${
                  errors.kmStart
                    ? 'border-red-400 focus:ring-red-400'
                    : 'border-slate-300 focus:ring-blue-500 focus:border-blue-500'
                }`}
              />
              <span className="absolute right-3 top-2 text-[11px] text-slate-400 font-mono pointer-events-none">
                KM
              </span>
            </div>
            {errors.kmStart && (
              <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3 shrink-0" />
                {errors.kmStart}
              </p>
            )}
          </div>

          {/* End KM */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              End Chainage (KM Post)
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                placeholder="e.g. 143.04"
                value={formData.kmEnd}
                onChange={(e) => onChange({ kmEnd: e.target.value })}
                className={`w-full bg-white border rounded-lg px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 transition-all ${
                  errors.kmEnd
                    ? 'border-red-400 focus:ring-red-400'
                    : 'border-slate-300 focus:ring-blue-500 focus:border-blue-500'
                }`}
              />
              <span className="absolute right-3 top-2 text-[11px] text-slate-400 font-mono pointer-events-none">
                KM
              </span>
            </div>
            {errors.kmEnd && (
              <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3 shrink-0" />
                {errors.kmEnd}
              </p>
            )}
          </div>
        </div>

        <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1">
          <span>Corridor Boundary Reference: {selectedSection.kmRange}</span>
          <span className="text-slate-400 font-mono text-[10px]">G&SR 15.02 Geometric Chainage</span>
        </div>
      </div>
    </div>
  );
};

