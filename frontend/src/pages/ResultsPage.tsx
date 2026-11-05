import React from 'react';
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
} from 'lucide-react';
import {
  ScientificAssessmentResult,
  ExperimentConfig,
  AISettings,
} from '../types';
import { PathwayFlow } from '../components/pathway/PathwayFlow';
import { ViabilityBadge, EvidenceBadge } from '../components/common/Badges';

interface ResultsPageProps {
  assessment: ScientificAssessmentResult | null;
  currentConfig: ExperimentConfig;
  aiSettings: AISettings | null;
  onNavigateToAI: () => void;
  onNavigateToEvidence: (evidenceId?: string) => void;
  onRunAssessment: () => void;
}

export const ResultsPage: React.FC<ResultsPageProps> = ({
  assessment,
  currentConfig,
  aiSettings,
  onNavigateToAI,
  onNavigateToEvidence,
  onRunAssessment,
}) => {
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
        <button
          onClick={onRunAssessment}
          className="px-5 py-2.5 bg-[#9785E8] hover:bg-[#8673DC] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
        >
          Execute Scientific Assessment Now
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
    <div className="p-8 max-w-[1500px] mx-auto space-y-6">
      
      {/* Assessment Overview Card */}
      <div className="bg-white rounded-2xl p-6 border border-[#E7E7EB] shadow-xs space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-[#E7E7EB]">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#777780]">
                Scientific Assessment Finding
              </span>
              <ViabilityBadge status={assessment.overall_status} />
            </div>
            <h1 className="text-xl font-bold text-[#24242B]">{currentConfig.name}</h1>
            <p className="text-xs text-[#777780] font-mono">
              Evaluated: {new Date(assessment.timestamp).toUTCString()} · Experiment ID: {assessment.experiment_id}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className={`px-4 py-2.5 rounded-xl border text-center ${scoreBadgeStyle}`}>
              <div className="text-2xl font-bold font-mono">{assessment.overall_score}</div>
              <div className="text-[9px] uppercase font-bold tracking-wider">Viability Score</div>
            </div>

            <button
              onClick={onNavigateToAI}
              className="px-4 py-3 bg-[#9785E8] hover:bg-[#8673DC] text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Ask AI to Interpret →</span>
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

      {/* CENTRAL VISUAL ELEMENT: Interactive Degradation Pathway (React Flow) */}
      <div className="bg-white rounded-2xl p-6 border border-[#E7E7EB] shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#9785E8]" />
            <h2 className="text-sm font-bold text-[#24242B]">
              Enzymatic Cleavage Pathway & Reaction Flux
            </h2>
          </div>
          <span className="text-[11px] text-[#777780] font-medium">
            {assessment.active_pathways.length} sequence(s) active under current conditions
          </span>
        </div>

        <PathwayFlow
          pathways={assessment.active_pathways}
          products={assessment.potential_products}
          selectedComponents={currentConfig.selected_components}
          overallStatus={assessment.overall_status}
        />
      </div>

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
                  <span className="font-bold text-[#24242B]">{ca.name}</span>
                  <ViabilityBadge status={ca.viability_status} />
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
          </div>
        </div>

        {/* Biochemical Interactions & Synergies */}
        <div className="bg-white rounded-2xl p-6 border border-[#E7E7EB] shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-[#E7E7EB] pb-3">
            <Sparkles className="w-4 h-4 text-[#9785E8]" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#24242B]">
              Biochemical Interactions & Synergies ({assessment.interactions.length})
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

      {/* Degradation Products Table */}
      <div className="bg-white rounded-2xl border border-[#E7E7EB] shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E7E7EB] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#72C7B0]" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#24242B]">
              Anticipated Degradation Products & Metabolites
            </h2>
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
                  <th className="px-5 py-3">Product Name</th>
                  <th className="px-5 py-3">Formula & Molar Mass</th>
                  <th className="px-5 py-3">Yield Classification</th>
                  <th className="px-5 py-3">Phase & Biological Fate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7E7EB]">
                {assessment.potential_products.map((p, idx) => (
                  <tr key={idx} className="hover:bg-[#FAFAFC] transition-colors">
                    <td className="px-5 py-3.5 font-bold text-[#24242B]">{p.name}</td>
                    <td className="px-5 py-3.5 font-mono text-[11px] text-[#7461CE] font-medium">
                      {p.formula} {p.molar_mass && `· ${p.molar_mass}`}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-[#E8F6F1] text-[#2D8A6E] border border-[#C6E8DC]">
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

      {/* Environmental & Climate Impact Analysis */}
      <div className="bg-white rounded-2xl p-6 border border-[#E7E7EB] shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b border-[#E7E7EB] pb-3">
          <Leaf className="w-4 h-4 text-[#72C7B0]" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#24242B]">
            Environmental & Climate Change Impact Analysis
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {assessment.environmental_implications.map((imp, idx) => (
            <div
              key={idx}
              className="bg-[#FAFAFC] rounded-xl p-4 border border-[#E7E7EB] space-y-2 text-xs"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-white text-[#7461CE] border border-[#D5CBF7]">
                  {imp.category}
                </span>
                <span className="text-[10px] text-[#777780] font-medium">{imp.severity_or_benefit}</span>
              </div>
              <p className="text-[11px] font-bold text-[#24242B]">{imp.finding}</p>
              <p className="text-[11px] text-[#777780] leading-relaxed">{imp.recommendation}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Published Literature Benchmarks */}
      <div className="bg-white rounded-2xl p-6 border border-[#E7E7EB] shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-[#E7E7EB] pb-3">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#9785E8]" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#24242B]">
              Empirical Literature Benchmark Data
            </h2>
          </div>
          <button
            onClick={() => onNavigateToEvidence()}
            className="text-xs text-[#7461CE] hover:text-[#9785E8] flex items-center gap-1 font-medium cursor-pointer"
          >
            <span>Evidence Library</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>

        <p className="text-[11px] text-[#777780] leading-relaxed">
          PolyPhage AI does not fabricate kinetic curves. The empirical benchmark records below are authentic, published observations reported by original researchers.
        </p>

        <div className="space-y-3">
          {assessment.experimental_reference_data_points.map((bm, idx) => (
            <div
              key={idx}
              className="bg-[#FAFAFC] rounded-xl p-4 border border-[#E7E7EB] space-y-1.5 text-xs"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#24242B]">{bm.source}</span>
                <span className="text-[11px] font-mono text-[#7461CE]">DOI: {bm.doi}</span>
              </div>
              <div className="text-[11px] text-[#777780]">
                <span className="font-medium text-[#24242B]">Conditions: </span>
                <span>{bm.condition} · Substrate: {bm.substrate}</span>
              </div>
              <div className="text-[11px] text-[#777780] leading-relaxed pt-1">
                {bm.reported_observation}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Assumptions & Uncertainties */}
      <div className="bg-white rounded-2xl p-6 border border-[#E7E7EB] shadow-xs space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold text-[#24242B]">
          <ShieldAlert className="w-4 h-4 text-[#B47820]" />
          <span>Scientific Governance, Assumptions & Uncertainties</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase text-[#A0A0A8] tracking-wider block">
              Assumptions & System Boundaries
            </span>
            <ul className="space-y-1.5 list-disc list-inside text-[11px] text-[#777780] leading-relaxed">
              {assessment.assumptions_and_limitations.map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
          </div>
          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase text-[#A0A0A8] tracking-wider block">
              Missing Evidence & Empirical Factors
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
  );
};
