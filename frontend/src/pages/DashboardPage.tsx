import React from 'react';
import {
  Sparkles,
  FlaskConical,
  Gauge,
  Activity,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  Atom,
} from 'lucide-react';
import { ExperimentConfig, ScientificAssessmentResult, AISettings } from '../types';
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
  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-[#0e1726] border border-slate-800 rounded-xl p-6 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-emerald-500/10 to-transparent pointer-events-none" />
        <div className="max-w-2xl space-y-3 relative z-10">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-800/60 text-emerald-300 text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Virtual Biotechnology Workstation · AI for Climate Change
          </div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">
            Accelerating Biological Plastic Degradation with Deterministic Science & AI
          </h1>
          <p className="text-slate-300 text-xs leading-relaxed">
            Configure enzyme-substrate micro-environments, test thermodynamic and biochemical compatibility thresholds,
            trace exact reaction pathways to circular monomers, and interpret findings with an optional AI co-pilot.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={onLoadDemoWorkflow}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg flex items-center gap-2 shadow transition cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Load PET + PETase Hackathon Demo</span>
            </button>
            <button
              onClick={onNewExperiment}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 flex items-center gap-2 transition cursor-pointer"
            >
              <FlaskConical className="w-3.5 h-3.5 text-cyan-400" />
              <span>New Custom Experiment</span>
            </button>
          </div>
        </div>
      </div>

      {/* Workflow Navigation Stepper */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div
          onClick={() => onNavigate('bench')}
          className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 p-4 rounded-lg cursor-pointer transition group"
        >
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-mono text-emerald-400">Step 1</span>
            <FlaskConical className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition" />
          </div>
          <h3 className="text-sm font-semibold text-slate-200">Lab Bench</h3>
          <p className="text-xs text-slate-400 mt-1">
            {currentConfig.selected_components.length} components selected (Substrates, Enzymes, Buffers).
          </p>
          <div className="mt-3 flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
            <span>Configure Components</span>
            <ArrowRight className="w-3 h-3" />
          </div>
        </div>

        <div
          onClick={() => onNavigate('chamber')}
          className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 p-4 rounded-lg cursor-pointer transition group"
        >
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-mono text-cyan-400">Step 2</span>
            <Gauge className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition" />
          </div>
          <h3 className="text-sm font-semibold text-slate-200">Environment Chamber</h3>
          <p className="text-xs text-slate-400 mt-1">
            {currentConfig.environment.temperature_celsius}°C · pH {currentConfig.environment.ph} · {currentConfig.environment.oxygen}
          </p>
          <div className="mt-3 flex items-center gap-1 text-[11px] text-cyan-400 font-medium">
            <span>Tune Parameters</span>
            <ArrowRight className="w-3 h-3" />
          </div>
        </div>

        <div
          onClick={onRunAssessment}
          className="bg-slate-900/90 border border-slate-800 hover:border-emerald-600/60 p-4 rounded-lg cursor-pointer transition group"
        >
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-mono text-purple-400">Step 3</span>
            <Activity className="w-4 h-4 text-purple-400 group-hover:scale-110 transition" />
          </div>
          <h3 className="text-sm font-semibold text-slate-200">Scientific Assessment</h3>
          <p className="text-xs text-slate-400 mt-1">
            Deterministic biochemical rules and literature evidence pipeline.
          </p>
          <div className="mt-3 flex items-center gap-1 text-[11px] text-purple-400 font-medium">
            <span>Execute Assessment</span>
            <ArrowRight className="w-3 h-3" />
          </div>
        </div>

        <div
          onClick={() => onNavigate('ai-assistant')}
          className="bg-slate-900/90 border border-slate-800 hover:border-purple-600/60 p-4 rounded-lg cursor-pointer transition group"
        >
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-mono text-amber-400">Step 4</span>
            <Sparkles className="w-4 h-4 text-amber-400 group-hover:scale-110 transition" />
          </div>
          <h3 className="text-sm font-semibold text-slate-200">AI Scientific Assistant</h3>
          <p className="text-xs text-slate-400 mt-1">
            {aiSettings?.is_active ? `Ready (${aiSettings.provider})` : 'BYOK Optional Co-pilot'}
          </p>
          <div className="mt-3 flex items-center gap-1 text-[11px] text-amber-400 font-medium">
            <span>Consult Assistant</span>
            <ArrowRight className="w-3 h-3" />
          </div>
        </div>
      </div>

      {/* System Integrity & Scientific Rules Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-lg p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-200 mb-1">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Traceable Peer-Reviewed Citations</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Zero fabricated references or synthetic DOIs. Every reaction step and kinetic benchmark maps strictly to authentic literature (e.g. Science, Nature, PNAS).
          </p>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-lg p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-200 mb-1">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span>Thermodynamic Boundary Checks</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Deterministic detection of thermal denaturation (e.g. wild-type IsPETase above 45°C), pH active-site protonation disruption, and acidification from released terephthalate.
          </p>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-lg p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-200 mb-1">
            <Atom className="w-4 h-4 text-cyan-400" />
            <span>BYOK Local AI Isolation</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            API credentials remain server-side only. Deterministic laboratory assessments run 100% independently without requiring an AI API key.
          </p>
        </div>
      </div>

      {/* Recent Experiments Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-lg overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-200">Recent Laboratory Experiments</h2>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            {recentExperiments.length} saved in LocalStorage
          </span>
        </div>

        {recentExperiments.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No completed experiments saved yet. Click "Load PET + PETase Hackathon Demo" or run an assessment to record results.
          </div>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {recentExperiments.map(exp => (
              <div
                key={exp.id}
                onClick={() => onSelectExperiment(exp)}
                className="px-5 py-3.5 flex items-center justify-between hover:bg-slate-800/40 transition cursor-pointer"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-semibold text-slate-200">{exp.config.name}</span>
                    {exp.assessment && (
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                          exp.assessment.overall_status === 'viable'
                            ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800'
                            : exp.assessment.overall_status === 'suboptimal'
                            ? 'bg-amber-950/60 text-amber-300 border-amber-800'
                            : 'bg-red-950/60 text-red-300 border-red-800'
                        }`}
                      >
                        Score: {exp.assessment.overall_score}/100 · {exp.assessment.overall_status}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400 flex items-center gap-4">
                    <span>{exp.config.selected_components.length} components</span>
                    <span>·</span>
                    <span>
                      {exp.config.environment.temperature_celsius}°C, pH {exp.config.environment.ph}
                    </span>
                    <span>·</span>
                    <span>Saved {new Date(exp.savedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-400 hover:text-slate-200 font-medium">
                  <span>Open Results</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
