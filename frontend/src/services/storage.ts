import {
  ExperimentConfig,
  ScientificAssessmentResult,
  AIInterpretationResponse,
  AIChatMessage,
} from '../types';

const DRAFT_KEY = 'polyphage_experiment_draft';
const HISTORY_KEY = 'polyphage_experiment_history';
export const ASSESSED_FP_KEY = 'polyphage_assessed_config_fingerprint';
const INTERPRETATIONS_KEY = 'polyphage_ai_interpretations';
const CHAT_MESSAGES_KEY = 'polyphage_ai_chat_messages';

export function recursivelyDecodeEntities<T>(obj: T): T {
  if (typeof obj === 'string') {
    let decoded: string = obj;
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
    return decoded as unknown as T;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => recursivelyDecodeEntities(item)) as unknown as T;
  }
  if (obj !== null && typeof obj === 'object') {
    const res: Record<string, any> = {};
    for (const [k, v] of Object.entries(obj)) {
      res[k] = recursivelyDecodeEntities(v);
    }
    return res as T;
  }
  return obj;
}

export function computeConfigFingerprint(config: ExperimentConfig): string {
  const sortedComps = [...config.selected_components]
    .map(c => `${c.component_id}:${c.role}:${c.concentration || ''}`)
    .sort()
    .join('|');
  const env = config.environment;
  const envStr = `${env.temperature_celsius}_${env.ph}_${env.oxygen}_${env.salinity_percent}_${(env.pressure_atm ?? 1.0).toFixed(1)}_${env.duration_hours}_${env.agitation_rpm || 150}`;
  return `${config.name || ''}::${sortedComps}::${envStr}`;
}

export interface SavedExperimentRecord {
  id: string;
  config: ExperimentConfig;
  assessment?: ScientificAssessmentResult;
  savedAt: string;
  configFingerprint?: string;
}

export const DEFAULT_DEMO_EXPERIMENT: ExperimentConfig = {
  id: 'PET-20261107-001',
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

/**
 * Automatically generates a collision-safe, alphanumeric, hyphenated experiment identifier.
 * Format: {POLYMER}-{YYYYMMDD}-{SEQUENCE} (e.g. PET-20261107-001)
 * Preserves existing valid identifiers when an experiment is edited or re-assessed.
 */
export function generateExperimentId(
  config: Partial<ExperimentConfig>,
  existingHistory?: SavedExperimentRecord[]
): string {
  // Derive polymer prefix strictly from substrate component or experiment name
  let prefix = 'EXP';
  const comps = config.selected_components || [];
  const substrate = comps.find(c => c.role === 'substrate');
  if (substrate) {
    const cid = substrate.component_id.toLowerCase();
    if (cid === 'comp_pet' || (cid.includes('pet') && !cid.includes('petase'))) {
      prefix = 'PET';
    } else if (cid.includes('pla') && !cid.includes('petase')) {
      prefix = 'PLA';
    } else if (cid.includes('pef') && !cid.includes('petase')) {
      prefix = 'PEF';
    } else if (cid.includes('pbat')) {
      prefix = 'PBAT';
    } else if (cid.includes('pcl')) {
      prefix = 'PCL';
    } else if (cid.includes('pe') || cid.includes('ldpe') || cid.includes('hdpe')) {
      prefix = 'PE';
    } else if (cid.includes('pur') || cid.includes('polyurethane')) {
      prefix = 'PUR';
    } else if (cid.includes('ps') && !cid.includes('ispetase')) {
      prefix = 'PS';
    } else if (cid.includes('pp')) {
      prefix = 'PP';
    }
  }

  if (prefix === 'EXP' && config.name) {
    const n = config.name.toUpperCase();
    for (const cand of ['PET', 'PLA', 'PEF', 'PBAT', 'PCL', 'PUR', 'PS', 'PP', 'PE']) {
      const regex = new RegExp(`\\b${cand}\\b`, 'i');
      if (regex.test(n)) {
        prefix = cand;
        break;
      }
    }
  }

  // If an existing valid alphanumeric hyphenated ID is already present, verify prefix matches substrate
  if (config.id && /^[A-Z0-9]+-\d{8}-\d{3,}$/i.test(config.id)) {
    const currentPrefix = config.id.split('-')[0].toUpperCase();
    if (prefix !== 'EXP' && currentPrefix !== prefix) {
      const rest = config.id.split('-').slice(1).join('-');
      return `${prefix}-${rest}`;
    }
    return config.id;
  }

  // Format today's date in YYYYMMDD
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(now.getUTCDate()).padStart(2, '0');
  const dateStr = `${yyyy}${mm}${dd}`;

  // Find next collision-safe sequence number from existing records
  const records = existingHistory || storage.getExperimentHistory();
  const pattern = new RegExp(`^${prefix}-${dateStr}-(\\d+)$`, 'i');
  let maxSeq = 0;
  for (const rec of records) {
    const m = rec.id.match(pattern);
    if (m && m[1]) {
      const num = parseInt(m[1], 10);
      if (!isNaN(num) && num > maxSeq) {
        maxSeq = num;
      }
    }
  }

  const nextSeq = String(maxSeq + 1).padStart(3, '0');
  return `${prefix}-${dateStr}-${nextSeq}`;
}

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
      const finalId =
        (config.id && /^[A-Z0-9]+-\d{8}-\d{3,}$/i.test(config.id))
          ? config.id
          : (assessment.experiment_id && /^[A-Z0-9]+-\d{8}-\d{3,}$/i.test(assessment.experiment_id))
          ? assessment.experiment_id
          : generateExperimentId(config, history);

      config.id = finalId;
      assessment.experiment_id = finalId;

      const record: SavedExperimentRecord = {
        id: finalId,
        config: { ...config, id: finalId },
        assessment: { ...assessment, experiment_id: finalId },
        savedAt: new Date().toISOString(),
        configFingerprint: computeConfigFingerprint(config),
      };
      // Prepend and limit to 20 recent experiments
      const updated = [record, ...history.filter(h => h.id !== record.id)].slice(0, 20);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
      localStorage.setItem(ASSESSED_FP_KEY, computeConfigFingerprint(config));
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

  getStoredInterpretations(): Record<string, AIInterpretationResponse> {
    try {
      const raw = localStorage.getItem(INTERPRETATIONS_KEY);
      if (raw) return recursivelyDecodeEntities(JSON.parse(raw));
    } catch {
      // fallback
    }
    return {};
  },

  saveInterpretation(expId: string, interpretation: AIInterpretationResponse): void {
    try {
      const current = storage.getStoredInterpretations();
      current[expId] = interpretation;
      localStorage.setItem(INTERPRETATIONS_KEY, JSON.stringify(current));
    } catch (e) {
      console.warn('LocalStorage save interpretation failed', e);
    }
  },

  getStoredChatMessages(): AIChatMessage[] | null {
    try {
      const raw = localStorage.getItem(CHAT_MESSAGES_KEY);
      if (raw) return recursivelyDecodeEntities(JSON.parse(raw));
    } catch {
      // fallback
    }
    return null;
  },

  saveChatMessages(messages: AIChatMessage[]): void {
    try {
      localStorage.setItem(CHAT_MESSAGES_KEY, JSON.stringify(messages));
    } catch (e) {
      console.warn('LocalStorage save chat messages failed', e);
    }
  },
};

