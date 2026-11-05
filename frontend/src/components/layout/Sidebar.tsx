import React from 'react';
import {
  LayoutDashboard,
  FlaskConical,
  Gauge,
  Activity,
  Bot,
  BookOpen,
  Settings as SettingsIcon,
  Sparkles,
} from 'lucide-react';

export type SectionType =
  | 'dashboard'
  | 'bench'
  | 'chamber'
  | 'results'
  | 'ai-assistant'
  | 'evidence'
  | 'settings';

interface SidebarProps {
  activeSection: SectionType;
  onSelectSection: (section: SectionType) => void;
  selectedComponentCount: number;
  hasResults: boolean;
  aiConfigured: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeSection,
  onSelectSection,
  selectedComponentCount,
  hasResults,
  aiConfigured,
}) => {
  const items: Array<{
    id: SectionType;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string | number;
    badgeColor?: string;
  }> = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    {
      id: 'bench',
      label: 'Lab Bench',
      icon: FlaskConical,
      badge: selectedComponentCount,
      badgeColor: 'bg-emerald-900/60 text-emerald-300 border-emerald-700/60',
    },
    { id: 'chamber', label: 'Environment Chamber', icon: Gauge },
    {
      id: 'results',
      label: 'Experiment Results',
      icon: Activity,
      badge: hasResults ? 'Ready' : undefined,
      badgeColor: 'bg-blue-900/60 text-blue-300 border-blue-700/60',
    },
    {
      id: 'ai-assistant',
      label: 'AI Scientific Assistant',
      icon: Bot,
      badge: aiConfigured ? 'Active' : 'BYOK',
      badgeColor: aiConfigured
        ? 'bg-purple-900/60 text-purple-300 border-purple-700/60'
        : 'bg-slate-800 text-slate-400 border-slate-700',
    },
    { id: 'evidence', label: 'Evidence Library', icon: BookOpen },
    { id: 'settings', label: 'AI Settings (BYOK)', icon: SettingsIcon },
  ];

  return (
    <aside className="w-64 border-r border-slate-800 bg-[#0a0e17] flex flex-col justify-between p-3 select-none shrink-0 min-h-[calc(100vh-3.5rem)]">
      <div className="space-y-1">
        <div className="px-3 py-2 text-[10px] font-mono uppercase tracking-wider text-slate-500 font-semibold">
          Workstation Navigation
        </div>
        {items.map(item => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectSection(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-md text-xs font-medium transition-colors text-left cursor-pointer ${
                isActive
                  ? 'bg-slate-800 text-slate-100 font-semibold border-l-2 border-emerald-500 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/80'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon
                  className={`w-4 h-4 ${
                    isActive ? 'text-emerald-400' : 'text-slate-500 group-hover:text-slate-300'
                  }`}
                />
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && (
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono border ${
                    item.badgeColor || 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Protocol & Climate Footprint Note */}
      <div className="p-3 bg-slate-950 rounded border border-slate-800/80 text-[11px] text-slate-400 space-y-1.5">
        <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          <span>Circular Climate Goal</span>
        </div>
        <p className="text-[10px] text-slate-400 leading-relaxed">
          PolyPhage AI investigates biological enzymatic routes to depolymerize synthetic plastics at low energetic footprints, diverting solid waste from incineration.
        </p>
      </div>
    </aside>
  );
};
