import React from 'react';
import {
  FlaskConical,
  Gauge,
  Activity,
  ArrowRight,
  Clock,
  Sparkles,
  BookOpen,
  Dna,
  Layers,
  ChevronRight,
  Play,
  CheckCircle2,
} from 'lucide-react';
import { ExperimentConfig, AISettings } from '../types';
import { SavedExperimentRecord } from '../services/storage';

interface DashboardPageProps {
  currentConfig: ExperimentConfig;
  recentExperiments: SavedExperimentRecord[];
  aiSettings: AISettings | null;
  onLoadDemoWorkflow: () => void;
  onNewExperiment: () => void;
  onSelectExperiment: (record: SavedExperimentRecord) => void;
  onNavigate: (section: any) => void;
  onRunAssessment: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  currentConfig,
  recentExperiments,
  aiSettings,
  onLoadDemoWorkflow,
  onNewExperiment,
  onSelectExperiment,
  onNavigate,
  onRunAssessment,
}) => {
  const latestAssessment = recentExperiments[0]?.assessment;

  return (
    <div className="p-8 max-w-[1500px] mx-auto space-y-6">
      {/* Three-Column Workstation Composition */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* COLUMN 1 (Left 3 cols): Research Tools & Quick Setup */}
        <div className="lg:col-span-3 space-y-5">
          {/* Quick Demo Workflow Card */}
          <div className="bg-white rounded-2xl p-5 border border-[#E7E7EB] shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#9785E8]">
              <Sparkles className="w-4 h-4" />
              <span>Demonstration Workflow</span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#24242B]">
                PET + IsPETase Benchmark
              </h3>
              <p className="text-xs text-[#777780] mt-1 leading-relaxed">
                Pre-configures amorphous PET film with wild-type IsPETase in neutral phosphate buffer at 30°C.
              </p>
            </div>
            <button
              onClick={onLoadDemoWorkflow}
              className="w-full py-2.5 px-4 bg-[#9785E8] hover:bg-[#8673DC] text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Load Demonstration</span>
            </button>
          </div>

          {/* New Custom Experiment Action */}
          <div className="bg-white rounded-2xl p-5 border border-[#E7E7EB] shadow-xs space-y-3">
            <div className="text-xs font-semibold text-[#24242B] flex items-center justify-between">
              <span>Create Experiment</span>
              <FlaskConical className="w-4 h-4 text-[#72C7B0]" />
            </div>
            <p className="text-xs text-[#777780] leading-relaxed">
              Assemble custom polyester substrates, engineered cutinases, microbial chassis, or buffer matrices.
            </p>
            <button
              onClick={onNewExperiment}
              className="w-full py-2 px-3 bg-[#F7F7F8] hover:bg-[#EFEFF1] text-[#24242B] text-xs font-medium rounded-xl border border-[#E7E7EB] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>New Workspace</span>
              <ChevronRight className="w-3.5 h-3.5 text-[#777780]" />
            </button>
          </div>

          {/* Component Library Shortcuts */}
          <div className="bg-white rounded-2xl p-5 border border-[#E7E7EB] shadow-xs space-y-3">
            <div className="text-xs font-semibold text-[#24242B] flex items-center justify-between">
              <span>Catalog Shortcuts</span>
              <Layers className="w-4 h-4 text-[#9785E8]" />
            </div>
            <div className="space-y-1.5 text-xs">
              <button
                onClick={() => onNavigate('bench')}
                className="w-full px-3 py-2 rounded-lg bg-[#F7F7F8] hover:bg-[#EAE5FA] text-left flex items-center justify-between text-[#24242B] transition-colors cursor-pointer"
              >
                <span>Plastics (PET, PEF, PLA)</span>
                <span className="text-[10px] text-[#777780] font-mono">3 Substrates</span>
              </button>
              <button
                onClick={() => onNavigate('bench')}
                className="w-full px-3 py-2 rounded-lg bg-[#F7F7F8] hover:bg-[#EAE5FA] text-left flex items-center justify-between text-[#24242B] transition-colors cursor-pointer"
              >
                <span>Enzymes (PETase, LCC, MHETase)</span>
                <span className="text-[10px] text-[#777780] font-mono">4 Hydrolases</span>
              </button>
              <button
                onClick={() => onNavigate('bench')}
                className="w-full px-3 py-2 rounded-lg bg-[#F7F7F8] hover:bg-[#EAE5FA] text-left flex items-center justify-between text-[#24242B] transition-colors cursor-pointer"
              >
                <span>Microbes & Buffers</span>
                <span className="text-[10px] text-[#777780] font-mono">6 Components</span>
              </button>
            </div>
          </div>
        </div>

        {/* COLUMN 2 (Center 6 cols): Main Scientific Workspace & Visual Illustration */}
        <div className="lg:col-span-6 space-y-6">
          {/* Main Hero Workspace Panel */}
          <div className="bg-white rounded-2xl p-6 border border-[#E7E7EB] shadow-xs space-y-5">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#E8F6F1] text-[#2D8A6E] text-[11px] font-medium border border-[#C6E8DC]">
                <Dna className="w-3.5 h-3.5" />
                <span>AI for Climate Change · Biochemical Depolymerization</span>
              </div>
              <h1 className="text-xl font-bold text-[#24242B] tracking-tight">
                PolyPhage Virtual Biotechnology Station
              </h1>
              <p className="text-xs text-[#777780] leading-relaxed max-w-xl">
                Model enzymatic polyester chain cleavage under verified thermodynamic boundaries, trace reaction flux to circular monomers, and interpret findings with grounded literature references.
              </p>
            </div>

            {/* Scientific Molecular Cleavage Diagram (Clean SVG Illustration) */}
            <div className="bg-[#FAF9FD] rounded-xl p-5 border border-[#EAE5FA] space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[#7461CE] uppercase tracking-wider text-[10px]">
                  Enzymatic Depolymerization Mechanism
                </span>
                <span className="text-[11px] text-[#777780] font-mono">Ser160 · Asp206 · His237 Triad</span>
              </div>

              {/* Vector Molecular Diagram */}
              <div className="w-full h-44 bg-white rounded-lg border border-[#E7E7EB] p-3 flex flex-col justify-between overflow-hidden relative">
                <div className="flex items-center justify-between text-[11px] font-mono text-[#777780] px-1">
                  <span className="text-[#24242B] font-semibold">PET Ester Backbone</span>
                  <span className="text-[#9785E8] font-semibold">Active Site Nucleophilic Attack</span>
                  <span className="text-[#72C7B0] font-semibold">Monomer Recovery</span>
                </div>

                {/* SVG Visual Scheme */}
                <svg className="w-full h-24" viewBox="0 0 600 90" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Substrate polymer chain */}
                  <rect x="20" y="30" width="130" height="34" rx="8" fill="#F7F7F8" stroke="#E7E7EB" strokeWidth="1.5" />
                  <text x="85" y="47" textAnchor="middle" fill="#24242B" fontSize="10" fontWeight="600" fontFamily="monospace">
                    -[PET]-
                  </text>
                  <text x="85" y="58" textAnchor="middle" fill="#777780" fontSize="8" fontFamily="monospace">
                    (C10H8O4)n
                  </text>

                  {/* Arrow 1 */}
                  <path d="M160 47 H210" stroke="#9785E8" strokeWidth="2" strokeDasharray="3 3" />
                  <polygon points="214,47 207,43 207,51" fill="#9785E8" />

                  {/* Enzyme active cleft */}
                  <rect x="224" y="24" width="150" height="46" rx="10" fill="#EAE5FA" stroke="#D5CBF7" strokeWidth="1.5" />
                  <circle cx="250" cy="47" r="14" fill="#9785E8" fillOpacity="0.2" />
                  <text x="250" y="50" textAnchor="middle" fill="#7461CE" fontSize="9" fontWeight="700">Ser</text>
                  <text x="310" y="43" textAnchor="middle" fill="#24242B" fontSize="10" fontWeight="600">IsPETase / LCC</text>
                  <text x="310" y="56" textAnchor="middle" fill="#7461CE" fontSize="8" fontFamily="monospace">Hydrolysis Cleft</text>

                  {/* Arrow 2 */}
                  <path d="M384 47 H434" stroke="#72C7B0" strokeWidth="2" />
                  <polygon points="438,47 431,43 431,51" fill="#72C7B0" />

                  {/* Products */}
                  <rect x="448" y="18" width="130" height="26" rx="6" fill="#E8F6F1" stroke="#C6E8DC" strokeWidth="1.5" />
                  <text x="513" y="35" textAnchor="middle" fill="#2D8A6E" fontSize="9" fontWeight="600" fontFamily="monospace">
                    TPA (C8H6O4)
                  </text>

                  <rect x="448" y="50" width="130" height="26" rx="6" fill="#F2F2F4" stroke="#E7E7EB" strokeWidth="1.5" />
                  <text x="513" y="67" textAnchor="middle" fill="#24242B" fontSize="9" fontWeight="600" fontFamily="monospace">
                    EG (C2H6O2) + MHET
                  </text>
                </svg>

                <div className="flex items-center justify-between text-[10px] text-[#777780] px-1">
                  <span>Amorphous domain adsorption</span>
                  <span className="text-[#7461CE] font-medium">Water-mediated acyl-enzyme intermediate</span>
                  <span className="text-[#2D8A6E] font-medium">Soluble circular building blocks</span>
                </div>
              </div>
            </div>

            {/* Current Experiment Overview & Primary CTA */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
              <div className="space-y-0.5">
                <span className="text-[11px] font-medium text-[#777780]">Loaded Experiment</span>
                <h4 className="text-xs font-bold text-[#24242B]">{currentConfig.name}</h4>
                <div className="text-[11px] text-[#777780]">
                  {currentConfig.selected_components.length} components selected · {currentConfig.environment.temperature_celsius}°C, pH {currentConfig.environment.ph}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onNavigate('bench')}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#F7F7F8] hover:bg-[#EFEFF1] text-[#24242B] border border-[#E7E7EB] transition-colors cursor-pointer"
                >
                  Open Bench
                </button>
                <button
                  onClick={onRunAssessment}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#9785E8] hover:bg-[#8673DC] text-white shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Run Assessment</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Workflow Stepper Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div
              onClick={() => onNavigate('bench')}
              className="bg-white rounded-2xl p-4 border border-[#E7E7EB] hover:border-[#9785E8] shadow-xs cursor-pointer transition-colors group space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase text-[#9785E8]">Step 1</span>
                <FlaskConical className="w-4 h-4 text-[#9785E8]" />
              </div>
              <div className="text-xs font-bold text-[#24242B]">Lab Bench</div>
              <p className="text-[11px] text-[#777780]">
                Configure substrates, enzymes, hosts, and buffers.
              </p>
            </div>

            <div
              onClick={() => onNavigate('chamber')}
              className="bg-white rounded-2xl p-4 border border-[#E7E7EB] hover:border-[#72C7B0] shadow-xs cursor-pointer transition-colors group space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase text-[#72C7B0]">Step 2</span>
                <Gauge className="w-4 h-4 text-[#72C7B0]" />
              </div>
              <div className="text-xs font-bold text-[#24242B]">Chamber</div>
              <p className="text-[11px] text-[#777780]">
                Tune temperature, pH, aeration, and salinity.
              </p>
            </div>

            <div
              onClick={() => onNavigate('results')}
              className="bg-white rounded-2xl p-4 border border-[#E7E7EB] hover:border-[#9785E8] shadow-xs cursor-pointer transition-colors group space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase text-[#9785E8]">Step 3</span>
                <Activity className="w-4 h-4 text-[#9785E8]" />
              </div>
              <div className="text-xs font-bold text-[#24242B]">Results & Pathways</div>
              <p className="text-[11px] text-[#777780]">
                Inspect reaction intermediates & verified evidence.
              </p>
            </div>
          </div>
        </div>

        {/* COLUMN 3 (Right 3 cols): Research Overview & Recent Assessment */}
        <div className="lg:col-span-3 space-y-5">
          {/* Latest Assessment Status Card */}
          <div className="bg-white rounded-2xl p-5 border border-[#E7E7EB] shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#24242B]">Recent Assessment</span>
              <Activity className="w-4 h-4 text-[#9785E8]" />
            </div>

            {latestAssessment ? (
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-[#FAF9FD] border border-[#EAE5FA] flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-[#777780] font-medium uppercase">Viability Index</div>
                    <div className="text-lg font-bold text-[#7461CE]">
                      {latestAssessment.overall_score} / 100
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-medium uppercase text-[#777780] block">Status</span>
                    <span className="text-xs font-bold capitalize text-[#24242B]">
                      {latestAssessment.overall_status}
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-[#777780] leading-relaxed line-clamp-3">
                  {latestAssessment.executive_summary}
                </p>

                <button
                  onClick={() => onNavigate('results')}
                  className="w-full py-2 bg-[#F7F7F8] hover:bg-[#EFEFF1] text-[#24242B] text-xs font-medium rounded-xl border border-[#E7E7EB] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span>View Assessment Report</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#777780]" />
                </button>
              </div>
            ) : (
              <div className="p-4 text-center text-xs text-[#777780] bg-[#F7F7F8] rounded-xl border border-[#E7E7EB]">
                No assessment run recorded yet. Click "Run Scientific Assessment" to generate findings.
              </div>
            )}
          </div>

          {/* Evidence Status Card */}
          <div className="bg-white rounded-2xl p-5 border border-[#E7E7EB] shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#24242B]">Literature Evidence</span>
              <BookOpen className="w-4 h-4 text-[#72C7B0]" />
            </div>
            <p className="text-xs text-[#777780] leading-relaxed">
              Curated peer-reviewed publications strictly establishing verified biochemical boundaries.
            </p>
            <div className="p-2.5 bg-[#E8F6F1] rounded-xl border border-[#C6E8DC] flex items-center gap-2 text-xs text-[#2D8A6E]">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span className="font-medium text-[11px]">7 Peer-Reviewed Papers Indexed</span>
            </div>
            <button
              onClick={() => onNavigate('evidence')}
              className="w-full py-2 bg-[#F7F7F8] hover:bg-[#EFEFF1] text-[#24242B] text-xs font-medium rounded-xl border border-[#E7E7EB] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>Explore Library</span>
              <ChevronRight className="w-3.5 h-3.5 text-[#777780]" />
            </button>
          </div>

          {/* Recent Experiments History */}
          <div className="bg-white rounded-2xl p-5 border border-[#E7E7EB] shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#777780]" />
                <span className="text-xs font-semibold text-[#24242B]">Experiment History</span>
              </div>
              <span className="text-[10px] font-mono text-[#A0A0A8]">
                {recentExperiments.length} saved
              </span>
            </div>

            {recentExperiments.length === 0 ? (
              <div className="text-[11px] text-[#777780] text-center py-3">
                No past runs recorded.
              </div>
            ) : (
              <div className="space-y-1.5">
                {recentExperiments.slice(0, 4).map(exp => (
                  <div
                    key={exp.id}
                    onClick={() => onSelectExperiment(exp)}
                    className="p-2 rounded-lg hover:bg-[#F7F7F8] transition-colors cursor-pointer border border-transparent hover:border-[#E7E7EB] flex items-center justify-between text-xs"
                  >
                    <div className="truncate pr-2">
                      <div className="font-medium text-[#24242B] truncate">{exp.config.name}</div>
                      <div className="text-[10px] text-[#777780]">
                        {exp.config.environment.temperature_celsius}°C · pH {exp.config.environment.ph}
                      </div>
                    </div>
                    {exp.assessment && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-[#E8F6F1] text-[#2D8A6E] shrink-0">
                        {exp.assessment.overall_score}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
