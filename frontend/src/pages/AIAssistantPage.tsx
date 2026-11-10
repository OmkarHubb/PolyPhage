import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  Sparkles,
  Send,
  KeyRound,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  FlaskConical,
  CheckCircle2,
  Wrench,
  ChevronDown,
  ExternalLink,
  ArrowDown,
  X,
  Eye,
  CornerDownLeft,
} from 'lucide-react';
import {
  ExperimentConfig,
  ScientificAssessmentResult,
  AISettings,
  AIInterpretationResponse,
  AIChatMessage,
} from '../types';
import { api } from '../services/api';
import { storage } from '../services/storage';

/**
 * Decodes raw HTML character entities (hex, decimal, named) to prevent raw escape leakage.
 */
export const decodeHtmlEntities = (text: string): string => {
  if (!text) return '';
  let decoded = text;
  for (let i = 0; i < 3; i++) {
    const prev = decoded;
    decoded = decoded
      .replace(/&amp;/g, '&')
      .replace(/&#x([0-9a-fA-F]{1,4});?/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
      .replace(/&#([0-9]{1,5});?/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&deg;/g, '°');
    if (decoded === prev) break;
  }
  return decoded;
};

/**
 * Lightweight scientific markdown parser for chat messages.
 * Formats headings, bold text, lists, and clickable DOI / external links.
 */
const renderInlineFormattedText = (rawText: string) => {
  const text = decodeHtmlEntities(rawText);
  const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s]+)|\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`/g;
  const elements: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = linkRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      elements.push(text.substring(lastIndex, match.index));
    }

    if (match[1] && match[2]) {
      // [text](url)
      elements.push(
        <a
          key={match.index}
          href={match[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#7461CE] hover:text-[#5845BD] underline font-medium inline-flex items-center gap-0.5"
        >
          <span>{match[1]}</span>
          <ExternalLink className="w-2.5 h-2.5 inline shrink-0" />
        </a>
      );
    } else if (match[3]) {
      // bare URL
      elements.push(
        <a
          key={match.index}
          href={match[3]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#7461CE] hover:text-[#5845BD] underline font-medium inline-flex items-center gap-0.5"
        >
          <span>{match[3]}</span>
          <ExternalLink className="w-2.5 h-2.5 inline shrink-0" />
        </a>
      );
    } else if (match[4]) {
      // **bold**
      elements.push(
        <strong key={match.index} className="font-semibold text-[#24242B]">
          {match[4]}
        </strong>
      );
    } else if (match[5]) {
      // *italic*
      elements.push(
        <em key={match.index} className="italic text-[#24242B]">
          {match[5]}
        </em>
      );
    } else if (match[6]) {
      // `code`
      elements.push(
        <code key={match.index} className="font-mono text-[10px] bg-[#FAF9FD] px-1 py-0.5 rounded border border-[#E7E7EB] text-[#7461CE]">
          {match[6]}
        </code>
      );
    }

    lastIndex = linkRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    elements.push(text.substring(lastIndex));
  }

  return elements;
};

const ScientificMarkdownView: React.FC<{ content: string }> = ({ content }) => {
  const lines = content.split('\n');
  const renderedElements: React.ReactNode[] = [];
  let currentList: { type: 'ul' | 'ol'; items: string[] } | null = null;

  const flushList = () => {
    if (!currentList) return;
    const listKey = `list-${renderedElements.length}`;
    if (currentList.type === 'ul') {
      renderedElements.push(
        <ul key={listKey} className="space-y-1 my-1 pl-1">
          {currentList.items.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2 text-xs leading-relaxed text-[#24242B]">
              <span className="text-[#9785E8] font-bold mt-0.5 text-[10px] shrink-0">&bull;</span>
              <div className="flex-1">{renderInlineFormattedText(item)}</div>
            </li>
          ))}
        </ul>
      );
    } else {
      renderedElements.push(
        <ol key={listKey} className="space-y-1 my-1 pl-1">
          {currentList.items.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2 text-xs leading-relaxed text-[#24242B]">
              <span className="text-[#7461CE] font-mono text-[11px] font-bold mt-0.5 shrink-0">{idx + 1}.</span>
              <div className="flex-1">{renderInlineFormattedText(item)}</div>
            </li>
          ))}
        </ol>
      );
    }
    currentList = null;
  };

  lines.forEach((line, lineIdx) => {
    const trimmed = line.trim();
    if (!trimmed) {
      flushList();
      return;
    }

    // Headings
    if (trimmed.startsWith('### ')) {
      flushList();
      renderedElements.push(
        <h4 key={lineIdx} className="text-xs font-bold text-[#24242B] mt-3 mb-1 flex items-center gap-1.5 border-b border-[#EAE5FA] pb-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#9785E8] shrink-0"></span>
          <span>{trimmed.substring(4)}</span>
        </h4>
      );
    } else if (trimmed.startsWith('## ')) {
      flushList();
      renderedElements.push(
        <h3 key={lineIdx} className="text-sm font-bold text-[#24242B] mt-3.5 mb-1.5 flex items-center gap-1.5 border-b border-[#EAE5FA] pb-1">
          <span className="w-2 h-2 rounded-full bg-[#7461CE] shrink-0"></span>
          <span>{trimmed.substring(3)}</span>
        </h3>
      );
    } else if (trimmed.startsWith('# ')) {
      flushList();
      renderedElements.push(
        <h2 key={lineIdx} className="text-base font-bold text-[#24242B] mt-4 mb-2">
          {trimmed.substring(2)}
        </h2>
      );
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      // Unordered list item
      if (!currentList || currentList.type !== 'ul') {
        flushList();
        currentList = { type: 'ul', items: [] };
      }
      currentList.items.push(trimmed.substring(2));
    } else if (/^\d+\.\s/.test(trimmed)) {
      // Ordered list item
      if (!currentList || currentList.type !== 'ol') {
        flushList();
        currentList = { type: 'ol', items: [] };
      }
      const itemContent = trimmed.replace(/^\d+\.\s/, '');
      currentList.items.push(itemContent);
    } else {
      flushList();
      renderedElements.push(
        <p key={lineIdx} className="text-xs leading-relaxed text-[#24242B] my-1">
          {renderInlineFormattedText(trimmed)}
        </p>
      );
    }
  });

  flushList();
  return <div className="space-y-1">{renderedElements}</div>;
};

export interface PendingAIAction {
  action: 'generate_scientific_interpretation';
  experimentId?: string;
}

interface AIAssistantPageProps {
  currentConfig: ExperimentConfig;
  assessment: ScientificAssessmentResult | null;
  aiSettings: AISettings | null;
  onNavigateToSettings: () => void;
  onNavigateToResults: () => void;
  onApplyProposal?: (config: ExperimentConfig) => void;
  pendingAction?: PendingAIAction | null;
  onClearPendingAction?: () => void;
  interpretationsByExpId?: Record<string, AIInterpretationResponse>;
  onSaveInterpretation?: (expId: string, interpretation: AIInterpretationResponse) => void;
  chatMessages?: AIChatMessage[];
  onUpdateChatMessages?: (msgs: AIChatMessage[]) => void;
}

export const AIAssistantPage: React.FC<AIAssistantPageProps> = ({
  currentConfig,
  assessment,
  aiSettings,
  onNavigateToSettings,
  onNavigateToResults,
  onApplyProposal,
  pendingAction,
  onClearPendingAction,
  interpretationsByExpId: propInterpretations,
  onSaveInterpretation: propSaveInterpretation,
  chatMessages: propChatMessages,
  onUpdateChatMessages: propUpdateChatMessages,
}) => {
  // Scientific Interpretation on-demand modal state and cache by Experiment ID
  const [isInterpretationOpen, setIsInterpretationOpen] = useState(false);
  const [isInterpreting, setIsInterpreting] = useState(false);
  const [interpretationError, setInterpretationError] = useState<string | null>(null);
  const [localInterpretations, setLocalInterpretations] = useState<Record<string, AIInterpretationResponse>>(() => {
    return propInterpretations || storage.getStoredInterpretations();
  });
  const [hasAppliedModalProposal, setHasAppliedModalProposal] = useState(false);

  const interpretationsByExpId = propInterpretations || localInterpretations;

  // Active experiment identifier
  const currentExpId = currentConfig.id || currentConfig.name || 'default';
  const currentInterpretation = interpretationsByExpId[currentExpId] || null;

  // Chat state
  const [localChatMessages, setLocalChatMessages] = useState<AIChatMessage[]>(() => {
    return (
      propChatMessages ||
      storage.getStoredChatMessages() || [
        {
          role: 'assistant',
          content:
            'Welcome. I am your scientific research copilot for PolyPhage AI. I interpret reaction viability, analyze active-site catalytic triad dynamics (Ser160-His237-Asp206), explain intermediate feedback inhibition, and recommend follow-up experimental sweeps strictly grounded in verified literature.',
        },
      ]
    );
  });

  const chatMessages = propChatMessages || localChatMessages;

  const updateChatMessages = (msgs: AIChatMessage[]) => {
    setLocalChatMessages(msgs);
    storage.saveChatMessages(msgs);
    if (propUpdateChatMessages) {
      propUpdateChatMessages(msgs);
    }
  };

  const saveInterpretation = (expId: string, res: AIInterpretationResponse) => {
    setLocalInterpretations(prev => ({ ...prev, [expId]: res }));
    storage.saveInterpretation(expId, res);
    if (propSaveInterpretation) {
      propSaveInterpretation(expId, res);
    }
  };

  const [userInput, setUserInput] = useState('');
  const [isSendingChat, setIsSendingChat] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [showIdleBanner, setShowIdleBanner] = useState(true);

  // Auto-scrolling and composer refs
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isUserScrolledUpRef = useRef<boolean>(false);
  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState(false);
  const [appliedProposalIds, setAppliedProposalIds] = useState<Set<string>>(new Set());
  const [expandedToolMsgIndices, setExpandedToolMsgIndices] = useState<Set<number>>(new Set());

  const isConfigured = aiSettings?.is_active ?? false;

  // Toggle collapsible tools record
  const toggleTools = (idx: number) => {
    setExpandedToolMsgIndices(prev => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  };

  // Chat container scroll listener to detect upward scrolling
  const handleChatScroll = () => {
    const container = chatContainerRef.current;
    if (!container) return;
    const { scrollTop, scrollHeight, clientHeight } = container;
    const isUp = scrollHeight - scrollTop - clientHeight > 60;
    isUserScrolledUpRef.current = isUp;
    setShowScrollBottomBtn(isUp);
  };

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    const container = chatContainerRef.current;
    if (!container) return;
    container.scrollTo({
      top: container.scrollHeight,
      behavior,
    });
  };

  const handleJumpToLatest = () => {
    isUserScrolledUpRef.current = false;
    setShowScrollBottomBtn(false);
    scrollToBottom('smooth');
  };

  // Auto-scroll when messages change or streaming completes unless user scrolled up
  useEffect(() => {
    if (!isUserScrolledUpRef.current) {
      scrollToBottom('smooth');
    }
  }, [chatMessages, isSendingChat]);

  // ResizeObserver on the messages content wrapper
  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver(() => {
      if (!isUserScrolledUpRef.current) {
        scrollToBottom('smooth');
      }
    });

    const innerContent = container.firstElementChild;
    if (innerContent) {
      resizeObserver.observe(innerContent);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Keyboard shortcut for closing modal with Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isInterpretationOpen) {
        setIsInterpretationOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isInterpretationOpen]);

  // Auto-expand textarea up to 120px
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [userInput]);

  // Scientific Interpretation trigger
  const handleInterpret = async (forceRegenerate: boolean = false) => {
    if (!assessment) {
      setInterpretationError('No scientific assessment results available. Please run an assessment first on the Lab Bench.');
      setIsInterpretationOpen(true);
      return;
    }
    if (!isConfigured) {
      setInterpretationError('AI Provider is not configured. Please supply an API key in the AI Settings (BYOK) tab.');
      setIsInterpretationOpen(true);
      return;
    }

    // If already generated for this experiment and not forcing regenerate, simply open modal
    if (currentInterpretation && !forceRegenerate) {
      setIsInterpretationOpen(true);
      return;
    }

    setIsInterpreting(true);
    setInterpretationError(null);
    setIsInterpretationOpen(true);
    try {
      const res = await api.interpretAssessment(currentConfig, assessment);
      saveInterpretation(currentExpId, res);
    } catch (e: any) {
      setInterpretationError(e.message || 'Failed to generate AI scientific interpretation.');
    } finally {
      setIsInterpreting(false);
    }
  };

  // Action handler for automatic interpretation navigation intent
  const isHandlingPendingActionRef = useRef<boolean>(false);

  useEffect(() => {
    if (!pendingAction) return;

    if (pendingAction.action === 'generate_scientific_interpretation') {
      const targetExpId = pendingAction.experimentId || currentExpId;

      // Prevent duplicate generation caused by React re-renders or StrictMode
      if (isHandlingPendingActionRef.current) return;
      isHandlingPendingActionRef.current = true;

      // Consume/clear navigation intent so it doesn't fire again
      if (onClearPendingAction) {
        onClearPendingAction();
      }

      // Check if already cached
      const cached = interpretationsByExpId[targetExpId];
      if (cached) {
        setIsInterpretationOpen(true);
        isHandlingPendingActionRef.current = false;
        return;
      }

      // Automatically trigger interpretation generation and open modal
      handleInterpret(false).finally(() => {
        isHandlingPendingActionRef.current = false;
      });
    }
  }, [pendingAction, currentExpId, interpretationsByExpId]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!userInput.trim() || isSendingChat) return;

    if (!isConfigured) {
      setChatError('AI Provider is not configured. Please supply an API key in the AI Settings (BYOK) tab.');
      return;
    }

    const newMsg: AIChatMessage = { role: 'user', content: userInput.trim() };
    const updatedMsgs = [...chatMessages, newMsg];
    updateChatMessages(updatedMsgs);
    setUserInput('');
    setIsSendingChat(true);
    setChatError(null);

    // Auto-scroll immediately on user submission
    isUserScrolledUpRef.current = false;
    setShowScrollBottomBtn(false);
    requestAnimationFrame(() => {
      scrollToBottom('smooth');
    });

    try {
      const res = await api.chatAI(
        updatedMsgs,
        currentConfig,
        assessment || undefined
      );
      updateChatMessages([
        ...updatedMsgs,
        {
          role: 'assistant',
          content: res.reply,
          executed_tools: res.executed_tools,
          proposed_experiment: res.proposed_experiment,
        },
      ]);
      requestAnimationFrame(() => {
        if (!isUserScrolledUpRef.current) {
          scrollToBottom('smooth');
        }
      });
    } catch (err: any) {
      setChatError(err.message || 'Failed to receive response from AI assistant.');
    } finally {
      setIsSendingChat(false);
    }
  };

  const handleComposerKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const quickQuestions = [
    'Explain the catalytic triad mechanism of IsPETase.',
    'Why does MHET accumulate and inhibit the primary enzyme?',
    'How does operating at 72°C near the PET Tg enhance LCC turnover?',
    'What buffer and pH control should I add to prevent acidification?',
    'Simulate thermophilic PET degradation with LCC at 70°C, pH 8.0.',
  ];

  return (
    <div className="h-full flex flex-col min-h-0 p-3 sm:p-4 lg:p-5 max-w-[1600px] w-full mx-auto space-y-3">
      {/* 1. Header (Compact, always visible, fits single row on desktop) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#EAE5FA] border border-[#D5CBF7] flex items-center justify-center text-[#7461CE] shrink-0">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-lg font-bold text-[#24242B]">
                AI Scientific Assistant
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[#FAF9FD] text-[#7461CE] border border-[#EAE5FA] font-semibold">
                {currentConfig.id || currentConfig.name}
              </span>
              <span className="text-[10px] text-[#777780] hidden md:inline">
                ({currentConfig.selected_components.length} components · {currentConfig.environment.temperature_celsius}°C · pH {currentConfig.environment.ph})
              </span>
            </div>
            <p className="text-[11px] text-[#777780] mt-0.5">
              Grounded conversational research workstation for biochemical mechanisms and literature validation.
            </p>
          </div>
        </div>

        {/* Action Controls in Header */}
        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 flex-wrap">
          {/* Scientific Interpretation on-demand action */}
          {currentInterpretation ? (
            <button
              type="button"
              onClick={() => setIsInterpretationOpen(true)}
              className="px-3 py-1.5 bg-[#E8F6F1] hover:bg-[#D5EFE6] text-[#2D8A6E] border border-[#C6E8DC] text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer shrink-0"
              title="View existing scientific interpretation for this experiment"
            >
              <Eye className="w-3.5 h-3.5 text-[#2D8A6E]" />
              <span>View Scientific Interpretation</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#2D8A6E]"></span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleInterpret(false)}
              disabled={isInterpreting || !isConfigured || !assessment}
              className="px-3 py-1.5 bg-[#9785E8] hover:bg-[#8673DC] text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-2xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0"
              title={
                !assessment
                  ? 'Run assessment on Lab Bench first'
                  : !isConfigured
                  ? 'Configure AI provider in Settings'
                  : 'Generate structured scientific interpretation'
              }
            >
              {isInterpreting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Interpreting...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Generate Scientific Interpretation</span>
                </>
              )}
            </button>
          )}

          {/* BYOK Status / Config Button */}
          <button
            type="button"
            onClick={onNavigateToSettings}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-2xs ${
              isConfigured
                ? 'bg-[#EAE5FA] text-[#7461CE] border-[#D5CBF7] hover:bg-[#E2DBF8]'
                : 'bg-[#FEF6EB] text-[#B47820] border-[#F6E1C4] hover:bg-[#FDF0DE]'
            }`}
            title={isConfigured ? 'Connected to AI Provider' : 'Click to configure API credentials in Settings'}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>
              {isConfigured
                ? `BYOK: ${aiSettings?.provider} (${aiSettings?.model})`
                : 'Configure AI Provider (BYOK)'}
            </span>
          </button>
        </div>
      </div>

      {/* 2. Compact BYOK Notice if idle/unconfigured */}
      {!isConfigured && showIdleBanner && (
        <div className="bg-[#FEF6EB] rounded-xl px-3.5 py-2 border border-[#F6E1C4] shadow-2xs flex items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-2 text-[#B47820]">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>
              <strong>Bring Your Own Key (BYOK) — AI Copilot is Idle.</strong> Core virtual laboratory runs 100% deterministically. To enable AI research dialogue, configure an API key in Settings.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onNavigateToSettings}
              className="text-[11px] font-bold underline text-[#B47820] hover:text-[#8D5B11] cursor-pointer"
            >
              Open Settings &rarr;
            </button>
            <button
              onClick={() => setShowIdleBanner(false)}
              className="p-1 text-[#B47820] hover:bg-[#F6E1C4]/50 rounded-lg cursor-pointer"
              title="Dismiss banner"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* 3. Primary Chat Workspace Card (Fills remaining viewport height) */}
      <div className="flex-1 min-h-0 flex flex-col bg-white rounded-2xl border border-[#E7E7EB] shadow-xs overflow-hidden">
        {/* Suggested Queries Bar (Compact, horizontally scrollable) */}
        <div className="px-4 py-2 bg-[#FAF9FD] border-b border-[#EAE5FA] flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0 text-xs">
          <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-[#777780] tracking-wider shrink-0">
            <Sparkles className="w-3 h-3 text-[#9785E8]" />
            <span>Suggested:</span>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {quickQuestions.map((q, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setUserInput(q);
                  if (textareaRef.current) textareaRef.current.focus();
                }}
                className="text-[11px] px-2.5 py-1 rounded-full bg-white hover:bg-[#EAE5FA] text-[#24242B] hover:text-[#7461CE] border border-[#E7E7EB] hover:border-[#D5CBF7] transition-all cursor-pointer whitespace-nowrap shadow-2xs"
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Central Messages Viewport (Internal scroll strictly confined here) */}
        <div className="flex-1 min-h-0 relative bg-[#FAF9FD]">
          <div
            ref={chatContainerRef}
            onScroll={handleChatScroll}
            className="absolute inset-0 overflow-y-auto p-4 md:p-6 space-y-4"
          >
            <div>
              {chatMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex flex-col mb-4 ${
                    msg.role === 'user' ? 'items-end' : 'items-start'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1 text-[10px] font-semibold text-[#A0A0A8]">
                    <span>{msg.role === 'user' ? 'Researcher' : 'AI Scientific Copilot'}</span>
                  </div>
                  <div
                    className={`p-4 rounded-xl text-xs leading-relaxed max-w-3xl shadow-2xs space-y-3 ${
                      msg.role === 'user'
                        ? 'bg-[#EAE5FA] text-[#24242B] border border-[#D5CBF7]'
                        : 'bg-white text-[#24242B] border border-[#E7E7EB]'
                    }`}
                  >
                    {/* Collapsible Scientific Tool Activities */}
                    {msg.executed_tools && msg.executed_tools.length > 0 && (
                      <div className="bg-[#FAF9FD] rounded-xl p-2.5 border border-[#EAE5FA] not-prose">
                        <button
                          type="button"
                          onClick={() => toggleTools(i)}
                          className="flex items-center justify-between w-full text-[11px] font-semibold text-[#7461CE] cursor-pointer hover:text-[#5F4BB6] transition-colors"
                        >
                          <div className="flex items-center gap-1.5">
                            <Wrench className="w-3.5 h-3.5 text-[#9785E8]" />
                            <span>Executed Scientific Tools ({msg.executed_tools.length})</span>
                          </div>
                          <ChevronDown
                            className={`w-3.5 h-3.5 text-[#7461CE] transition-transform duration-200 ${
                              expandedToolMsgIndices.has(i) ? 'rotate-180' : ''
                            }`}
                          />
                        </button>
                        {expandedToolMsgIndices.has(i) && (
                          <div className="space-y-1.5 mt-2 pt-2 border-t border-[#EAE5FA]">
                            {msg.executed_tools.map((et, etIdx) => (
                              <div
                                key={etIdx}
                                className="flex items-start gap-1.5 text-[10px] font-mono text-[#777780] bg-white p-2 rounded-lg border border-[#E7E7EB]"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-[#72C7B0] shrink-0 mt-1"></span>
                                <div className="overflow-hidden">
                                  <span className="font-semibold text-[#24242B] mr-1.5">{et.tool}:</span>
                                  <span className="text-[#4E4E58] break-words">{et.summary}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Formatted Markdown Content */}
                    {msg.role === 'user' ? (
                      <div className="whitespace-pre-line text-[#24242B] font-medium">{msg.content}</div>
                    ) : (
                      <ScientificMarkdownView content={msg.content} />
                    )}

                    {/* Proposed Experiment Proposal Card inside Dialogue */}
                    {msg.proposed_experiment && (
                      <div className="bg-[#FAF9FD] rounded-xl p-4 border border-[#D5CBF7] space-y-3 mt-3 not-prose shadow-2xs">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#EAE5FA] pb-2.5">
                          <div className="flex items-start gap-2">
                            <FlaskConical className="w-4 h-4 text-[#9785E8] shrink-0 mt-0.5" />
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#EAE5FA] text-[#7461CE] font-bold border border-[#D5CBF7]">
                                  {msg.proposed_experiment.config.id || 'PET-PROPOSAL'}
                                </span>
                                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[#E8F6F1] text-[#2D8A6E] border border-[#C6E8DC]">
                                  Structured Proposal
                                </span>
                              </div>
                              <h4 className="text-xs font-bold text-[#24242B] mt-1">
                                {msg.proposed_experiment.config.name}
                              </h4>
                            </div>
                          </div>

                          {/* Compatibility Index Badge if simulated */}
                          {(() => {
                            const simTool = msg.executed_tools?.find(
                              t => t.tool === 'simulate_assessment' && t.result?.success
                            );
                            if (simTool && simTool.result) {
                              return (
                                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-[#E7E7EB] text-right self-start sm:self-auto">
                                  <Sparkles className="w-3.5 h-3.5 text-[#9785E8]" />
                                  <div>
                                    <span className="text-[9px] text-[#777780] block">Compatibility Index</span>
                                    <span className="text-[11px] font-bold text-[#24242B] font-mono">
                                      {simTool.result.overall_score}/100 ({simTool.result.overall_status})
                                    </span>
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </div>

                        {/* Rationale */}
                        <p className="text-[11px] text-[#777780] leading-relaxed bg-white p-2.5 rounded-lg border border-[#EAE5FA]">
                          {msg.proposed_experiment.scientific_rationale}
                        </p>

                        {/* Components */}
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold uppercase text-[#7461CE] tracking-wider block">
                            Proposed Components ({msg.proposed_experiment.config.selected_components.length})
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {msg.proposed_experiment.config.selected_components.map((c, cIdx) => {
                              const isExploratory = c.component_id === 'comp_mhetase' ||
                                (c.notes && c.notes.toLowerCase().includes('exploratory'));
                              return (
                                <div
                                  key={cIdx}
                                  className="flex flex-col gap-0.5 px-2.5 py-1.5 rounded-lg bg-white border border-[#E7E7EB] text-[10px]"
                                >
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-mono font-bold text-[#7461CE]">{c.component_id}</span>
                                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#FAF9FD] text-[#777780] border border-[#E7E7EB] capitalize">
                                      {c.role}
                                    </span>
                                    {c.concentration && (
                                      <span className="font-mono text-[#24242B] font-medium bg-[#FAF9FD] px-1 rounded">
                                        {c.concentration}
                                      </span>
                                    )}
                                  </div>
                                  {isExploratory && (
                                    <span className="text-[9px] text-[#B47820] font-sans font-medium italic">
                                      Exploratory starting concentration — not a validated optimum.
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                          <p className="text-[9px] text-[#A0A0A8] italic font-sans pt-0.5">
                            *Concentrations are recorded for experimental protocol reproducibility and are not used to calculate reaction kinetics or quantitative yield in this model.
                          </p>
                        </div>

                        {/* Environmental Reaction Conditions Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] bg-white p-2.5 rounded-lg border border-[#EAE5FA] font-mono">
                          <div>
                            <span className="text-[#A0A0A8] block text-[9px]">Temperature:</span>
                            <span className="font-semibold text-[#24242B]">
                              {msg.proposed_experiment.config.environment.temperature_celsius}°C
                            </span>
                          </div>
                          <div>
                            <span className="text-[#A0A0A8] block text-[9px]">pH:</span>
                            <span className="font-semibold text-[#24242B]">
                              {msg.proposed_experiment.config.environment.ph}
                            </span>
                          </div>
                          <div>
                            <span className="text-[#A0A0A8] block text-[9px]">Pressure:</span>
                            <span className="font-semibold text-[#24242B]">
                              {msg.proposed_experiment.config.environment.pressure_atm} atm
                            </span>
                          </div>
                          <div>
                            <span className="text-[#A0A0A8] block text-[9px]">Agitation:</span>
                            <span className="font-semibold text-[#24242B]">
                              {msg.proposed_experiment.config.environment.agitation_rpm || 150} RPM
                            </span>
                          </div>
                        </div>

                        {/* Review & Apply Action Button */}
                        {onApplyProposal && (
                          (() => {
                            const proposalId = msg.proposed_experiment.config.id || `prop-${i}`;
                            const isApplied = appliedProposalIds.has(proposalId);
                            return (
                              <button
                                type="button"
                                onClick={() => {
                                  onApplyProposal(msg.proposed_experiment!.config);
                                  setAppliedProposalIds(prev => new Set(prev).add(proposalId));
                                }}
                                className={`w-full py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer ${
                                  isApplied
                                    ? 'bg-[#E8F6F1] text-[#2D8A6E] border border-[#C6E8DC]'
                                    : 'bg-[#9785E8] hover:bg-[#8673DC] text-white'
                                }`}
                              >
                                {isApplied ? (
                                  <>
                                    <CheckCircle2 className="w-3.5 h-3.5 text-[#2D8A6E]" />
                                    <span>Applied to Lab Bench</span>
                                  </>
                                ) : (
                                  <>
                                    <FlaskConical className="w-3.5 h-3.5" />
                                    <span>Review &amp; Apply to Lab Bench</span>
                                    <ArrowRight className="w-3 h-3" />
                                  </>
                                )}
                              </button>
                            );
                          })()
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isSendingChat && (
                <div className="flex items-center gap-2 text-xs text-[#777780] p-3 bg-white rounded-xl border border-[#EAE5FA] shadow-2xs max-w-sm">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#9785E8]" />
                  <span>Analyzing literature benchmarks & biochemical rules...</span>
                </div>
              )}
            </div>
          </div>

          {/* Jump to latest floating pill when scrolled up */}
          {showScrollBottomBtn && (
            <button
              type="button"
              onClick={handleJumpToLatest}
              className="absolute bottom-4 right-5 px-3 py-1.5 bg-[#9785E8] hover:bg-[#8673DC] text-white text-[11px] font-semibold rounded-full shadow-lg flex items-center gap-1.5 cursor-pointer transition-colors z-10"
            >
              <ArrowDown className="w-3.5 h-3.5" />
              <span>Jump to latest</span>
            </button>
          )}
        </div>

        {chatError && (
          <div className="px-4 py-2.5 bg-[#FCEEEE] border-t border-[#F8C8C8] text-xs text-[#C44141] flex items-center gap-2 shrink-0">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{chatError}</span>
          </div>
        )}

        {/* 4. Message Composer (Sticky at bottom, auto-expanding textarea, Enter to send) */}
        <div className="p-3 sm:p-4 bg-white border-t border-[#E7E7EB] shrink-0">
          <form onSubmit={handleSendMessage} className="space-y-2">
            <div className="flex items-end gap-2 bg-[#FAF9FD] rounded-2xl border border-[#E7E7EB] focus-within:border-[#9785E8] focus-within:ring-1 focus-within:ring-[#9785E8] p-2 transition-all">
              <textarea
                ref={textareaRef}
                rows={1}
                value={userInput}
                onChange={e => setUserInput(e.target.value)}
                onKeyDown={handleComposerKeyDown}
                placeholder={
                  isConfigured
                    ? 'Ask a scientific question, evaluate reaction mechanism, or request an experimental sweep...'
                    : 'Configure AI settings above to enable interactive dialogue...'
                }
                disabled={!isConfigured || isSendingChat}
                className="flex-1 bg-transparent border-0 px-2.5 py-1 text-xs text-[#24242B] placeholder-[#A0A0A8] focus:outline-none resize-none min-h-[36px] max-h-[120px] leading-relaxed disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!isConfigured || !userInput.trim() || isSendingChat}
                className="px-4 py-2 bg-[#9785E8] hover:bg-[#8673DC] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0 shadow-xs"
              >
                {isSendingChat ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                <span className="hidden sm:inline">Send</span>
              </button>
            </div>
            <div className="flex items-center justify-between text-[10px] text-[#A0A0A8] px-1">
              <span>
                Press <kbd className="px-1 py-0.2 bg-[#FAF9FD] border border-[#E7E7EB] rounded font-mono text-[9px] text-[#7461CE]">Enter</kbd> to send, <kbd className="px-1 py-0.2 bg-[#FAF9FD] border border-[#E7E7EB] rounded font-mono text-[9px] text-[#7461CE]">Shift+Enter</kbd> for new line
              </span>
              <span>Deterministic simulation active · Grounded in literature</span>
            </div>
          </form>
        </div>
      </div>

      {/* 5. Scientific Interpretation Modal (Opens on demand without page navigation or losing chat state) */}
      {isInterpretationOpen && (
        <div
          className="fixed inset-0 z-50 bg-[#1A1A24]/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 md:p-6 animate-fade-in"
          onClick={() => setIsInterpretationOpen(false)}
        >
          <div
            className="bg-white rounded-2xl border border-[#E7E7EB] shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-scale-up"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-[#E7E7EB] flex items-center justify-between gap-3 bg-[#FAF9FD] shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#EAE5FA] flex items-center justify-center text-[#7461CE]">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#24242B] flex items-center gap-2">
                    <span>Structured Scientific Interpretation</span>
                    {currentInterpretation && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#E8F6F1] text-[#2D8A6E] border border-[#C6E8DC]">
                        Ready
                      </span>
                    )}
                  </h3>
                  <p className="text-[11px] text-[#777780]">
                    {currentConfig.name} ({currentExpId}) · {currentConfig.environment.temperature_celsius}°C · pH {currentConfig.environment.ph}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {currentInterpretation && !isInterpreting && (
                  <button
                    type="button"
                    onClick={() => handleInterpret(true)}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-[#FAF9FD] text-[#7461CE] border border-[#D5CBF7] flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                    title="Regenerate interpretation with updated findings"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Regenerate</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsInterpretationOpen(false)}
                  className="p-1.5 rounded-lg text-[#777780] hover:text-[#24242B] hover:bg-white border border-transparent hover:border-[#E7E7EB] transition-colors cursor-pointer"
                  title="Close interpretation modal"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-6 space-y-4">
              {/* Loading State */}
              {isInterpreting && (
                <div className="py-16 text-center space-y-3">
                  <RefreshCw className="w-8 h-8 animate-spin text-[#9785E8] mx-auto" />
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-[#24242B]">
                      Generating Scientific Interpretation...
                    </p>
                    <p className="text-xs text-[#777780] max-w-md mx-auto">
                      Analyzing deterministic compatibility metrics, catalytic triad dynamics, and literature tolerance thresholds.
                    </p>
                  </div>
                </div>
              )}

              {/* Error State */}
              {!isInterpreting && interpretationError && (
                <div className="p-4 bg-[#FCEEEE] border border-[#F8C8C8] rounded-xl text-xs text-[#C44141] flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div className="space-y-2 flex-1">
                    <p className="font-semibold">{interpretationError}</p>
                    <button
                      type="button"
                      onClick={() => handleInterpret(true)}
                      className="px-3 py-1.5 bg-[#C44141] text-white rounded-lg text-xs font-semibold cursor-pointer hover:bg-[#B03535] transition-colors inline-block"
                    >
                      Try Again
                    </button>
                  </div>
                </div>
              )}

              {/* Empty / Not Generated Yet State */}
              {!isInterpreting && !interpretationError && !currentInterpretation && (
                <div className="py-12 text-center border border-dashed border-[#E7E7EB] rounded-2xl bg-[#FAF9FD] p-6 space-y-3">
                  <FlaskConical className="w-8 h-8 text-[#9785E8] mx-auto" />
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-[#24242B]">
                      No AI interpretation recorded for this experiment run
                    </h4>
                    <p className="text-[11px] text-[#777780] max-w-md mx-auto">
                      Click below to generate a comprehensive literature-grounded interpretation of current deterministic findings.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleInterpret(true)}
                    disabled={!assessment || !isConfigured}
                    className="px-4 py-2 bg-[#9785E8] hover:bg-[#8673DC] text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 mx-auto transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Generate Interpretation Now</span>
                  </button>
                </div>
              )}

              {/* Rendered Interpretation Report */}
              {!isInterpreting && currentInterpretation && (
                <div className="space-y-4 text-xs">
                  {/* Executive Overview */}
                  <div className="bg-[#FAF9FD] p-4 rounded-xl border border-[#EAE5FA] space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#7461CE] block">
                      Executive Biochemical Overview
                    </span>
                    <div className="text-[#24242B] leading-relaxed text-xs">
                      <ScientificMarkdownView content={currentInterpretation.executive_overview} />
                    </div>
                  </div>

                  {/* Mechanism & Climate Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-[#FAF9FD] p-4 rounded-xl border border-[#EAE5FA] space-y-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#2D8A6E] block">
                        Catalytic Mechanism & Intermediate Dynamics
                      </span>
                      <div className="text-[#24242B] leading-relaxed text-xs">
                        <ScientificMarkdownView content={currentInterpretation.biochemical_mechanism_analysis} />
                      </div>
                    </div>

                    <div className="bg-[#FAF9FD] p-4 rounded-xl border border-[#EAE5FA] space-y-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#7461CE] block">
                        Circular Economy & Climate Perspective
                      </span>
                      <div className="text-[#24242B] leading-relaxed text-xs">
                        <ScientificMarkdownView content={currentInterpretation.environmental_and_climate_perspective} />
                      </div>
                    </div>
                  </div>

                  {/* Caveats & Recommended Experiments */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-[#FAF9FD] p-4 rounded-xl border border-[#EAE5FA] space-y-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#B47820] block">
                        Scientific Caveats & Kinetic Boundaries
                      </span>
                      <div className="text-[#24242B] leading-relaxed text-xs">
                        <ScientificMarkdownView content={currentInterpretation.uncertainties_and_gap_analysis} />
                      </div>
                    </div>

                    <div className="bg-[#FAF9FD] p-4 rounded-xl border border-[#EAE5FA] space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#7461CE] block">
                        Recommended Follow-Up Investigations
                      </span>
                      <ul className="space-y-1.5 text-xs text-[#24242B]">
                        {currentInterpretation.recommended_follow_up_experiments.map((rec, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className="text-[#72C7B0] font-bold shrink-0">→</span>
                            <span className="flex-1 leading-relaxed">{renderInlineFormattedText(decodeHtmlEntities(rec))}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Proposed Follow-Up Experiment Card */}
                  {currentInterpretation.proposed_experiment && (
                    <div className="bg-[#FAF9FD] rounded-2xl p-5 border-2 border-[#D5CBF7] shadow-xs space-y-3.5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EAE5FA] pb-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#9785E8] text-white">
                              Recommended Follow-Up Experiment
                            </span>
                            <span className="text-[10px] font-mono text-[#777780]">
                              {currentInterpretation.proposed_experiment.config.id || 'AI-PROPOSAL'}
                            </span>
                          </div>
                          <h4 className="text-xs font-bold text-[#24242B]">
                            {decodeHtmlEntities(currentInterpretation.proposed_experiment.config.name)}
                          </h4>
                        </div>

                        {onApplyProposal && (
                          <button
                            type="button"
                            onClick={() => {
                              onApplyProposal(currentInterpretation.proposed_experiment!.config);
                              setHasAppliedModalProposal(true);
                            }}
                            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer shrink-0 ${
                              hasAppliedModalProposal
                                ? 'bg-[#E8F6F1] text-[#2D8A6E] border border-[#C6E8DC]'
                                : 'bg-[#9785E8] hover:bg-[#8673DC] text-white'
                            }`}
                          >
                            {hasAppliedModalProposal ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 text-[#2D8A6E]" />
                                <span>Applied to Lab Bench</span>
                              </>
                            ) : (
                              <>
                                <FlaskConical className="w-3.5 h-3.5" />
                                <span>Apply to Lab Bench &rarr;</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>

                      {/* Scientific Rationale */}
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold uppercase text-[#7461CE] tracking-wider block">
                          Mechanistic Scientific Rationale
                        </span>
                        <div className="text-[11px] text-[#24242B] leading-relaxed bg-white p-3 rounded-xl border border-[#EAE5FA]">
                          <ScientificMarkdownView content={currentInterpretation.proposed_experiment.scientific_rationale} />
                        </div>
                      </div>

                      {/* Proposed Components & Environment */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
                        <div className="space-y-1 bg-white p-3 rounded-xl border border-[#EAE5FA]">
                          <span className="text-[10px] font-bold uppercase text-[#777780] block">
                            Proposed Components ({currentInterpretation.proposed_experiment.config.selected_components.length})
                          </span>
                          <div className="space-y-1.5">
                            {currentInterpretation.proposed_experiment.config.selected_components.map((c, idx) => {
                              const isExploratory = c.component_id === 'comp_mhetase' ||
                                (c.notes && c.notes.toLowerCase().includes('exploratory'));
                              return (
                                <div key={idx} className="flex flex-col gap-0.5 border-b border-[#FAF9FD] pb-1 last:border-b-0">
                                  <div className="flex items-center justify-between">
                                    <span className="font-mono text-[#7461CE] font-bold">{c.component_id}</span>
                                    <span className="text-[10px] text-[#777780]">{c.role} · {c.concentration || 'Unspecified'}</span>
                                  </div>
                                  {isExploratory && (
                                    <span className="text-[9px] text-[#B47820] font-sans font-medium italic">
                                      Exploratory starting concentration — not a validated optimum.
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                            <p className="text-[9px] text-[#A0A0A8] italic font-sans pt-1">
                              *Concentrations are recorded for experimental protocol reproducibility and are not used to calculate reaction kinetics or quantitative yield in this model.
                            </p>
                          </div>
                        </div>

                        <div className="space-y-1 bg-white p-3 rounded-xl border border-[#EAE5FA]">
                          <span className="text-[10px] font-bold uppercase text-[#777780] block">
                            Proposed Chamber Conditions
                          </span>
                          <div className="grid grid-cols-2 gap-1.5 font-mono text-[10px]">
                            <div>Temp: <strong className="text-[#24242B]">{currentInterpretation.proposed_experiment.config.environment.temperature_celsius}°C</strong></div>
                            <div>pH: <strong className="text-[#24242B]">{currentInterpretation.proposed_experiment.config.environment.ph}</strong></div>
                            <div>Pressure: <strong className="text-[#24242B]">{currentInterpretation.proposed_experiment.config.environment.pressure_atm} atm</strong></div>
                            <div>Agitation: <strong className="text-[#24242B]">{currentInterpretation.proposed_experiment.config.environment.agitation_rpm || 150} RPM</strong></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Grounded in Literature Footer */}
                  <div className="text-[10px] text-[#A0A0A8] font-mono text-right pt-2 border-t border-[#EAE5FA]">
                    Generated via {currentInterpretation.provider} ({currentInterpretation.model}) · Grounded in verified biochemical literature
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-[#E7E7EB] bg-[#FAF9FD] flex items-center justify-end shrink-0">
              <button
                type="button"
                onClick={() => setIsInterpretationOpen(false)}
                className="px-4 py-2 bg-white hover:bg-[#FAF9FD] text-[#24242B] border border-[#E7E7EB] rounded-xl text-xs font-semibold cursor-pointer transition-colors"
              >
                Close Interpretation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
