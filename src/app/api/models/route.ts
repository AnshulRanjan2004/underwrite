import OpenAI from "openai";
import { z } from "zod";
import { resolveProvider, validateModelEndpoint } from "@/lib/harness/providers";
import { checkRateLimit, rateLimitHeaders } from "@/lib/server/rate-limit";

const schema = z.object({
  provider: z.enum(["auto", "openai", "gemini", "ollama", "openai-compatible"]),
  model: z.string().trim().max(200).optional(),
  apiKey: z.string().trim().max(1000).optional(),
  baseUrl: z.string().url().max(1000).optional(),
});

export async function POST(request: Request) {
  const rate = checkRateLimit(request, "model-list", { limit: 20, windowMs: 60_000 });
  if (!rate.allowed) {
    return Response.json({ error: "Too many model-list requests. Please wait and try again." }, { status: 429, headers: rateLimitHeaders(rate) });
  }
  try {
    const input = schema.parse(await request.json());
    const provider = resolveProvider(input);
    let models: string[] = [];

    if (provider.kind === "ollama" || provider.kind === "openai-compatible") {
      await validateModelEndpoint(provider.baseUrl);
    }

    if (provider.kind === "openai" || provider.kind === "openai-compatible") {
      if (!provider.apiKey) throw new Error("An API key is required to list models.");
      const client = new OpenAI({
        apiKey: provider.apiKey,
        baseURL: provider.kind === "openai-compatible" ? provider.baseUrl : undefined,
        timeout: 15_000,
        maxRetries: 1,
      });
      const page = await client.models.list();
      models = page.data.map((item) => item.id).sort();
    } else if (provider.kind === "gemini") {
      if (!provider.apiKey) throw new Error("A Gemini API key is required to list models.");
      const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models", {
        headers: { "x-goog-api-key": provider.apiKey },
        signal: AbortSignal.timeout(15_000),
      });
      const payload = (await response.json()) as {
        models?: Array<{ name?: string; supportedGenerationMethods?: string[] }>;
      };
      if (!response.ok) throw new Error(`Gemini returned ${response.status}.`);
      models = (payload.models || [])
        .filter((item) => item.supportedGenerationMethods?.includes("generateContent"))
        .flatMap((item) => (item.name ? [item.name.replace(/^models\//, "")] : []))
        .sort();
    } else if (provider.kind === "ollama") {
      const response = await fetch(`${provider.baseUrl}/api/tags`, { signal: AbortSignal.timeout(15_000) });
      const payload = (await response.json()) as { models?: Array<{ name?: string }> };
      if (!response.ok) throw new Error(`Ollama returned ${response.status}.`);
      models = (payload.models || []).flatMap((item) => (item.name ? [item.name] : [])).sort();
    }

    return Response.json({ models, provider: provider.kind }, { headers: rateLimitHeaders(rate) });
  } catch {
    return Response.json(
      { error: "Could not list models. Verify the provider connection and try again." },
      { status: 400, headers: rateLimitHeaders(rate) },
    );
  }
}
