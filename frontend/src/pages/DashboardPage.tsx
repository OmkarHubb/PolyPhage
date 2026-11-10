import React from 'react';
import {
  FlaskConical,
  Activity,
  ArrowRight,
  Clock,
  Sparkles,
  BookOpen,
  Dna,
  ChevronRight,
  Play,
  CheckCircle2,
  Trash2,
} from 'lucide-react';
import { ExperimentConfig, AISettings, ComponentCategory } from '../types';
import { SavedExperimentRecord } from '../services/storage';

interface DashboardPageProps {
  currentConfig: ExperimentConfig;
  recentExperiments: SavedExperimentRecord[];
  aiSettings: AISettings | null;
  onLoadDemoWorkflow: () => void;
  onNewExperiment: () => void;
  onSelectExperiment: (record: SavedExperimentRecord) => void;
  onDeleteExperiment?: (id: string) => void;
  onNavigate: (section: any, categoryFilter?: ComponentCategory | 'All') => void;
  onRunAssessment?: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  currentConfig,
  recentExperiments,
  onLoadDemoWorkflow,
  onNewExperiment,
  onSelectExperiment,
  onDeleteExperiment,
  onNavigate,
}) => {
  const latestAssessment = recentExperiments[0]?.assessment;

  // Derive active components for conditional pathway illustration
  const selectedIds = new Set(currentConfig.selected_components.map(sc => sc.component_id));
  const hasIsPetase = selectedIds.has('comp_ispetase');
  const hasFastPetase = selectedIds.has('comp_fast_petase');
  const hasLcc = selectedIds.has('comp_lcc_iccg');
  const hasMhetase = selectedIds.has('comp_mhetase');
  const anyPetase = hasIsPetase || hasFastPetase;
  const hasCatalyst = anyPetase || hasLcc;

  // Enzyme label and triad shown in diagram
  const enzymeLabel = hasLcc ? 'LCC-ICCG' : hasFastPetase ? 'FAST-PETase' : hasIsPetase ? 'IsPETase' : 'Hydrolase';
  const enzymeTriad = hasLcc ? 'Ser165-Asp210-His242' : 'Ser160-Asp206-His237';

  return (
    <div className="h-full w-full max-w-[1560px] mx-auto p-3.5 md:p-4 lg:p-5 flex flex-col box-border min-h-0">
      {/* Three-Column Workstation Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 lg:gap-4 xl:gap-5 h-full items-stretch min-h-0">
        
        {/* =========================================================================
            COLUMN 1 (Left 3 cols): Quick Actions (Demonstration & New Workspace)
            ========================================================================= */}
        <div className="lg:col-span-3 flex flex-col gap-3.5 lg:gap-4 min-h-0">
          
          {/* Demonstration Workflow Card */}
          <div className="bg-white rounded-2xl p-4 lg:p-5 border border-[#E7E7EB] shadow-xs flex-1 flex flex-col justify-between">
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#9785E8]">
                <Sparkles className="w-4 h-4" />
                <span>Demonstration Workflow</span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#24242B]">
                  PET + IsPETase Benchmark
                </h3>
                <p className="text-xs text-[#777780] mt-1.5 leading-relaxed">
                  Pre-configures amorphous PET film with wild-type IsPETase in neutral phosphate buffer at 30°C.
                </p>
              </div>
            </div>

            <button
              onClick={onLoadDemoWorkflow}
              className="w-full py-2.5 px-4 bg-[#9785E8] hover:bg-[#8673DC] text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer mt-4"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Load Demonstration</span>
            </button>
          </div>

          {/* Create Experiment Card */}
          <div className="bg-white rounded-2xl p-4 lg:p-5 border border-[#E7E7EB] shadow-xs flex-1 flex flex-col justify-between">
            <div className="space-y-2.5">
              <div className="text-xs font-semibold text-[#24242B] flex items-center justify-between">
                <span className="uppercase tracking-wider text-[11px] font-semibold text-[#777780]">Create Experiment</span>
                <FlaskConical className="w-4 h-4 text-[#72C7B0]" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#24242B]">
                  Custom Workspace
                </h3>
                <p className="text-xs text-[#777780] mt-1.5 leading-relaxed">
                  Assemble custom polyester substrates, engineered cutinases, microbial chassis, or buffer matrices.
                </p>
              </div>
            </div>

            <button
              onClick={onNewExperiment}
              className="w-full py-2.5 px-4 bg-[#F7F7F8] hover:bg-[#EFEFF1] text-[#24242B] text-xs font-medium rounded-xl border border-[#E7E7EB] flex items-center justify-center gap-1.5 transition-colors cursor-pointer mt-4"
            >
              <span>New Workspace</span>
              <ChevronRight className="w-3.5 h-3.5 text-[#777780]" />
            </button>
          </div>

        </div>

        {/* =========================================================================
            COLUMN 2 (Center 6 cols): Main Scientific Workspace & Pathway Mechanism
            ========================================================================= */}
        <div className="lg:col-span-6 flex flex-col min-h-0">
          <div className="bg-white rounded-2xl p-5 lg:p-6 border border-[#E7E7EB] shadow-xs h-full flex flex-col justify-between min-h-0">
            
            {/* Context Heading */}
            <div className="space-y-1.5 shrink-0">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#E8F6F1] text-[#2D8A6E] text-[11px] font-medium border border-[#C6E8DC]">
                <Dna className="w-3.5 h-3.5" />
                <span>AI for Climate Change · Biochemical Depolymerization</span>
              </div>
              <h1 className="text-lg lg:text-xl font-bold text-[#24242B] tracking-tight">
                PolyPhage Virtual Biotechnology Station
              </h1>
              <p className="text-xs text-[#777780] leading-relaxed">
                Assess enzymatic polyester chain cleavage under verified biochemical compatibility conditions and trace degradation pathways to expected intermediates.
              </p>
            </div>

            {/* Dynamic Enzymatic Depolymerization Mechanism Diagram */}
            <div className="bg-[#FAF9FD] rounded-xl p-3.5 lg:p-4 border border-[#EAE5FA] my-auto space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[#7461CE] uppercase tracking-wider text-[10px]">
                  Enzymatic Depolymerization Mechanism
                </span>
                <span className="text-[11px] text-[#777780] font-mono">{enzymeTriad} Triad</span>
              </div>

              {/* Vector Molecular Diagram */}
              <div className="w-full bg-white rounded-lg border border-[#E7E7EB] p-3 flex flex-col justify-between overflow-hidden">
                <div className="flex items-center justify-between text-[11px] font-mono text-[#777780] px-1 mb-1">
                  <span className="text-[#24242B] font-semibold">PET Ester Backbone</span>
                  <span className="text-[#9785E8] font-semibold">Active Site Nucleophilic Attack</span>
                  <span className="text-[#72C7B0] font-semibold">
                    {hasMhetase && anyPetase ? 'TPA + EG (via MHETase)' : anyPetase ? 'MHET (primary)' : hasLcc ? 'TPA + EG (direct)' : 'Intermediates'}
                  </span>
                </div>

                {/* SVG Visual Scheme */}
                <svg className="w-full h-20 lg:h-24" viewBox="0 0 600 90" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Substrate polymer chain */}
                  <rect x="20" y="28" width="130" height="34" rx="8" fill="#F7F7F8" stroke="#E7E7EB" strokeWidth="1.5" />
                  <text x="85" y="45" textAnchor="middle" fill="#24242B" fontSize="10" fontWeight="600" fontFamily="monospace">
                    -[PET]-
                  </text>
                  <text x="85" y="56" textAnchor="middle" fill="#777780" fontSize="8" fontFamily="monospace">
                    (C10H8O4)n
                  </text>

                  {/* Arrow 1 */}
                  <path d="M160 45 H210" stroke="#9785E8" strokeWidth="2" strokeDasharray="3 3" />
                  <polygon points="214,45 207,41 207,49" fill="#9785E8" />

                  {/* Enzyme active cleft — dynamic label */}
                  <rect x="224" y="22" width="150" height="46" rx="10" fill="#EAE5FA" stroke="#D5CBF7" strokeWidth="1.5" />
                  <circle cx="250" cy="45" r="14" fill="#9785E8" fillOpacity="0.2" />
                  <text x="250" y="48" textAnchor="middle" fill="#7461CE" fontSize="9" fontWeight="700">Ser</text>
                  <text x="310" y="41" textAnchor="middle" fill="#24242B" fontSize="10" fontWeight="600">{enzymeLabel}</text>
                  <text x="310" y="54" textAnchor="middle" fill="#7461CE" fontSize="8" fontFamily="monospace">Hydrolysis Cleft</text>

                  {/* Arrow 2 */}
                  <path d="M384 45 H434" stroke="#72C7B0" strokeWidth="2" />
                  <polygon points="438,45 431,41 431,49" fill="#72C7B0" />

                  {/* Products — IsPETase/FAST primary: MHET. LCC or + MHETase: TPA+EG */}
                  {(anyPetase && !hasMhetase) ? (
                    <>
                      <rect x="448" y="20" width="130" height="24" rx="6" fill="#FEF6EB" stroke="#F6E1C4" strokeWidth="1.5" />
                      <text x="513" y="36" textAnchor="middle" fill="#B47820" fontSize="9" fontWeight="600" fontFamily="monospace">
                        MHET (C10H10O5)
                      </text>
                      <rect x="448" y="50" width="130" height="22" rx="6" fill="#F2F2F4" stroke="#E7E7EB" strokeWidth="1.5" />
                      <text x="513" y="65" textAnchor="middle" fill="#777780" fontSize="8" fontFamily="monospace">
                        minor: TPA, BHET
                      </text>
                    </>
                  ) : hasCatalyst ? (
                    <>
                      <rect x="448" y="16" width="130" height="26" rx="6" fill="#E8F6F1" stroke="#C6E8DC" strokeWidth="1.5" />
                      <text x="513" y="33" textAnchor="middle" fill="#2D8A6E" fontSize="9" fontWeight="600" fontFamily="monospace">
                        TPA (C8H6O4)
                      </text>
                      <rect x="448" y="48" width="130" height="26" rx="6" fill="#F2F2F4" stroke="#E7E7EB" strokeWidth="1.5" />
                      <text x="513" y="65" textAnchor="middle" fill="#24242B" fontSize="9" fontWeight="600" fontFamily="monospace">
                        EG (C2H6O2)
                      </text>
                    </>
                  ) : (
                    <>
                      <rect x="448" y="24" width="130" height="40" rx="6" fill="#F7F7F8" stroke="#E7E7EB" strokeWidth="1.5" />
                      <text x="513" y="48" textAnchor="middle" fill="#777780" fontSize="9" fontWeight="500" fontFamily="monospace">
                        Awaiting Catalyst
                      </text>
                    </>
                  )}
                </svg>

                <div className="flex items-center justify-between text-[10px] text-[#777780] px-1 mt-1">
                  <span>Amorphous domain adsorption</span>
                  <span className="text-[#7461CE] font-medium">Water-mediated acyl-enzyme intermediate</span>
                  <span className="text-[#2D8A6E] font-medium">
                    {hasMhetase && anyPetase ? 'TPA + EG via cascade' : anyPetase ? 'MHET accumulates (no MHETase)' : hasLcc ? 'TPA + EG direct' : 'Uncatalyzed'}
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Configuration Summary & Lab Bench Action (No duplicate assessment button) */}
            <div className="flex items-center justify-between pt-2 border-t border-[#E7E7EB] shrink-0">
              <div className="space-y-0.5">
                <span className="text-[10px] uppercase font-semibold text-[#A0A0A8] tracking-wider block">Configuration Metadata</span>
                <div className="text-xs text-[#24242B] font-medium flex items-center gap-2">
                  <span>{currentConfig.selected_components.length} components</span>
                  <span className="text-[#A0A0A8]">·</span>
                  <span>{currentConfig.environment.temperature_celsius}°C</span>
                  <span className="text-[#A0A0A8]">·</span>
                  <span>pH {currentConfig.environment.ph}</span>
                  <span className="text-[#A0A0A8]">·</span>
                  <span className="inline-flex items-center gap-1.5 text-[11px]">
                    <span className={`w-2 h-2 rounded-full ${latestAssessment ? 'bg-[#72C7B0]' : 'bg-[#D0D0D6]'}`} />
                    <span className="text-[#777780]">{latestAssessment ? `Assessed (${latestAssessment.overall_status})` : 'Awaiting Run'}</span>
                  </span>
                </div>
              </div>

              <button
                onClick={() => onNavigate('bench')}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#F7F7F8] hover:bg-[#EFEFF1] text-[#24242B] border border-[#E7E7EB] flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>Open Lab Bench</span>
                <ChevronRight className="w-3.5 h-3.5 text-[#777780]" />
              </button>
            </div>

          </div>
        </div>

        {/* =========================================================================
            COLUMN 3 (Right 3 cols): Laboratory Status (Assessment, Evidence, History)
            ========================================================================= */}
        <div className="lg:col-span-3 flex flex-col gap-3 lg:gap-3.5 min-h-0">
          
          {/* Latest Assessment Status Card */}
          <div className="bg-white rounded-2xl p-4 border border-[#E7E7EB] shadow-xs flex-1 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#24242B]">Latest Assessment</span>
                <Activity className="w-4 h-4 text-[#9785E8]" />
              </div>

              {latestAssessment ? (
                <div className="space-y-2">
                  <div className="p-2.5 rounded-xl bg-[#FAF9FD] border border-[#EAE5FA] flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-[#777780] font-medium uppercase">Compatibility Index</div>
                      <div className="text-base font-bold text-[#7461CE]">
                        {latestAssessment.overall_score} / 100
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-medium uppercase text-[#777780] block">Status</span>
                      <span className={`text-xs font-bold capitalize ${
                        latestAssessment.overall_status === 'viable'
                          ? 'text-[#2D8A6E]'
                          : latestAssessment.overall_status === 'suboptimal'
                          ? 'text-[#B47820]'
                          : 'text-[#C44141]'
                      }`}>
                        {latestAssessment.overall_status}
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] text-[#777780] leading-relaxed line-clamp-2">
                    {latestAssessment.executive_summary}
                  </p>
                </div>
              ) : (
                <div className="p-3 text-center text-[11px] text-[#777780] bg-[#F7F7F8] rounded-xl border border-[#E7E7EB]">
                  No assessment recorded. Click "Run Scientific Assessment" above.
                </div>
              )}
            </div>

            {latestAssessment && (
              <button
                onClick={() => onNavigate('results')}
                className="w-full mt-2 py-1.5 bg-[#F7F7F8] hover:bg-[#EFEFF1] text-[#24242B] text-xs font-medium rounded-xl border border-[#E7E7EB] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>View Assessment Report</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#777780]" />
              </button>
            )}
          </div>

          {/* Literature Evidence Card */}
          <div className="bg-white rounded-2xl p-4 border border-[#E7E7EB] shadow-xs flex-1 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#24242B]">Literature Evidence</span>
                <BookOpen className="w-4 h-4 text-[#72C7B0]" />
              </div>
              <p className="text-[11px] text-[#777780] leading-relaxed">
                Curated peer-reviewed publications establishing verified biochemical boundaries.
              </p>
              <div className="p-2 bg-[#E8F6F1] rounded-xl border border-[#C6E8DC] flex items-center gap-2 text-xs text-[#2D8A6E]">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span className="font-medium text-[11px]">7 Peer-Reviewed Papers Indexed</span>
              </div>
            </div>

            <button
              onClick={() => onNavigate('evidence')}
              className="w-full mt-2 py-1.5 bg-[#F7F7F8] hover:bg-[#EFEFF1] text-[#24242B] text-xs font-medium rounded-xl border border-[#E7E7EB] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>Explore Library</span>
              <ChevronRight className="w-3.5 h-3.5 text-[#777780]" />
            </button>
          </div>

          {/* Experiment History Card */}
          <div className="bg-white rounded-2xl p-4 border border-[#E7E7EB] shadow-xs flex-1 flex flex-col justify-between">
            <div className="space-y-2">
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
                <div className="text-[11px] text-[#777780] text-center py-2.5">
                  No past runs recorded.
                </div>
              ) : (
                <div className="space-y-1">
                  {recentExperiments.slice(0, 3).map(exp => (
                    <div
                      key={exp.id}
                      onClick={() => onSelectExperiment(exp)}
                      className="p-1.5 px-2 rounded-lg hover:bg-[#F7F7F8] transition-colors cursor-pointer border border-transparent hover:border-[#E7E7EB] flex items-center justify-between text-xs group"
                    >
                      <div className="truncate pr-2 min-w-0">
                        <div className="font-medium text-[#24242B] truncate text-[11px]">{exp.config.name}</div>
                        <div className="text-[10px] text-[#777780] font-mono">
                          <span className="text-[#7461CE] font-semibold">{exp.id}</span> · {exp.config.environment.temperature_celsius}°C · pH {exp.config.environment.ph}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {exp.assessment && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-[#E8F6F1] text-[#2D8A6E]">
                            {exp.assessment.overall_score}
                          </span>
                        )}
                        {onDeleteExperiment && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteExperiment(exp.id);
                            }}
                            title="Delete from history"
                            className="opacity-0 group-hover:opacity-100 p-1 text-[#A0A0A8] hover:text-[#C44141] transition-opacity cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {recentExperiments.length > 0 && (
              <div className="text-[10px] text-center text-[#A0A0A8] pt-1 border-t border-[#F2F2F4]">
                Click an experiment to restore
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
