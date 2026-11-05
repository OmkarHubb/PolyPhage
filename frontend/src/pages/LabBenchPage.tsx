import React, { useState } from 'react';
import {
  Search,
  Plus,
  Trash2,
  Info,
  Check,
  FlaskConical,
  Layers,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import {
  ComponentItem,
  ComponentCategory,
  ComponentRole,
  SelectedComponent,
  ExperimentConfig,
} from '../types';

interface LabBenchPageProps {
  allComponents: ComponentItem[];
  currentConfig: ExperimentConfig;
  onUpdateConfig: (updated: ExperimentConfig) => void;
  onNavigate: (section: any) => void;
}

const CATEGORIES: Array<ComponentCategory | 'All'> = [
  'All',
  'Plastics',
  'Enzymes',
  'Microorganisms',
  'Chemicals and Cofactors',
];

const ROLES: ComponentRole[] = [
  'substrate',
  'catalyst',
  'host_organism',
  'buffer',
  'cofactor',
];

export const LabBenchPage: React.FC<LabBenchPageProps> = ({
  allComponents,
  currentConfig,
  onUpdateConfig,
  onNavigate,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<ComponentCategory | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeInspectId, setActiveInspectId] = useState<string | null>('comp_pet');

  const filteredComponents = allComponents.filter(c => {
    const matchesCat = selectedCategory === 'All' || c.category === selectedCategory;
    const matchesSearch =
      searchQuery.trim() === '' ||
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.chemical_formula && c.chemical_formula.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.ec_number && c.ec_number.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  const selectedCompMap = new Map(
    currentConfig.selected_components.map(sc => [sc.component_id, sc])
  );

  const inspectedComponent = allComponents.find(c => c.id === activeInspectId) || allComponents[0];

  const handleAddComponent = (comp: ComponentItem) => {
    if (selectedCompMap.has(comp.id)) return;
    const defaultRole = comp.supported_roles[0] || 'substrate';
    const updated: SelectedComponent[] = [
      ...currentConfig.selected_components,
      {
        component_id: comp.id,
        role: defaultRole,
        concentration: comp.category === 'Enzymes' ? '50 nM' : comp.category === 'Plastics' ? '10 mg/mL' : '50 mM',
      },
    ];
    onUpdateConfig({ ...currentConfig, selected_components: updated });
  };

  const handleRemoveComponent = (componentId: string) => {
    const updated = currentConfig.selected_components.filter(
      sc => sc.component_id !== componentId
    );
    onUpdateConfig({ ...currentConfig, selected_components: updated });
  };

  const handleRoleChange = (componentId: string, role: ComponentRole) => {
    const updated = currentConfig.selected_components.map(sc =>
      sc.component_id === componentId ? { ...sc, role } : sc
    );
    onUpdateConfig({ ...currentConfig, selected_components: updated });
  };

  const handleConcentrationChange = (componentId: string, concentration: string) => {
    const updated = currentConfig.selected_components.map(sc =>
      sc.component_id === componentId ? { ...sc, concentration } : sc
    );
    onUpdateConfig({ ...currentConfig, selected_components: updated });
  };

  return (
    <div className="p-8 max-w-[1500px] mx-auto space-y-6">
      {/* Header and Stage Progression */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#24242B] flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-[#9785E8]" />
            <span>Virtual Lab Bench & Component Assembly</span>
          </h1>
          <p className="text-xs text-[#777780] mt-1">
            Select polyester substrates, hydrolytic enzymes, microbial expression hosts, and buffer salts.
          </p>
        </div>

        <button
          onClick={() => onNavigate('chamber')}
          className="px-4 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-[#F7F7F8] text-[#24242B] border border-[#E7E7EB] transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
        >
          <span>Next: Environment Chamber</span>
          <ArrowRight className="w-3.5 h-3.5 text-[#9785E8]" />
        </button>
      </div>

      {/* ACTIVE EXPERIMENT BENCH PANEL */}
      <div className="bg-white rounded-2xl p-6 border border-[#E7E7EB] shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#72C7B0]"></span>
            <h2 className="text-sm font-bold text-[#24242B]">
              Active Reaction Bench ({currentConfig.selected_components.length} components)
            </h2>
          </div>
          {currentConfig.selected_components.length === 0 && (
            <span className="text-xs text-[#B47820] font-medium">
              Select at least 1 substrate (e.g. PET) and 1 catalyst (e.g. IsPETase)
            </span>
          )}
        </div>

        {currentConfig.selected_components.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-[#E7E7EB] rounded-xl bg-[#FAF9FD] text-xs text-[#777780] space-y-1">
            <p className="font-medium text-[#24242B]">Your reaction bench is empty.</p>
            <p className="text-[11px]">Browse the library below and click "+ Add to Bench" to introduce components.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {currentConfig.selected_components.map(sc => {
              const comp = allComponents.find(c => c.id === sc.component_id);
              if (!comp) return null;
              return (
                <div
                  key={sc.component_id}
                  className="bg-[#FAFAFC] border border-[#E7E7EB] rounded-xl p-3.5 space-y-2.5 hover:border-[#D0D0D8] transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-white text-[#777780] border border-[#E7E7EB]">
                        {comp.category}
                      </span>
                      <h3 className="text-xs font-bold text-[#24242B] mt-1.5 truncate">
                        {comp.name}
                      </h3>
                      {comp.chemical_formula && (
                        <span className="text-[10px] font-mono text-[#7461CE] font-medium block">
                          {comp.chemical_formula}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handleRemoveComponent(sc.component_id)}
                      className="text-[#A0A0A8] hover:text-[#C44141] p-1 transition-colors cursor-pointer"
                      title="Remove from bench"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Assigned Role */}
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-[#E7E7EB]">
                    <span className="text-[11px] text-[#777780]">Assigned Role:</span>
                    <select
                      value={sc.role}
                      onChange={e => handleRoleChange(sc.component_id, e.target.value as ComponentRole)}
                      className="bg-white border border-[#E7E7EB] text-[#24242B] text-xs rounded-lg px-2.5 py-1 focus:outline-none focus:border-[#9785E8] font-medium"
                    >
                      {ROLES.map(role => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Concentration */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[11px] text-[#777780]">Concentration / Form:</span>
                    <input
                      type="text"
                      value={sc.concentration || ''}
                      onChange={e => handleConcentrationChange(sc.component_id, e.target.value)}
                      placeholder="e.g. 10 mg/mL, 50 nM"
                      className="bg-white border border-[#E7E7EB] text-[#24242B] text-[11px] rounded-lg px-2 py-1 w-32 focus:outline-none focus:border-[#9785E8] font-mono text-right"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* COMPONENT LIBRARY & INSPECTOR SPLIT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT 8 COLS: Search, Categories & Component Tiles */}
        <div className="lg:col-span-8 bg-white rounded-2xl p-6 border border-[#E7E7EB] shadow-xs space-y-5">
          {/* Search & Category Filter Pills */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-[#A0A0A8] absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search components by name, EC number (3.1.1.101), formula, or mechanism..."
                className="w-full bg-[#F7F7F8] border border-[#E7E7EB] rounded-xl pl-10 pr-4 py-2.5 text-xs text-[#24242B] placeholder-[#A0A0A8] focus:outline-none focus:border-[#9785E8] focus:bg-white transition-colors"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-[#9785E8] text-white'
                      : 'bg-[#F7F7F8] text-[#777780] hover:text-[#24242B] border border-[#E7E7EB]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Component Tiles Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 max-h-[580px] overflow-y-auto pr-1">
            {filteredComponents.map(comp => {
              const isSelected = selectedCompMap.has(comp.id);
              const isInspected = activeInspectId === comp.id;

              return (
                <div
                  key={comp.id}
                  onClick={() => setActiveInspectId(comp.id)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                    isInspected
                      ? 'bg-white border-[#9785E8] shadow-xs ring-1 ring-[#9785E8]/30'
                      : 'bg-[#FAFAFC] border-[#E7E7EB] hover:border-[#D0D0D8] hover:bg-white'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-white text-[#777780] border border-[#E7E7EB]">
                        {comp.category}
                      </span>
                      {comp.ec_number && (
                        <span className="text-[10px] font-mono text-[#7461CE] font-semibold">
                          EC {comp.ec_number}
                        </span>
                      )}
                    </div>
                    <h3 className="text-xs font-bold text-[#24242B]">{comp.name}</h3>
                    <p className="text-[11px] text-[#777780] line-clamp-2 leading-relaxed">
                      {comp.description}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-[#E7E7EB] flex items-center justify-between text-xs">
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        setActiveInspectId(comp.id);
                      }}
                      className="text-[#777780] hover:text-[#9785E8] flex items-center gap-1 text-[11px] font-medium cursor-pointer"
                    >
                      <Info className="w-3 h-3" />
                      <span>Properties</span>
                    </button>

                    {isSelected ? (
                      <span className="inline-flex items-center gap-1 text-[#2D8A6E] text-[11px] font-semibold">
                        <Check className="w-3.5 h-3.5" />
                        <span>On Bench</span>
                      </span>
                    ) : (
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          handleAddComponent(comp);
                        }}
                        className="px-2.5 py-1 bg-white hover:bg-[#EAE5FA] text-[#7461CE] border border-[#D5CBF7] text-[11px] rounded-lg font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT 4 COLS: Component Biochemical Inspector */}
        <div className="lg:col-span-4 bg-white rounded-2xl p-6 border border-[#E7E7EB] shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-[#E7E7EB] pb-3">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-[#9785E8]" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#24242B]">
                Biochemical Profile
              </h2>
            </div>
            <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-[#F7F7F8] text-[#777780] border border-[#E7E7EB]">
              {inspectedComponent?.category}
            </span>
          </div>

          {inspectedComponent && (
            <div className="space-y-4 text-xs">
              <div>
                <h3 className="text-sm font-bold text-[#24242B]">{inspectedComponent.name}</h3>
                {inspectedComponent.chemical_formula && (
                  <div className="text-xs font-mono text-[#7461CE] font-medium mt-0.5">
                    Formula: {inspectedComponent.chemical_formula}
                  </div>
                )}
                {inspectedComponent.ec_number && (
                  <div className="text-xs font-mono text-[#777780] mt-0.5">
                    Classification: EC {inspectedComponent.ec_number}
                  </div>
                )}
                <p className="text-[#777780] text-xs mt-2 leading-relaxed">
                  {inspectedComponent.description}
                </p>
              </div>

              {/* Biophysical Constants Table */}
              <div className="space-y-2">
                <span className="text-[10px] uppercase font-bold text-[#A0A0A8] tracking-wider block">
                  Biophysical Constants & Tolerances
                </span>
                <div className="bg-[#FAF9FD] rounded-xl border border-[#EAE5FA] divide-y divide-[#EAE5FA] text-[11px]">
                  {Object.entries(inspectedComponent.properties).map(([key, val]) => {
                    const formattedKey = key.replace(/_/g, ' ');
                    const formattedVal = Array.isArray(val) ? val.join(' · ') : String(val);
                    return (
                      <div key={key} className="p-2.5 flex items-start justify-between gap-2">
                        <span className="text-[#777780] capitalize">{formattedKey}:</span>
                        <span className="text-[#24242B] text-right font-medium max-w-[180px] truncate font-mono">
                          {formattedVal}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Supported Roles */}
              <div>
                <span className="text-[10px] uppercase font-bold text-[#A0A0A8] tracking-wider block mb-1.5">
                  Permitted Reaction Roles
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {inspectedComponent.supported_roles.map(r => (
                    <span
                      key={r}
                      className="px-2 py-0.5 rounded text-[10px] font-medium bg-[#F7F7F8] text-[#24242B] border border-[#E7E7EB]"
                    >
                      {r}
                    </span>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-2">
                {selectedCompMap.has(inspectedComponent.id) ? (
                  <button
                    onClick={() => handleRemoveComponent(inspectedComponent.id)}
                    className="w-full py-2 bg-[#FCEEEE] hover:bg-[#F8E1E1] text-[#C44141] border border-[#F8C8C8] rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove from Lab Bench</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleAddComponent(inspectedComponent)}
                    className="w-full py-2 bg-[#9785E8] hover:bg-[#8673DC] text-white rounded-xl text-xs font-semibold transition-colors shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add to Active Bench</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
