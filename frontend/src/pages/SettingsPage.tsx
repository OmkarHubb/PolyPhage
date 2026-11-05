import React, { useState } from 'react';
import {
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Trash2,
  ExternalLink,
  Zap,
  Lock,
} from 'lucide-react';
import { AISettings } from '../types';
import { api } from '../services/api';

interface SettingsPageProps {
  aiSettings: AISettings | null;
  onRefreshSettings: () => Promise<void>;
}

interface ProviderPreset {
  id: string;
  name: string;
  baseUrl: string;
  defaultModel: string;
  recommendedModels: string[];
  docUrl: string;
}

const PROVIDERS: ProviderPreset[] = [
  {
    id: 'openai',
    name: 'OpenAI (Direct)',
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    recommendedModels: ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo'],
    docUrl: 'https://platform.openai.com/api-keys',
  },
  {
    id: 'groq',
    name: 'Groq Cloud (Fast Inference)',
    baseUrl: 'https://api.groq.com/openai/v1',
    defaultModel: 'llama-3.3-70b-versatile',
    recommendedModels: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'],
    docUrl: 'https://console.groq.com/keys',
  },
  {
    id: 'openrouter',
    name: 'OpenRouter (Multi-model Gateway)',
    baseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'anthropic/claude-3.5-sonnet',
    recommendedModels: [
      'anthropic/claude-3.5-sonnet',
      'openai/gpt-4o-mini',
      'google/gemini-2.0-flash-exp:free',
    ],
    docUrl: 'https://openrouter.ai/keys',
  },
  {
    id: 'custom',
    name: 'Custom OpenAI-Compatible Endpoint (Ollama / vLLM)',
    baseUrl: 'http://127.0.0.1:11434/v1',
    defaultModel: 'llama3',
    recommendedModels: ['llama3', 'mistral', 'deepseek-chat'],
    docUrl: 'https://ollama.com',
  },
];

export const SettingsPage: React.FC<SettingsPageProps> = ({
  aiSettings,
  onRefreshSettings,
}) => {
  const currentProviderId = aiSettings?.provider || 'openai';
  const preset = PROVIDERS.find(p => p.id === currentProviderId) || PROVIDERS[0];

  const [provider, setProvider] = useState<string>(currentProviderId);
  const [apiKey, setApiKey] = useState<string>('');
  const [baseUrl, setBaseUrl] = useState<string>(aiSettings?.base_url || preset.baseUrl);
  const [model, setModel] = useState<string>(aiSettings?.model || preset.defaultModel);

  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    detected_model?: string;
    latency_ms?: number;
  } | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleProviderSelect = (newProviderId: string) => {
    setProvider(newProviderId);
    const p = PROVIDERS.find(item => item.id === newProviderId);
    if (p) {
      setBaseUrl(p.baseUrl);
      setModel(p.defaultModel);
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    setSaveSuccess(null);
    setSaveError(null);

    const keyToTest = apiKey.trim() || (aiSettings?.api_key_configured ? 'USE_EXISTING' : '');

    if (!keyToTest) {
      setTestResult({
        success: false,
        message: 'Please enter an API key to test the connection.',
      });
      setIsTesting(false);
      return;
    }

    try {
      const res = await api.testAIConnection({
        provider,
        api_key: apiKey.trim(),
        base_url: baseUrl.trim(),
        model: model.trim(),
      });
      setTestResult(res);
    } catch (e: any) {
      setTestResult({
        success: false,
        message: e.message || 'Network test failed.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(null);
    setSaveError(null);

    try {
      await api.updateAISettings({
        provider,
        api_key: apiKey.trim() || undefined,
        base_url: baseUrl.trim(),
        model: model.trim(),
      });
      await onRefreshSettings();
      setSaveSuccess('Configuration updated successfully and stored securely on backend.');
      setApiKey(''); // Clear raw secret from state
    } catch (e: any) {
      setSaveError(e.message || 'Failed to update AI settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Disconnect AI provider and clear stored credentials on the backend?')) {
      return;
    }
    try {
      await api.disconnectAI();
      await onRefreshSettings();
      setApiKey('');
      setTestResult(null);
      setSaveSuccess('AI provider disconnected and credentials wiped from backend.');
    } catch (e: any) {
      setSaveError(e.message || 'Failed to disconnect.');
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-xl font-bold text-[#24242B] flex items-center gap-2">
          <KeyRound className="w-5 h-5 text-[#9785E8]" />
          <span>AI Provider Configuration (BYOK)</span>
        </h1>
        <p className="text-xs text-[#777780] mt-1">
          Bring Your Own Key: Connect PolyPhage AI to OpenAI-compatible endpoints to interpret structured assessments.
        </p>
      </div>

      {/* Security & Responsibility Disclosure */}
      <div className="bg-white rounded-2xl p-6 border border-[#E7E7EB] shadow-xs space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-[#24242B]">
          <ShieldCheck className="w-4 h-4 text-[#72C7B0]" />
          <span>Security Architecture & Researcher Usage Terms</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="space-y-1 bg-[#FAF9FD] p-3.5 rounded-xl border border-[#EAE5FA]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#7461CE] block">
              Backend Credential Isolation
            </span>
            <p className="text-[#777780] leading-relaxed">
              Your API key is never written to browser LocalStorage or frontend bundles. It is managed strictly on the backend server in an isolated configuration file.
            </p>
          </div>

          <div className="space-y-1 bg-[#FAF9FD] p-3.5 rounded-xl border border-[#EAE5FA]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#B47820] block">
              Autonomous Laboratory Guarantee
            </span>
            <p className="text-[#777780] leading-relaxed">
              AI is completely optional. If unconfigured or disconnected, the deterministic biochemical assessment engine and all experimental tools remain 100% operational.
            </p>
          </div>
        </div>
      </div>

      {/* Active Status Banner */}
      <div className="bg-white rounded-2xl p-5 border border-[#E7E7EB] shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`w-3 h-3 rounded-full ${
              aiSettings?.is_active ? 'bg-[#72C7B0]' : 'bg-[#D0D0D6]'
            }`}
          />
          <div>
            <div className="text-xs font-bold text-[#24242B]">
              {aiSettings?.is_active
                ? `Connected to ${aiSettings.provider.toUpperCase()} (${aiSettings.model})`
                : 'No Active AI Connection (Idle / BYOK)'}
            </div>
            <div className="text-[11px] text-[#777780] font-mono">
              {aiSettings?.status_message || (aiSettings?.is_active ? 'Ready for scientific interpretation' : 'Awaiting API key')}
              {aiSettings?.masked_key && ` · Key: ${aiSettings.masked_key}`}
            </div>
          </div>
        </div>

        {aiSettings?.is_active && (
          <button
            onClick={handleDisconnect}
            className="px-3 py-1.5 bg-[#FCEEEE] hover:bg-[#F8E1E1] text-[#C44141] border border-[#F8C8C8] rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Disconnect</span>
          </button>
        )}
      </div>

      {/* Configuration Form */}
      <form onSubmit={handleSaveSettings} className="bg-white rounded-2xl p-6 border border-[#E7E7EB] shadow-xs space-y-5">
        <h2 className="text-xs font-bold uppercase tracking-wider text-[#24242B] border-b border-[#E7E7EB] pb-3">
          Provider & Model Parameters
        </h2>

        {/* Provider selector */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-[#24242B] block">Select AI Provider Adapter:</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {PROVIDERS.map(p => (
              <div
                key={p.id}
                onClick={() => handleProviderSelect(p.id)}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all text-xs ${
                  provider === p.id
                    ? 'bg-[#FAF9FD] border-[#9785E8] shadow-xs ring-1 ring-[#9785E8]/30'
                    : 'bg-[#FAFAFC] border-[#E7E7EB] hover:border-[#D0D0D8] hover:bg-white'
                }`}
              >
                <div className="flex items-center justify-between font-bold text-[#24242B]">
                  <span>{p.name}</span>
                  <a
                    href={p.docUrl}
                    target="_blank"
                    rel="noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="text-[10px] text-[#777780] hover:text-[#9785E8] flex items-center gap-0.5"
                  >
                    <span>Keys</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
                <div className="text-[11px] font-mono text-[#777780] mt-1 truncate">{p.baseUrl}</div>
              </div>
            ))}
          </div>
        </div>

        {/* API Key */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-[#24242B]">
              API Key ({provider.toUpperCase()}):
            </label>
            {aiSettings?.api_key_configured && (
              <span className="text-[10px] font-mono text-[#2D8A6E] flex items-center gap-1 font-semibold">
                <CheckCircle2 className="w-3 h-3" />
                <span>Configured on server ({aiSettings.masked_key})</span>
              </span>
            )}
          </div>
          <input
            type="password"
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            placeholder={
              aiSettings?.api_key_configured
                ? 'Enter new key to replace existing saved credentials...'
                : 'sk-...'
            }
            className="w-full bg-[#F7F7F8] border border-[#E7E7EB] rounded-xl px-4 py-2.5 text-xs font-mono text-[#24242B] placeholder-[#A0A0A8] focus:outline-none focus:border-[#9785E8] focus:bg-white transition-colors"
          />
          <p className="text-[10px] text-[#777780]">
            Never shared with third parties. Handled strictly via backend local store.
          </p>
        </div>

        {/* Base URL */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[#24242B]">API Base URL Endpoint:</label>
          <input
            type="text"
            value={baseUrl}
            onChange={e => setBaseUrl(e.target.value)}
            placeholder="https://api.openai.com/v1"
            className="w-full bg-[#F7F7F8] border border-[#E7E7EB] rounded-xl px-4 py-2.5 text-xs font-mono text-[#24242B] placeholder-[#A0A0A8] focus:outline-none focus:border-[#9785E8] focus:bg-white transition-colors"
          />
        </div>

        {/* Model Identifier */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-[#24242B]">Model Name / ID:</label>
            <div className="flex items-center gap-1">
              {preset.recommendedModels.map(rm => (
                <button
                  type="button"
                  key={rm}
                  onClick={() => setModel(rm)}
                  className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#F7F7F8] hover:bg-[#EAE5FA] text-[#777780] hover:text-[#7461CE] border border-[#E7E7EB] cursor-pointer"
                >
                  {rm}
                </button>
              ))}
            </div>
          </div>
          <input
            type="text"
            value={model}
            onChange={e => setModel(e.target.value)}
            placeholder="gpt-4o-mini"
            className="w-full bg-[#F7F7F8] border border-[#E7E7EB] rounded-xl px-4 py-2.5 text-xs font-mono text-[#24242B] placeholder-[#A0A0A8] focus:outline-none focus:border-[#9785E8] focus:bg-white transition-colors"
          />
        </div>

        {/* Actions & Feedback */}
        <div className="pt-3 border-t border-[#E7E7EB] space-y-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTesting || (!apiKey.trim() && !aiSettings?.api_key_configured)}
              className="px-4 py-2 bg-white hover:bg-[#F7F7F8] text-[#24242B] rounded-xl text-xs font-semibold border border-[#E7E7EB] flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-xs"
            >
              {isTesting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Pinging Endpoint...</span>
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5 text-[#9785E8]" />
                  <span>Test Connection</span>
                </>
              )}
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 bg-[#9785E8] hover:bg-[#8673DC] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
            >
              {isSaving ? (
                <span>Saving...</span>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  <span>Save Configuration</span>
                </>
              )}
            </button>
          </div>

          {/* Test connection report */}
          {testResult && (
            <div
              className={`p-3.5 rounded-xl border text-xs flex items-center gap-2.5 ${
                testResult.success
                  ? 'bg-[#E8F6F1] border-[#C6E8DC] text-[#2D8A6E]'
                  : 'bg-[#FCEEEE] border-[#F8C8C8] text-[#C44141]'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-[#2D8A6E]" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0 text-[#C44141]" />
              )}
              <div className="space-y-0.5">
                <div className="font-medium">{testResult.message}</div>
                {testResult.latency_ms && (
                  <div className="text-[10px] font-mono opacity-80">
                    Round-trip latency: {testResult.latency_ms} ms · Validated endpoint
                  </div>
                )}
              </div>
            </div>
          )}

          {saveSuccess && (
            <div className="p-3 bg-[#E8F6F1] border border-[#C6E8DC] rounded-xl text-xs text-[#2D8A6E] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{saveSuccess}</span>
            </div>
          )}

          {saveError && (
            <div className="p-3 bg-[#FCEEEE] border border-[#F8C8C8] rounded-xl text-xs text-[#C44141] flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{saveError}</span>
            </div>
          )}
        </div>
      </form>
    </div>
  );
};
