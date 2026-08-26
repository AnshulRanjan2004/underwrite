"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Check, Eye, EyeSlash, GearSix, Key, SpinnerGap, X } from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import type { ModelConfig, ModelProvider } from "@/lib/harness/types";

type Props = { value: ModelConfig; onChange: (value: ModelConfig) => void };

const PROVIDERS: Array<{ value: ModelProvider; label: string; description: string; defaultModel: string }> = [
  { value: "auto", label: "Automatic", description: "Use server configuration or the no-key preview", defaultModel: "" },
  { value: "openai", label: "OpenAI", description: "Responses API with native tool calling", defaultModel: "gpt-5.6" },
  { value: "gemini", label: "Gemini", description: "Hosted option with a free API tier", defaultModel: "gemini-2.5-flash" },
  { value: "ollama", label: "Ollama", description: "Fully local and free", defaultModel: "qwen3:8b" },
  { value: "openai-compatible", label: "Compatible API", description: "vLLM, OpenRouter, LM Studio, or another host", defaultModel: "" },
];

export function ModelSettings({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const [rememberKey, setRememberKey] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [models, setModels] = useState<string[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [modelError, setModelError] = useState("");

  const provider = useMemo(() => PROVIDERS.find((item) => item.value === draft.provider) || PROVIDERS[0], [draft.provider]);

  function selectProvider(next: ModelProvider) {
    const selected = PROVIDERS.find((item) => item.value === next);
    setDraft({
      provider: next,
      model: selected?.defaultModel || "",
      apiKey: next === "ollama" ? "" : draft.apiKey,
      baseUrl: next === "ollama" ? "http://127.0.0.1:11434" : next === "openai-compatible" ? draft.baseUrl || "" : "",
    });
    setModels([]);
    setModelError("");
  }

  async function loadModels() {
    setLoadingModels(true);
    setModelError("");
    try {
      const response = await fetch("/api/models", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(draft) });
      const payload = (await response.json()) as { models?: string[]; error?: string };
      if (!response.ok) throw new Error(payload.error || "Could not load models.");
      setModels(payload.models || []);
      if (!payload.models?.length) setModelError("The provider returned no compatible model IDs.");
    } catch (error) {
      setModelError(error instanceof Error ? error.message : "Could not load models.");
    } finally {
      setLoadingModels(false);
    }
  }

  function save() {
    const next = { ...draft, model: draft.model?.trim(), apiKey: draft.apiKey?.trim(), baseUrl: draft.baseUrl?.trim() };
    onChange(next);
    localStorage.setItem("underwrite-model-config", JSON.stringify({ ...next, apiKey: rememberKey ? next.apiKey : "" }));
    localStorage.setItem("underwrite-remember-key", String(rememberKey));
    setOpen(false);
  }

  return (
    <Dialog.Root open={open} onOpenChange={(nextOpen) => { setOpen(nextOpen); if (nextOpen) { setDraft(value); setRememberKey(localStorage.getItem("underwrite-remember-key") === "true"); } }}>
      <Dialog.Trigger asChild>
        <button className="provider-button" type="button" aria-label="Configure model"><span className="provider-status" aria-hidden="true" /><span>{provider.label}</span><span className="provider-model">{value.model || "Choose model"}</span><GearSix size={16} weight="bold" /></button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="settings-dialog">
          <div className="dialog-heading">
            <div><Dialog.Title>Model connection</Dialog.Title><Dialog.Description>Bring your own key. Credentials remain in this browser unless you submit a run.</Dialog.Description></div>
            <Dialog.Close asChild><button className="icon-button" type="button" aria-label="Close settings"><X size={18} /></button></Dialog.Close>
          </div>
          <div className="provider-grid" role="radiogroup" aria-label="AI provider">
            {PROVIDERS.map((item) => (
              <button className="provider-option" data-active={draft.provider === item.value} key={item.value} onClick={() => selectProvider(item.value)} role="radio" aria-checked={draft.provider === item.value} type="button"><span>{item.label}</span><small>{item.description}</small>{draft.provider === item.value && <Check size={16} weight="bold" />}</button>
            ))}
          </div>
          {draft.provider === "auto" ? (
            <div className="automatic-note">Underwrite will use the server&apos;s configured provider. If none is present, it falls back to the live no-key preview.</div>
          ) : <div className="settings-form">
            {draft.provider !== "ollama" && (
              <label className="field"><span>API key</span><span className="input-with-icon"><Key size={17} /><input type={showKey ? "text" : "password"} value={draft.apiKey || ""} onChange={(event) => setDraft({ ...draft, apiKey: event.target.value })} placeholder={draft.provider === "openai" ? "sk-..." : "Paste provider key"} autoComplete="off" spellCheck={false} /><button type="button" onClick={() => setShowKey((current) => !current)} aria-label={showKey ? "Hide API key" : "Show API key"}>{showKey ? <EyeSlash size={17} /> : <Eye size={17} />}</button></span></label>
            )}
            {(draft.provider === "ollama" || draft.provider === "openai-compatible") && (
              <label className="field"><span>Base URL</span><input type="url" value={draft.baseUrl || ""} onChange={(event) => setDraft({ ...draft, baseUrl: event.target.value })} placeholder={draft.provider === "ollama" ? "http://127.0.0.1:11434" : "https://api.example.com/v1"} spellCheck={false} /><small>Private network URLs are allowed in local development and trusted self-hosting.</small></label>
            )}
            <label className="field"><span>Model ID</span><div className="model-field-row"><input list="underwrite-model-list" value={draft.model || ""} onChange={(event) => setDraft({ ...draft, model: event.target.value })} placeholder="Enter any tool-capable model ID" spellCheck={false} /><button className="secondary-button" type="button" onClick={loadModels} disabled={loadingModels}>{loadingModels && <SpinnerGap className="spin" size={16} />}Load models</button></div><datalist id="underwrite-model-list">{models.map((model) => <option value={model} key={model} />)}</datalist>{modelError ? <small className="field-error">{modelError}</small> : <small>The model must support function or tool calling for full research runs.</small>}</label>
            {draft.provider !== "ollama" && (
              <label className="check-field"><input type="checkbox" checked={rememberKey} onChange={(event) => setRememberKey(event.target.checked)} /><span>Remember key on this device<small>Stored only in browser local storage. Leave off on a shared computer.</small></span></label>
            )}
          </div>}
          <div className="dialog-actions"><Dialog.Close asChild><button className="secondary-button" type="button">Cancel</button></Dialog.Close><button className="primary-button" type="button" onClick={save} disabled={(draft.provider !== "auto" && !draft.model) || (draft.provider === "openai-compatible" && !draft.baseUrl)}>Save connection</button></div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
