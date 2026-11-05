import React from 'react';
import { Play, Sparkles, Dna, ShieldAlert, KeyRound } from 'lucide-react';
import { AISettings } from '../../types';

interface HeaderProps {
  experimentName: string;
  isAssessing: boolean;
  onRunAssessment: () => void;
  aiSettings: AISettings | null;
  onNavigateToSettings: () => void;
  activeSection: string;
  onNavigate: (section: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  experimentName,
  isAssessing,
  onRunAssessment,
  aiSettings,
  onNavigateToSettings,
  activeSection,
  onNavigate,
}) => {
  return (
    <header className="h-14 border-b border-slate-800 bg-[#0d121d] px-5 flex items-center justify-between sticky top-0 z-30 select-none">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
          <Dna className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm tracking-wide text-slate-100">PolyPhage AI</span>
            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 font-semibold">
              AI for Climate Change
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-mono truncate max-w-sm">
            Biocatalytic Plastic Degradation Research Station
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Active Experiment Pill */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-slate-900/90 rounded border border-slate-800 text-xs">
          <span className="text-slate-400">Active Workstation:</span>
          <span className="text-slate-200 font-medium truncate max-w-xs">{experimentName}</span>
        </div>

        {/* AI Status Badge with BYOK link */}
        <button
          onClick={onNavigateToSettings}
          title="Click to configure AI Provider (BYOK)"
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs border transition-all ${
            aiSettings?.is_active
              ? 'bg-purple-950/40 text-purple-300 border-purple-800/60 hover:bg-purple-900/40'
              : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-purple-400" />
          <span>{aiSettings?.is_active ? `AI: ${aiSettings.provider} (${aiSettings.model})` : 'AI: Idle (BYOK)'}</span>
          <KeyRound className="w-3 h-3 text-slate-500 ml-0.5" />
        </button>

        {/* Run Assessment Action Button */}
        <button
          onClick={onRunAssessment}
          disabled={isAssessing}
          className="flex items-center gap-2 px-4 py-1.5 rounded-md font-medium text-xs bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>{isAssessing ? 'Assessing Rules...' : 'Run Scientific Assessment'}</span>
        </button>
      </div>
    </header>
  );
};
