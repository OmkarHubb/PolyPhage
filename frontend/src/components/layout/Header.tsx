import React from 'react';
import { Play, Sparkles, KeyRound, FlaskConical } from 'lucide-react';
import { AISettings } from '../../types';

interface HeaderProps {
  experimentName: string;
  isAssessing: boolean;
  onRunAssessment: () => void;
  aiSettings: AISettings | null;
  onNavigateToSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  experimentName,
  isAssessing,
  onRunAssessment,
  aiSettings,
  onNavigateToSettings,
}) => {
  return (
    <header className="h-16 border-b border-[#E7E7EB] bg-white px-6 flex items-center justify-between sticky top-0 z-30 select-none">
      {/* Current Experiment Identifier */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-[#EAE5FA] flex items-center justify-center text-[#9785E8]">
          <FlaskConical className="w-4 h-4" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#777780] font-medium">Active Experiment:</span>
            <span className="font-semibold text-sm text-[#24242B] truncate max-w-md">
              {experimentName}
            </span>
          </div>
          <p className="text-[11px] text-[#777780]">
            Deterministic Assessment & Reaction Modeling
          </p>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* AI BYOK Status Badge */}
        <button
          onClick={onNavigateToSettings}
          title="Configure AI Provider (BYOK)"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
            aiSettings?.is_active
              ? 'bg-[#EAE5FA] text-[#7461CE] border-[#D5CBF7] hover:bg-[#E2DBF8]'
              : 'bg-[#F7F7F8] text-[#777780] border-[#E7E7EB] hover:bg-[#EFEFF1] hover:text-[#24242B]'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-[#9785E8]" />
          <span>{aiSettings?.is_active ? `AI: ${aiSettings.provider} (${aiSettings.model})` : 'AI: Idle (BYOK)'}</span>
          <KeyRound className="w-3 h-3 text-[#A0A0A8] ml-0.5" />
        </button>

        {/* Run Assessment Action */}
        <button
          onClick={onRunAssessment}
          disabled={isAssessing}
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-xs bg-[#9785E8] hover:bg-[#8673DC] text-white shadow-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>{isAssessing ? 'Running Assessment...' : 'Run Scientific Assessment'}</span>
        </button>
      </div>
    </header>
  );
};
