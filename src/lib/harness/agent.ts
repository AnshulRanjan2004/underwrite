import OpenAI from "openai";
import { runDemo } from "./demo";
import { buildInstructions } from "./modes";
import { resolveProvider } from "./providers";
import {
  executeTool,
  openAITools,
  toolCatalog,
  type ToolSpec,
  visibleToolSpecs,
} from "./tools";
import type { ResearchRequest, ToolContext, ToolEventEmitter } from "./types";

type FunctionCall = { name: string; arguments: unknown; callId: string };

function emitReport(report: string, emit: ToolEventEmitter) {
  const chunks = report.match(/.{1,110}(?:\s|$)/g) || [report];
  chunks.forEach((delta) =>
    emit({ type: "report_delta", at: new Date().toISOString(), delta }),
  );
  emit({ type: "report_completed", at: new Date().toISOString(), report });
}

function safeJson(value: string) {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return {};
  }
}

async function runOpenAI(
  request: ResearchRequest,
  context: ToolContext,
  emit: ToolEventEmitter,
) {
  const provider = resolveProvider(request.modelConfig);
  if (!provider.apiKey) throw new Error("An OpenAI API key is required.");
  const client = new OpenAI({ apiKey: provider.apiKey });
  const input: Array<Record<string, unknown>> = [
    { role: "user", content: request.question },
  ];
  const instructions = buildInstructions(request.mode, toolCatalog());
  let report = "";

  for (let round = 0; round < 14; round += 1) {
    emit({ type: "phase", at: new Date().toISOString(), label: round ? "Continuing analysis" : "Reasoning" });
    const response = await client.responses.create({
      model: provider.model,
      instructions,
      input: input as never,
      tools: openAITools(context.loadedTools) as never,
    });
    input.push(...(response.output as unknown as Array<Record<string, unknown>>));
    const calls: FunctionCall[] = response.output.flatMap((item) =>
      item.type === "function_call"
        ? [{ name: item.name, arguments: safeJson(item.arguments), callId: item.call_id }]
        : [],
    );
    if (!calls.length) {
      report = response.output_text.trim();
      break;
    }
    for (const call of calls) {
      try {
        const output = await executeTool(call.name, call.arguments, call.callId, context);
        input.push({
          type: "function_call_output",
          call_id: call.callId,
          output: JSON.stringify({ markdown: output.markdown, structured: output.structured }),
        });
      } catch (error) {
        input.push({
          type: "function_call_output",
          call_id: call.callId,
          output: JSON.stringify({ ok: false, error: error instanceof Error ? error.message : "Tool failed" }),
        });
      }
    }
  }
  if (!report) throw new Error("The agent reached its step limit without producing a report.");
  emitReport(report, emit);
  return report;
}

function geminiSchema(tool: ToolSpec) {
  const schema = JSON.parse(JSON.stringify(openAITools(new Set([tool.name])).find((item) => item.name === tool.name)?.parameters || {}));
  const clean = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(clean);
    if (value && typeof value === "object") {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>)
          .filter(([key]) => !["$schema", "additionalProperties"].includes(key))
          .map(([key, item]) => [key, clean(item)]),
      );
    }
    return value;
  };
  return { name: tool.name, description: tool.description, parameters: clean(schema) };
}

async function runGemini(
  request: ResearchRequest,
  context: ToolContext,
  emit: ToolEventEmitter,
) {
  const provider = resolveProvider(request.modelConfig);
  const key = provider.apiKey;
  if (!key) throw new Error("GEMINI_API_KEY is not configured.");
  const model = provider.model;
  const contents: Array<Record<string, unknown>> = [
    { role: "user", parts: [{ text: request.question }] },
  ];
  const instructions = buildInstructions(request.mode, toolCatalog());
  let report = "";

  for (let round = 0; round < 14; round += 1) {
    emit({ type: "phase", at: new Date().toISOString(), label: round ? "Continuing analysis" : "Reasoning" });
    const tools = visibleToolSpecs(context.loadedTools).map(geminiSchema);
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: instructions }] },
          contents,
          tools: [{ functionDeclarations: tools }],
          generationConfig: { temperature: 0.2 },
        }),
      },
    );
    const payload = (await response.json()) as Record<string, unknown>;
    if (!response.ok) {
      const detail = JSON.stringify(payload).slice(0, 800);
      throw new Error(`Gemini returned ${response.status}: ${detail}`);
    }
    const candidates = payload.candidates as Array<{ content?: { role?: string; parts?: Array<Record<string, unknown>> } }> | undefined;
    const content = candidates?.[0]?.content;
    const parts = content?.parts || [];
    if (content) contents.push(content as unknown as Record<string, unknown>);
    const calls: FunctionCall[] = parts.flatMap((part, index) => {
      const call = part.functionCall as { name?: string; args?: unknown } | undefined;
      return call?.name
        ? [{ name: call.name, arguments: call.args || {}, callId: `gemini_${round}_${index}` }]
        : [];
    });
    if (!calls.length) {
      report = parts.map((part) => (typeof part.text === "string" ? part.text : "")).join("").trim();
      break;
    }
    const responseParts: Array<Record<string, unknown>> = [];
    for (const call of calls) {
      try {
        const output = await executeTool(call.name, call.arguments, call.callId, context);
        responseParts.push({ functionResponse: { name: call.name, response: { markdown: output.markdown, structured: output.structured } } });
      } catch (error) {
        responseParts.push({ functionResponse: { name: call.name, response: { ok: false, error: error instanceof Error ? error.message : "Tool failed" } } });
      }
    }
    contents.push({ role: "user", parts: responseParts });
  }
  if (!report) throw new Error("The agent reached its step limit without producing a report.");
  emitReport(report, emit);
  return report;
}

async function runOllama(
  request: ResearchRequest,
  context: ToolContext,
  emit: ToolEventEmitter,
) {
  const provider = resolveProvider(request.modelConfig);
  const messages: Array<Record<string, unknown>> = [
    { role: "system", content: buildInstructions(request.mode, toolCatalog()) },
    { role: "user", content: request.question },
  ];
  let report = "";

  for (let round = 0; round < 14; round += 1) {
    emit({ type: "phase", at: new Date().toISOString(), label: round ? "Continuing analysis" : "Reasoning locally" });
    const response = await fetch(`${provider.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: provider.model,
        stream: false,
        messages,
        tools: openAITools(context.loadedTools).map((tool) => ({
          type: "function",
          function: { name: tool.name, description: tool.description, parameters: tool.parameters },
        })),
        options: { temperature: 0.2 },
      }),
    });
    const payload = (await response.json()) as {
      error?: string;
      message?: {
        role?: string;
        content?: string;
        tool_calls?: Array<{ function?: { name?: string; arguments?: unknown } }>;
      };
    };
    if (!response.ok || payload.error) throw new Error(payload.error || `Ollama returned ${response.status}.`);
    const message = payload.message || {};
    messages.push(message as Record<string, unknown>);
    const calls: FunctionCall[] = (message.tool_calls || []).flatMap((item, index) =>
      item.function?.name
        ? [{ name: item.function.name, arguments: item.function.arguments || {}, callId: `ollama_${round}_${index}` }]
        : [],
    );
    if (!calls.length) {
      report = message.content?.trim() || "";
      break;
    }
    for (const call of calls) {
      try {
        const output = await executeTool(call.name, call.arguments, call.callId, context);
        messages.push({ role: "tool", tool_name: call.name, content: JSON.stringify({ markdown: output.markdown, structured: output.structured }) });
      } catch (error) {
        messages.push({ role: "tool", tool_name: call.name, content: JSON.stringify({ ok: false, error: error instanceof Error ? error.message : "Tool failed" }) });
      }
    }
  }
  if (!report) throw new Error("The local agent reached its step limit without producing a report.");
  emitReport(report, emit);
  return report;
}

async function runCompatible(
  request: ResearchRequest,
  context: ToolContext,
  emit: ToolEventEmitter,
) {
  const provider = resolveProvider(request.modelConfig);
  if (!provider.baseUrl || !provider.model) {
    throw new Error("A base URL and model ID are required for an OpenAI-compatible provider.");
  }
  const client = new OpenAI({
    apiKey: provider.apiKey || "not-required",
    baseURL: provider.baseUrl,
  });
  const messages: Array<Record<string, unknown>> = [
    { role: "system", content: buildInstructions(request.mode, toolCatalog()) },
    { role: "user", content: request.question },
  ];
  let report = "";

  for (let round = 0; round < 14; round += 1) {
    emit({ type: "phase", at: new Date().toISOString(), label: round ? "Continuing analysis" : "Reasoning" });
    const response = await client.chat.completions.create({
      model: provider.model,
      messages: messages as never,
      tools: openAITools(context.loadedTools).map((tool) => ({
        type: "function" as const,
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters as Record<string, unknown>,
        },
      })),
      temperature: 0.2,
    });
    const message = response.choices[0]?.message;
    if (!message) throw new Error("The model endpoint returned no assistant message.");
    messages.push(message as unknown as Record<string, unknown>);
    const calls: FunctionCall[] = (message.tool_calls || []).flatMap((item) =>
      item.type === "function"
        ? [{ name: item.function.name, arguments: safeJson(item.function.arguments), callId: item.id }]
        : [],
    );
    if (!calls.length) {
      report = typeof message.content === "string" ? message.content.trim() : "";
      break;
    }
    for (const call of calls) {
      try {
        const output = await executeTool(call.name, call.arguments, call.callId, context);
        messages.push({ role: "tool", tool_call_id: call.callId, content: JSON.stringify({ markdown: output.markdown, structured: output.structured }) });
      } catch (error) {
        messages.push({ role: "tool", tool_call_id: call.callId, content: JSON.stringify({ ok: false, error: error instanceof Error ? error.message : "Tool failed" }) });
      }
    }
  }
  if (!report) throw new Error("The selected model reached its step limit without producing a report. Confirm that it supports tool calling.");
  emitReport(report, emit);
  return report;
}

export async function runResearch(request: ResearchRequest, emit: ToolEventEmitter) {
  const provider = resolveProvider(request.modelConfig);
  if (request.demo || provider.kind === "demo") return runDemo(request, emit);

  const context: ToolContext = {
    results: new Map(),
    loadedTools: new Set(),
    emit,
  };
  emit({ type: "run_started", at: new Date().toISOString(), label: `${provider.label} / ${provider.model}` });

  try {
    const report =
      provider.kind === "openai"
        ? await runOpenAI(request, context, emit)
        : provider.kind === "gemini"
          ? await runGemini(request, context, emit)
          : provider.kind === "openai-compatible"
            ? await runCompatible(request, context, emit)
            : await runOllama(request, context, emit);
    emit({ type: "done", at: new Date().toISOString(), data: { provider: provider.kind, model: provider.model } });
    return report;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Research run failed.";
    emit({ type: "error", at: new Date().toISOString(), message });
    emit({ type: "done", at: new Date().toISOString(), data: { provider: provider.kind, error: message } });
    throw error;
  }
}
