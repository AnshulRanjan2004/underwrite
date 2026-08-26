import OpenAI from "openai";
import { z } from "zod";
import { resolveProvider } from "@/lib/harness/providers";

const schema = z.object({
  provider: z.enum(["auto", "openai", "gemini", "ollama", "openai-compatible"]),
  model: z.string().optional(),
  apiKey: z.string().optional(),
  baseUrl: z.string().url().optional(),
});

export async function POST(request: Request) {
  try {
    const input = schema.parse(await request.json());
    const provider = resolveProvider(input);
    let models: string[] = [];

    if (provider.kind === "openai" || provider.kind === "openai-compatible") {
      if (!provider.apiKey) throw new Error("An API key is required to list models.");
      const client = new OpenAI({
        apiKey: provider.apiKey,
        baseURL: provider.kind === "openai-compatible" ? provider.baseUrl : undefined,
      });
      const page = await client.models.list();
      models = page.data.map((item) => item.id).sort();
    } else if (provider.kind === "gemini") {
      if (!provider.apiKey) throw new Error("A Gemini API key is required to list models.");
      const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models", {
        headers: { "x-goog-api-key": provider.apiKey },
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
      const response = await fetch(`${provider.baseUrl}/api/tags`);
      const payload = (await response.json()) as { models?: Array<{ name?: string }> };
      if (!response.ok) throw new Error(`Ollama returned ${response.status}.`);
      models = (payload.models || []).flatMap((item) => (item.name ? [item.name] : [])).sort();
    }

    return Response.json({ models, provider: provider.kind });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Could not list models." },
      { status: 400 },
    );
  }
}

