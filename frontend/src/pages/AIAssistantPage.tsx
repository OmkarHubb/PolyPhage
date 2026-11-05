import React, { useState } from 'react';
import {
  Bot,
  Sparkles,
  Send,
  KeyRound,
  AlertCircle,
  RefreshCw,
  ArrowRight,
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
}) => {
  const [isInterpreting, setIsInterpreting] = useState(false);
  const [interpretation, setInterpretation] = useState<AIInterpretationResponse | null>(null);
  const [interpretationError, setInterpretationError] = useState<string | null>(null);

  // Chat state
  const [chatMessages, setChatMessages] = useState<AIChatMessage[]>([
    {
      role: 'assistant',
      content:
        'Welcome. I am your scientific research copilot for PolyPhage AI. I interpret reaction viability, analyze active-site catalytic triad dynamics (Ser160-His237-Asp206), explain intermediate feedback inhibition, and recommend follow-up experimental sweeps strictly grounded in verified literature.',
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
    'Why does MHET accumulate and inhibit the primary enzyme?',
    'How does operating at 72°C near the PET Tg enhance LCC turnover?',
    'What buffer and pH control should I add to prevent acidification?',
  ];

  return (
    <div className="p-8 max-w-[1500px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#24242B] flex items-center gap-2">
            <Bot className="w-5 h-5 text-[#9785E8]" />
            <span>AI Scientific Assistant</span>
          </h1>
          <p className="text-xs text-[#777780] mt-1">
            Grounded interpretation of experiment findings, reaction mechanisms, and follow-up design.
          </p>
        </div>

        <button
          onClick={onNavigateToSettings}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto ${
            isConfigured
              ? 'bg-[#EAE5FA] text-[#7461CE] border-[#D5CBF7] hover:bg-[#E2DBF8]'
              : 'bg-[#FEF6EB] text-[#B47820] border-[#F6E1C4] hover:bg-[#FDF0DE]'
          }`}
        >
          <KeyRound className="w-3.5 h-3.5" />
          <span>{isConfigured ? `BYOK: ${aiSettings?.provider} (${aiSettings?.model})` : 'Configure AI Provider (BYOK)'}</span>
        </button>
      </div>

      {/* BYOK Idle Banner if unconfigured */}
      {!isConfigured && (
        <div className="bg-white rounded-2xl p-6 border border-[#F6E1C4] shadow-xs flex flex-col sm:flex-row items-start justify-between gap-4">
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-2 text-[#B47820] font-bold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Bring Your Own Key (BYOK) — AI Assistant is Idle</span>
            </div>
            <p className="text-[#24242B] leading-relaxed max-w-2xl">
              The core virtual laboratory and deterministic scientific assessment work 100% independently without an API key.
              To enable AI-assisted interpretation and mechanistic Q&A, supply your OpenAI-compatible API credentials in Settings.
            </p>
            <p className="text-[11px] text-[#777780]">
              Credentials remain strictly on the backend server and are never exposed to browser LocalStorage or frontend bundles.
            </p>
          </div>
          <button
            onClick={onNavigateToSettings}
            className="px-4 py-2 bg-[#9785E8] hover:bg-[#8673DC] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer shrink-0"
          >
            Open Settings →
          </button>
        </div>
      )}

      {/* Structured Scientific Interpretation Section */}
      <div className="bg-white rounded-2xl p-6 border border-[#E7E7EB] shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E7E7EB] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#9785E8]" />
              <h2 className="text-sm font-bold text-[#24242B]">
                Structured Scientific Interpretation
              </h2>
            </div>
            <p className="text-xs text-[#777780] mt-0.5">
              Interprets deterministic findings for {currentConfig.name} ({currentConfig.environment.temperature_celsius}°C, pH {currentConfig.environment.ph}).
            </p>
          </div>

          <button
            onClick={handleInterpret}
            disabled={isInterpreting || !isConfigured || !assessment}
            className="px-4 py-2 bg-[#9785E8] hover:bg-[#8673DC] text-white text-xs font-semibold rounded-xl flex items-center gap-2 shadow-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0"
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
          <div className="p-3 bg-[#FCEEEE] border border-[#F8C8C8] rounded-xl text-xs text-[#C44141] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{interpretationError}</span>
          </div>
        )}

        {!interpretation && !isInterpreting && (
          <div className="p-8 text-center border border-dashed border-[#E7E7EB] rounded-xl bg-[#FAF9FD] text-xs text-[#777780] space-y-1">
            <p className="font-semibold text-[#24242B]">No AI interpretation generated for this experiment run yet.</p>
            <p className="text-[11px]">
              Click "Generate Scientific Interpretation" above to invoke the AI assistant on the current findings.
            </p>
          </div>
        )}

        {interpretation && (
          <div className="space-y-4 text-xs">
            {/* Executive Overview */}
            <div className="bg-[#FAF9FD] p-4 rounded-xl border border-[#EAE5FA] space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#7461CE] block">
                Executive Biochemical Overview
              </span>
              <p className="text-[#24242B] leading-relaxed text-xs">
                {interpretation.executive_overview}
              </p>
            </div>

            {/* Mechanism & Climate Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#FAF9FD] p-4 rounded-xl border border-[#EAE5FA] space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#2D8A6E] block">
                  Catalytic Mechanism & Intermediate Dynamics
                </span>
                <p className="text-[#777780] leading-relaxed text-xs">
                  {interpretation.biochemical_mechanism_analysis}
                </p>
              </div>

              <div className="bg-[#FAF9FD] p-4 rounded-xl border border-[#EAE5FA] space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#7461CE] block">
                  Circular Economy & Climate Perspective
                </span>
                <p className="text-[#777780] leading-relaxed text-xs">
                  {interpretation.environmental_and_climate_perspective}
                </p>
              </div>
            </div>

            {/* Caveats & Recommended Experiments */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#FAF9FD] p-4 rounded-xl border border-[#EAE5FA] space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#B47820] block">
                  Scientific Caveats & Kinetic Boundaries
                </span>
                <p className="text-[#777780] leading-relaxed text-xs">
                  {interpretation.uncertainties_and_gap_analysis}
                </p>
              </div>

              <div className="bg-[#FAF9FD] p-4 rounded-xl border border-[#EAE5FA] space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#7461CE] block">
                  Recommended Follow-Up Investigations
                </span>
                <ul className="space-y-1.5 text-xs text-[#24242B]">
                  {interpretation.recommended_follow_up_experiments.map((rec, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-[#72C7B0] font-bold shrink-0">→</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="text-[10px] text-[#A0A0A8] font-mono text-right">
              Generated via {interpretation.provider} ({interpretation.model}) · Grounded in literature
            </div>
          </div>
        )}
      </div>

      {/* Interactive Dialogue Section */}
      <div className="bg-white rounded-2xl p-6 border border-[#E7E7EB] shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-[#E7E7EB] pb-3">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-[#72C7B0]" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#24242B]">
              Interactive Scientific Dialogue
            </h2>
          </div>
          <span className="text-xs text-[#777780]">
            Context: {currentConfig.selected_components.length} components · {currentConfig.environment.temperature_celsius}°C
          </span>
        </div>

        {/* Quick Inquiry Chips */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-[#777780] mr-1 font-medium">Suggested queries:</span>
          {quickQuestions.map((q, idx) => (
            <button
              key={idx}
              onClick={() => setUserInput(q)}
              className="text-[11px] px-3 py-1 rounded-full bg-[#F7F7F8] hover:bg-[#EAE5FA] text-[#24242B] border border-[#E7E7EB] transition-colors cursor-pointer"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Messages Log */}
        <div className="space-y-3 max-h-96 overflow-y-auto pr-1 bg-[#FAF9FD] p-4 rounded-xl border border-[#EAE5FA]">
          {chatMessages.map((msg, i) => (
            <div
              key={i}
              className={`flex flex-col ${
                msg.role === 'user' ? 'items-end' : 'items-start'
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1 text-[10px] font-semibold text-[#A0A0A8]">
                <span>{msg.role === 'user' ? 'Researcher' : 'AI Copilot'}</span>
              </div>
              <div
                className={`p-3.5 rounded-xl text-xs leading-relaxed max-w-2xl whitespace-pre-line shadow-2xs ${
                  msg.role === 'user'
                    ? 'bg-[#EAE5FA] text-[#24242B] border border-[#D5CBF7]'
                    : 'bg-white text-[#24242B] border border-[#E7E7EB]'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {isSendingChat && (
            <div className="flex items-center gap-2 text-xs text-[#777780] p-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#9785E8]" />
              <span>Analyzing scientific literature & biochemical rules...</span>
            </div>
          )}
        </div>

        {chatError && (
          <div className="p-3 bg-[#FCEEEE] border border-[#F8C8C8] rounded-xl text-xs text-[#C44141]">
            {chatError}
          </div>
        )}

        {/* Input Form */}
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <input
            type="text"
            value={userInput}
            onChange={e => setUserInput(e.target.value)}
            placeholder={
              isConfigured
                ? 'Ask a scientific question about degradation mechanisms, mutations, or kinetics...'
                : 'Configure AI settings above to enable interactive dialogue...'
            }
            disabled={!isConfigured || isSendingChat}
            className="flex-1 bg-white border border-[#E7E7EB] rounded-xl px-4 py-2.5 text-xs text-[#24242B] placeholder-[#A0A0A8] focus:outline-none focus:border-[#9785E8] disabled:opacity-50 shadow-xs"
          />
          <button
            type="submit"
            disabled={!isConfigured || !userInput.trim() || isSendingChat}
            className="px-4 py-2.5 bg-[#9785E8] hover:bg-[#8673DC] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-xs"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send</span>
          </button>
        </form>
      </div>
    </div>
  );
};
