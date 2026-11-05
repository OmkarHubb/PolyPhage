import { ExperimentConfig, ScientificAssessmentResult } from '../types';

const DRAFT_KEY = 'polyphage_experiment_draft';
const HISTORY_KEY = 'polyphage_experiment_history';

export interface SavedExperimentRecord {
  id: string;
  config: ExperimentConfig;
  assessment?: ScientificAssessmentResult;
  savedAt: string;
}

export const DEFAULT_DEMO_EXPERIMENT: ExperimentConfig = {
  id: 'exp_pet_petase_demo',
  name: 'PET Hydrolysis via Ideonella sakaiensis PETase',
  description: 'Standard mesophilic enzymatic depolymerization of low-crystallinity PET film using wild-type IsPETase in neutral phosphate buffer.',
  selected_components: [
    { component_id: 'comp_pet', role: 'substrate', concentration: '10 mg/mL (amorphous film)' },
    { component_id: 'comp_ispetase', role: 'catalyst', concentration: '50 nM' },
    { component_id: 'comp_buffer_phosphate', role: 'buffer', concentration: '50 mM (pH 7.0)' },
  ],
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

export const storage = {
  getDraftExperiment(): ExperimentConfig {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) return JSON.parse(raw);
    } catch {
      // fallback
    }
    return DEFAULT_DEMO_EXPERIMENT;
  },

  saveDraftExperiment(config: ExperimentConfig): void {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(config));
    } catch (e) {
      console.warn('LocalStorage save failed', e);
    }
  },

  getExperimentHistory(): SavedExperimentRecord[] {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (raw) return JSON.parse(raw);
    } catch {
      // fallback
    }
    return [];
  },

  saveCompletedExperiment(config: ExperimentConfig, assessment: ScientificAssessmentResult): void {
    try {
      const history = storage.getExperimentHistory();
      const record: SavedExperimentRecord = {
        id: assessment.experiment_id || config.id || `exp_${Date.now()}`,
        config,
        assessment,
        savedAt: new Date().toISOString(),
      };
      // Prepend and limit to 20 recent experiments
      const updated = [record, ...history.filter(h => h.id !== record.id)].slice(0, 20);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('LocalStorage history save failed', e);
    }
  },

  deleteExperimentFromHistory(id: string): void {
    try {
      const history = storage.getExperimentHistory().filter(h => h.id !== id);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch (e) {
      console.warn('LocalStorage delete failed', e);
    }
  },
};

