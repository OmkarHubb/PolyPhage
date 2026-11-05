import React, { useState } from 'react';
import {
  Bot,
  Sparkles,
  Send,
  KeyRound,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  Layers,
  ArrowRight,
  RefreshCw,
  FlaskConical,
} from 'lucide-react';
import {
  ExperimentConfig,
  ScientificAssessmentResult,
  AISettings,
  AIInterpretationResponse,
  AIChatMessage,
} from '../types';
import { api } from '../services/api';

interface AIAssistantPageProps {
  currentConfig: ExperimentConfig;
  assessment: ScientificAssessmentResult | null;
  aiSettings: AISettings | null;
  onNavigateToSettings: () => void;
  onNavigateToResults: () => void;
}

export const AIAssistantPage: React.FC<AIAssistantPageProps> = ({
  currentConfig,
  assessment,
  aiSettings,
  onNavigateToSettings,
  onNavigateToResults,
}) => {
  const [isInterpreting, setIsInterpreting] = useState(false);
  const [interpretation, setInterpretation] = useState<AIInterpretationResponse | null>(null);
  const [interpretationError, setInterpretationError] = useState<string | null>(null);

  // Chat state
  const [chatMessages, setChatMessages] = useState<AIChatMessage[]>([
    {
      role: 'assistant',
      content:
        'Hello researcher. I am your scientific co-pilot for PolyPhage AI. I can explain the catalytic mechanisms of PETase, analyze thermodynamic viability windows, interpret experimental degradation products, or recommend follow-up parameter sweeps grounded strictly in published literature.',
    },
  ]);
  const [userInput, setUserInput] = useState('');
  const [isSendingChat, setIsSendingChat] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  const isConfigured = aiSettings?.is_active ?? false;

  const handleInterpret = async () => {
    if (!assessment) {
      setInterpretationError('No scientific assessment results available. Please run an assessment first.');
      return;
    }
    if (!isConfigured) {
      setInterpretationError('AI Provider is not configured. Please supply an API key in the AI Settings (BYOK) tab.');
      return;
    }

    setIsInterpreting(true);
    setInterpretationError(null);
    try {
      const res = await api.interpretAssessment(currentConfig, assessment);
      setInterpretation(res);
    } catch (e: any) {
      setInterpretationError(e.message || 'Failed to generate AI scientific interpretation.');
    } finally {
      setIsInterpreting(false);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!userInput.trim() || isSendingChat) return;

    if (!isConfigured) {
      setChatError('AI Provider is not configured. Please supply an API key in the AI Settings (BYOK) tab.');
      return;
    }

    const newMsg: AIChatMessage = { role: 'user', content: userInput.trim() };
    const updatedMsgs = [...chatMessages, newMsg];
    setChatMessages(updatedMsgs);
    setUserInput('');
    setIsSendingChat(true);
    setChatError(null);

    try {
      const res = await api.chatAI(
        updatedMsgs,
        currentConfig,
        assessment || undefined
      );
      setChatMessages([...updatedMsgs, { role: 'assistant', content: res.reply }]);
    } catch (err: any) {
      setChatError(err.message || 'Failed to receive response from AI assistant.');
    } finally {
      setIsSendingChat(false);
    }
  };

  const quickQuestions = [
    'Explain the catalytic triad mechanism of IsPETase.',
    'Why is mono-(2-hydroxyethyl) terephthalate (MHET) an inhibitor?',
    'How does operating at 72°C near the PET glass transition temperature enhance LCC kinetics?',
    'What buffer and pH control should I add to prevent acidification?',
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Bot className="w-5 h-5 text-purple-400" />
            <span>AI Scientific Assistant</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Grounded interpretation of experiment findings, reaction mechanisms, and follow-up design.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onNavigateToSettings}
            className={`px-3 py-1.5 rounded text-xs border font-medium flex items-center gap-1.5 transition cursor-pointer ${
              isConfigured
                ? 'bg-purple-950/40 text-purple-300 border-purple-800 hover:bg-purple-900/40'
                : 'bg-amber-950/40 text-amber-300 border-amber-800 hover:bg-amber-900/40'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>{isConfigured ? `BYOK: ${aiSettings?.provider} (${aiSettings?.model})` : 'Configure AI Provider (BYOK)'}</span>
          </button>
        </div>
      </div>

      {/* BYOK Warning if not configured */}
      {!isConfigured && (
        <div className="bg-slate-900/90 border border-amber-800/60 rounded-xl p-5 flex flex-col sm:flex-row items-start justify-between gap-4">
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-2 text-amber-300 font-semibold">
              <AlertCircle className="w-4 h-4 text-amber-400" />
              <span>Bring Your Own Key (BYOK) — AI Assistant is Idle</span>
            </div>
            <p className="text-slate-300 leading-relaxed max-w-2xl">
              The core virtual laboratory and deterministic scientific assessment work 100% independently without an API key.
              To enable AI-assisted interpretation and mechanistic Q&A, supply your OpenAI-compatible API credentials (OpenAI, Groq, OpenRouter, etc.).
            </p>
            <p className="text-[11px] text-slate-400">
              Credentials remain strictly on the backend server and are never exposed to browser LocalStorage or frontend bundles.
            </p>
          </div>
          <button
            onClick={onNavigateToSettings}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-slate-950 text-xs font-bold rounded shadow transition cursor-pointer shrink-0"
          >
            Open AI Settings →
          </button>
        </div>
      )}

      {/* Structured Interpretation Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <h2 className="text-sm font-semibold text-slate-200">
                Structured Scientific Interpretation of Current Assessment
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Analyzes the deterministic findings from {currentConfig.name} ({currentConfig.environment.temperature_celsius}°C, pH {currentConfig.environment.ph}).
            </p>
          </div>

          <button
            onClick={handleInterpret}
            disabled={isInterpreting || !isConfigured || !assessment}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-lg flex items-center gap-2 shadow transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0"
          >
            {isInterpreting ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Interpreting Findings...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Generate Scientific Interpretation</span>
              </>
            )}
          </button>
        </div>

        {interpretationError && (
          <div className="p-3 bg-red-950/40 border border-red-800/80 rounded text-xs text-red-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{interpretationError}</span>
          </div>
        )}

        {!interpretation && !isInterpreting && (
          <div className="p-6 text-center border border-dashed border-slate-800 rounded bg-slate-950/40 text-xs text-slate-500 space-y-1">
            <p>No AI interpretation generated for this experiment run yet.</p>
            <p className="text-[11px] text-slate-600">
              Click "Generate Scientific Interpretation" above to invoke the AI assistant on the current findings.
            </p>
          </div>
        )}

        {interpretation && (
          <div className="space-y-4 text-xs">
            {/* Executive Overview */}
            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-1.5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-purple-400 font-semibold block">
                Executive Biochemical Overview
              </span>
              <p className="text-slate-200 leading-relaxed font-sans text-xs">
                {interpretation.executive_overview}
              </p>
            </div>

            {/* Mechanism & Climate Split */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-1.5">
                <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-semibold block">
                  Catalytic Mechanism & Intermediate Dynamics
                </span>
                <p className="text-slate-300 leading-relaxed text-xs">
                  {interpretation.biochemical_mechanism_analysis}
                </p>
              </div>

              <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-1.5">
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-semibold block">
                  Circular Economy & Climate Mitigation Perspective
                </span>
                <p className="text-slate-300 leading-relaxed text-xs">
                  {interpretation.environmental_and_climate_perspective}
                </p>
              </div>
            </div>

            {/* Uncertainties & Recommended sweeps */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-1.5">
                <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-semibold block">
                  Scientific Caveats & Kinetic Boundaries
                </span>
                <p className="text-slate-300 leading-relaxed text-xs">
                  {interpretation.uncertainties_and_gap_analysis}
                </p>
              </div>

              <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-blue-400 font-semibold block">
                  Recommended Follow-Up Investigations
                </span>
                <ul className="space-y-1.5 text-xs text-slate-300">
                  {interpretation.recommended_follow_up_experiments.map((rec, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-emerald-400 font-bold shrink-0">→</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="text-[10px] text-slate-500 font-mono text-right">
              Generated via {interpretation.provider} ({interpretation.model}) · Grounded in verified reference dataset
            </div>
          </div>
        )}
      </div>

      {/* Interactive Chat Dialogue */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-semibold text-slate-200">
              Interactive Scientific Dialogue
            </h2>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            Context: {currentConfig.selected_components.length} components · {currentConfig.environment.temperature_celsius}°C
          </span>
        </div>

        {/* Quick Question Chips */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-mono text-slate-500 mr-1">Suggested inquiries:</span>
          {quickQuestions.map((q, idx) => (
            <button
              key={idx}
              onClick={() => {
                setUserInput(q);
              }}
              className="text-[11px] px-2.5 py-1 rounded-full bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 transition cursor-pointer"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Message Log */}
        <div className="space-y-3 max-h-96 overflow-y-auto pr-1 bg-slate-950/60 p-4 rounded-lg border border-slate-800/80">
          {chatMessages.map((msg, i) => (
            <div
              key={i}
              className={`flex flex-col ${
                msg.role === 'user' ? 'items-end' : 'items-start'
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1 text-[10px] font-mono text-slate-500">
                <span>{msg.role === 'user' ? 'Researcher' : 'AI Assistant'}</span>
              </div>
              <div
                className={`p-3 rounded-lg text-xs leading-relaxed max-w-2xl whitespace-pre-line ${
                  msg.role === 'user'
                    ? 'bg-slate-800 text-slate-100 border border-slate-700'
                    : 'bg-[#111726] text-slate-200 border border-slate-800'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {isSendingChat && (
            <div className="flex items-center gap-2 text-xs text-slate-400 p-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-purple-400" />
              <span>Consulting scientific literature and formulation rules...</span>
            </div>
          )}
        </div>

        {chatError && (
          <div className="p-2.5 bg-red-950/40 border border-red-800/80 rounded text-xs text-red-200">
            {chatError}
          </div>
        )}

        {/* Chat Input */}
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <input
            type="text"
            value={userInput}
            onChange={e => setUserInput(e.target.value)}
            placeholder={
              isConfigured
                ? 'Ask a scientific question about degradation mechanisms, mutations, or kinetics...'
                : 'Configure AI settings above to enable interactive scientific dialogue...'
            }
            disabled={!isConfigured || isSendingChat}
            className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!isConfigured || !userInput.trim() || isSendingChat}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send</span>
          </button>
        </form>
      </div>
    </div>
  );
};
