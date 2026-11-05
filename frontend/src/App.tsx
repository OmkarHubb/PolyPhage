import React, { useState, useEffect } from 'react';
import {
  ComponentItem,
  EvidenceRecord,
  ExperimentConfig,
  ScientificAssessmentResult,
  AISettings,
} from './types';
import { api } from './services/api';
import { storage, SavedExperimentRecord, DEFAULT_DEMO_EXPERIMENT } from './services/storage';
import { Header } from './components/layout/Header';
import { Sidebar, SectionType } from './components/layout/Sidebar';
import { DashboardPage } from './pages/DashboardPage';
import { LabBenchPage } from './pages/LabBenchPage';
import { EnvironmentPage } from './pages/EnvironmentPage';
import { ResultsPage } from './pages/ResultsPage';
import { AIAssistantPage } from './pages/AIAssistantPage';
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
  const [aiSettings, setAiSettings] = useState<AISettings | null>(null);

  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const [isAssessing, setIsAssessing] = useState(false);
  const [systemError, setSystemError] = useState<string | null>(null);

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
    setCurrentConfig(updated);
    storage.saveDraftExperiment(updated);
  };

  // Run Scientific Assessment
  const handleRunAssessment = async () => {
    if (currentConfig.selected_components.length === 0) {
      alert('Please select at least 1 substrate (e.g. PET) and 1 catalyst (e.g. IsPETase) on the Lab Bench.');
      setActiveSection('bench');
      return;
    }

    setIsAssessing(true);
    try {
      const assessment = await api.runAssessment(currentConfig);
      setCurrentAssessment(assessment);
      storage.saveCompletedExperiment(currentConfig, assessment);
      setRecentExperiments(storage.getExperimentHistory());
      setActiveSection('results');
    } catch (e: any) {
      alert(`Scientific Assessment Error: ${e.message}`);
    } finally {
      setIsAssessing(false);
    }
  };

  // Load PET + PETase Demo Workflow
  const handleLoadDemo = async () => {
    handleUpdateConfig(DEFAULT_DEMO_EXPERIMENT);
    setIsAssessing(true);
    try {
      const assessment = await api.runAssessment(DEFAULT_DEMO_EXPERIMENT);
      setCurrentAssessment(assessment);
      storage.saveCompletedExperiment(DEFAULT_DEMO_EXPERIMENT, assessment);
      setRecentExperiments(storage.getExperimentHistory());
      setActiveSection('results');
    } catch (e: any) {
      console.error(e);
      setActiveSection('bench');
    } finally {
      setIsAssessing(false);
    }
  };

  // Start new blank experiment
  const handleNewExperiment = () => {
    const blank: ExperimentConfig = {
      id: `exp_${Date.now()}`,
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
    setActiveSection('bench');
  };

  // Select experiment from history
  const handleSelectHistoryExperiment = (record: SavedExperimentRecord) => {
    setCurrentConfig(record.config);
    if (record.assessment) {
      setCurrentAssessment(record.assessment);
      setActiveSection('results');
    } else {
      setActiveSection('bench');
    }
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
      <div className="min-h-screen bg-[#0a0d14] flex flex-col items-center justify-center space-y-3 text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin text-emerald-400" />
        <div className="text-sm font-semibold text-slate-200">Initializing PolyPhage Virtual Laboratory...</div>
        <div className="text-xs font-mono text-slate-500">Loading verified biochemical catalogs & evidence references</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0d14] text-slate-100 font-sans">
      {/* Workstation Header */}
      <Header
        experimentName={currentConfig.name}
        isAssessing={isAssessing}
        onRunAssessment={handleRunAssessment}
        aiSettings={aiSettings}
        onNavigateToSettings={() => setActiveSection('settings')}
        activeSection={activeSection}
        onNavigate={s => setActiveSection(s as SectionType)}
      />

      {/* Backend Disconnected Alert if any */}
      {systemError && (
        <div className="bg-red-950/80 border-b border-red-800 text-red-200 px-5 py-2 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{systemError}</span>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="underline font-mono text-red-300 hover:text-white ml-2 cursor-pointer"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* Main Workspace Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Navigation Sidebar */}
        <Sidebar
          activeSection={activeSection}
          onSelectSection={s => setActiveSection(s)}
          selectedComponentCount={currentConfig.selected_components.length}
          hasResults={currentAssessment !== null}
          aiConfigured={aiSettings?.is_active ?? false}
        />

        {/* Content Pane */}
        <main className="flex-1 overflow-y-auto bg-[#0b0f19]">
          {activeSection === 'dashboard' && (
            <DashboardPage
              currentConfig={currentConfig}
              recentExperiments={recentExperiments}
              aiSettings={aiSettings}
              onLoadDemoWorkflow={handleLoadDemo}
              onNewExperiment={handleNewExperiment}
              onSelectExperiment={handleSelectHistoryExperiment}
              onNavigate={s => setActiveSection(s as SectionType)}
              onRunAssessment={handleRunAssessment}
            />
          )}

          {activeSection === 'bench' && (
            <LabBenchPage
              allComponents={components}
              currentConfig={currentConfig}
              onUpdateConfig={handleUpdateConfig}
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
              onNavigateToAI={() => setActiveSection('ai-assistant')}
              onNavigateToEvidence={() => setActiveSection('evidence')}
              onRunAssessment={handleRunAssessment}
            />
          )}

          {activeSection === 'ai-assistant' && (
            <AIAssistantPage
              currentConfig={currentConfig}
              assessment={currentAssessment}
              aiSettings={aiSettings}
              onNavigateToSettings={() => setActiveSection('settings')}
              onNavigateToResults={() => setActiveSection('results')}
            />
          )}

          {activeSection === 'evidence' && (
            <EvidenceLibraryPage evidenceList={evidenceList} />
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
