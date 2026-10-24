import React from 'react';
import {
  Clock,
  ShieldCheck,
  CheckCircle2,
  FileCheck2,
  Zap,
  Navigation,
  Lock,
  Radio,
  FileSignature
} from 'lucide-react';
import { Department } from '../../types';

interface StagePlanProps {
  department: Department;
  supervisorName: string;
}

export const StagePlan: React.FC<StagePlanProps> = ({
  department,
  supervisorName,
}) => {
  const stages = [
    {
      num: '01',
      title: 'Requisition Draft',
      actor: supervisorName || 'Site Supervisor',
      role: 'Originating Authority',
      status: 'READY',
      icon: FileCheck2,
      desc: 'Formulation of possession scope & GPS boundary definition',
    },
    {
      num: '02',
      title: 'Power Block (ETR-1)',
      actor: 'TPC Desk (DDU / ECR Grid)',
      role: 'Traction Power Controller',
      status: 'STATUTORY',
      icon: Zap,
      desc: 'SCADA 25kV de-energization & feeding post isolation',
    },
    {
      num: '03',
      title: 'Traffic Feasibility',
      actor: 'Danapur Section Controller',
      role: 'Operating Desk',
      status: 'STATUTORY',
      icon: Navigation,
      desc: 'Freight/coaching path pacing & caution order issuance',
    },
    {
      num: '04',
      title: 'Point Clamping',
      actor: 'Station Master',
      role: 'Local Interlocking Control',
      status: 'STATUTORY',
      icon: Lock,
      desc: 'Padlocking crossover points #14A/B in reverse route',
    },
    {
      num: '05',
      title: 'S&T Notice',
      actor: 'Signal Maintainer (ESM)',
      role: 'Signal & Telecom Authority',
      status: 'STATUTORY',
      icon: Radio,
      desc: 'Axle counter clamp & track circuit disconnection notice',
    },
    {
      num: '06',
      title: 'Permit Form3-PTW',
      actor: 'Field Earthing Gang',
      role: 'On-Site Custody',
      status: 'STATUTORY',
      icon: ShieldCheck,
      desc: 'Discharge earthing rods affixed, digital permit active',
    },
    {
      num: '07',
      title: 'Clearance & S3 Seal',
      actor: 'SM + Field Supervisor',
      role: 'Dual Cryptographic Key',
      status: 'FINAL SEAL',
      icon: FileSignature,
      desc: 'Fit-for-traffic certification & SHA-256 audit ledger seal',
    },
  ];

  return (
    <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-white space-y-3 shadow-sm">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-blue-400 shrink-0" />
          <div>
            <h4 className="text-xs font-bold text-slate-200 font-mono tracking-wide uppercase">
              Mandatory 7-Stage Work Plan & Statutory Quorum
            </h4>
            <p className="text-[10.5px] text-slate-400">
              Indian Railways Operating Manual (ACTM Vol. II & G&SR Section 15.04)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-[10px] font-mono font-bold bg-blue-950 text-blue-300 border border-blue-600/40 px-2 py-0.5 rounded">
            QUORUM: 4 STATUTORY KEYS
          </span>
        </div>
      </div>

      {/* 7-Stage Timeline Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1">
        {stages.map((st, idx) => {
          const Icon = st.icon;
          const isCurrent = idx === 0;
          return (
            <div
              key={st.num}
              className={`p-2.5 rounded-lg border transition-all ${
                isCurrent
                  ? 'bg-blue-950/60 border-blue-500/50 shadow-sm'
                  : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-[10.5px] font-extrabold text-blue-400">
                  STAGE {st.num}
                </span>
                <span
                  className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded ${
                    isCurrent
                      ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-500/40'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {st.status}
                </span>
              </div>
              <div className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                <Icon className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span className="truncate">{st.title}</span>
              </div>
              <div className="text-[10.5px] text-slate-300 font-medium mt-1 truncate">
                {st.actor}
              </div>
              <div className="text-[9.5px] text-slate-400 font-mono truncate">
                {st.role}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

