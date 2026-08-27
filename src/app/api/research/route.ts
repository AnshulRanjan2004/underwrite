import { z } from "zod";
import { runResearch } from "@/lib/harness/agent";
import type { RunEvent } from "@/lib/harness/types";
import { checkRateLimit, rateLimitHeaders } from "@/lib/server/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 300;

const requestSchema = z.object({
  question: z.string().trim().min(3).max(5000),
  mode: z.enum(["auto", "research", "analytical"]),
  demo: z.boolean().optional(),
  modelConfig: z
    .object({
      provider: z.enum(["auto", "openai", "gemini", "ollama", "openai-compatible"]),
      model: z.string().trim().max(200).optional(),
      apiKey: z.string().trim().max(1000).optional(),
      baseUrl: z.string().url().max(1000).optional(),
    })
    .optional(),
});

const encoder = new TextEncoder();

function frame(event: RunEvent) {
  return encoder.encode(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
}

export async function POST(request: Request) {
  const rate = checkRateLimit(request, "research", { limit: 6, windowMs: 10 * 60_000 });
  if (!rate.allowed) {
    return Response.json({ error: "Too many research runs. Please wait before starting another." }, { status: 429, headers: rateLimitHeaders(rate) });
  }
  let input: z.infer<typeof requestSchema>;
  try {
    input = requestSchema.parse(await request.json());
  } catch {
    return Response.json(
      { error: "Invalid research request." },
      { status: 400, headers: rateLimitHeaders(rate) },
    );
  }

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const emit = (event: RunEvent) => controller.enqueue(frame(event));
      void runResearch(input, emit)
        .catch(() => undefined)
        .finally(() => controller.close());
    },
  });

  return new Response(stream, {
    headers: {
      ...rateLimitHeaders(rate),
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no",
    },
  });
}
