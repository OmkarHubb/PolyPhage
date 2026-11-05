import React, { useState } from 'react';
import {
  Search,
  Plus,
  Trash2,
  Info,
  SlidersHorizontal,
  Check,
  FlaskConical,
  Sparkles,
  ExternalLink,
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
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header and Action */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-emerald-400" />
            <span>Virtual Lab Bench & Component Library</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Assemble plastics, depolymerase enzymes, cellular hosts, and buffers for reaction modeling.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('chamber')}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded border border-slate-700 font-medium transition cursor-pointer"
          >
            Next: Environment Chamber →
          </button>
        </div>
      </div>

      {/* Selected Workspace Bench Section */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <h2 className="text-sm font-semibold text-slate-200">
              Active Experiment Workspace Bench ({currentConfig.selected_components.length} components)
            </h2>
          </div>
          {currentConfig.selected_components.length === 0 && (
            <span className="text-xs text-amber-400 font-mono">
              Select at least 1 substrate (e.g. PET) and 1 catalyst (e.g. IsPETase)
            </span>
          )}
        </div>

        {currentConfig.selected_components.length === 0 ? (
          <div className="p-6 text-center border border-dashed border-slate-800 rounded bg-slate-950/40 text-xs text-slate-500">
            Your lab bench is empty. Browse the library below and click "+ Add to Bench" to introduce components into the reaction chamber.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {currentConfig.selected_components.map(sc => {
              const comp = allComponents.find(c => c.id === sc.component_id);
              if (!comp) return null;
              return (
                <div
                  key={sc.component_id}
                  className="bg-slate-950/80 border border-slate-800 rounded p-3 space-y-2 hover:border-slate-700 transition"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                        {comp.category}
                      </span>
                      <h3 className="text-xs font-semibold text-slate-200 mt-1 truncate">
                        {comp.name}
                      </h3>
                      {comp.chemical_formula && (
                        <span className="text-[10px] font-mono text-cyan-400">{comp.chemical_formula}</span>
                      )}
                    </div>
                    <button
                      onClick={() => handleRemoveComponent(sc.component_id)}
                      className="text-slate-500 hover:text-red-400 p-1 transition cursor-pointer"
                      title="Remove component"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Role Assignment */}
                  <div className="pt-1 flex items-center justify-between text-xs">
                    <label className="text-[11px] text-slate-400">Assigned Role:</label>
                    <select
                      value={sc.role}
                      onChange={e => handleRoleChange(sc.component_id, e.target.value as ComponentRole)}
                      className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded px-2 py-0.5 focus:outline-none focus:border-emerald-500 font-mono"
                    >
                      {ROLES.map(role => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Concentration/Form Note */}
                  <div className="flex items-center justify-between text-xs">
                    <label className="text-[11px] text-slate-400">Concentration/Form:</label>
                    <input
                      type="text"
                      value={sc.concentration || ''}
                      onChange={e => handleConcentrationChange(sc.component_id, e.target.value)}
                      placeholder="e.g. 10 mg/mL, 50 nM"
                      className="bg-slate-900 border border-slate-800 text-slate-300 text-[11px] rounded px-2 py-0.5 w-32 focus:outline-none focus:border-emerald-500 font-mono text-right"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Main Library & Inspector Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Component Library */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search components (PET, IsPETase, EC 3.1.1.101, buffer)..."
                className="w-full bg-slate-900/90 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Category tabs */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1.5 rounded text-xs whitespace-nowrap transition cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-emerald-600 text-white font-medium'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Component List Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[600px] overflow-y-auto pr-1">
            {filteredComponents.map(comp => {
              const isSelected = selectedCompMap.has(comp.id);
              const isInspected = activeInspectId === comp.id;

              return (
                <div
                  key={comp.id}
                  onClick={() => setActiveInspectId(comp.id)}
                  className={`p-3.5 rounded-lg border transition cursor-pointer flex flex-col justify-between ${
                    isInspected
                      ? 'bg-slate-900 border-emerald-500/80 shadow-sm'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800">
                        {comp.category}
                      </span>
                      {comp.ec_number && (
                        <span className="text-[10px] font-mono text-cyan-400">
                          EC {comp.ec_number}
                        </span>
                      )}
                    </div>
                    <h3 className="text-xs font-semibold text-slate-100">{comp.name}</h3>
                    <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                      {comp.description}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs">
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        setActiveInspectId(comp.id);
                      }}
                      className="text-slate-400 hover:text-cyan-400 flex items-center gap-1 text-[11px] cursor-pointer"
                    >
                      <Info className="w-3 h-3" />
                      <span>Properties</span>
                    </button>

                    {isSelected ? (
                      <span className="inline-flex items-center gap-1 text-emerald-400 text-xs font-medium font-mono">
                        <Check className="w-3.5 h-3.5" />
                        <span>On Bench</span>
                      </span>
                    ) : (
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          handleAddComponent(comp);
                        }}
                        className="px-2.5 py-1 bg-emerald-600/90 hover:bg-emerald-500 text-white text-[11px] rounded font-medium flex items-center gap-1 transition cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add to Bench</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Component Deep Inspector */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-cyan-400" />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300 font-mono">
                Component Biochemical Profile
              </h2>
            </div>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800">
              {inspectedComponent?.category}
            </span>
          </div>

          {inspectedComponent && (
            <div className="space-y-4 text-xs">
              <div>
                <h3 className="text-sm font-semibold text-slate-100">{inspectedComponent.name}</h3>
                {inspectedComponent.chemical_formula && (
                  <div className="text-xs font-mono text-cyan-400 mt-0.5">
                    Formula: {inspectedComponent.chemical_formula}
                  </div>
                )}
                {inspectedComponent.ec_number && (
                  <div className="text-xs font-mono text-purple-400 mt-0.5">
                    Enzyme Commission: EC {inspectedComponent.ec_number}
                  </div>
                )}
                <p className="text-slate-300 text-xs mt-2 leading-relaxed">
                  {inspectedComponent.description}
                </p>
              </div>

              {/* Biochemical Properties Table */}
              <div className="space-y-2">
                <h4 className="text-[11px] font-mono uppercase text-slate-400 font-semibold">
                  Biophysical Constants & Tolerances
                </h4>
                <div className="bg-slate-950 rounded border border-slate-800/80 divide-y divide-slate-800/60 font-mono text-[11px]">
                  {Object.entries(inspectedComponent.properties).map(([key, val]) => {
                    const formattedKey = key.replace(/_/g, ' ');
                    const formattedVal = Array.isArray(val) ? val.join(' · ') : String(val);
                    return (
                      <div key={key} className="p-2 flex items-start justify-between gap-2">
                        <span className="text-slate-500 capitalize">{formattedKey}:</span>
                        <span className="text-slate-200 text-right font-medium max-w-[200px] truncate">
                          {formattedVal}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Supported Roles */}
              <div>
                <h4 className="text-[11px] font-mono uppercase text-slate-400 font-semibold mb-1.5">
                  Permitted Reaction Roles
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {inspectedComponent.supported_roles.map(r => (
                    <span
                      key={r}
                      className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700"
                    >
                      {r}
                    </span>
                  ))}
                </div>
              </div>

              {/* Add/Remove CTA */}
              <div className="pt-2">
                {selectedCompMap.has(inspectedComponent.id) ? (
                  <button
                    onClick={() => handleRemoveComponent(inspectedComponent.id)}
                    className="w-full py-2 bg-red-950/40 hover:bg-red-900/40 text-red-300 border border-red-800/60 rounded text-xs font-medium transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove from Lab Bench</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleAddComponent(inspectedComponent)}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5"
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
