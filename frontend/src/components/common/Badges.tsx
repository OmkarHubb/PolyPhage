import React from 'react';
import { ViabilityStatus, EvidenceLevel } from '../../types';

export const ViabilityBadge: React.FC<{ status: ViabilityStatus | string }> = ({ status }) => {
  switch (status) {
    case 'optimal':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-950/80 text-emerald-300 border border-emerald-700/60">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          Optimal Viability
        </span>
      );
    case 'suboptimal':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-950/80 text-amber-300 border border-amber-700/60">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
          Suboptimal Rate
        </span>
      );
    case 'denatured_or_lethal':
    case 'inactivated':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-950/80 text-red-300 border border-red-700/60">
          <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
          Denatured / Inactivated
        </span>
      );
    case 'inhibitory':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-950/80 text-orange-300 border border-orange-700/60">
          <span className="w-1.5 h-1.5 rounded-full bg-orange-400"></span>
          Feedback Inhibited
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
          {status}
        </span>
      );
  }
};

export const EvidenceBadge: React.FC<{ level: EvidenceLevel | string }> = ({ level }) => {
  switch (level) {
    case 'experimental':
      return (
        <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-cyan-950/60 text-cyan-300 border border-cyan-800/60">
          EXP: Peer-Reviewed Experimental
        </span>
      );
    case 'literature_supported':
      return (
        <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-blue-950/60 text-blue-300 border border-blue-800/60">
          LIT: Literature-Supported
        </span>
      );
    case 'computational':
      return (
        <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-indigo-950/60 text-indigo-300 border border-indigo-800/60">
          COMP: Machine Learning / Model
        </span>
      );
    default:
      return (
        <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-slate-800 text-slate-400 border border-slate-700">
          INSUFF: Insufficient Data
        </span>
      );
  }
};
