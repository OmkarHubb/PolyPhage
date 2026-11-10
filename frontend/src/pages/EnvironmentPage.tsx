import React from 'react';
import {
  Gauge,
  Thermometer,
  Droplets,
  Wind,
  Waves,
  Timer,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';
import { ExperimentConfig, OxygenAvailability, ComponentItem } from '../types';

interface EnvironmentPageProps {
  currentConfig: ExperimentConfig;
  allComponents: ComponentItem[];
  onUpdateConfig: (updated: ExperimentConfig) => void;
  onRunAssessment: () => void;
  onNavigate: (section: any) => void;
}

export const EnvironmentPage: React.FC<EnvironmentPageProps> = ({
  currentConfig,
  onUpdateConfig,
  onNavigate,
}) => {
  const env = currentConfig.environment;

  const handleUpdate = (fields: Partial<typeof env>) => {
    onUpdateConfig({
      ...currentConfig,
      environment: { ...env, ...fields },
    });
  };

  // Check selected components for active warnings
  const selectedIds = new Set(currentConfig.selected_components.map(sc => sc.component_id));
  const hasIsPetase = selectedIds.has('comp_ispetase');
  const hasLcc = selectedIds.has('comp_lcc_iccg');

  // Real-time biochemical compatibility feedback
  let thermalAlert: { type: 'alert' | 'warn' | 'optimal'; message: string } | null = null;
  if (hasIsPetase) {
    if (env.temperature_celsius >= 45.0) {
      thermalAlert = {
        type: 'alert',
        message: `Thermal Denaturation Imminent: IsPETase is heat-labile and unfolds rapidly above 45°C (Current: ${env.temperature_celsius}°C). The deterministic engine will evaluate the system as inactivated.`,
      };
    } else if (env.temperature_celsius > 38.0) {
      thermalAlert = {
        type: 'warn',
        message: `Elevated Thermal Stress: Operating at ${env.temperature_celsius}°C approaches the IsPETase denaturation boundary (42–45°C). Catalytic half-life is significantly compromised.`,
      };
    } else if (Math.abs(env.temperature_celsius - 30.0) <= 3.0) {
      thermalAlert = {
        type: 'optimal',
        message: `Near-Optimal Mesophilic Window: 30°C aligns with reported activity under cited assay conditions for wild-type Ideonella sakaiensis PETase (Yoshida et al. 2016, 50 mM phosphate buffer, amorphous PET film).`,
      };
    }
  } else if (hasLcc) {
    if (env.temperature_celsius < 60.0) {
      thermalAlert = {
        type: 'warn',
        message: `Below Recommended Regime: Engineered LCC cutinase is reported to perform best near the PET glass transition temperature (Tg ~67°C). Operating at ${env.temperature_celsius}°C is associated in the literature with lower polymer chain mobility and reduced enzyme surface access — though Tg proximity does not directly determine enzymatic reaction rate.`,
      };
    } else if (Math.abs(env.temperature_celsius - 72.0) <= 3.0) {
      thermalAlert = {
        type: 'optimal',
        message: `Near-Optimal Thermophilic Regime: 72°C matches reported activity under cited assay conditions in Tournier et al. (Nature 2020) for engineered LCC-ICCG.`,
      };
    }
  }

  // Presets
  const applyPreset = (preset: {
    temp: number;
    ph: number;
    oxygen: OxygenAvailability;
    salinity: number;
    duration: number;
  }) => {
    handleUpdate({
      temperature_celsius: preset.temp,
      ph: preset.ph,
      oxygen: preset.oxygen,
      salinity_percent: preset.salinity,
      duration_hours: preset.duration,
    });
  };

  return (
    <div className="p-5 md:p-6 lg:p-8 max-w-[1560px] mx-auto space-y-5">
      {/* Header & Stage Progression */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#24242B] flex items-center gap-2">
            <Gauge className="w-5 h-5 text-[#9785E8]" />
            <span>Environment Chamber Control</span>
          </h1>
          <p className="text-xs text-[#777780] mt-1">
            Configure assay thermodynamics, medium ionization (pH), aerobic respiration, and bioreactor mass-transfer conditions.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => onNavigate('bench')}
            className="px-3.5 py-2 bg-white hover:bg-[#F7F7F8] text-[#24242B] text-xs font-semibold rounded-xl border border-[#E7E7EB] transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[#777780]" />
            <span>Lab Bench</span>
          </button>
          <button
            onClick={() => onNavigate('results')}
            className="px-4 py-2 bg-[#9785E8] hover:bg-[#8673DC] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <span>Next: Experiment Results</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Biochemical Compatibility Feedback Banner */}
      {thermalAlert && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-start gap-3 shadow-xs ${
            thermalAlert.type === 'alert'
              ? 'bg-[#FCEEEE] border-[#F8C8C8] text-[#C44141]'
              : thermalAlert.type === 'warn'
              ? 'bg-[#FEF6EB] border-[#F6E1C4] text-[#B47820]'
              : 'bg-[#E8F6F1] border-[#C6E8DC] text-[#2D8A6E]'
          }`}
        >
          {thermalAlert.type === 'alert' ? (
            <AlertTriangle className="w-4 h-4 text-[#C44141] shrink-0 mt-0.5" />
          ) : thermalAlert.type === 'warn' ? (
            <AlertTriangle className="w-4 h-4 text-[#B47820] shrink-0 mt-0.5" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-[#2D8A6E] shrink-0 mt-0.5" />
          )}
          <div className="space-y-0.5">
            <span className="font-bold uppercase tracking-wider text-[10px] block">
              Biochemical Compatibility Feedback
            </span>
            <span className="leading-relaxed text-[11px]">{thermalAlert.message}</span>
          </div>
        </div>
      )}

      {/* Literature-Based Reference Conditions (Compact Bar) */}
      <div className="bg-white rounded-2xl p-4 lg:p-5 border border-[#E7E7EB] shadow-xs space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-[#24242B]">
            <Sparkles className="w-4 h-4 text-[#9785E8]" />
            <span>Literature-Based Benchmark Regimes</span>
          </div>
          <span className="text-[10px] text-[#A0A0A8] font-mono">Click a preset to apply conditions</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          <button
            onClick={() =>
              applyPreset({ temp: 30.0, ph: 7.0, oxygen: 'Aerobic', salinity: 0.0, duration: 24.0 })
            }
            className="p-3 rounded-xl bg-[#FAF9FD] hover:bg-[#EAE5FA] border border-[#EAE5FA] text-left transition-colors cursor-pointer space-y-0.5 group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#7461CE]">Mesophilic Benchmark</span>
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-white text-[#7461CE] border border-[#D5CBF7]">Science 2016</span>
            </div>
            <div className="text-[11px] text-[#24242B] font-mono font-medium">30°C · pH 7.0 · 24h</div>
            <div className="text-[10px] text-[#777780] truncate">Yoshida et al. (IsPETase in 50 mM PO4)</div>
          </button>

          <button
            onClick={() =>
              applyPreset({ temp: 72.0, ph: 8.0, oxygen: 'Aerobic', salinity: 0.0, duration: 10.0 })
            }
            className="p-3 rounded-xl bg-[#FAF9FD] hover:bg-[#EAE5FA] border border-[#EAE5FA] text-left transition-colors cursor-pointer space-y-0.5 group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#7461CE]">Thermophilic Tg Regime</span>
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-white text-[#7461CE] border border-[#D5CBF7]">Nature 2020</span>
            </div>
            <div className="text-[11px] text-[#24242B] font-mono font-medium">72°C · pH 8.0 · 10h</div>
            <div className="text-[10px] text-[#777780] truncate">Tournier et al. (LCC-ICCG at PET Tg)</div>
          </button>

          <button
            onClick={() =>
              applyPreset({ temp: 50.0, ph: 8.0, oxygen: 'Aerobic', salinity: 0.0, duration: 48.0 })
            }
            className="p-3 rounded-xl bg-[#FAF9FD] hover:bg-[#EAE5FA] border border-[#EAE5FA] text-left transition-colors cursor-pointer space-y-0.5 group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#7461CE]">FAST-PETase Regime</span>
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-white text-[#7461CE] border border-[#D5CBF7]">Nature 2022</span>
            </div>
            <div className="text-[11px] text-[#24242B] font-mono font-medium">50°C · pH 8.0 · 48h</div>
            <div className="text-[10px] text-[#777780] truncate">Lu et al. (FAST-PETase variant)</div>
          </button>

          <button
            onClick={() =>
              applyPreset({ temp: 70.0, ph: 7.0, oxygen: 'Aerobic', salinity: 0.0, duration: 12.0 })
            }
            className="p-3 rounded-xl bg-[#FCEEEE] hover:bg-[#F8E1E1] border border-[#F8C8C8] text-left transition-colors cursor-pointer space-y-0.5 group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#C44141]">Denaturation Stress</span>
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-white text-[#C44141] border border-[#F8C8C8]">Stress Test</span>
            </div>
            <div className="text-[11px] text-[#24242B] font-mono font-medium">70°C · pH 7.0 · 12h</div>
            <div className="text-[10px] text-[#C44141] truncate">Illustrative thermal unfolding test</div>
          </button>
        </div>
      </div>

      {/* Main Environmental Parameter Grids */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* PANEL 1: Physicochemical Parameters */}
        <div className="bg-white rounded-2xl p-5 lg:p-6 border border-[#E7E7EB] shadow-xs space-y-4">
          <div className="border-b border-[#E7E7EB] pb-2.5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#24242B]">
              Physicochemical & Medium Thermodynamics
            </h2>
            <p className="text-[11px] text-[#777780] mt-0.5">Reaction temperature, medium ionization, and ionic strength.</p>
          </div>

          {/* Temperature Controller */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Thermometer className="w-3.5 h-3.5 text-[#9785E8]" />
                <label className="text-xs font-semibold text-[#24242B]">Reaction Temperature</label>
              </div>
              <div className="font-mono text-sm font-bold text-[#7461CE] bg-[#FAF9FD] px-2.5 py-0.5 rounded-lg border border-[#EAE5FA]">
                {env.temperature_celsius.toFixed(1)} <span className="text-[11px] text-[#777780] font-normal">°C</span>
              </div>
            </div>

            <input
              type="range"
              min="4"
              max="95"
              step="0.5"
              value={env.temperature_celsius}
              onChange={e => handleUpdate({ temperature_celsius: parseFloat(e.target.value) })}
              className="w-full accent-[#9785E8] cursor-pointer h-1.5 bg-[#F2F2F4] rounded-lg"
            />

            <div className="flex items-center justify-between text-[10px] font-mono text-[#777780]">
              <span>4°C</span>
              <span className="text-[#2D8A6E] font-medium">30°C (IsPETase)</span>
              <span className="text-[#7461CE] font-medium">50°C (FAST)</span>
              <span className="text-[#9785E8] font-medium">72°C (LCC)</span>
              <span>95°C</span>
            </div>
          </div>

          {/* pH Controller */}
          <div className="space-y-2 pt-2 border-t border-[#F2F2F4]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Droplets className="w-3.5 h-3.5 text-[#72C7B0]" />
                <label className="text-xs font-semibold text-[#24242B]">Medium Ionization (pH)</label>
              </div>
              <div className="font-mono text-sm font-bold text-[#2D8A6E] bg-[#E8F6F1] px-2.5 py-0.5 rounded-lg border border-[#C6E8DC]">
                {env.ph.toFixed(1)} <span className="text-[11px] text-[#777780] font-normal">pH</span>
              </div>
            </div>

            <input
              type="range"
              min="2.0"
              max="12.0"
              step="0.1"
              value={env.ph}
              onChange={e => handleUpdate({ ph: parseFloat(e.target.value) })}
              className="w-full accent-[#72C7B0] cursor-pointer h-1.5 bg-[#F2F2F4] rounded-lg"
            />

            <div className="flex items-center justify-between text-[10px] font-mono text-[#777780]">
              <span className="text-[#C44141]">pH 2 (Acidic)</span>
              <span className="text-[#2D8A6E] font-medium">pH 7.0 (Neutral)</span>
              <span className="text-[#7461CE] font-medium">pH 8.0 (Alkaline)</span>
              <span>pH 12</span>
            </div>
          </div>

          {/* Salinity Controller */}
          <div className="space-y-2 pt-2 border-t border-[#F2F2F4]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Waves className="w-3.5 h-3.5 text-[#72C7B0]" />
                <label className="text-xs font-semibold text-[#24242B]">Medium Salinity</label>
              </div>
              <div className="font-mono text-sm font-bold text-[#24242B] bg-[#F7F7F8] px-2.5 py-0.5 rounded-lg border border-[#E7E7EB]">
                {env.salinity_percent.toFixed(1)} <span className="text-[11px] text-[#777780] font-normal">w/v %</span>
              </div>
            </div>

            <input
              type="range"
              min="0"
              max="10"
              step="0.1"
              value={env.salinity_percent}
              onChange={e => handleUpdate({ salinity_percent: parseFloat(e.target.value) })}
              className="w-full accent-[#72C7B0] cursor-pointer h-1.5 bg-[#F2F2F4] rounded-lg"
            />

            <div className="flex items-center justify-between text-[10px] font-mono text-[#777780]">
              <span>0.0% (Fresh)</span>
              <span className="text-[#2D8A6E] font-medium">3.5% (Seawater)</span>
              <span>10.0% (Hypersaline)</span>
            </div>
          </div>
        </div>

        {/* PANEL 2: Operational Bioreactor Dynamics */}
        <div className="bg-white rounded-2xl p-5 lg:p-6 border border-[#E7E7EB] shadow-xs space-y-4">
          <div className="border-b border-[#E7E7EB] pb-2.5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#24242B]">
              Operational Bioreactor Dynamics
            </h2>
            <p className="text-[11px] text-[#777780] mt-0.5">Aeration, vessel pressure, duration, and mass transfer.</p>
          </div>

          {/* Oxygen Availability (Segmented Buttons) */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Wind className="w-3.5 h-3.5 text-[#9785E8]" />
              <label className="text-xs font-semibold text-[#24242B]">Dissolved Oxygen Availability</label>
            </div>

            <div className="grid grid-cols-3 gap-1.5 bg-[#F7F7F8] p-1 rounded-xl border border-[#E7E7EB]">
              {(['Aerobic', 'Microaerophilic', 'Anaerobic'] as OxygenAvailability[]).map(o2 => (
                <button
                  key={o2}
                  onClick={() => handleUpdate({ oxygen: o2 })}
                  className={`py-1.5 px-2 rounded-lg text-xs font-medium text-center transition-colors cursor-pointer ${
                    env.oxygen === o2
                      ? 'bg-white text-[#24242B] font-bold shadow-xs'
                      : 'text-[#777780] hover:text-[#24242B]'
                  }`}
                >
                  {o2}
                </button>
              ))}
            </div>
          </div>

          {/* Atmospheric Pressure */}
          <div className="space-y-2 pt-2 border-t border-[#F2F2F4]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Gauge className="w-3.5 h-3.5 text-[#9785E8]" />
                <label className="text-xs font-semibold text-[#24242B]">Atmospheric Vessel Pressure</label>
              </div>
              <div className="font-mono text-sm font-bold text-[#7461CE] bg-[#FAF9FD] px-2.5 py-0.5 rounded-lg border border-[#EAE5FA]">
                {(env.pressure_atm || 1.0).toFixed(1)} <span className="text-[11px] text-[#777780] font-normal">atm</span>
              </div>
            </div>

            <input
              type="range"
              min="0.5"
              max="10.0"
              step="0.1"
              value={env.pressure_atm ?? 1.0}
              onChange={e => handleUpdate({ pressure_atm: parseFloat(e.target.value) })}
              className="w-full accent-[#9785E8] cursor-pointer h-1.5 bg-[#F2F2F4] rounded-lg"
            />

            <div className="flex items-center justify-between text-[10px] font-mono text-[#777780]">
              <span>0.5 atm</span>
              <span className="text-[#2D8A6E] font-medium">1.0 atm (Ambient)</span>
              <span>10.0 atm</span>
            </div>
          </div>

          {/* Duration and Agitation Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#F2F2F4]">
            {/* Duration */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <Timer className="w-3.5 h-3.5 text-[#9785E8]" />
                  <label className="text-[11px] font-semibold text-[#24242B]">Duration</label>
                </div>
                <span className="font-mono text-xs font-bold text-[#24242B]">
                  {env.duration_hours}h ({(env.duration_hours / 24).toFixed(1)}d)
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="336"
                step="1"
                value={env.duration_hours}
                onChange={e => handleUpdate({ duration_hours: parseFloat(e.target.value) })}
                className="w-full accent-[#9785E8] cursor-pointer h-1.5 bg-[#F2F2F4] rounded-lg"
              />
            </div>

            {/* Agitation */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-[#24242B]">Orbital Agitation</label>
                <span className="font-mono text-xs font-bold text-[#24242B]">
                  {env.agitation_rpm || 150} RPM
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="400"
                step="10"
                value={env.agitation_rpm || 150}
                onChange={e => handleUpdate({ agitation_rpm: parseInt(e.target.value) })}
                className="w-full accent-[#72C7B0] cursor-pointer h-1.5 bg-[#F2F2F4] rounded-lg"
              />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
