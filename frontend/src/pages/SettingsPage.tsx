import React, { useState } from 'react';
import {
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Trash2,
  ExternalLink,
  Server,
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
    name: 'Groq Cloud (Fast Llama-3 / Gemma)',
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
    name: 'Custom OpenAI-Compatible Endpoint (Local Ollama / vLLM / LiteLLM)',
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

    // If key not typed, check if backend already has configured key
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
      setSaveSuccess('Configuration updated successfully and saved securely on local server.');
      setApiKey(''); // Clear raw secret from local form state
    } catch (e: any) {
      setSaveError(e.message || 'Failed to update AI settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Disconnect AI provider and clear stored API credentials from the backend?')) {
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
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Title */}
      <div>
        <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <KeyRound className="w-5 h-5 text-purple-400" />
          <span>AI Provider Configuration (BYOK Architecture)</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Bring Your Own Key: PolyPhage AI connects to OpenAI-compatible LLMs to interpret structured scientific assessments.
        </p>
      </div>

      {/* Security & Responsibility Disclosure */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Security Architecture & Researcher Usage Terms</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-300 leading-relaxed">
          <div className="space-y-1.5 bg-slate-950 p-3 rounded border border-slate-800/80">
            <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-semibold block">
              Credentials Isolation
            </span>
            <p className="text-[11px] text-slate-400">
              Your API key is never written to browser LocalStorage, client JavaScript bundles, or application logs.
              It is stored strictly on the backend host in a local configuration file with restricted file permissions.
            </p>
          </div>

          <div className="space-y-1.5 bg-slate-950 p-3 rounded border border-slate-800/80">
            <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-semibold block">
              Independent Scientific Laboratory
            </span>
            <p className="text-[11px] text-slate-400">
              AI is completely optional. If unconfigured or disconnected, the deterministic biochemical assessment engine
              and all experimental tools remain 100% operational. You are responsible for your own provider usage charges.
            </p>
          </div>
        </div>
      </div>

      {/* Active Status Banner */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`w-3 h-3 rounded-full ${
              aiSettings?.is_active ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'
            }`}
          />
          <div>
            <div className="text-xs font-semibold text-slate-200">
              {aiSettings?.is_active
                ? `Connected to ${aiSettings.provider.toUpperCase()} (${aiSettings.model})`
                : 'No Active AI Connection (Idle / BYOK)'}
            </div>
            <div className="text-[11px] text-slate-400 font-mono">
              {aiSettings?.status_message || (aiSettings?.is_active ? 'Ready for scientific interpretation' : 'Awaiting API key')}
              {aiSettings?.masked_key && ` · Key: ${aiSettings.masked_key}`}
            </div>
          </div>
        </div>

        {aiSettings?.is_active && (
          <button
            onClick={handleDisconnect}
            className="px-3 py-1.5 bg-red-950/40 hover:bg-red-900/40 text-red-300 border border-red-800/60 rounded text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Disconnect & Wipe Key</span>
          </button>
        )}
      </div>

      {/* Configuration Form */}
      <form onSubmit={handleSaveSettings} className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 space-y-5">
        <h2 className="text-sm font-semibold text-slate-200 border-b border-slate-800 pb-3">
          Provider & Model Parameters
        </h2>

        {/* Provider selector */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-300 block">Select AI Provider Adapter:</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {PROVIDERS.map(p => (
              <div
                key={p.id}
                onClick={() => handleProviderSelect(p.id)}
                className={`p-3 rounded-lg border cursor-pointer transition text-xs ${
                  provider === p.id
                    ? 'bg-slate-800 border-purple-500 shadow-sm'
                    : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between font-semibold text-slate-200">
                  <span>{p.name}</span>
                  <a
                    href={p.docUrl}
                    target="_blank"
                    rel="noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="text-[10px] text-slate-500 hover:text-purple-400 flex items-center gap-0.5"
                  >
                    <span>Keys</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
                <div className="text-[11px] font-mono text-slate-400 mt-1 truncate">{p.baseUrl}</div>
              </div>
            ))}
          </div>
        </div>

        {/* API Key */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-slate-300">
              API Key ({provider.toUpperCase()}):
            </label>
            {aiSettings?.api_key_configured && (
              <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>Saved on server ({aiSettings.masked_key})</span>
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
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-purple-500"
          />
          <p className="text-[10px] text-slate-500">
            Never shared with 3rd parties. Kept strictly on the backend.
          </p>
        </div>

        {/* Base URL */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-300">API Base URL Endpoint:</label>
          <input
            type="text"
            value={baseUrl}
            onChange={e => setBaseUrl(e.target.value)}
            placeholder="https://api.openai.com/v1"
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-purple-500"
          />
        </div>

        {/* Model Identifier */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-slate-300">Model Name / ID:</label>
            <div className="flex items-center gap-1">
              {preset.recommendedModels.map(rm => (
                <button
                  type="button"
                  key={rm}
                  onClick={() => setModel(rm)}
                  className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 hover:bg-slate-800 text-slate-400 border border-slate-800 cursor-pointer"
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
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-purple-500"
          />
        </div>

        {/* Actions & Feedback */}
        <div className="pt-3 border-t border-slate-800 space-y-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTesting || (!apiKey.trim() && !aiSettings?.api_key_configured)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isTesting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Pinging Endpoint...</span>
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Test Connection</span>
                </>
              )}
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
            >
              {isSaving ? (
                <span>Saving...</span>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  <span>Save Configuration to Server</span>
                </>
              )}
            </button>
          </div>

          {/* Test connection report */}
          {testResult && (
            <div
              className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
                testResult.success
                  ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-200'
                  : 'bg-red-950/40 border-red-800/80 text-red-200'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              )}
              <div className="space-y-0.5">
                <div>{testResult.message}</div>
                {testResult.latency_ms && (
                  <div className="text-[10px] font-mono text-emerald-400/80">
                    Round-trip latency: {testResult.latency_ms} ms · Validated endpoint
                  </div>
                )}
              </div>
            </div>
          )}

          {saveSuccess && (
            <div className="p-2.5 bg-emerald-950/40 border border-emerald-800/80 rounded text-xs text-emerald-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{saveSuccess}</span>
            </div>
          )}

          {saveError && (
            <div className="p-2.5 bg-red-950/40 border border-red-800/80 rounded text-xs text-red-200 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{saveError}</span>
            </div>
          )}
        </div>
      </form>
    </div>
  );
};
