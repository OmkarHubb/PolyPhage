import React, { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  Trash2,
  Info,
  Check,
  FlaskConical,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Play,
  RefreshCw,
} from 'lucide-react';
import {
  ComponentItem,
  ComponentCategory,
  ComponentRole,
  SelectedComponent,
  ExperimentConfig,
  VALID_CONCENTRATION_UNITS,
} from '../types';

interface LabBenchPageProps {
  allComponents: ComponentItem[];
  currentConfig: ExperimentConfig;
  initialCategory?: ComponentCategory | 'All';
  isAssessing?: boolean;
  onUpdateConfig: (updated: ExperimentConfig) => void;
  onRunAssessment: () => void;
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
  initialCategory = 'All',
  isAssessing = false,
  onUpdateConfig,
  onRunAssessment,
  onNavigate,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<ComponentCategory | 'All'>(initialCategory);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeInspectId, setActiveInspectId] = useState<string | null>('comp_pet');

  useEffect(() => {
    if (initialCategory) {
      setSelectedCategory(initialCategory);
    }
  }, [initialCategory]);

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

  // Derive assembly checklist for researcher clarity
  const hasSubstrate = currentConfig.selected_components.some(sc => sc.role === 'substrate');
  const hasCatalyst = currentConfig.selected_components.some(sc => sc.role === 'catalyst');
  const hasBuffer = currentConfig.selected_components.some(sc => sc.role === 'buffer');

  const handleAddComponent = (comp: ComponentItem) => {
    if (selectedCompMap.has(comp.id)) return;
    const defaultRole = comp.supported_roles[0] || 'substrate';
    const allowedUnits = VALID_CONCENTRATION_UNITS[comp.category] || ['nM'];
    const defaultUnit = allowedUnits[0] || 'nM';
    const defaultVal = comp.category === 'Enzymes' ? 50 : comp.category === 'Plastics' ? 10 : 50;

    const updated: SelectedComponent[] = [
      ...currentConfig.selected_components,
      {
        component_id: comp.id,
        role: defaultRole,
        concentration: `${defaultVal} ${defaultUnit}`,
        concentration_value: defaultVal,
        concentration_unit: defaultUnit,
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

  const getCategoryForComponent = (componentId: string): ComponentCategory => {
    const comp = allComponents.find(c => c.id === componentId);
    return comp?.category || 'Enzymes';
  };

  const getUnitsForComponent = (componentId: string): string[] => {
    const cat = getCategoryForComponent(componentId);
    return VALID_CONCENTRATION_UNITS[cat] || ['nM', 'µM', 'mg/mL', 'mM'];
  };

  const parseConcentration = (raw?: string, defaultUnit: string = 'nM'): { valStr: string; unit: string } => {
    if (!raw) return { valStr: '', unit: defaultUnit };
    const match = raw.match(/^([+-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\s*(.+)$/);
    if (match) {
      return { valStr: match[1], unit: match[2].trim() };
    }
    return { valStr: '', unit: defaultUnit };
  };

  const handleConcentrationPartsChange = (componentId: string, valStr: string, unitStr: string) => {
    const updated = currentConfig.selected_components.map(sc => {
      if (sc.component_id !== componentId) return sc;
      const cleanVal = valStr.trim();
      if (!cleanVal) {
        return {
          ...sc,
          concentration: undefined,
          concentration_value: undefined,
          concentration_unit: unitStr,
        };
      }
      const num = parseFloat(cleanVal);
      const isPositive = !isNaN(num) && num > 0;
      return {
        ...sc,
        concentration: isPositive ? `${num} ${unitStr}` : `${cleanVal} ${unitStr}`,
        concentration_value: !isNaN(num) ? num : undefined,
        concentration_unit: unitStr,
      };
    });
    onUpdateConfig({ ...currentConfig, selected_components: updated });
  };

  const getCategoryBadgeStyle = (cat: ComponentCategory) => {
    switch (cat) {
      case 'Plastics':
        return 'bg-[#FAF9FD] text-[#7461CE] border-[#EAE5FA]';
      case 'Enzymes':
        return 'bg-[#E8F6F1] text-[#2D8A6E] border-[#C6E8DC]';
      case 'Microorganisms':
        return 'bg-[#FEF6EB] text-[#B47820] border-[#F6E1C4]';
      default:
        return 'bg-[#F0F4FA] text-[#3B68A0] border-[#D6E2F0]';
    }
  };

  return (
    <div className="p-5 md:p-6 lg:p-8 max-w-[1560px] mx-auto space-y-6">
      {/* Contextual Experiment Header and Stage Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[#9785E8] mb-1">
            <FlaskConical className="w-3.5 h-3.5" />
            <span className="uppercase tracking-wider text-[11px] font-bold">Active Experiment:</span>
            <span className="text-[#24242B] font-semibold">{currentConfig.name}</span>
            <span className="font-mono text-[10px] px-2 py-0.5 rounded-md bg-[#FAF9FD] border border-[#EAE5FA] text-[#7461CE] font-bold">
              {currentConfig.id || 'PET-20261107-001'}
            </span>
          </div>
          <h1 className="text-xl font-bold text-[#24242B]">
            Virtual Lab Bench & Component Assembly
          </h1>
          <p className="text-xs text-[#777780] mt-0.5">
            Assemble substrates, hydrolytic catalysts, expression chassis, and buffer matrices for enzymatic depolymerization.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={() => onNavigate('chamber')}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-[#F7F7F8] text-[#24242B] border border-[#E7E7EB] transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <span>Environment Chamber</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#777780]" />
          </button>

          <button
            onClick={onRunAssessment}
            disabled={isAssessing || currentConfig.selected_components.length === 0}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#9785E8] hover:bg-[#8673DC] text-white shadow-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAssessing ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Evaluating Reaction...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Run Scientific Assessment</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ACTIVE EXPERIMENT BENCH PANEL */}
      <div className="bg-white rounded-2xl p-5 lg:p-6 border border-[#E7E7EB] shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#72C7B0]"></span>
            <h2 className="text-sm font-bold text-[#24242B]">
              Active Reaction Bench ({currentConfig.selected_components.length} components)
            </h2>
          </div>

          {/* Quick Assembly Readiness Checklist */}
          <div className="flex items-center gap-2 text-[11px] font-medium">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border ${
              hasSubstrate ? 'bg-[#E8F6F1] text-[#2D8A6E] border-[#C6E8DC]' : 'bg-[#F7F7F8] text-[#A0A0A8] border-[#E7E7EB]'
            }`}>
              <CheckCircle2 className="w-3 h-3" />
              <span>Substrate</span>
            </span>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border ${
              hasCatalyst ? 'bg-[#E8F6F1] text-[#2D8A6E] border-[#C6E8DC]' : 'bg-[#F7F7F8] text-[#A0A0A8] border-[#E7E7EB]'
            }`}>
              <CheckCircle2 className="w-3 h-3" />
              <span>Catalyst</span>
            </span>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border ${
              hasBuffer ? 'bg-[#E8F6F1] text-[#2D8A6E] border-[#C6E8DC]' : 'bg-[#FAF9FD] text-[#7461CE] border-[#EAE5FA]'
            }`}>
              <CheckCircle2 className="w-3 h-3" />
              <span>Buffer (Recommended)</span>
            </span>
          </div>
        </div>

        {currentConfig.selected_components.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-[#E7E7EB] rounded-xl bg-[#FAF9FD] text-xs text-[#777780] space-y-1">
            <p className="font-semibold text-[#24242B]">Your reaction bench is empty.</p>
            <p className="text-[11px]">Browse the library below and click "+ Add to Bench" to introduce components.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {currentConfig.selected_components.map(sc => {
              const comp = allComponents.find(c => c.id === sc.component_id);
              if (!comp) return null;
              const badgeStyle = getCategoryBadgeStyle(comp.category);

              return (
                <div
                  key={sc.component_id}
                  className="bg-[#FAFAFC] border border-[#E7E7EB] rounded-xl p-3.5 space-y-3 hover:border-[#D0D0D8] transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${badgeStyle}`}>
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
                  <div className="flex items-center justify-between text-xs pt-2 border-t border-[#E7E7EB]">
                    <span className="text-[11px] text-[#777780] font-medium">Assigned Role:</span>
                    <select
                      value={sc.role}
                      onChange={e => handleRoleChange(sc.component_id, e.target.value as ComponentRole)}
                      className="bg-white border border-[#E7E7EB] text-[#24242B] text-xs rounded-lg px-2.5 py-1 focus:outline-none focus:border-[#9785E8] font-medium"
                    >
                      {(comp.supported_roles.length > 0 ? comp.supported_roles : ROLES).map(role => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Concentration Record Input */}
                  {(() => {
                    const allowedUnits = getUnitsForComponent(sc.component_id);
                    const parsed = parseConcentration(sc.concentration, allowedUnits[0]);
                    return (
                      <div className="space-y-1 pt-1.5 border-t border-[#E7E7EB]">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] text-[#777780] font-medium">Concentration:</span>
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#FAF9FD] text-[#7461CE] font-mono border border-[#EAE5FA]" title="Experimental Record (Non-Kinetic)">
                              Non-Kinetic
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="0.0001"
                              step="any"
                              value={parsed.valStr}
                              onChange={e => handleConcentrationPartsChange(sc.component_id, e.target.value, parsed.unit || allowedUnits[0])}
                              placeholder="e.g. 50"
                              className="bg-white border border-[#E7E7EB] text-[#24242B] text-[11px] rounded-lg px-2 py-1 w-20 focus:outline-none focus:border-[#9785E8] font-mono text-right"
                            />
                            <select
                              value={parsed.unit || allowedUnits[0]}
                              onChange={e => handleConcentrationPartsChange(sc.component_id, parsed.valStr, e.target.value)}
                              className="bg-white border border-[#E7E7EB] text-[#7461CE] text-[11px] rounded-lg px-1.5 py-1 focus:outline-none focus:border-[#9785E8] font-mono font-medium"
                            >
                              {allowedUnits.map(u => (
                                <option key={u} value={u}>
                                  {u}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              );
            })}
          </div>
        )}

        {/* Concentration Non-Kinetic Explanation Notice */}
        {currentConfig.selected_components.length > 0 && (
          <div className="mt-3 p-3 bg-[#FAF9FD] border border-[#EAE5FA] rounded-xl flex items-start gap-2 text-xs text-[#777780]">
            <Info className="w-4 h-4 text-[#9785E8] shrink-0 mt-0.5" />
            <div className="leading-relaxed text-[11px]">
              <span className="font-semibold text-[#24242B]">Experimental Record / Boundary Condition: </span>
              Concentration is recorded for experimental reproducibility. This version does not use concentration to calculate enzymatic reaction rates or degradation yield.
            </div>
          </div>
        )}
      </div>

      {/* COMPONENT LIBRARY & INSPECTOR SPLIT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT 8 COLS: Search, Categories & Component Tiles */}
        <div className="lg:col-span-8 bg-white rounded-2xl p-5 lg:p-6 border border-[#E7E7EB] shadow-xs space-y-4">
          {/* Search & Category Filter Pills */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-[#A0A0A8] absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search components by name, EC number (3.1.1.101), formula, or mechanism..."
                className="w-full bg-[#F7F7F8] border border-[#E7E7EB] rounded-xl pl-10 pr-4 py-2 text-xs text-[#24242B] placeholder-[#A0A0A8] focus:outline-none focus:border-[#9785E8] focus:bg-white transition-colors"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-[#9785E8] text-white shadow-xs'
                      : 'bg-[#F7F7F8] text-[#777780] hover:text-[#24242B] border border-[#E7E7EB]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Component Tiles Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[580px] overflow-y-auto pr-1">
            {filteredComponents.map(comp => {
              const isSelected = selectedCompMap.has(comp.id);
              const isInspected = activeInspectId === comp.id;
              const badgeStyle = getCategoryBadgeStyle(comp.category);

              return (
                <div
                  key={comp.id}
                  onClick={() => setActiveInspectId(comp.id)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between space-y-2.5 ${
                    isInspected
                      ? 'bg-white border-[#9785E8] shadow-xs ring-1 ring-[#9785E8]/30'
                      : 'bg-[#FAFAFC] border-[#E7E7EB] hover:border-[#D0D0D8] hover:bg-white'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${badgeStyle}`}>
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
        <div className="lg:col-span-4 bg-white rounded-2xl p-5 lg:p-6 border border-[#E7E7EB] shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#E7E7EB] pb-3">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-[#9785E8]" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#24242B]">
                Biochemical Profile
              </h2>
            </div>
            {inspectedComponent && (
              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${getCategoryBadgeStyle(inspectedComponent.category)}`}>
                {inspectedComponent.category}
              </span>
            )}
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
