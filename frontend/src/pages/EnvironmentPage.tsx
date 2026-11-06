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

  // Real-time biochemical compatibility feedback
  let thermalAlert: { type: 'alert' | 'warn' | 'optimal'; message: string } | null = null;
  if (hasIsPetase) {
    if (env.temperature_celsius >= 45.0) {
      thermalAlert = {
        type: 'alert',
        message: `Thermal Denaturation Imminent: IsPETase is heat-labile and unfolds rapidly above 45\u00b0C (Current: ${env.temperature_celsius}\u00b0C). The deterministic engine will evaluate the system as inactivated.`,
      };
    } else if (env.temperature_celsius > 38.0) {
      thermalAlert = {
        type: 'warn',
        message: `Elevated Thermal Stress: Operating at ${env.temperature_celsius}\u00b0C approaches the IsPETase denaturation boundary (42\u201345\u00b0C). Catalytic half-life is significantly compromised.`,
      };
    } else if (Math.abs(env.temperature_celsius - 30.0) <= 3.0) {
      thermalAlert = {
        type: 'optimal',
        message: `Near-Optimal Mesophilic Window: 30\u00b0C aligns with reported activity under cited assay conditions for wild-type Ideonella sakaiensis PETase (Yoshida et al. 2016, 50\u00a0mM phosphate buffer, amorphous PET film).`,
      };
    }
  } else if (hasLcc) {
    if (env.temperature_celsius < 60.0) {
      thermalAlert = {
        type: 'warn',
        message: `Below Recommended Regime: Engineered LCC cutinase is reported to perform best near the PET glass transition temperature (Tg\u00a0\u223c67\u00b0C). Operating at ${env.temperature_celsius}\u00b0C is associated in the literature with lower polymer chain mobility and reduced enzyme surface access \u2014 though Tg proximity does not directly determine enzymatic reaction rate.`,
      };
    } else if (Math.abs(env.temperature_celsius - 72.0) <= 3.0) {
      thermalAlert = {
        type: 'optimal',
        message: `Near-Optimal Thermophilic Regime: 72\u00b0C matches reported activity under cited assay conditions in Tournier et al. (Nature 2020) for engineered LCC-ICCG.`,
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
    <div className="p-8 max-w-[1500px] mx-auto space-y-6">
      {/* Header & Stage Progression */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#24242B] flex items-center gap-2">
            <Gauge className="w-5 h-5 text-[#9785E8]" />
            <span>Environment Chamber Control</span>
          </h1>
          <p className="text-xs text-[#777780] mt-1">
            Configure assay thermodynamics, medium ionization (pH), aerobic respiration, and ionic strength.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('bench')}
            className="px-4 py-2 bg-white hover:bg-[#F7F7F8] text-[#24242B] text-xs font-semibold rounded-xl border border-[#E7E7EB] transition-colors cursor-pointer"
          >
            &larr; Back to Bench
          </button>
          <button
            onClick={onRunAssessment}
            className="px-4 py-2 bg-[#9785E8] hover:bg-[#8673DC] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <span>Run Assessment</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Biochemical Compatibility Feedback Banner */}
      {thermalAlert && (
        <div
          className={`p-4 rounded-2xl border text-xs flex items-start gap-3 shadow-xs ${
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
            <span className="leading-relaxed">{thermalAlert.message}</span>
          </div>
        </div>
      )}

      {/* Literature-Based Reference Conditions */}
      <div className="bg-white rounded-2xl p-6 border border-[#E7E7EB] shadow-xs space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-[#24242B]">
          <Sparkles className="w-4 h-4 text-[#9785E8]" />
          <span>Literature-Based Reference Conditions</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <button
            onClick={() =>
              applyPreset({ temp: 30.0, ph: 7.0, oxygen: 'Aerobic', salinity: 0.0, duration: 24.0 })
            }
            className="p-3.5 rounded-xl bg-[#FAF9FD] hover:bg-[#EAE5FA] border border-[#EAE5FA] text-left transition-colors cursor-pointer space-y-1"
          >
            <div className="text-xs font-bold text-[#7461CE]">Mesophilic Benchmark</div>
            <div className="text-[11px] text-[#24242B] font-mono">30&deg;C &middot; pH 7.0 &middot; 24h</div>
            <div className="text-[10px] text-[#777780]">Yoshida et al. (Science 2016) &mdash; 50&thinsp;mM phosphate, amorphous PET film</div>
          </button>

          <button
            onClick={() =>
              applyPreset({ temp: 72.0, ph: 8.0, oxygen: 'Aerobic', salinity: 0.0, duration: 10.0 })
            }
            className="p-3.5 rounded-xl bg-[#FAF9FD] hover:bg-[#EAE5FA] border border-[#EAE5FA] text-left transition-colors cursor-pointer space-y-1"
          >
            <div className="text-xs font-bold text-[#7461CE]">Thermophilic Tg Regime</div>
            <div className="text-[11px] text-[#24242B] font-mono">72&deg;C &middot; pH 8.0 &middot; 10h</div>
            <div className="text-[10px] text-[#777780]">Tournier et al. (Nature 2020) &mdash; LCC-ICCG, micronized PET, NaOH titration</div>
          </button>

          <button
            onClick={() =>
              applyPreset({ temp: 50.0, ph: 8.0, oxygen: 'Aerobic', salinity: 0.0, duration: 48.0 })
            }
            className="p-3.5 rounded-xl bg-[#FAF9FD] hover:bg-[#EAE5FA] border border-[#EAE5FA] text-left transition-colors cursor-pointer space-y-1"
          >
            <div className="text-xs font-bold text-[#7461CE]">FAST-PETase Regime</div>
            <div className="text-[11px] text-[#24242B] font-mono">50&deg;C &middot; pH 8.0 &middot; 48h</div>
            <div className="text-[10px] text-[#777780]">Lu et al. (Nature 2022) &mdash; FAST-PETase, post-consumer PET containers</div>
          </button>

          <button
            onClick={() =>
              applyPreset({ temp: 70.0, ph: 7.0, oxygen: 'Aerobic', salinity: 0.0, duration: 12.0 })
            }
            className="p-3.5 rounded-xl bg-[#FCEEEE] hover:bg-[#F8E1E1] border border-[#F8C8C8] text-left transition-colors cursor-pointer space-y-1"
          >
            <div className="text-xs font-bold text-[#C44141]">Denaturation Stress Test</div>
            <div className="text-[11px] text-[#24242B] font-mono">70&deg;C with IsPETase</div>
            <div className="text-[10px] text-[#C44141]">Illustrative scenario &mdash; not a literature-derived operating condition</div>
          </button>
        </div>
      </div>

      {/* Main Environmental Parameter Sliders */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Temperature Controller */}
        <div className="bg-white rounded-2xl p-6 border border-[#E7E7EB] shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Thermometer className="w-4 h-4 text-[#9785E8]" />
              <label className="text-xs font-bold uppercase tracking-wider text-[#24242B]">
                Reaction Temperature
              </label>
            </div>
            <div className="flex items-center gap-1 font-mono text-base font-bold text-[#7461CE] bg-[#FAF9FD] px-3 py-1 rounded-xl border border-[#EAE5FA]">
              <span>{env.temperature_celsius.toFixed(1)}</span>
              <span className="text-xs text-[#777780] font-normal">&deg;C</span>
            </div>
          </div>

          <input
            type="range"
            min="4"
            max="95"
            step="0.5"
            value={env.temperature_celsius}
            onChange={e => handleUpdate({ temperature_celsius: parseFloat(e.target.value) })}
            className="w-full accent-[#9785E8] cursor-pointer h-2 bg-[#F2F2F4] rounded-lg"
          />

          <div className="flex items-center justify-between text-[10px] font-mono text-[#777780]">
            <span>4&deg;C</span>
            <span className="text-[#2D8A6E] font-semibold">30&deg;C (IsPETase opt)</span>
            <span className="text-[#7461CE] font-semibold">50&deg;C (FAST-PETase)</span>
            <span className="text-[#9785E8] font-semibold">72&deg;C (LCC opt)</span>
            <span>95&deg;C</span>
          </div>

          <p className="text-[11px] text-[#777780] leading-relaxed">
            Governs enzyme active-site turnover velocity. Polymer chain mobility in amorphous regions is associated in the literature with proximity to the PET glass transition temperature (Tg&thinsp;&asymp;&thinsp;67&deg;C), but Tg alone does not directly determine enzymatic degradation rate.
          </p>
        </div>

        {/* pH Controller */}
        <div className="bg-white rounded-2xl p-6 border border-[#E7E7EB] shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Droplets className="w-4 h-4 text-[#72C7B0]" />
              <label className="text-xs font-bold uppercase tracking-wider text-[#24242B]">
                Medium Ionization (pH)
              </label>
            </div>
            <div className="font-mono text-base font-bold text-[#2D8A6E] bg-[#E8F6F1] px-3 py-1 rounded-xl border border-[#C6E8DC]">
              {env.ph.toFixed(1)}
            </div>
          </div>

          <input
            type="range"
            min="2.0"
            max="12.0"
            step="0.1"
            value={env.ph}
            onChange={e => handleUpdate({ ph: parseFloat(e.target.value) })}
            className="w-full accent-[#72C7B0] cursor-pointer h-2 bg-[#F2F2F4] rounded-lg"
          />

          <div className="flex items-center justify-between text-[10px] font-mono text-[#777780]">
            <span className="text-[#C44141]">pH 2 (Acidic)</span>
            <span className="text-[#2D8A6E] font-semibold">pH 7.0 (Neutral)</span>
            <span className="text-[#7461CE] font-semibold">pH 8.0 (Alkaline)</span>
            <span>pH 12</span>
          </div>

          <p className="text-[11px] text-[#777780] leading-relaxed">
            Maintains the ionization state of the catalytic triad (Ser-His-Asp). Unbuffered digests suffer proton accumulation from released terephthalate.
          </p>
        </div>

        {/* Oxygen Availability (Segmented Buttons) */}
        <div className="bg-white rounded-2xl p-6 border border-[#E7E7EB] shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <Wind className="w-4 h-4 text-[#9785E8]" />
            <label className="text-xs font-bold uppercase tracking-wider text-[#24242B]">
              Dissolved Oxygen Availability
            </label>
          </div>

          <div className="grid grid-cols-3 gap-2 bg-[#F7F7F8] p-1.5 rounded-xl border border-[#E7E7EB]">
            {(['Aerobic', 'Microaerophilic', 'Anaerobic'] as OxygenAvailability[]).map(o2 => (
              <button
                key={o2}
                onClick={() => handleUpdate({ oxygen: o2 })}
                className={`py-2 px-3 rounded-lg text-xs font-medium text-center transition-colors cursor-pointer ${
                  env.oxygen === o2
                    ? 'bg-white text-[#24242B] font-bold shadow-xs'
                    : 'text-[#777780] hover:text-[#24242B]'
                }`}
              >
                {o2}
              </button>
            ))}
          </div>

          <p className="text-[11px] text-[#777780] leading-relaxed">
            Obligate aerobe bacterium (Ideonella sakaiensis) requires oxygen for respiratory growth. Cell-free enzyme depolymerization does not consume O&#8322;.
          </p>
        </div>

        {/* Salinity Controller */}
        <div className="bg-white rounded-2xl p-6 border border-[#E7E7EB] shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Waves className="w-4 h-4 text-[#72C7B0]" />
              <label className="text-xs font-bold uppercase tracking-wider text-[#24242B]">
                Medium Salinity (w/v %)
              </label>
            </div>
            <div className="font-mono text-base font-bold text-[#24242B] bg-[#F7F7F8] px-3 py-1 rounded-xl border border-[#E7E7EB]">
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
            className="w-full accent-[#72C7B0] cursor-pointer h-2 bg-[#F2F2F4] rounded-lg"
          />

          <div className="flex items-center justify-between text-[10px] font-mono text-[#777780]">
            <span>0.0% (Fresh)</span>
            <span className="text-[#2D8A6E] font-semibold">3.5% (Seawater)</span>
            <span>10.0% (Hypersaline)</span>
          </div>

          <p className="text-[11px] text-[#777780] leading-relaxed">
            Simulates ocean salinity for marine bio-remediation applications. High ionic strength alters surface electrostatics of esterases.
          </p>
        </div>

        {/* Duration and Agitation Row */}
        <div className="bg-white rounded-2xl p-6 border border-[#E7E7EB] shadow-xs space-y-4 md:col-span-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Timer className="w-4 h-4 text-[#9785E8]" />
                  <label className="text-xs font-bold uppercase tracking-wider text-[#24242B]">
                    Assay Duration (Hours)
                  </label>
                </div>
                <div className="font-mono text-sm font-bold text-[#24242B] bg-[#F7F7F8] px-3 py-1 rounded-xl border border-[#E7E7EB]">
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
                className="w-full accent-[#9785E8] cursor-pointer h-2 bg-[#F2F2F4] rounded-lg"
              />

              <div className="flex items-center justify-between text-[10px] font-mono text-[#777780]">
                <span>1 h</span>
                <span>24 h (1 day)</span>
                <span>72 h (3 days)</span>
                <span>336 h (2 weeks)</span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-[#24242B]">
                  Orbital Agitation (RPM)
                </label>
                <div className="font-mono text-sm font-bold text-[#24242B] bg-[#F7F7F8] px-3 py-1 rounded-xl border border-[#E7E7EB]">
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
                className="w-full accent-[#72C7B0] cursor-pointer h-2 bg-[#F2F2F4] rounded-lg"
              />

              <div className="flex items-center justify-between text-[10px] font-mono text-[#777780]">
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
