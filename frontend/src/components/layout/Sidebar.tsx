import React from 'react';
import {
  LayoutDashboard,
  FlaskConical,
  Gauge,
  Activity,
  BookOpen,
  Bot,
  Settings as SettingsIcon,
  Sparkles,
  Dna,
} from 'lucide-react';

export type SectionType =
  | 'dashboard'
  | 'bench'
  | 'chamber'
  | 'results'
  | 'evidence'
  | 'ai-assistant'
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
  const navItems: Array<{
    id: SectionType;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string | number;
  }> = [
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
    {
      id: 'bench',
      label: 'Lab Bench',
      icon: FlaskConical,
      badge: selectedComponentCount > 0 ? selectedComponentCount : undefined,
    },
    { id: 'chamber', label: 'Environment Chamber', icon: Gauge },
    {
      id: 'results',
      label: 'Experiment Results',
      icon: Activity,
    },
    { id: 'evidence', label: 'Evidence Library', icon: BookOpen },
    {
      id: 'ai-assistant',
      label: 'AI Scientific Assistant',
      icon: Bot,
    },
  ];

  return (
    <aside className="w-64 border-r border-[#E7E7EB] bg-[#F7F7F8] flex flex-col justify-between p-4 select-none shrink-0 h-full">
      {/* Brand Header & Main Nav */}
      <div className="space-y-6">
        {/* Brand */}
        <div className="flex items-center gap-3 px-2 py-1">
          <div className="w-9 h-9 rounded-xl bg-[#EAE5FA] flex items-center justify-center text-[#9785E8]">
            <Dna className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-sm tracking-tight text-[#24242B]">
              PolyPhage AI
            </div>
            <div className="text-[11px] text-[#777780] font-medium">
              Biotech Workstation
            </div>
          </div>
        </div>

        {/* Navigation List */}
        <nav className="space-y-1">
          <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#A0A0A8]">
            Laboratory Navigation
          </div>
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectSection(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-colors text-left cursor-pointer ${
                  isActive
                    ? 'bg-[#EAE5FA] text-[#7461CE] font-semibold'
                    : 'text-[#777780] hover:text-[#24242B] hover:bg-[#EFEFF1]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 ${
                      isActive ? 'text-[#9785E8]' : 'text-[#777780]'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                      isActive
                        ? 'bg-white text-[#9785E8]'
                        : 'bg-[#E7E7EB] text-[#777780]'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Area: Settings */}
      <div className="pt-3 border-t border-[#E7E7EB]">
        {/* Settings Tab Button */}
        <button
          onClick={() => onSelectSection('settings')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-colors text-left cursor-pointer ${
            activeSection === 'settings'
              ? 'bg-[#EAE5FA] text-[#7461CE] font-semibold'
              : 'text-[#777780] hover:text-[#24242B] hover:bg-[#EFEFF1]'
          }`}
        >
          <SettingsIcon
            className={`w-4 h-4 ${
              activeSection === 'settings' ? 'text-[#9785E8]' : 'text-[#777780]'
            }`}
          />
          <span>AI Settings (BYOK)</span>
        </button>
      </div>
    </aside>
  );
};
