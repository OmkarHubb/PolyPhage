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
  allComponents,
  onUpdateConfig,
  onRunAssessment,
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
  const hasFastPetase = selectedIds.has('comp_fast_petase');

  // Real-time thermodynamic warning conditions
  let thermalAlert: { type: 'alert' | 'warn' | 'optimal'; message: string } | null = null;
  if (hasIsPetase) {
    if (env.temperature_celsius >= 45.0) {
      thermalAlert = {
        type: 'alert',
        message: `Thermal Denaturation Imminent: IsPETase is heat-labile and unfolds rapidly above 45°C (Current: ${env.temperature_celsius}°C). Assessment will flag system as inactivated.`,
      };
    } else if (env.temperature_celsius > 38.0) {
      thermalAlert = {
        type: 'warn',
        message: `Thermal Stress: Operating at ${env.temperature_celsius}°C approaches the IsPETase denaturation boundary (42-45°C). Kinetic half-life will be compromised.`,
      };
    } else if (Math.abs(env.temperature_celsius - 30.0) <= 3.0) {
      thermalAlert = {
        type: 'optimal',
        message: `Near Optimal Catalytic Window: 30°C aligns with published maximum activity for wild-type Ideonella sakaiensis PETase.`,
      };
    }
  } else if (hasLcc) {
    if (env.temperature_celsius < 60.0) {
      thermalAlert = {
        type: 'warn',
        message: `Below Chain Mobility Threshold: LCC cutinase depolymerizes PET efficiently near the glass transition temperature (Tg ~67°C). Operating at ${env.temperature_celsius}°C will exhibit significantly suppressed conversion kinetics.`,
      };
    } else if (Math.abs(env.temperature_celsius - 72.0) <= 3.0) {
      thermalAlert = {
        type: 'optimal',
        message: `Optimal Thermophilic Regime: 72°C matches Tournier et al. (Nature 2020) target temperature for engineered LCC-ICCG.`,
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
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header and Quick Run Action */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Gauge className="w-5 h-5 text-cyan-400" />
            <span>Environment Chamber Controls</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Simulate reaction thermodynamics, medium ionization (pH), aerobic respiration, and ionic strength.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('bench')}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded border border-slate-700 transition cursor-pointer"
          >
            ← Back to Bench
          </button>
          <button
            onClick={onRunAssessment}
            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded shadow transition cursor-pointer"
          >
            Run Assessment with Current Conditions →
          </button>
        </div>
      </div>

      {/* Real-time Thermal Alert Banner */}
      {thermalAlert && (
        <div
          className={`p-3.5 rounded-lg border text-xs flex items-start gap-3 ${
            thermalAlert.type === 'alert'
              ? 'bg-red-950/50 border-red-800/80 text-red-200'
              : thermalAlert.type === 'warn'
              ? 'bg-amber-950/50 border-amber-800/80 text-amber-200'
              : 'bg-emerald-950/50 border-emerald-800/80 text-emerald-200'
          }`}
        >
          {thermalAlert.type === 'alert' ? (
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          ) : thermalAlert.type === 'warn' ? (
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          )}
          <div>
            <span className="font-semibold uppercase tracking-wider text-[10px] block font-mono">
              Thermodynamic Boundary Live Feedback
            </span>
            <span>{thermalAlert.message}</span>
          </div>
        </div>
      )}

      {/* Preset Configurations Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-4 space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>Validated Literature Environmental Presets</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-1">
          <button
            onClick={() =>
              applyPreset({ temp: 30.0, ph: 7.0, oxygen: 'Aerobic', salinity: 0.0, duration: 24.0 })
            }
            className="p-2.5 rounded bg-slate-950 hover:bg-slate-800/80 border border-slate-800 text-left transition cursor-pointer"
          >
            <div className="text-xs font-semibold text-emerald-300">Mesophilic Benchmark</div>
            <div className="text-[11px] text-slate-400 font-mono mt-0.5">30°C · pH 7.0 · 24h</div>
            <div className="text-[10px] text-slate-500 mt-1">Yoshida et al. (Science 2016)</div>
          </button>

          <button
            onClick={() =>
              applyPreset({ temp: 72.0, ph: 8.0, oxygen: 'Aerobic', salinity: 0.0, duration: 10.0 })
            }
            className="p-2.5 rounded bg-slate-950 hover:bg-slate-800/80 border border-slate-800 text-left transition cursor-pointer"
          >
            <div className="text-xs font-semibold text-purple-300">Thermophilic Tg Regime</div>
            <div className="text-[11px] text-slate-400 font-mono mt-0.5">72°C · pH 8.0 · 10h</div>
            <div className="text-[10px] text-slate-500 mt-1">Tournier et al. (Nature 2020)</div>
          </button>

          <button
            onClick={() =>
              applyPreset({ temp: 50.0, ph: 8.0, oxygen: 'Aerobic', salinity: 0.0, duration: 48.0 })
            }
            className="p-2.5 rounded bg-slate-950 hover:bg-slate-800/80 border border-slate-800 text-left transition cursor-pointer"
          >
            <div className="text-xs font-semibold text-cyan-300">FAST-PETase Regime</div>
            <div className="text-[11px] text-slate-400 font-mono mt-0.5">50°C · pH 8.0 · 48h</div>
            <div className="text-[10px] text-slate-500 mt-1">Lu et al. (Nature 2022)</div>
          </button>

          <button
            onClick={() =>
              applyPreset({ temp: 70.0, ph: 7.0, oxygen: 'Aerobic', salinity: 0.0, duration: 12.0 })
            }
            className="p-2.5 rounded bg-slate-950 hover:bg-red-950/30 border border-red-900/40 text-left transition cursor-pointer"
          >
            <div className="text-xs font-semibold text-red-300">Denaturation Stress Test</div>
            <div className="text-[11px] text-slate-400 font-mono mt-0.5">70°C with IsPETase</div>
            <div className="text-[10px] text-red-400/80 mt-1">Tests failure detection rule</div>
          </button>
        </div>
      </div>

      {/* Main Control Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Temperature Controller */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Thermometer className="w-4 h-4 text-red-400" />
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-200 font-mono">
                Reaction Temperature
              </label>
            </div>
            <div className="flex items-center gap-1 font-mono text-base font-bold text-slate-100 bg-slate-950 px-2.5 py-0.5 rounded border border-slate-800">
              <span>{env.temperature_celsius.toFixed(1)}</span>
              <span className="text-xs text-slate-400 font-normal">°C</span>
            </div>
          </div>

          <input
            type="range"
            min="4"
            max="95"
            step="0.5"
            value={env.temperature_celsius}
            onChange={e => handleUpdate({ temperature_celsius: parseFloat(e.target.value) })}
            className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
          />

          <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
            <span>4°C (Chilled)</span>
            <span className="text-emerald-400 font-semibold">30°C (IsPETase opt)</span>
            <span className="text-cyan-400 font-semibold">50°C (FAST-PETase)</span>
            <span className="text-purple-400 font-semibold">72°C (LCC opt)</span>
            <span>95°C</span>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed">
            Directly governs enzyme catalytic turnover frequency and substrate mobility near the PET glass transition temperature (Tg ~67°C).
          </p>
        </div>

        {/* pH Controller */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Droplets className="w-4 h-4 text-cyan-400" />
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-200 font-mono">
                Reaction Medium pH
              </label>
            </div>
            <div className="flex items-center gap-1 font-mono text-base font-bold text-slate-100 bg-slate-950 px-2.5 py-0.5 rounded border border-slate-800">
              <span>{env.ph.toFixed(1)}</span>
            </div>
          </div>

          <input
            type="range"
            min="2.0"
            max="12.0"
            step="0.1"
            value={env.ph}
            onChange={e => handleUpdate({ ph: parseFloat(e.target.value) })}
            className="w-full accent-cyan-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
          />

          <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
            <span className="text-red-400">pH 2 (Acidic)</span>
            <span className="text-emerald-400 font-semibold">pH 7.0 (Neutral)</span>
            <span className="text-blue-400 font-semibold">pH 8.0 (Alkaline)</span>
            <span className="text-purple-400">pH 12 (Basic)</span>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed">
            Maintains the ionization state of the catalytic triad (Ser-His-Asp). Progressive release of terephthalic acid lowers local pH if unbuffered.
          </p>
        </div>

        {/* Oxygen Availability */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Wind className="w-4 h-4 text-teal-400" />
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-200 font-mono">
              Dissolved Oxygen Availability
            </label>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {(['Aerobic', 'Microaerophilic', 'Anaerobic'] as OxygenAvailability[]).map(o2 => (
              <button
                key={o2}
                onClick={() => handleUpdate({ oxygen: o2 })}
                className={`py-2 px-3 rounded text-xs font-medium text-center transition cursor-pointer ${
                  env.oxygen === o2
                    ? 'bg-teal-600 text-white font-semibold'
                    : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {o2}
              </button>
            ))}
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed">
            Obligate aerobic organisms (e.g., Ideonella sakaiensis) halt respiration under anaerobic conditions. Purified enzyme hydrolysis does not consume O2 directly.
          </p>
        </div>

        {/* Salinity & Ionic Strength */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Waves className="w-4 h-4 text-blue-400" />
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-200 font-mono">
                Medium Salinity (w/v %)
              </label>
            </div>
            <div className="font-mono text-base font-bold text-slate-100 bg-slate-950 px-2.5 py-0.5 rounded border border-slate-800">
              {env.salinity_percent.toFixed(1)}%
            </div>
          </div>

          <input
            type="range"
            min="0"
            max="10"
            step="0.1"
            value={env.salinity_percent}
            onChange={e => handleUpdate({ salinity_percent: parseFloat(e.target.value) })}
            className="w-full accent-blue-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
          />

          <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
            <span>0.0% (Freshwater)</span>
            <span className="text-blue-400 font-semibold">3.5% (Ocean Seawater)</span>
            <span>10.0% (Hypersaline)</span>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed">
            Tests halotolerance for direct marine plastic bio-remediation applications. High ionic strength can stabilize or destabilize electrostatic surface salt bridges.
          </p>
        </div>

        {/* Incubation Duration & Agitation */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-5 space-y-4 md:col-span-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Timer className="w-4 h-4 text-amber-400" />
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-200 font-mono">
                    Incubation Duration (Hours)
                  </label>
                </div>
                <div className="font-mono text-sm font-bold text-slate-100 bg-slate-950 px-2.5 py-0.5 rounded border border-slate-800">
                  {env.duration_hours} h ({(env.duration_hours / 24).toFixed(1)} d)
                </div>
              </div>

              <input
                type="range"
                min="1"
                max="336"
                step="1"
                value={env.duration_hours}
                onChange={e => handleUpdate({ duration_hours: parseFloat(e.target.value) })}
                className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />

              <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                <span>1 h</span>
                <span>24 h (1 day)</span>
                <span>72 h (3 days)</span>
                <span>168 h (1 week)</span>
                <span>336 h (2 weeks)</span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-200 font-mono">
                  Orbital Agitation (RPM)
                </label>
                <div className="font-mono text-sm font-bold text-slate-100 bg-slate-950 px-2.5 py-0.5 rounded border border-slate-800">
                  {env.agitation_rpm || 150} RPM
                </div>
              </div>

              <input
                type="range"
                min="0"
                max="400"
                step="10"
                value={env.agitation_rpm || 150}
                onChange={e => handleUpdate({ agitation_rpm: parseInt(e.target.value) })}
                className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />

              <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                <span>0 (Static)</span>
                <span>150 RPM (Standard Flask)</span>
                <span>400 RPM (High Mass-Transfer)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
