import React, { useState } from 'react';
import {
  Activity,
  Sparkles,
  ExternalLink,
  Layers,
  BookOpen,
  Leaf,
  ShieldAlert,
  Play,
  ArrowRight,
  Info,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  AlertCircle,
  RefreshCw,
  Download,
  FileText,
} from 'lucide-react';
import {
  ScientificAssessmentResult,
  ExperimentConfig,
  AISettings,
} from '../types';
import { PathwayFlow } from '../components/pathway/PathwayFlow';
import { ViabilityBadge, EvidenceBadge } from '../components/common/Badges';
import { generateAssessmentPDF } from '../services/reportGenerator';

interface ResultsPageProps {
  assessment: ScientificAssessmentResult | null;
  currentConfig: ExperimentConfig;
  aiSettings: AISettings | null;
  onNavigateToAI: (options?: { action?: 'generate_scientific_interpretation'; experimentId?: string }) => void;
  onNavigateToEvidence: (evidenceId?: string) => void;
  onRunAssessment: () => void;
  isStale?: boolean;
  isAssessing?: boolean;
  assessmentError?: string | null;
}

export const ResultsPage: React.FC<ResultsPageProps> = ({
  assessment,
  currentConfig,
  aiSettings,
  onNavigateToAI,
  onNavigateToEvidence,
  onRunAssessment,
  isStale = false,
  isAssessing = false,
  assessmentError = null,
}) => {
  const [showScoreBreakdown, setShowScoreBreakdown] = useState(false);
  if (!assessment) {
    return (
      <div className="p-16 text-center max-w-xl mx-auto space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-[#EAE5FA] flex items-center justify-center mx-auto text-[#9785E8]">
          <Activity className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-bold text-[#24242B]">No Assessment Results Generated Yet</h2>
        <p className="text-xs text-[#777780] leading-relaxed">
          The reaction configuration has not been evaluated by the deterministic scientific engine.
          Run the assessment to model thermodynamic compatibility, resolve degradation pathways, and inspect intermediate products.
        </p>

        {assessmentError && (
          <div className="p-3 bg-[#FCEEEE] border border-[#F8C8C8] rounded-xl text-left text-xs text-[#C44141] flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Assessment Request Failed</p>
              <p className="text-[11px] text-[#9B2A2A]">{assessmentError}</p>
            </div>
          </div>
        )}

        <button
          onClick={onRunAssessment}
          disabled={isAssessing}
          className="px-5 py-2.5 bg-[#9785E8] hover:bg-[#8673DC] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-2 mx-auto disabled:opacity-50"
        >
          {isAssessing ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Evaluating Biochemical Compatibility...</span>
            </>
          ) : (
            <span>Execute Scientific Assessment Now</span>
          )}
        </button>
      </div>
    );
  }

  const scoreBadgeStyle =
    assessment.overall_score >= 80
      ? 'text-[#2D8A6E] border-[#C6E8DC] bg-[#E8F6F1]'
      : assessment.overall_score >= 50
      ? 'text-[#B47820] border-[#F6E1C4] bg-[#FEF6EB]'
      : 'text-[#C44141] border-[#F8C8C8] bg-[#FCEEEE]';

  return (
    <div className="p-5 md:p-6 lg:p-8 max-w-[1560px] mx-auto space-y-6">
      
      {/* Stale Assessment Warning Banner */}
      {isStale && (
        <div className="bg-[#FEF6EB] border border-[#F6E1C4] rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#FDE9CD] text-[#B47820] flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#8F5A13]">
                Experiment configuration has changed since the last assessment. These results represent the previous configuration.
              </p>
              <p className="text-[11px] text-[#A66D1B]">
                Re-run the scientific assessment to model your updated components, temperature, pH, or pressure.
              </p>
            </div>
          </div>
          <button
            onClick={onRunAssessment}
            disabled={isAssessing}
            className="shrink-0 px-4 py-2 bg-[#9785E8] hover:bg-[#8673DC] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50 self-end sm:self-auto"
          >
            {isAssessing ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Re-running Assessment...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Re-run Scientific Assessment</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Assessment Error Banner (if re-run failed, preserving previous results) */}
      {assessmentError && (
        <div className="bg-[#FCEEEE] border border-[#F8C8C8] rounded-2xl p-4 flex items-center gap-3 shadow-xs text-[#C44141]">
          <AlertCircle className="w-5 h-5 shrink-0 text-[#C44141]" />
          <div className="text-xs">
            <p className="font-semibold">Assessment Re-run Failed (Previous Results Preserved)</p>
            <p className="text-[11px] text-[#9B2A2A]">{assessmentError}</p>
          </div>
        </div>
      )}

      {/* SECTION A — ASSESSMENT OVERVIEW */}
      <div className="bg-white rounded-2xl p-6 border border-[#E7E7EB] shadow-xs space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-[#E7E7EB]">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#FAF9FD] text-[#7461CE] border border-[#EAE5FA]">
                Section A · Assessment Overview
              </span>
              <ViabilityBadge status={assessment.overall_status} />
            </div>
            <h1 className="text-xl font-bold text-[#24242B]">{currentConfig.name}</h1>
            <p className="text-xs text-[#777780] font-mono">
              Evaluated: {new Date(assessment.timestamp).toUTCString()} · Experiment ID: <span className="text-[#7461CE] font-bold">{assessment.experiment_id}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="space-y-1">
              <div className={`px-4 py-2.5 rounded-xl border text-center ${scoreBadgeStyle}`}>
                <div className="text-2xl font-bold font-mono">{assessment.overall_score}</div>
                <div className="text-[9px] uppercase font-bold tracking-wider">Compatibility Index</div>
              </div>
            </div>

            <button
              onClick={() => generateAssessmentPDF(currentConfig, assessment)}
              className="px-4 py-3 bg-white hover:bg-[#FAF9FD] text-[#24242B] border border-[#E7E7EB] hover:border-[#D5CBF7] rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
              title="Download publication-grade scientific PDF assessment report"
            >
              <Download className="w-4 h-4 text-[#7461CE]" />
              <span>Download Report (PDF)</span>
            </button>

            <button
              onClick={() => onNavigateToAI({ action: 'generate_scientific_interpretation', experimentId: currentConfig.id || assessment?.experiment_id })}
              className="px-4 py-3 bg-[#9785E8] hover:bg-[#8673DC] text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Ask AI to Interpret &rarr;</span>
            </button>
          </div>
        </div>

        {/* Executive Summary */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#A0A0A8] block">
            Executive Scientific Summary
          </span>
          <p className="text-xs text-[#24242B] leading-relaxed bg-[#FAF9FD] p-4 rounded-xl border border-[#EAE5FA]">
            {assessment.executive_summary}
          </p>
        </div>
      </div>

      {/* SECTION B — ASSESSMENT BREAKDOWN & THERMODYNAMIC VIABILITY */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#72C7B0]" />
            <h2 className="text-sm font-bold text-[#24242B]">
              Section B · Assessment Breakdown &amp; Thermodynamic Viability
            </h2>
          </div>
          <button
            onClick={() => setShowScoreBreakdown(v => !v)}
            className="text-xs text-[#7461CE] hover:text-[#9785E8] flex items-center gap-1 font-medium cursor-pointer"
          >
            <Info className="w-3.5 h-3.5" />
            <span>{showScoreBreakdown ? 'Hide Calculation Trace' : 'View Calculation Methodology & Trace'}</span>
            {showScoreBreakdown ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Score Breakdown Panel (Expandable) */}
        {showScoreBreakdown && (
          <div className="bg-[#FAF9FD] rounded-2xl border border-[#EAE5FA] p-5 space-y-4">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#7461CE] block">
                Compatibility Index &mdash; Calculation Methodology
              </span>
              <p className="text-[11px] text-[#777780] leading-relaxed">
                {assessment.score_methodology ||
                  'Rule-based compatibility index (0\u2013100), calculated from individual component heuristic scores. It is not an experimentally validated degradation yield or probability.'}
              </p>
            </div>

            {/* Individual Component Scores */}
            {assessment.score_breakdown && assessment.score_breakdown.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#A0A0A8] block">
                  1. Component Heuristic Contributions
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {assessment.score_breakdown.map((entry) => (
                    <div key={entry.component_id} className="flex items-center justify-between gap-3 bg-white rounded-lg px-3 py-2 border border-[#E7E7EB] text-xs">
                      <div className="min-w-0">
                        <span className="font-semibold text-[#24242B] truncate block">{entry.name}</span>
                        <span className="text-[10px] text-[#777780] leading-tight block">{entry.basis}</span>
                      </div>
                      <span className={`font-mono font-bold shrink-0 px-2 py-0.5 rounded ${
                        entry.heuristic_score >= 80 ? 'text-[#2D8A6E] bg-[#E8F6F1]' :
                        entry.heuristic_score >= 50 ? 'text-[#B47820] bg-[#FEF6EB]' :
                        'text-[#C44141] bg-[#FCEEEE]'
                      }`}>{entry.heuristic_score}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Detailed Trace: Raw Mean vs Cap/Override */}
            {assessment.score_details && (
              <div className="space-y-2 pt-1 border-t border-[#EAE5FA]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#A0A0A8] block">
                  2. Aggregation &amp; System Overrides
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="bg-white rounded-lg p-2.5 border border-[#E7E7EB]">
                    <span className="text-[10px] text-[#777780] block font-medium">Raw Component Mean:</span>
                    <span className="text-sm font-bold font-mono text-[#24242B]">
                      {assessment.score_details.raw_component_mean} / 100
                    </span>
                    <span className="text-[10px] text-[#A0A0A8] block mt-0.5">Unweighted arithmetic average</span>
                  </div>
                  <div className="bg-white rounded-lg p-2.5 border border-[#E7E7EB]">
                    <span className="text-[10px] text-[#777780] block font-medium">Applied System Cap:</span>
                    <span className={`text-sm font-bold font-mono ${
                      assessment.score_details.applied_cap !== null && assessment.score_details.applied_cap !== undefined
                        ? 'text-[#C44141]'
                        : 'text-[#2D8A6E]'
                    }`}>
                      {assessment.score_details.applied_cap !== null && assessment.score_details.applied_cap !== undefined
                        ? `Capped at ${assessment.score_details.applied_cap}`
                        : 'None (no cap applied)'}
                    </span>
                    <span className="text-[10px] text-[#A0A0A8] block mt-0.5">
                      {assessment.score_details.override_reason || 'Scores within tolerable limits'}
                    </span>
                  </div>
                </div>

                {/* Step-by-Step Calculation Trace */}
                {assessment.score_details.calculation_steps.length > 0 && (
                  <div className="bg-white rounded-lg p-3 border border-[#E7E7EB] space-y-1">
                    <span className="text-[10px] font-bold text-[#7461CE] uppercase tracking-wider block">
                      Deterministic Execution Trace:
                    </span>
                    <ul className="space-y-1 text-[11px] text-[#777780] font-mono leading-relaxed">
                      {assessment.score_details.calculation_steps.map((step, sIdx) => (
                        <li key={sIdx} className="flex items-start gap-1.5">
                          <span className="text-[#9785E8] font-bold shrink-0">&bull;</span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Component Viability & Interactions Split */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          
          {/* Component Viability Findings */}
          <div className="bg-white rounded-2xl p-6 border border-[#E7E7EB] shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-[#E7E7EB] pb-3">
              <Activity className="w-4 h-4 text-[#72C7B0]" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#24242B]">
                Component Thermodynamic Viability ({assessment.component_assessments.length})
              </h2>
            </div>

            <div className="space-y-3">
              {assessment.component_assessments.map(ca => (
                <div
                  key={ca.component_id}
                  className="bg-[#FAFAFC] rounded-xl p-4 border border-[#E7E7EB] space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#24242B]">{ca.name}</span>
                      <span className="text-[10px] text-[#777780] font-mono px-1.5 py-0.5 rounded bg-white border border-[#E7E7EB]">
                        {ca.role}
                      </span>
                    </div>
                    <ViabilityBadge status={ca.viability_status} />
                  </div>

                  {/* Configured Concentration Record */}
                  <div className="flex items-center justify-between text-[11px] bg-white rounded-lg px-2.5 py-1.5 border border-[#E7E7EB]">
                    <span className="text-[#777780] font-medium">Configured Concentration:</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-semibold text-[#7461CE]">
                        {ca.concentration || 'Unspecified'}
                      </span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#FAF9FD] text-[#777780] border border-[#EAE5FA]" title="Experimental Record / Boundary Condition (Non-Kinetic)">
                        Non-Kinetic Record
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1 text-[11px] text-[#777780]">
                    <div className="flex items-start gap-1.5">
                      <span className="text-[#A0A0A8] font-medium shrink-0">Temp:</span>
                      <span className="text-[#24242B]">{ca.temperature_assessment}</span>
                    </div>
                    <div className="flex items-start gap-1.5">
                      <span className="text-[#A0A0A8] font-medium shrink-0">pH:</span>
                      <span className="text-[#24242B]">{ca.ph_assessment}</span>
                    </div>
                  </div>
                  {ca.notes.length > 0 && (
                    <div className="pt-1 text-[11px] text-[#B47820] space-y-0.5">
                      {ca.notes.map((n, i) => (
                        <div key={i} className="flex items-center gap-1">
                          <span>•</span>
                          <span>{n}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {/* Non-kinetic explanation disclaimer */}
              <div className="p-3 bg-[#FAF9FD] border border-[#EAE5FA] rounded-xl text-[11px] text-[#777780] leading-relaxed flex items-start gap-2">
                <Info className="w-4 h-4 text-[#9785E8] shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-[#24242B]">Experimental Record / Boundary Condition (Non-Kinetic): </span>
                  Concentration is recorded for experimental reproducibility. This version does not use concentration to calculate enzymatic reaction rates or degradation yield.
                </div>
              </div>
            </div>
          </div>

          {/* Biochemical Interactions & Synergies */}
          <div className="bg-white rounded-2xl p-6 border border-[#E7E7EB] shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-[#E7E7EB] pb-3">
              <Sparkles className="w-4 h-4 text-[#9785E8]" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#24242B]">
                Biochemical Interactions &amp; Synergies ({assessment.interactions.length})
              </h2>
            </div>

            <div className="space-y-3">
              {assessment.interactions.map((inter, idx) => (
                <div
                  key={idx}
                  className="bg-[#FAFAFC] rounded-xl p-4 border border-[#E7E7EB] space-y-2 text-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-bold text-[#24242B]">{inter.title}</span>
                    <EvidenceBadge level={inter.confidence} />
                  </div>
                  <p className="text-[11px] text-[#777780] leading-relaxed">
                    {inter.description}
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[10px] text-[#A0A0A8] font-medium">Participants:</span>
                    {inter.participants.map(p => (
                      <span
                        key={p}
                        className="text-[10px] px-2 py-0.5 rounded bg-white text-[#24242B] border border-[#E7E7EB] font-medium"
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* SECTION C — BIOCHEMICAL CLEAVAGE PATHWAY & INTERMEDIATES */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#9785E8]" />
            <h2 className="text-sm font-bold text-[#24242B]">
              Section C · Biochemical Cleavage Pathway &amp; Intermediate Products
            </h2>
          </div>
          <span className="text-[11px] text-[#777780] font-medium">
            {assessment.active_pathways.length} sequence(s) active under current conditions
          </span>
        </div>

        {/* Interactive Degradation Pathway (React Flow) */}
        <div className="bg-white rounded-2xl p-6 border border-[#E7E7EB] shadow-xs">
          <PathwayFlow
            pathways={assessment.active_pathways}
            products={assessment.potential_products}
            selectedComponents={currentConfig.selected_components}
            overallStatus={assessment.overall_status}
          />
        </div>

        {/* Degradation Products Table */}
        <div className="bg-white rounded-2xl border border-[#E7E7EB] shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-[#E7E7EB] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#72C7B0]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#24242B]">
                Anticipated Degradation Products &amp; Metabolites
              </h3>
            </div>
            <span className="text-xs text-[#777780]">
              {assessment.potential_products.length} product(s) identified
            </span>
          </div>

          {assessment.potential_products.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#777780]">
              No cleavage products formed under current conditions (catalyst may be inactivated or missing).
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAF9FD] border-b border-[#E7E7EB] text-[10px] font-bold uppercase tracking-wider text-[#777780]">
                  <tr>
                    <th className="px-5 py-3">Product Name &amp; Stage</th>
                    <th className="px-5 py-3">Formula &amp; Molar Mass</th>
                    <th className="px-5 py-3">Classification &amp; Intermediate Role</th>
                    <th className="px-5 py-3">Phase &amp; Biological Fate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E7E7EB]">
                  {assessment.potential_products.map((p, idx) => (
                    <tr key={idx} className="hover:bg-[#FAFAFC] transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-[#24242B]">{p.name}</div>
                        {p.reaction_stage && (
                          <span className={`inline-block mt-0.5 text-[9px] px-2 py-0.5 rounded font-mono font-medium ${
                            p.reaction_stage === 'primary_cleavage_intermediate'
                              ? 'bg-[#FEF6EB] text-[#B47820] border border-[#F6E1C4]'
                              : p.reaction_stage === 'secondary_hydrolysis_product'
                              ? 'bg-[#E8F6F1] text-[#2D8A6E] border border-[#C6E8DC]'
                              : 'bg-[#FAF9FD] text-[#7461CE] border border-[#EAE5FA]'
                          }`}>
                            {p.reaction_stage === 'primary_cleavage_intermediate'
                              ? 'Primary Cleavage Intermediate'
                              : p.reaction_stage === 'secondary_hydrolysis_product'
                              ? 'Secondary Hydrolysis Product'
                              : 'Direct Cleavage Monomer'}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-[11px] text-[#7461CE] font-medium">
                        {p.formula} {p.molar_mass && `· ${p.molar_mass}`}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-[#F7F7F8] text-[#24242B] border border-[#E7E7EB]">
                          {p.yield_classification}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-[#777780] text-[11px] leading-relaxed max-w-md">
                        {p.biological_and_environmental_impact}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* SECTION D — SCIENTIFIC EVIDENCE & LITERATURE BENCHMARKS */}
      <div className="bg-white rounded-2xl p-6 border border-[#E7E7EB] shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-[#E7E7EB] pb-3">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#9785E8]" />
            <h2 className="text-sm font-bold text-[#24242B]">
              Section D · Scientific Evidence &amp; Literature Benchmarks
            </h2>
          </div>
          <button
            onClick={() => onNavigateToEvidence()}
            className="text-xs text-[#7461CE] hover:text-[#9785E8] flex items-center gap-1 font-medium cursor-pointer"
          >
            <span>Explore Evidence Library &rarr;</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>

        <p className="text-[11px] text-[#777780] leading-relaxed">
          PolyPhage AI does not fabricate kinetic curves or synthetic yields. The empirical benchmark records below are authentic, published observations reported by original researchers.
        </p>

        <div className="space-y-3">
          {assessment.experimental_reference_data_points.map((bm, idx) => (
            <div
              key={idx}
              className="bg-[#FAFAFC] rounded-xl p-4 border border-[#E7E7EB] space-y-2 text-xs"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#24242B]">{bm.source}</span>
                  <span className="text-[9px] px-2 py-0.5 rounded-full font-bold bg-[#E8F6F1] text-[#2D8A6E] border border-[#C6E8DC]">
                    Curated Benchmark
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigateToEvidence(bm.doi)}
                  className="text-[11px] font-mono text-[#7461CE] hover:text-[#9785E8] flex items-center gap-1 cursor-pointer transition-colors"
                  title="View this paper in Evidence Library"
                >
                  <span>DOI: {bm.doi}</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
              <div className="text-[11px] text-[#777780]">
                <span className="font-medium text-[#24242B]">Conditions: </span>
                <span>{bm.condition} · Substrate: {bm.substrate}</span>
              </div>
              <div className="text-[11px] text-[#777780] leading-relaxed pt-0.5">
                {bm.reported_observation}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION E — ENVIRONMENTAL IMPACT & SCIENTIFIC GOVERNANCE */}
      <div className="bg-white rounded-2xl p-6 border border-[#E7E7EB] shadow-xs space-y-5">
        <div className="flex items-center justify-between border-b border-[#E7E7EB] pb-3">
          <div className="flex items-center gap-2">
            <Leaf className="w-4 h-4 text-[#72C7B0]" />
            <h2 className="text-sm font-bold text-[#24242B]">
              Section E · Environmental Impact &amp; Scientific Governance
            </h2>
          </div>
          <span className="text-[11px] text-[#777780] font-medium">
            Stoichiometric &amp; Biochemical Boundaries
          </span>
        </div>

        {/* Circularity Potential & Acidification Dynamics Split */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {assessment.circularity_potential && (
            <div className="bg-[#FAF9FD] rounded-xl p-4 border border-[#EAE5FA] space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-[#7461CE] tracking-wider">
                  Circularity &amp; Monomer Recovery Potential
                </span>
                <span className="text-[9px] px-2 py-0.5 rounded bg-white text-[#7461CE] border border-[#D5CBF7] font-medium">
                  Catalytic Fate
                </span>
              </div>
              <p className="text-[11px] text-[#24242B] leading-relaxed">
                {assessment.circularity_potential}
              </p>
            </div>
          )}

          {assessment.acidification_considerations && (
            <div className="bg-[#FEF6EB] rounded-xl p-4 border border-[#F6E1C4] space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-[#B47820] tracking-wider">
                  Acidification &amp; Buffer Dynamics
                </span>
                <span className="text-[9px] px-2 py-0.5 rounded bg-white text-[#B47820] border border-[#F6E1C4] font-medium">
                  pH Equilibrium
                </span>
              </div>
              <p className="text-[11px] text-[#24242B] leading-relaxed">
                {assessment.acidification_considerations}
              </p>
            </div>
          )}
        </div>

        {/* Process Energy & Thermal Requirements */}
        {assessment.process_energy_considerations && assessment.process_energy_considerations.length > 0 && (
          <div className="bg-[#FAFAFC] rounded-xl p-4 border border-[#E7E7EB] space-y-2 text-xs">
            <span className="text-[10px] font-bold uppercase text-[#777780] tracking-wider block">
              Bioreactor Process Energy &amp; Utility Considerations
            </span>
            <ul className="space-y-1 text-[11px] text-[#777780] leading-relaxed grid grid-cols-1 md:grid-cols-2 gap-x-4">
              {assessment.process_energy_considerations.map((energyNote, eIdx) => (
                <li key={eIdx} className="flex items-start gap-1.5">
                  <span className="text-[#9785E8] font-bold shrink-0">&bull;</span>
                  <span>{energyNote}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Detailed Implications Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {assessment.environmental_implications.map((imp, idx) => (
            <div
              key={idx}
              className="bg-[#FAFAFC] rounded-xl p-4 border border-[#E7E7EB] space-y-2 text-xs flex flex-col justify-between"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded bg-white text-[#7461CE] border border-[#D5CBF7] truncate max-w-[150px]">
                    {imp.category}
                  </span>
                  <span className={`text-[9px] font-semibold px-2 py-0.5 rounded border shrink-0 ${
                    imp.severity_or_benefit.includes('Potential Benefit')
                      ? 'text-[#2D8A6E] bg-[#E8F6F1] border-[#BDE7D8]'
                      : imp.severity_or_benefit.includes('Conditional Benefit')
                      ? 'text-[#7461CE] bg-[#FAF9FD] border-[#D5CBF7]'
                      : imp.severity_or_benefit.includes('Requires Validation')
                      ? 'text-[#B47820] bg-[#FEF6EB] border-[#F6E1C4]'
                      : 'text-[#9A6014] bg-[#FEF6EB] border-[#F6E1C4]'
                  }`}>
                    {imp.severity_or_benefit}
                  </span>
                </div>
                <p className="text-[11px] font-bold text-[#24242B]">{imp.finding}</p>
                <p className="text-[11px] text-[#777780] leading-relaxed">{imp.recommendation}</p>
              </div>

              {imp.evidence_type && (
                <div className="pt-2 border-t border-[#E7E7EB]/60">
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-white text-[#777780] border border-[#E7E7EB] font-mono">
                    {imp.evidence_type === 'literature_supported'
                      ? 'Literature-Supported Possibility'
                      : imp.evidence_type === 'theoretical_chemical_consideration'
                      ? 'Theoretical Chemical Consideration'
                      : imp.evidence_type === 'experimentally_measured'
                      ? 'Experimentally Measured Outcome'
                      : 'Rule-Based Platform Assessment'}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Life Cycle Assessment (LCA) System Boundary Disclaimer */}
        <div className="p-3.5 bg-[#FAF9FD] border border-[#EAE5FA] rounded-xl flex items-start gap-3 text-xs text-[#777780]">
          <ShieldAlert className="w-4 h-4 text-[#9785E8] shrink-0 mt-0.5" />
          <div className="space-y-0.5 leading-relaxed text-[11px]">
            <span className="font-semibold text-[#24242B]">Life Cycle Assessment (LCA) System Boundary Disclaimer: </span>
            <span>
              {assessment.lca_disclaimer ||
                'PolyPhage does not currently calculate net greenhouse gas savings or perform a complete Life Cycle Assessment. Environmental benefits depend on process energy, enzyme production, pretreatment, product recovery, purification and the displaced waste-management or virgin-material pathway.'}
            </span>
          </div>
        </div>

        {/* Scientific Governance, Assumptions & Uncertainties */}
        <div className="pt-3 border-t border-[#E7E7EB] space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-[#24242B]">
            <ShieldAlert className="w-4 h-4 text-[#B47820]" />
            <span>Scientific Governance, Assumptions &amp; Uncertainties</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase text-[#A0A0A8] tracking-wider block">
                Assumptions &amp; System Boundaries
              </span>
              <ul className="space-y-1.5 list-disc list-inside text-[11px] text-[#777780] leading-relaxed">
                {assessment.assumptions_and_limitations.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </div>
            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase text-[#A0A0A8] tracking-wider block">
                Missing Evidence &amp; Empirical Factors
              </span>
              <ul className="space-y-1.5 list-disc list-inside text-[11px] text-[#777780] leading-relaxed">
                {assessment.missing_evidence_and_uncertainties.map((u, i) => (
                  <li key={i}>{u}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};
