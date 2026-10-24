import React from 'react';
import {
  Users,
  UserCheck,
  Briefcase,
  FileText,
  Phone,
  AlertCircle,
  HardHat,
  ShieldCheck
} from 'lucide-react';
import { WorkRequestFormData } from './types';
import { Department } from '../../types';

interface StepTeamWorkProps {
  formData: WorkRequestFormData;
  onChange: (fields: Partial<WorkRequestFormData>) => void;
  errors: Record<string, string>;
}

const DEPARTMENTS: Array<{ id: Department; label: string; code: string; defaultDesc: string }> = [
  {
    id: 'OHE',
    label: 'OHE / Electrical Traction (TRD)',
    code: 'OHE',
    defaultDesc: 'OHE Catenary Inspection, Contact Wire dropper adjustment and cantilever renewal as per ACTM Vol II Sec 20615.',
  },
  {
    id: 'CIVIL_P_WAY',
    label: 'Civil Engineering (P-Way / Track)',
    code: 'PWAY',
    defaultDesc: 'Deep screening and mechanical tamping with CSM-952 machine per IRPWM Para 224.',
  },
  {
    id: 'S_AND_T',
    label: 'Signalling & Telecommunications (S&T)',
    code: 'SIG',
    defaultDesc: 'Electronic Interlocking point machine testing & dual SSDAC axle counter recalibration.',
  },
  {
    id: 'MECHANICAL_CW',
    label: 'Mechanical (Carriage & Wagon)',
    code: 'CW',
    defaultDesc: 'Brake rigging adjustment and hot axle acoustic bearing inspection on yard examination line.',
  },
  {
    id: 'SAFETY',
    label: 'Operating & Safety Department',
    code: 'SAF',
    defaultDesc: 'Foul-mark verification, detonator placement audit, and level crossing gate interlocking check.',
  },
];

export const StepTeamWork: React.FC<StepTeamWorkProps> = ({
  formData,
  onChange,
  errors,
}) => {
  const handleDepartmentChange = (dept: Department) => {
    const found = DEPARTMENTS.find((d) => d.id === dept);
    onChange({
      department: dept,
      // If description was empty or matching standard default, update to standard default of new dept
      description: formData.description.length <= 15 ? (found?.defaultDesc || '') : formData.description,
    });
  };

  const charCount = formData.description.length;
  const maxChars = 500;

  return (
    <div className="space-y-6">
      {/* Step Header */}
      <div>
        <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <HardHat className="w-5 h-5 text-blue-600" />
          Who leads the work and what is the scope?
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          Assign department leadership, site supervisor credentials, and work specifications.
        </p>
      </div>

      {/* Primary Department */}
      <div>
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
          <Briefcase className="w-3.5 h-3.5 text-blue-600" />
          Primary Department <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
          {DEPARTMENTS.map((dept) => {
            const isSelected = formData.department === dept.id;
            return (
              <button
                key={dept.id}
                type="button"
                onClick={() => handleDepartmentChange(dept.id)}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-blue-50/80 border-blue-600 shadow-sm ring-1 ring-blue-500/30'
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`font-mono text-[10px] font-extrabold px-1.5 py-0.5 rounded ${
                      isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {dept.code}
                  </span>
                  {isSelected && <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />}
                </div>
                <div
                  className={`text-xs font-bold ${
                    isSelected ? 'text-blue-900' : 'text-slate-800'
                  }`}
                >
                  {dept.label}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Supervisor Credentials */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Supervisor Name */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <UserCheck className="w-3.5 h-3.5 text-blue-600" />
            Supervisor in Charge (Site Leader) <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            placeholder="e.g. Vikramaditya Rao"
            value={formData.supervisorName}
            onChange={(e) => onChange({ supervisorName: e.target.value })}
            className={`w-full bg-white border rounded-xl px-3.5 py-2.5 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 transition-all shadow-sm ${
              errors.supervisorName
                ? 'border-red-400 focus:ring-red-400'
                : 'border-slate-300 focus:ring-blue-500 focus:border-blue-500'
            }`}
          />
          {errors.supervisorName ? (
            <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3 shrink-0" />
              {errors.supervisorName}
            </p>
          ) : (
            <p className="text-[11px] text-slate-400 mt-1">Authorized under Indian Railways G&SR Rule 15.04</p>
          )}
        </div>

        {/* Supervisor Designation */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Briefcase className="w-3.5 h-3.5 text-blue-600" />
            Official Designation <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            placeholder="e.g. Senior Section Engineer (SSE / TRD / Danapur)"
            value={formData.supervisorDesignation}
            onChange={(e) => onChange({ supervisorDesignation: e.target.value })}
            className={`w-full bg-white border rounded-xl px-3.5 py-2.5 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 transition-all shadow-sm ${
              errors.supervisorDesignation
                ? 'border-red-400 focus:ring-red-400'
                : 'border-slate-300 focus:ring-blue-500 focus:border-blue-500'
            }`}
          />
          {errors.supervisorDesignation && (
            <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3 shrink-0" />
              {errors.supervisorDesignation}
            </p>
          )}
        </div>
      </div>

      {/* Plain Description of Work */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-blue-600" />
            Plain Description of Work / SOP Justification <span className="text-red-500">*</span>
          </label>
          <span
            className={`text-[11px] font-mono ${
              charCount > maxChars ? 'text-red-600 font-bold' : 'text-slate-400'
            }`}
          >
            {charCount} / {maxChars}
          </span>
        </div>
        <textarea
          rows={3}
          maxLength={maxChars}
          placeholder="Describe the physical maintenance, track inspection, machine tamping or component renewal to be executed..."
          value={formData.description}
          onChange={(e) => onChange({ description: e.target.value })}
          className={`w-full bg-white border rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:ring-2 transition-all shadow-sm leading-relaxed ${
            errors.description
              ? 'border-red-400 focus:ring-red-400'
              : 'border-slate-300 focus:ring-blue-500 focus:border-blue-500'
          }`}
        />
        {errors.description && (
          <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1">
            <AlertCircle className="w-3 h-3 shrink-0" />
            {errors.description}
          </p>
        )}
      </div>

      {/* Optional: Team Size & Contact Number */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
        {/* Gang Size */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-blue-600" />
            Gang Strength (Team Size) <span className="text-slate-400 font-normal">(Optional)</span>
          </label>
          <input
            type="number"
            min="1"
            max="100"
            placeholder="e.g. 8 personnel"
            value={formData.teamSize}
            onChange={(e) => onChange({ teamSize: e.target.value })}
            className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
          />
          <p className="text-[10.5px] text-slate-400 mt-1">Number of rostered gang technicians on site</p>
        </div>

        {/* Emergency Contact */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5 text-blue-600" />
            Emergency On-Site Contact <span className="text-slate-400 font-normal">(Optional)</span>
          </label>
          <input
            type="text"
            placeholder="e.g. +91 94318 02441 / CUG 4410"
            value={formData.contactNumber}
            onChange={(e) => onChange({ contactNumber: e.target.value })}
            className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
          />
          <p className="text-[10.5px] text-slate-400 mt-1">24/7 radio frequency or mobile CUG line</p>
        </div>
      </div>
    </div>
  );
};

