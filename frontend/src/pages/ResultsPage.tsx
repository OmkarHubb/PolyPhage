import React from 'react';
import {
  Activity,
  Sparkles,
  ExternalLink,
  Layers,
  ArrowRight,
  BookOpen,
  AlertTriangle,
  CheckCircle2,
  Leaf,
  ShieldAlert,
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
      <div className="p-12 text-center max-w-xl mx-auto space-y-4">
        <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-500">
          <Activity className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-200">No Assessment Results Available</h2>
        <p className="text-xs text-slate-400 leading-relaxed">
          The reaction configuration has not been evaluated by the deterministic scientific engine yet.
          Run the assessment to compute thermodynamic compatibility, degradation pathways, and product yields.
        </p>
        <button
          onClick={onRunAssessment}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded shadow transition cursor-pointer"
        >
          Execute Scientific Assessment Now
        </button>
      </div>
    );
  }

  const scoreColor =
    assessment.overall_score >= 80
      ? 'text-emerald-400 border-emerald-500/50 bg-emerald-950/40'
      : assessment.overall_score >= 50
      ? 'text-amber-400 border-amber-500/50 bg-amber-950/40'
      : 'text-red-400 border-red-500/50 bg-red-950/40';

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Overview & Score Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-800">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
                Scientific Assessment Finding
              </span>
              <ViabilityBadge status={assessment.overall_status} />
            </div>
            <h1 className="text-xl font-bold text-slate-100">{currentConfig.name}</h1>
            <p className="text-xs text-slate-400 font-mono">
              Evaluated at {new Date(assessment.timestamp).toUTCString()} · Experiment ID: {assessment.experiment_id}
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className={`px-4 py-3 rounded-lg border text-center ${scoreColor}`}>
              <div className="text-2xl font-bold font-mono">{assessment.overall_score}</div>
              <div className="text-[10px] uppercase font-mono tracking-wider font-semibold">Viability Score</div>
            </div>

            <button
              onClick={onNavigateToAI}
              className="px-4 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow transition cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Ask AI to Interpret Findings →</span>
            </button>
          </div>
        </div>

        {/* Executive Summary */}
        <div className="pt-4">
          <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold mb-1.5">
            Executive Scientific Summary
          </h3>
          <p className="text-xs text-slate-200 leading-relaxed bg-slate-950/60 p-3 rounded border border-slate-800/80">
            {assessment.executive_summary}
          </p>
        </div>
      </div>

      {/* Interactive Pathway Graph (React Flow) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-semibold text-slate-200">
              Interactive Biocatalytic Pathway & Reaction Intermediates
            </h2>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            {assessment.active_pathways.length} active pathway sequence(s) resolved
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Component Viability Assessments */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Activity className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-semibold text-slate-200">
              Component Thermodynamic Viability ({assessment.component_assessments.length})
            </h2>
          </div>

          <div className="space-y-3">
            {assessment.component_assessments.map(ca => (
              <div
                key={ca.component_id}
                className="bg-slate-950 rounded-lg p-3.5 border border-slate-800/80 space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-100">{ca.name}</span>
                  <ViabilityBadge status={ca.viability_status} />
                </div>
                <div className="space-y-1 text-[11px] text-slate-400 font-mono">
                  <div className="flex items-start gap-1.5">
                    <span className="text-slate-500 shrink-0">Temp:</span>
                    <span className="text-slate-300">{ca.temperature_assessment}</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="text-slate-500 shrink-0">pH:</span>
                    <span className="text-slate-300">{ca.ph_assessment}</span>
                  </div>
                </div>
                {ca.notes.length > 0 && (
                  <div className="pt-1 text-[11px] text-amber-300/90">
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
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <h2 className="text-sm font-semibold text-slate-200">
              Biochemical Interactions & Synergies ({assessment.interactions.length})
            </h2>
          </div>

          <div className="space-y-3">
            {assessment.interactions.map((inter, idx) => (
              <div
                key={idx}
                className="bg-slate-950 rounded-lg p-3.5 border border-slate-800/80 space-y-2 text-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-semibold text-slate-100">{inter.title}</span>
                  <EvidenceBadge level={inter.confidence} />
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  {inter.description}
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-[10px] text-slate-500 font-mono">Participants:</span>
                  {inter.participants.map(p => (
                    <span
                      key={p}
                      className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800"
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

      {/* Potential Degradation Products Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-semibold text-slate-200">
              Anticipated Degradation Products & Metabolites
            </h2>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            {assessment.potential_products.length} product(s) identified
          </span>
        </div>

        {assessment.potential_products.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500">
            No active cleavage products generated under current conditions (system may be inactivated or missing catalyst).
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-mono uppercase text-slate-400">
                <tr>
                  <th className="px-4 py-2.5">Product Name</th>
                  <th className="px-4 py-2.5">Formula & Molar Mass</th>
                  <th className="px-4 py-2.5">Yield Classification</th>
                  <th className="px-4 py-2.5">Phase & Biological Impact</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {assessment.potential_products.map((p, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/30">
                    <td className="px-4 py-3 font-semibold text-slate-100">{p.name}</td>
                    <td className="px-4 py-3 font-mono text-[11px] text-cyan-400">
                      {p.formula} {p.molar_mass && `· ${p.molar_mass}`}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-emerald-950/60 text-emerald-300 border border-emerald-800/60">
                        {p.yield_classification}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-300 text-[11px] leading-relaxed max-w-md">
                      {p.biological_and_environmental_impact}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Environmental & Climate Implications */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-3">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <Leaf className="w-4 h-4 text-emerald-400" />
          <h2 className="text-sm font-semibold text-slate-200">
            Environmental & Climate Change Impact Analysis
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {assessment.environmental_implications.map((imp, idx) => (
            <div
              key={idx}
              className="bg-slate-950 rounded-lg p-3.5 border border-slate-800/80 space-y-2 text-xs"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-900 text-emerald-300 border border-slate-800 font-semibold">
                  {imp.category}
                </span>
                <span className="text-[10px] font-mono text-slate-400">{imp.severity_or_benefit}</span>
              </div>
              <p className="text-[11px] text-slate-200 font-medium">{imp.finding}</p>
              <p className="text-[11px] text-slate-400 leading-relaxed">{imp.recommendation}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Verified Published Literature Benchmarks */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-blue-400" />
            <h2 className="text-sm font-semibold text-slate-200">
              Empirical Literature Benchmark Data (Verified Citations)
            </h2>
          </div>
          <button
            onClick={() => onNavigateToEvidence()}
            className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-mono cursor-pointer"
          >
            <span>View Full Evidence Library</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>

        <p className="text-[11px] text-slate-400 leading-relaxed">
          PolyPhage AI does not synthesize synthetic kinetic rates or artificial percentage curves.
          The empirical benchmark records below are authentic, published observations reported by original authors.
        </p>

        <div className="space-y-3">
          {assessment.experimental_reference_data_points.map((bm, idx) => (
            <div
              key={idx}
              className="bg-slate-950 rounded-lg p-3.5 border border-slate-800/80 space-y-1.5 text-xs font-mono"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-100">{bm.source}</span>
                <span className="text-[11px] text-cyan-400">DOI: {bm.doi}</span>
              </div>
              <div className="text-[11px] text-slate-400">
                <span className="text-slate-500">Conditions: </span>
                <span>{bm.condition} · Substrate: {bm.substrate}</span>
              </div>
              <div className="text-[11px] text-slate-300 font-sans leading-relaxed pt-1">
                {bm.reported_observation}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Assumptions, Limitations & Scientific Caveats */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
          <ShieldAlert className="w-4 h-4 text-amber-400" />
          <span>Scientific Governance, Assumptions & Uncertainties</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-400">
          <div className="space-y-1.5">
            <span className="text-[11px] font-mono uppercase text-slate-500 block font-semibold">
              Assumptions & System Boundaries
            </span>
            <ul className="space-y-1 list-disc list-inside text-[11px] text-slate-400 leading-relaxed">
              {assessment.assumptions_and_limitations.map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
          </div>
          <div className="space-y-1.5">
            <span className="text-[11px] font-mono uppercase text-slate-500 block font-semibold">
              Missing Evidence & Real-World Variabilities
            </span>
            <ul className="space-y-1 list-disc list-inside text-[11px] text-slate-400 leading-relaxed">
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
