import { executeTool } from "./tools";
import type { ResearchRequest, ToolContext, ToolEventEmitter, ToolResult } from "./types";

const COMPANY_TICKERS: Record<string, string> = {
  apple: "AAPL",
  microsoft: "MSFT",
  nvidia: "NVDA",
  amazon: "AMZN",
  alphabet: "GOOGL",
  google: "GOOGL",
  meta: "META",
  tesla: "TSLA",
};

export function tickerFrom(question: string) {
  const company = Object.entries(COMPANY_TICKERS).find(([name]) =>
    question.toLowerCase().includes(name),
  );
  if (company) return company[1];
  const explicitCashTicker = question.match(/\$([A-Za-z]{1,5})\b/)?.[1];
  if (explicitCashTicker) return explicitCashTicker.toUpperCase();
  const excluded = new Set(["DCF", "WACC", "CAPM", "USD", "ETF", "CEO", "CFO"]);
  return question.match(/\b[A-Z]{1,5}\b/g)?.find((item) => !excluded.has(item)) || "AAPL";
}

function latestPriceData(priceResult?: ToolResult) {
  const series = priceResult?.structured.series;
  if (!Array.isArray(series) || series.length < 2) return null;
  const first = series[0] as { close?: number; date?: string };
  const last = series.at(-1) as { close?: number; date?: string };
  if (typeof first.close !== "number" || typeof last.close !== "number") return null;
  return {
    first,
    last,
    change: last.close / first.close - 1,
  };
}

export async function runDemo(request: ResearchRequest, emit: ToolEventEmitter) {
  const ticker = tickerFrom(request.question);
  const context: ToolContext = {
    results: new Map(),
    loadedTools: new Set(["data_equity_reference", "data_equity_prices"]),
    emit,
  };

  emit({ type: "run_started", at: new Date().toISOString(), label: "No-key preview" });
  emit({ type: "phase", at: new Date().toISOString(), label: "Planning" });
  await executeTool(
    "update_plan",
    {
      items: [
        { title: `Resolve ${ticker} and current market context`, status: "in_progress" },
        { title: "Inspect one-year price history", status: "pending" },
        { title: "Draft a traceable preview report", status: "pending" },
      ],
    },
    "plan_1",
    context,
  );

  emit({ type: "phase", at: new Date().toISOString(), label: "Gathering market data" });
  let marketError = "";
  try {
    await executeTool("data_equity_reference", { symbol: ticker }, "quote_1", context);
    await executeTool(
      "data_equity_prices",
      { symbol: ticker, range: "1y", interval: "1d" },
      "prices_1",
      context,
    );
  } catch (error) {
    marketError = error instanceof Error ? error.message : "Market data unavailable";
  }

  await executeTool(
    "update_plan",
    {
      items: [
        { title: `Resolve ${ticker} and current market context`, status: "completed" },
        { title: "Inspect one-year price history", status: marketError ? "pending" : "completed" },
        { title: "Draft a traceable preview report", status: "completed" },
      ],
    },
    "plan_2",
    context,
  );

  emit({ type: "phase", at: new Date().toISOString(), label: "Writing" });
  const reference = context.results.get("quote_1")?.structured;
  const priceData = latestPriceData(context.results.get("prices_1"));
  const price = reference?.regularMarketPrice;
  const currency = reference?.currency || "reported currency";
  const name = reference?.name || ticker;

  const report = marketError
    ? `# Preview could not reach market data

Underwrite is running without an AI key, and the public market-data endpoint did not respond.

**Provider message:** ${marketError}

The application itself is healthy. Connect local Ollama for a fully free research agent, or add a Gemini API key for a hosted deployment.`
    : `# ${name} (${ticker}) preview

> This is Underwrite's deterministic no-key preview. It demonstrates live tools and traceability, not full AI research or investment advice.

## Market snapshot

${typeof price === "number" ? `The latest provider price is **${price.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${currency}**.` : "The provider did not return a latest price."}

${priceData ? `Across the requested one-year series, the observed price moved from **${priceData.first.close?.toFixed(2)}** on ${priceData.first.date} to **${priceData.last.close?.toFixed(2)}** on ${priceData.last.date}, a change of **${(priceData.change * 100).toFixed(1)}%**.` : "The one-year series was not long enough to calculate a period change."}

## What this run proves

- The mode stayed on **${request.mode}** while the same tool registry remained available.
- Market output is stored as structured data and can be referenced by later calls.
- The browser received plan, phase, tool-start, tool-complete, and report events over one stream.

## To answer the full question

Your question was: “${request.question.replaceAll("“", "").replaceAll("”", "")}”

Connect local Ollama or a Gemini key to enable multi-step synthesis, web research, citations, valuation, and risk analysis.`;

  const chunks = report.match(/.{1,90}(?:\s|$)/g) || [report];
  for (const delta of chunks) {
    emit({ type: "report_delta", at: new Date().toISOString(), delta });
  }
  emit({ type: "report_completed", at: new Date().toISOString(), report });
  emit({ type: "done", at: new Date().toISOString(), data: { provider: "demo" } });
  return report;
}
