import {
  ComponentItem,
  EvidenceRecord,
  ExperimentConfig,
  ScientificAssessmentResult,
  AISettings,
  AIInterpretationResponse,
  AIChatMessage,
} from '../types';

const API_BASE = '/api';

export const api = {
  // Components
  async getComponents(category?: string, search?: string): Promise<ComponentItem[]> {
    const params = new URLSearchParams();
    if (category && category !== 'All') params.append('category', category);
    if (search) params.append('search', search);
    const res = await fetch(`${API_BASE}/components?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch components.');
    return res.json();
  },

  async getComponent(id: string): Promise<ComponentItem> {
    const res = await fetch(`${API_BASE}/components/${id}`);
    if (!res.ok) throw new Error(`Failed to fetch component ${id}`);
    return res.json();
  },

  // Evidence
  async getEvidenceList(): Promise<EvidenceRecord[]> {
    const res = await fetch(`${API_BASE}/evidence`);
    if (!res.ok) throw new Error('Failed to fetch scientific evidence references.');
    return res.json();
  },

  // Scientific Assessment (Deterministic engine)
  async runAssessment(config: ExperimentConfig): Promise<ScientificAssessmentResult> {
    const res = await fetch(`${API_BASE}/assessment/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Assessment failed.' }));
      throw new Error(err.detail || 'Scientific assessment error.');
    }
    return res.json();
  },

  // AI Settings (BYOK)
  async getAISettings(): Promise<AISettings> {
    const res = await fetch(`${API_BASE}/ai/settings`);
    if (!res.ok) throw new Error('Failed to fetch AI configuration.');
    return res.json();
  },

  async updateAISettings(data: {
    provider: string;
    api_key?: string;
    base_url?: string;
    model: string;
  }): Promise<AISettings> {
    const res = await fetch(`${API_BASE}/ai/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update AI settings.');
    return res.json();
  },

  async testAIConnection(data: {
    provider: string;
    api_key: string;
    base_url?: string;
    model: string;
  }): Promise<{ success: boolean; message: string; detected_model?: string; latency_ms?: number }> {
    const res = await fetch(`${API_BASE}/ai/settings/test-connection`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Network failure while testing connection.');
    return res.json();
  },

  async disconnectAI(): Promise<AISettings> {
    const res = await fetch(`${API_BASE}/ai/settings`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to disconnect AI credentials.');
    return res.json();
  },

  // AI Interpretation & Chat
  async interpretAssessment(
    experiment: ExperimentConfig,
    assessment: ScientificAssessmentResult,
    specificQuestion?: string
  ): Promise<AIInterpretationResponse> {
    const res = await fetch(`${API_BASE}/ai/interpret`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        experiment,
        assessment,
        specific_question: specificQuestion,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'AI Interpretation request failed.' }));
      throw new Error(err.detail || 'AI interpretation failed.');
    }
    return res.json();
  },

  async chatAI(
    messages: AIChatMessage[],
    experiment?: ExperimentConfig,
    assessment?: ScientificAssessmentResult
  ): Promise<{ reply: string; provider: string; model: string }> {
    const res = await fetch(`${API_BASE}/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages,
        context_experiment: experiment,
        context_assessment: assessment,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'AI Chat request failed.' }));
      throw new Error(err.detail || 'AI Assistant communication failed.');
    }
    return res.json();
  },
};
