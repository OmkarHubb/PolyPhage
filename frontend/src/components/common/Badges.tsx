import React from 'react';
import { ViabilityStatus, EvidenceLevel } from '../../types';

export const ViabilityBadge: React.FC<{ status: ViabilityStatus | string }> = ({ status }) => {
  switch (status) {
    case 'optimal':
    case 'viable':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#E8F6F1] text-[#2D8A6E] border border-[#C6E8DC]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#3EAA88]"></span>
          Optimal Viability
        </span>
      );
    case 'suboptimal':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#FEF6EB] text-[#B47820] border border-[#F6E1C4]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#DCA23F]"></span>
          Suboptimal Rate
        </span>
      );
    case 'denatured_or_lethal':
    case 'inactivated':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#FCEEEE] text-[#C44141] border border-[#F8C8C8]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#D84E4E]"></span>
          Denatured / Inactivated
        </span>
      );
    case 'inhibitory':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#FEF3EC] text-[#C8642A] border border-[#F8D2BD]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#E27638]"></span>
          Feedback Inhibited
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#F2F2F4] text-[#777780] border border-[#E7E7EB]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#A0A0A8]"></span>
          {status}
        </span>
      );
  }
};

export const EvidenceBadge: React.FC<{ level: EvidenceLevel | string }> = ({ level }) => {
  switch (level) {
    case 'experimental':
      return (
        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-[#EAE5FA] text-[#7461CE] border border-[#D5CBF7]">
          EXP: Peer-Reviewed Experimental
        </span>
      );
    case 'literature_supported':
      return (
        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-[#EBF3FC] text-[#3377B8] border border-[#CBE0F8]">
          LIT: Literature-Supported
        </span>
      );
    case 'computational':
      return (
        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-[#F3EAFD] text-[#7F44C8] border border-[#E1CFF8]">
          COMP: Machine Learning Model
        </span>
      );
    default:
      return (
        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-[#F2F2F4] text-[#777780] border border-[#E7E7EB]">
          INSUFF: Insufficient Data
        </span>
      );
  }
};
