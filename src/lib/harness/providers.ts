import type { ModelConfig } from "./types";
import { allowsPrivateModelEndpoints, assertSafeModelEndpoint } from "./network";

export type ProviderKind =
  | "demo"
  | "ollama"
  | "gemini"
  | "openai"
  | "openai-compatible";

export type ProviderConfig = {
  kind: ProviderKind;
  label: string;
  model: string;
  baseUrl?: string;
  apiKey?: string;
};

function safeBaseUrl(value: string) {
  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Model endpoint must use HTTP or HTTPS.");
  }
  const privateHost =
    url.hostname === "localhost" ||
    url.hostname === "127.0.0.1" ||
    url.hostname === "0.0.0.0" ||
    url.hostname === "::1" ||
    /^10\./.test(url.hostname) ||
    /^192\.168\./.test(url.hostname) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(url.hostname);
  if (
    process.env.NODE_ENV === "production" &&
    privateHost &&
    !allowsPrivateModelEndpoints()
  ) {
    throw new Error(
      "Private model endpoints are disabled in production. Set ALLOW_PRIVATE_MODEL_ENDPOINTS=true only on a trusted self-hosted server.",
    );
  }
  return value.replace(/\/$/, "");
}

export async function validateModelEndpoint(value: string | undefined) {
  if (value) await assertSafeModelEndpoint(value);
}

export function resolveProvider(override?: ModelConfig): ProviderConfig {
  const requested =
    override?.provider && override.provider !== "auto"
      ? override.provider
      : process.env.AI_PROVIDER?.toLowerCase();

  if (requested === "openai-compatible") {
    if (!override?.baseUrl) {
      throw new Error("A base URL is required for an OpenAI-compatible provider.");
    }
    return {
      kind: "openai-compatible",
      label: "OpenAI-compatible",
      model: override.model || "",
      baseUrl: safeBaseUrl(override.baseUrl),
      apiKey: override.apiKey || "not-required",
    };
  }

  if (requested === "ollama" || (!requested && process.env.OLLAMA_BASE_URL)) {
    return {
      kind: "ollama",
      label: "Local Ollama",
      model: override?.model || process.env.OLLAMA_MODEL || "qwen3:8b",
      baseUrl: safeBaseUrl(override?.baseUrl || process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434"),
    };
  }

  if (requested === "gemini" || (!requested && process.env.GEMINI_API_KEY)) {
    return {
      kind: "gemini",
      label: "Gemini",
      model: override?.model || process.env.GEMINI_MODEL || "gemini-2.5-flash",
      apiKey: override?.apiKey || process.env.GEMINI_API_KEY,
    };
  }

  if (requested === "openai" || (!requested && process.env.OPENAI_API_KEY)) {
    return {
      kind: "openai",
      label: "OpenAI",
      model: override?.model || process.env.OPENAI_MODEL || "gpt-5.6",
      apiKey: override?.apiKey || process.env.OPENAI_API_KEY,
    };
  }

  return { kind: "demo", label: "No-key preview", model: "deterministic" };
}

export function publicProviderStatus() {
  const provider = resolveProvider();
  return {
    kind: provider.kind,
    label: provider.label,
    model: provider.model,
    configured: provider.kind !== "demo",
  };
}
