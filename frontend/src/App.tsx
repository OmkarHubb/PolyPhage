import React, { useState, useEffect } from 'react';
import {
  ComponentItem,
  ComponentCategory,
  EvidenceRecord,
  ExperimentConfig,
  ScientificAssessmentResult,
  AISettings,
  AIInterpretationResponse,
  AIChatMessage,
} from './types';
import { api } from './services/api';
import {
  storage,
  SavedExperimentRecord,
  DEFAULT_DEMO_EXPERIMENT,
  computeConfigFingerprint,
  generateExperimentId,
  ASSESSED_FP_KEY,
} from './services/storage';
import { Sidebar, SectionType } from './components/layout/Sidebar';
import { DashboardPage } from './pages/DashboardPage';
import { LabBenchPage } from './pages/LabBenchPage';
import { EnvironmentPage } from './pages/EnvironmentPage';
import { ResultsPage } from './pages/ResultsPage';
import { AIAssistantPage, PendingAIAction } from './pages/AIAssistantPage';
import { EvidenceLibraryPage } from './pages/EvidenceLibraryPage';
import { SettingsPage } from './pages/SettingsPage';
import { RefreshCw, AlertCircle } from 'lucide-react';

export const App: React.FC = () => {
  const [activeSection, setActiveSection] = useState<SectionType>('dashboard');
  const [components, setComponents] = useState<ComponentItem[]>([]);
  const [evidenceList, setEvidenceList] = useState<EvidenceRecord[]>([]);
  const [currentConfig, setCurrentConfig] = useState<ExperimentConfig>(storage.getDraftExperiment());
  const [recentExperiments, setRecentExperiments] = useState<SavedExperimentRecord[]>(
    storage.getExperimentHistory()
  );
  const [currentAssessment, setCurrentAssessment] = useState<ScientificAssessmentResult | null>(null);
  const [assessedConfigFingerprint, setAssessedConfigFingerprint] = useState<string | null>(() => {
    return localStorage.getItem(ASSESSED_FP_KEY);
  });
  const [benchCategoryFilter, setBenchCategoryFilter] = useState<ComponentCategory | 'All'>('All');
  const [activeEvidenceId, setActiveEvidenceId] = useState<string | null>(null);
  const [assessmentError, setAssessmentError] = useState<string | null>(null);
  const [aiSettings, setAiSettings] = useState<AISettings | null>(null);

  // Interpretation on-demand state and AI chat history caching
  const [pendingAIAction, setPendingAIAction] = useState<PendingAIAction | null>(null);
  const [interpretationsByExpId, setInterpretationsByExpId] = useState<Record<string, AIInterpretationResponse>>(() => {
    return storage.getStoredInterpretations();
  });
  const [chatMessages, setChatMessages] = useState<AIChatMessage[]>(() => {
    return storage.getStoredChatMessages() || [];
  });

  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const [isAssessing, setIsAssessing] = useState(false);
  const [systemError, setSystemError] = useState<string | null>(null);

  // Stale assessment check: true if assessment exists and current configuration fingerprint differs from assessed configuration
  const isAssessmentStale = Boolean(
    currentAssessment &&
    assessedConfigFingerprint &&
    computeConfigFingerprint(currentConfig) !== assessedConfigFingerprint
  );

  // Initial load from backend
  useEffect(() => {
    async function init() {
      try {
        const [comps, evs, ai] = await Promise.all([
          api.getComponents(),
          api.getEvidenceList(),
          api.getAISettings().catch(() => null),
        ]);
        setComponents(comps);
        setEvidenceList(evs);
        if (ai) setAiSettings(ai);

        // If there's an experiment in history, load its latest assessment into view
        const history = storage.getExperimentHistory();
        if (history.length > 0 && history[0].assessment) {
          setCurrentAssessment(history[0].assessment);
          const fp = history[0].configFingerprint || computeConfigFingerprint(history[0].config);
          if (!localStorage.getItem(ASSESSED_FP_KEY)) {
            setAssessedConfigFingerprint(fp);
            localStorage.setItem(ASSESSED_FP_KEY, fp);
          }
        }
      } catch (err: any) {
        setSystemError(
          'Failed to connect to PolyPhage backend server. Please verify backend is running on http://127.0.0.1:8000.'
        );
      } finally {
        setIsLoadingInitial(false);
      }
    }
    init();
  }, []);

  // Save draft whenever config changes
  const handleUpdateConfig = (updated: ExperimentConfig) => {
    let finalConfig = updated;
    // If id is empty or legacy format, normalize it
    if (!finalConfig.id || finalConfig.id.startsWith('exp_')) {
      finalConfig = {
        ...finalConfig,
        id: generateExperimentId(finalConfig, storage.getExperimentHistory()),
      };
    }
    setCurrentConfig(finalConfig);
    storage.saveDraftExperiment(finalConfig);
  };

  // Run Scientific Assessment
  const handleRunAssessment = async () => {
    if (currentConfig.selected_components.length === 0) {
      alert('Please select at least 1 substrate (e.g. PET) and 1 catalyst (e.g. IsPETase) on the Lab Bench.');
      setActiveSection('bench');
      return;
    }

    setIsAssessing(true);
    setAssessmentError(null);
    try {
      const assessment = await api.runAssessment(currentConfig);
      const fp = computeConfigFingerprint(currentConfig);
      setCurrentAssessment(assessment);
      setAssessedConfigFingerprint(fp);
      localStorage.setItem(ASSESSED_FP_KEY, fp);
      storage.saveCompletedExperiment(currentConfig, assessment);
      setRecentExperiments(storage.getExperimentHistory());
      setActiveSection('results');
    } catch (e: any) {
      const errMsg = e?.message || 'Scientific Assessment execution failed.';
      setAssessmentError(errMsg);
      if (!currentAssessment) {
        setActiveSection('results');
      }
    } finally {
      setIsAssessing(false);
    }
  };

  // Load PET + PETase Demo Workflow
  const handleLoadDemo = async () => {
    handleUpdateConfig(DEFAULT_DEMO_EXPERIMENT);
    setIsAssessing(true);
    setAssessmentError(null);
    try {
      const assessment = await api.runAssessment(DEFAULT_DEMO_EXPERIMENT);
      const fp = computeConfigFingerprint(DEFAULT_DEMO_EXPERIMENT);
      setCurrentAssessment(assessment);
      setAssessedConfigFingerprint(fp);
      localStorage.setItem(ASSESSED_FP_KEY, fp);
      storage.saveCompletedExperiment(DEFAULT_DEMO_EXPERIMENT, assessment);
      setRecentExperiments(storage.getExperimentHistory());
      setActiveSection('results');
    } catch (e: any) {
      console.error(e);
      setAssessmentError(e?.message || 'Failed to load demo assessment');
      setActiveSection('bench');
    } finally {
      setIsAssessing(false);
    }
  };

  // Start new blank experiment
  const handleNewExperiment = () => {
    const blank: ExperimentConfig = {
      id: generateExperimentId({}, storage.getExperimentHistory()),
      name: 'Custom Plastic Biocatalysis Experiment',
      selected_components: [],
      environment: {
        temperature_celsius: 30.0,
        ph: 7.0,
        oxygen: 'Aerobic',
        salinity_percent: 0.0,
        pressure_atm: 1.0,
        duration_hours: 24.0,
        agitation_rpm: 150,
      },
    };
    handleUpdateConfig(blank);
    setCurrentAssessment(null);
    setAssessedConfigFingerprint(null);
    localStorage.removeItem(ASSESSED_FP_KEY);
    setAssessmentError(null);
    setActiveSection('bench');
  };

  // Select experiment from history
  const handleSelectHistoryExperiment = (record: SavedExperimentRecord) => {
    setCurrentConfig(record.config);
    setAssessmentError(null);
    if (record.assessment) {
      setCurrentAssessment(record.assessment);
      const fp = record.configFingerprint || computeConfigFingerprint(record.config);
      setAssessedConfigFingerprint(fp);
      localStorage.setItem(ASSESSED_FP_KEY, fp);
      setActiveSection('results');
    } else {
      setCurrentAssessment(null);
      setAssessedConfigFingerprint(null);
      localStorage.removeItem(ASSESSED_FP_KEY);
      setActiveSection('bench');
    }
  };

  // Delete experiment from history
  const handleDeleteExperiment = (id: string) => {
    storage.deleteExperimentFromHistory(id);
    setRecentExperiments(storage.getExperimentHistory());
  };

  // Apply AI Proposed Experiment to workspace
  const handleApplyProposal = (proposedConfig: ExperimentConfig) => {
    handleUpdateConfig(proposedConfig);
    setActiveSection('bench');
  };

  // Refresh AI settings from backend
  const handleRefreshAISettings = async () => {
    try {
      const ai = await api.getAISettings();
      setAiSettings(ai);
    } catch {
      // ignore
    }
  };

  if (isLoadingInitial) {
    return (
      <div className="min-h-screen bg-[#F2F2F4] flex flex-col items-center justify-center space-y-3 text-[#777780]">
        <RefreshCw className="w-8 h-8 animate-spin text-[#9785E8]" />
        <div className="text-sm font-bold text-[#24242B]">Initializing PolyPhage Biotechnology Station...</div>
        <div className="text-xs font-mono text-[#A0A0A8]">Loading verified biochemical catalogs & evidence references</div>
      </div>
    );
  }

  return (
    <div className="h-screen h-[100dvh] flex flex-col bg-[#F2F2F4] text-[#24242B] font-sans overflow-hidden">
      {/* Backend Disconnected Alert if any */}
      {systemError && (
        <div className="bg-[#FCEEEE] border-b border-[#F8C8C8] text-[#C44141] px-6 py-2.5 text-xs flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-[#C44141] shrink-0" />
            <span>{systemError}</span>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="underline font-semibold text-[#C44141] hover:text-[#9B2A2A] ml-2 cursor-pointer"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* Main Workspace Body */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Navigation Sidebar */}
        <Sidebar
          activeSection={activeSection}
          onSelectSection={s => setActiveSection(s)}
          selectedComponentCount={currentConfig.selected_components.length}
          hasResults={currentAssessment !== null}
          aiConfigured={aiSettings?.is_active ?? false}
        />

        {/* Content Pane */}
        <main className={`flex-1 bg-[#F2F2F4] min-h-0 min-w-0 ${
          activeSection === 'dashboard' || activeSection === 'ai-assistant'
            ? 'overflow-y-auto lg:overflow-hidden flex flex-col'
            : 'overflow-y-auto'
        }`}>
          {activeSection === 'dashboard' && (
            <DashboardPage
              currentConfig={currentConfig}
              recentExperiments={recentExperiments}
              aiSettings={aiSettings}
              onLoadDemoWorkflow={handleLoadDemo}
              onNewExperiment={handleNewExperiment}
              onSelectExperiment={handleSelectHistoryExperiment}
              onDeleteExperiment={handleDeleteExperiment}
              onNavigate={(s, category) => {
                if (category) setBenchCategoryFilter(category);
                setActiveSection(s as SectionType);
              }}
              onRunAssessment={handleRunAssessment}
            />
          )}

          {activeSection === 'bench' && (
            <LabBenchPage
              allComponents={components}
              currentConfig={currentConfig}
              initialCategory={benchCategoryFilter}
              isAssessing={isAssessing}
              onUpdateConfig={handleUpdateConfig}
              onRunAssessment={handleRunAssessment}
              onNavigate={s => setActiveSection(s as SectionType)}
            />
          )}

          {activeSection === 'chamber' && (
            <EnvironmentPage
              currentConfig={currentConfig}
              allComponents={components}
              onUpdateConfig={handleUpdateConfig}
              onRunAssessment={handleRunAssessment}
              onNavigate={s => setActiveSection(s as SectionType)}
            />
          )}

          {activeSection === 'results' && (
            <ResultsPage
              assessment={currentAssessment}
              currentConfig={currentConfig}
              aiSettings={aiSettings}
              isStale={isAssessmentStale}
              isAssessing={isAssessing}
              assessmentError={assessmentError}
              onNavigateToAI={(options) => {
                if (options?.action) {
                  setPendingAIAction({
                    action: options.action,
                    experimentId: options.experimentId || currentConfig.id || currentAssessment?.experiment_id,
                  });
                }
                setActiveSection('ai-assistant');
              }}
              onNavigateToEvidence={evidenceId => {
                if (evidenceId) setActiveEvidenceId(evidenceId);
                setActiveSection('evidence');
              }}
              onRunAssessment={handleRunAssessment}
            />
          )}

          {activeSection === 'evidence' && (
            <EvidenceLibraryPage
              evidenceList={evidenceList}
              initialPaperId={activeEvidenceId}
              currentConfig={currentConfig}
            />
          )}

          {activeSection === 'ai-assistant' && (
            <AIAssistantPage
              currentConfig={currentConfig}
              assessment={currentAssessment}
              aiSettings={aiSettings}
              onNavigateToSettings={() => setActiveSection('settings')}
              onNavigateToResults={() => setActiveSection('results')}
              onApplyProposal={handleApplyProposal}
              pendingAction={pendingAIAction}
              onClearPendingAction={() => setPendingAIAction(null)}
              interpretationsByExpId={interpretationsByExpId}
              onSaveInterpretation={(expId, res) => {
                setInterpretationsByExpId(prev => ({ ...prev, [expId]: res }));
                storage.saveInterpretation(expId, res);
              }}
              chatMessages={chatMessages.length > 0 ? chatMessages : undefined}
              onUpdateChatMessages={(msgs) => {
                setChatMessages(msgs);
                storage.saveChatMessages(msgs);
              }}
            />
          )}

          {activeSection === 'settings' && (
            <SettingsPage
              aiSettings={aiSettings}
              onRefreshSettings={handleRefreshAISettings}
            />
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
