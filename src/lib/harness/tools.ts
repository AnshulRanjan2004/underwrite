import { z } from "zod";
import { resolveReferences } from "./chaining";
import { assertSafeOutboundUrl } from "./network";
import { SKILLS } from "./skills";
import type { ToolContext, ToolResult } from "./types";

export class ToolExecutionError extends Error {}

export type ToolSpec = {
  name: string;
  displayName: string;
  tier: "core" | "deferred";
  description: string;
  tags: string[];
  schema: z.ZodType;
  execute: (args: unknown, context: ToolContext) => Promise<ToolResult>;
};

const result = (
  markdown: string,
  structured: Record<string, unknown>,
  meta: Record<string, unknown> = {},
): ToolResult => ({ markdown, structured, meta });

function number(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizeSymbol(symbol: string) {
  return symbol.trim().toUpperCase();
}

async function fetchYahoo(path: string) {
  const response = await fetch(`https://query1.finance.yahoo.com${path}`, {
    headers: {
      accept: "application/json",
      "user-agent": "Mozilla/5.0 Underwrite/0.1",
    },
    next: { revalidate: 60 },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    throw new ToolExecutionError(
      `Market-data provider returned ${response.status}. Try again or verify the ticker.`,
    );
  }
  return response.json() as Promise<Record<string, unknown>>;
}

async function chart(symbol: string, range = "1y", interval = "1d") {
  const safe = encodeURIComponent(normalizeSymbol(symbol));
  const payload = await fetchYahoo(
    `/v8/finance/chart/${safe}?range=${encodeURIComponent(range)}&interval=${encodeURIComponent(interval)}&events=div%2Csplits`,
  );
  const chartData = payload.chart as
    | { error?: { description?: string }; result?: Array<Record<string, unknown>> }
    | undefined;
  if (chartData?.error) {
    throw new ToolExecutionError(chartData.error.description || "Ticker lookup failed.");
  }
  const first = chartData?.result?.[0];
  if (!first) throw new ToolExecutionError(`No market data found for ${symbol}.`);
  return first;
}

async function quoteSummary(symbol: string, modules: string[]) {
  const safe = encodeURIComponent(normalizeSymbol(symbol));
  const payload = await fetchYahoo(
    `/v10/finance/quoteSummary/${safe}?modules=${modules.join("%2C")}`,
  );
  const summary = payload.quoteSummary as
    | { error?: { description?: string }; result?: Array<Record<string, unknown>> }
    | undefined;
  if (summary?.error) {
    throw new ToolExecutionError(summary.error.description || "Fundamental-data lookup failed.");
  }
  const first = summary?.result?.[0];
  if (!first) throw new ToolExecutionError(`No fundamental data found for ${symbol}.`);
  return first;
}

function raw(value: unknown): unknown {
  if (value && typeof value === "object" && "raw" in value) {
    return (value as { raw: unknown }).raw;
  }
  return value;
}

function unwrap(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(unwrap);
  if (value && typeof value === "object") {
    if ("raw" in value && Object.keys(value).every((key) => ["raw", "fmt", "longFmt"].includes(key))) {
      return raw(value);
    }
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, unwrap(item)]),
    );
  }
  return value;
}

function stats(values: number[]) {
  if (!values.length) throw new ToolExecutionError("At least one numeric value is required.");
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance =
    values.length > 1
      ? values.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
        (values.length - 1)
      : 0;
  return { mean, variance, stdDev: Math.sqrt(variance) };
}

function evaluateExpression(expression: string) {
  const normalized = expression.replaceAll(",", "").replaceAll("^", "**").replace(/\s+/g, "");
  const tokens = normalized.match(/(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?|\*\*|[()+\-*/%]/gi);
  if (!tokens || tokens.join("") !== normalized) {
    throw new ToolExecutionError("Expression contains unsupported characters.");
  }
  let index = 0;
  const apply = (operator: string, left: number, right: number) => {
    const value = operator === "+" ? left + right
      : operator === "-" ? left - right
        : operator === "*" ? left * right
          : operator === "/" ? left / right
            : operator === "%" ? left % right
              : Math.pow(left, right);
    if (!Number.isFinite(value)) throw new ToolExecutionError("Expression did not produce a finite number.");
    return value;
  };
  const parsePrimary = (): number => {
    const token = tokens[index++];
    if (token === "+") return parsePrimary();
    if (token === "-") return -parsePrimary();
    if (token === "(") {
      const value = parseSum();
      if (tokens[index++] !== ")") throw new ToolExecutionError("Expression has unmatched parentheses.");
      return value;
    }
    const value = Number(token);
    if (!Number.isFinite(value)) throw new ToolExecutionError("Expression contains an invalid number.");
    return value;
  };
  const parsePower = (): number => {
    const left = parsePrimary();
    if (tokens[index] !== "**") return left;
    index += 1;
    return apply("**", left, parsePower());
  };
  const parseProduct = (): number => {
    let value = parsePower();
    while (["*", "/", "%"].includes(tokens[index] || "")) {
      value = apply(tokens[index++], value, parsePower());
    }
    return value;
  };
  const parseSum = (): number => {
    let value = parseProduct();
    while (["+", "-"].includes(tokens[index] || "")) {
      value = apply(tokens[index++], value, parseProduct());
    }
    return value;
  };
  const result = parseSum();
  if (index !== tokens.length) throw new ToolExecutionError("Expression could not be parsed.");
  return result;
}

async function fetchPublicPage(value: string) {
  let url = await assertSafeOutboundUrl(value);
  for (let hop = 0; hop < 4; hop += 1) {
    const response = await fetch(url, {
      headers: { "user-agent": "Mozilla/5.0 Underwrite/0.1", accept: "text/html, text/plain, application/xhtml+xml" },
      redirect: "manual",
      signal: AbortSignal.timeout(15_000),
    });
    if (![301, 302, 303, 307, 308].includes(response.status)) return { response, url };
    const location = response.headers.get("location");
    if (!location) throw new ToolExecutionError("The page redirect did not include a destination.");
    url = await assertSafeOutboundUrl(new URL(location, url).toString());
  }
  throw new ToolExecutionError("The page redirected too many times.");
}

async function readTextWithLimit(response: Response, maxBytes: number) {
  const contentLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw new ToolExecutionError("The page is too large to inspect safely.");
  }
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new ToolExecutionError("The page is too large to inspect safely.");
    }
    chunks.push(value);
  }
  return new TextDecoder().decode(Buffer.concat(chunks));
}

function returns(values: number[]) {
  return values.slice(1).map((value, index) => value / values[index] - 1);
}

const updatePlanSchema = z.object({
  items: z.array(
    z.object({
      title: z.string().min(1),
      status: z.enum(["pending", "in_progress", "completed"]),
    }),
  ),
});

const toolSpecs: ToolSpec[] = [
  {
    name: "update_plan",
    displayName: "core.update_plan",
    tier: "core",
    description: "Create or update the visible investigation plan and the status of each research step.",
    tags: ["planning", "workflow"],
    schema: updatePlanSchema,
    execute: async (args, context) => {
      const parsed = updatePlanSchema.parse(args);
      context.emit({ type: "plan", at: new Date().toISOString(), data: parsed.items });
      return result("Plan updated.", { items: parsed.items });
    },
  },
  {
    name: "calc",
    displayName: "core.calc",
    tier: "core",
    description: "Evaluate a basic arithmetic expression containing numbers, parentheses, and standard operators.",
    tags: ["math", "calculation"],
    schema: z.object({ expression: z.string().min(1).max(240) }),
    execute: async (args) => {
      const { expression } = z.object({ expression: z.string().min(1).max(240) }).parse(args);
      const value = evaluateExpression(expression);
      return result(`Result: ${value}`, { expression, value });
    },
  },
  {
    name: "load_tool",
    displayName: "core.load_tool",
    tier: "core",
    description: "Load full callable schemas for one or more deferred tools from the constant registry.",
    tags: ["tool-discovery"],
    schema: z.object({ names: z.array(z.string()).min(1) }),
    execute: async (args, context) => {
      const { names } = z.object({ names: z.array(z.string()) }).parse(args);
      const known = names.filter((name) => TOOL_MAP.has(name));
      const unknown = names.filter((name) => !TOOL_MAP.has(name));
      known.forEach((name) => context.loadedTools.add(name));
      return result(
        `Loaded: ${known.join(", ") || "none"}${unknown.length ? `. Unknown: ${unknown.join(", ")}` : ""}`,
        { loaded: known, unknown },
      );
    },
  },
  {
    name: "load_skill",
    displayName: "core.load_skill",
    tier: "core",
    description: "Load a reusable financial workflow and reveal every deferred tool required by that workflow.",
    tags: ["workflow", "skills"],
    schema: z.object({ name: z.string() }),
    execute: async (args, context) => {
      const { name } = z.object({ name: z.string() }).parse(args);
      const skill = SKILLS.find((item) => item.name === name);
      if (!skill) throw new ToolExecutionError(`Unknown skill: ${name}`);
      skill.tools.forEach((tool) => context.loadedTools.add(tool));
      return result(
        `Loaded skill ${skill.name}. ${skill.guidance}`,
        { name: skill.name, tools: skill.tools, guidance: skill.guidance },
      );
    },
  },
  {
    name: "compose_citations",
    displayName: "research.compose_citations",
    tier: "core",
    description: "Format a numbered source list from titles and URLs already gathered during the research run.",
    tags: ["research", "citations"],
    schema: z.object({
      sources: z.array(z.object({ title: z.string(), url: z.string().url() })),
    }),
    execute: async (args) => {
      const { sources } = z
        .object({ sources: z.array(z.object({ title: z.string(), url: z.string().url() })) })
        .parse(args);
      const markdown = sources
        .map((source, index) => `${index + 1}. [${source.title}](${source.url})`)
        .join("\n");
      return result(markdown || "No sources supplied.", { sources });
    },
  },
  {
    name: "search",
    displayName: "research.search",
    tier: "core",
    description: "Search the public web with a no-key fallback and return titles, URLs, and short result snippets.",
    tags: ["research", "web", "discovery"],
    schema: z.object({ query: z.string().min(2), limit: z.number().int().min(1).max(10).optional() }),
    execute: async (args) => {
      const { query, limit = 6 } = z
        .object({ query: z.string().min(2), limit: z.number().int().optional() })
        .parse(args);
      const response = await fetch(
        `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
        {
          headers: {
            accept: "text/html",
            "user-agent": "Mozilla/5.0 Underwrite/0.1",
          },
          signal: AbortSignal.timeout(15000),
        },
      );
      if (!response.ok) {
        throw new ToolExecutionError(`Search provider returned ${response.status}.`);
      }
      const html = await response.text();
      const blocks = html.split('class="result results_links').slice(1);
      const hits = blocks.slice(0, limit).flatMap((block) => {
        const anchor = block.match(/class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
        if (!anchor) return [];
        const snippetMatch = block.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>|class="result__snippet"[^>]*>([\s\S]*?)<\/div>/i);
        const clean = (value: string) =>
          value
            .replace(/<[^>]+>/g, " ")
            .replace(/&amp;/g, "&")
            .replace(/&#x27;/g, "'")
            .replace(/&quot;/g, '"')
            .replace(/\s+/g, " ")
            .trim();
        let url = anchor[1].replace(/&amp;/g, "&");
        try {
          const parsed = new URL(url, "https://duckduckgo.com");
          url = parsed.searchParams.get("uddg") || parsed.toString();
        } catch {
          return [];
        }
        return [{ title: clean(anchor[2]), url, snippet: clean(snippetMatch?.[1] || snippetMatch?.[2] || "") }];
      });
      if (!hits.length) throw new ToolExecutionError("No search results were returned. Refine the query and try again.");
      return result(
        hits.map((hit, index) => `${index + 1}. [${hit.title}](${hit.url})\n   ${hit.snippet}`).join("\n"),
        { query, hits },
        { provider: "DuckDuckGo HTML fallback" },
      );
    },
  },
  {
    name: "visit",
    displayName: "research.visit",
    tier: "deferred",
    description: "Fetch a public web page and return readable text with its canonical URL for source-grounded analysis.",
    tags: ["research", "web", "source"],
    schema: z.object({ url: z.string().url(), maxCharacters: z.number().int().min(1000).max(30000).optional() }),
    execute: async (args, context) => {
      const { url, maxCharacters = 14000 } = z
        .object({ url: z.string().url(), maxCharacters: z.number().int().optional() })
        .parse(args);
      const { response, url: finalUrl } = await fetchPublicPage(url);
      if (!response.ok) throw new ToolExecutionError(`Page returned ${response.status}.`);
      const contentType = response.headers.get("content-type") || "";
      if (!/^(text\/html|text\/plain|application\/xhtml\+xml)/i.test(contentType)) {
        throw new ToolExecutionError("Only HTML and plain-text pages can be inspected.");
      }
      const html = await readTextWithLimit(response, 2_000_000);
      const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]
        ?.replace(/\s+/g, " ")
        .trim() || finalUrl.hostname;
      const text = html
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, maxCharacters);
      context.emit({ type: "source", at: new Date().toISOString(), title, url: finalUrl.toString() });
      return result(`# ${title}\n\n${text}`, { title, url: finalUrl.toString(), text }, { fetchedAt: new Date().toISOString() });
    },
  },
  {
    name: "data_instrument_search",
    displayName: "data.instrument.search",
    tier: "deferred",
    description: "Resolve names or partial tickers across global equities, ETFs, funds, indices, futures, currencies, and crypto instruments available from Yahoo Finance.",
    tags: ["market", "instrument", "discovery", "global"],
    schema: z.object({
      query: z.string().min(1),
      limit: z.number().int().min(1).max(10).optional(),
    }),
    execute: async (args) => {
      const { query, limit = 8 } = z
        .object({ query: z.string().min(1), limit: z.number().int().min(1).max(10).optional() })
        .parse(args);
      const payload = await fetchYahoo(
        `/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=${limit}&newsCount=0`,
      );
      const quotes = Array.isArray(payload.quotes) ? payload.quotes : [];
      const instruments = quotes.slice(0, limit).map((quote) => {
        const item = quote as Record<string, unknown>;
        return {
          symbol: item.symbol,
          name: item.longname || item.shortname || item.symbol,
          instrumentType: item.quoteType || item.typeDisp,
          exchange: item.exchDisp || item.exchange,
          sector: item.sectorDisp || item.sector,
          industry: item.industryDisp || item.industry,
        };
      });
      if (!instruments.length) {
        throw new ToolExecutionError(`No instruments found for ${query}.`);
      }
      const markdown = instruments
        .map((item, index) => `${index + 1}. ${item.name} (${item.symbol}) | ${item.instrumentType || "instrument"} | ${item.exchange || "exchange unavailable"}`)
        .join("\n");
      return result(markdown, { query, instruments }, { provider: "Yahoo Finance" });
    },
  },
  {
    name: "data_equity_reference",
    displayName: "data.equity.reference",
    tier: "deferred",
    description: "Resolve a ticker and return current exchange, currency, price, market state, and instrument metadata.",
    tags: ["equity", "quote", "identity"],
    schema: z.object({ symbol: z.string().min(1) }),
    execute: async (args, context) => {
      const { symbol } = z.object({ symbol: z.string() }).parse(args);
      const payload = await chart(symbol, "5d", "1d");
      const meta = (payload.meta || {}) as Record<string, unknown>;
      const structured = {
        symbol: normalizeSymbol(symbol),
        name: meta.longName || meta.shortName || normalizeSymbol(symbol),
        exchange: meta.fullExchangeName || meta.exchangeName,
        currency: meta.currency,
        instrumentType: meta.instrumentType,
        regularMarketPrice: number(meta.regularMarketPrice),
        previousClose: number(meta.chartPreviousClose) || number(meta.previousClose),
        marketState: meta.marketState,
        timezone: meta.exchangeTimezoneName,
        asOf: meta.regularMarketTime,
      };
      context.emit({
        type: "source",
        at: new Date().toISOString(),
        title: `${structured.name} market reference`,
        url: `https://finance.yahoo.com/quote/${encodeURIComponent(structured.symbol)}/`,
      });
      return result(`Latest reference data for ${structured.symbol}:\n\n\`\`\`json\n${JSON.stringify(structured, null, 2)}\n\`\`\``, structured);
    },
  },
  {
    name: "data_equity_prices",
    displayName: "data.equity.prices",
    tier: "deferred",
    description: "Return dated adjusted price history and volume for a Yahoo Finance instrument over a requested range and interval.",
    tags: ["market", "equity", "etf", "index", "prices", "time-series"],
    schema: z.object({
      symbol: z.string(),
      range: z.enum(["1mo", "3mo", "6mo", "1y", "2y", "5y", "10y"]).optional(),
      interval: z.enum(["1d", "1wk", "1mo"]).optional(),
    }),
    execute: async (args, context) => {
      const { symbol, range = "1y", interval = "1d" } = z
        .object({ symbol: z.string(), range: z.string().optional(), interval: z.string().optional() })
        .parse(args);
      const payload = await chart(symbol, range, interval);
      const timestamps = (payload.timestamp || []) as number[];
      const indicators = payload.indicators as {
        quote?: Array<{ close?: Array<number | null>; volume?: Array<number | null> }>;
        adjclose?: Array<{ adjclose?: Array<number | null> }>;
      };
      const prices = indicators?.adjclose?.[0]?.adjclose || indicators?.quote?.[0]?.close || [];
      const volumes = indicators?.quote?.[0]?.volume || [];
      const series = timestamps
        .map((timestamp, index) => ({
          date: new Date(timestamp * 1000).toISOString().slice(0, 10),
          close: prices[index],
          volume: volumes[index],
        }))
        .filter((item) => typeof item.close === "number");
      context.emit({
        type: "source",
        at: new Date().toISOString(),
        title: `${normalizeSymbol(symbol)} historical prices`,
        url: `https://finance.yahoo.com/quote/${encodeURIComponent(normalizeSymbol(symbol))}/history/`,
      });
      return result(
        `${normalizeSymbol(symbol)} price history contains ${series.length} observations from ${series[0]?.date || "n/a"} to ${series.at(-1)?.date || "n/a"}.`,
        { symbol: normalizeSymbol(symbol), range, interval, series },
      );
    },
  },
  {
    name: "data_equity_fundamentals",
    displayName: "data.equity.fundamentals",
    tier: "deferred",
    description: "Return available income statement, balance sheet, cash-flow, and financial-health fields for an equity.",
    tags: ["equity", "fundamentals", "statements"],
    schema: z.object({ symbol: z.string() }),
    execute: async (args) => {
      const { symbol } = z.object({ symbol: z.string() }).parse(args);
      const summary = await quoteSummary(symbol, [
        "financialData",
        "incomeStatementHistory",
        "cashflowStatementHistory",
        "balanceSheetHistory",
      ]);
      const structured = unwrap(summary) as Record<string, unknown>;
      return result(`Fundamental data for ${normalizeSymbol(symbol)}:\n\n\`\`\`json\n${JSON.stringify(structured, null, 2).slice(0, 18000)}\n\`\`\``, {
        symbol: normalizeSymbol(symbol),
        ...structured,
      });
    },
  },
  {
    name: "data_equity_ratios",
    displayName: "data.equity.ratios",
    tier: "deferred",
    description: "Return available valuation, profitability, leverage, growth, and trading ratios for an equity.",
    tags: ["equity", "ratios", "valuation"],
    schema: z.object({ symbol: z.string() }),
    execute: async (args) => {
      const { symbol } = z.object({ symbol: z.string() }).parse(args);
      const summary = await quoteSummary(symbol, ["defaultKeyStatistics", "financialData", "summaryDetail", "price"]);
      const structured = unwrap(summary) as Record<string, unknown>;
      return result(`Ratio data for ${normalizeSymbol(symbol)}:\n\n\`\`\`json\n${JSON.stringify(structured, null, 2).slice(0, 16000)}\n\`\`\``, {
        symbol: normalizeSymbol(symbol),
        ...structured,
      });
    },
  },
  {
    name: "data_equity_comps",
    displayName: "data.equity.comps",
    tier: "deferred",
    description: "Collect comparable reference and ratio data for a supplied peer set using consistent provider fields.",
    tags: ["equity", "peers", "relative-valuation"],
    schema: z.object({ symbols: z.array(z.string()).min(2).max(12) }),
    execute: async (args) => {
      const { symbols } = z.object({ symbols: z.array(z.string()).min(2).max(12) }).parse(args);
      const peers = await Promise.all(
        symbols.map(async (symbol) => {
          try {
            const data = await quoteSummary(symbol, ["defaultKeyStatistics", "financialData", "summaryDetail", "price"]);
            return { symbol: normalizeSymbol(symbol), ok: true, data: unwrap(data) };
          } catch (error) {
            return { symbol: normalizeSymbol(symbol), ok: false, error: error instanceof Error ? error.message : "Unknown error" };
          }
        }),
      );
      return result(`Comparable-company data collected for ${peers.filter((peer) => peer.ok).length} of ${peers.length} tickers.`, { peers });
    },
  },
  {
    name: "data_equity_estimates",
    displayName: "data.equity.estimates",
    tier: "deferred",
    description: "Return available analyst estimate trends, recommendation data, and target-price fields for an equity.",
    tags: ["equity", "consensus", "estimates"],
    schema: z.object({ symbol: z.string() }),
    execute: async (args) => {
      const { symbol } = z.object({ symbol: z.string() }).parse(args);
      const summary = await quoteSummary(symbol, ["earningsTrend", "recommendationTrend", "financialData"]);
      const structured = unwrap(summary) as Record<string, unknown>;
      return result(`Consensus data for ${normalizeSymbol(symbol)}:\n\n\`\`\`json\n${JSON.stringify(structured, null, 2).slice(0, 14000)}\n\`\`\``, {
        symbol: normalizeSymbol(symbol),
        ...structured,
      });
    },
  },
  {
    name: "data_market_rates",
    displayName: "data.market.rates",
    tier: "deferred",
    description: "Return a current market proxy for the US 10-year Treasury yield with provider timestamp and units.",
    tags: ["market", "rates", "macro"],
    schema: z.object({}),
    execute: async () => {
      const payload = await chart("^TNX", "5d", "1d");
      const meta = (payload.meta || {}) as Record<string, unknown>;
      const yieldPercent = number(meta.regularMarketPrice);
      const structured = {
        instrument: "US 10-year Treasury yield proxy",
        symbol: "^TNX",
        yieldPercent,
        yieldDecimal: yieldPercent === null ? null : yieldPercent / 100,
        asOf: meta.regularMarketTime,
        source: "Yahoo Finance",
      };
      return result(`US 10-year yield proxy: ${yieldPercent ?? "unavailable"}%`, structured);
    },
  },
  {
    name: "data_market_indices",
    displayName: "data.market.indices",
    tier: "deferred",
    description: "Return current reference data for major market indices or a supplied set of Yahoo Finance symbols.",
    tags: ["market", "indices", "macro"],
    schema: z.object({ symbols: z.array(z.string()).max(10).optional() }),
    execute: async (args) => {
      const { symbols = ["^GSPC", "^DJI", "^IXIC"] } = z
        .object({ symbols: z.array(z.string()).optional() })
        .parse(args);
      const indices = await Promise.all(
        symbols.map(async (symbol) => {
          const payload = await chart(symbol, "5d", "1d");
          const meta = (payload.meta || {}) as Record<string, unknown>;
          return {
            symbol,
            name: meta.longName || meta.shortName || symbol,
            price: number(meta.regularMarketPrice),
            previousClose: number(meta.chartPreviousClose) || number(meta.previousClose),
            asOf: meta.regularMarketTime,
          };
        }),
      );
      return result(`Collected ${indices.length} market index observations.`, { indices });
    },
  },
  {
    name: "compute_valuation_wacc",
    displayName: "compute.valuation.wacc",
    tier: "deferred",
    description: "Calculate cost of equity with CAPM and combine it with after-tax debt cost into WACC.",
    tags: ["valuation", "wacc", "capm"],
    schema: z.object({
      riskFreeRate: z.number(),
      beta: z.number(),
      equityRiskPremium: z.number(),
      preTaxCostOfDebt: z.number(),
      taxRate: z.number(),
      marketValueEquity: z.number().positive(),
      marketValueDebt: z.number().nonnegative(),
    }),
    execute: async (args) => {
      const input = z.object({
        riskFreeRate: z.number(), beta: z.number(), equityRiskPremium: z.number(), preTaxCostOfDebt: z.number(), taxRate: z.number(), marketValueEquity: z.number().positive(), marketValueDebt: z.number().nonnegative(),
      }).parse(args);
      const total = input.marketValueEquity + input.marketValueDebt;
      const costOfEquity = input.riskFreeRate + input.beta * input.equityRiskPremium;
      const afterTaxCostOfDebt = input.preTaxCostOfDebt * (1 - input.taxRate);
      const wacc = (input.marketValueEquity / total) * costOfEquity + (input.marketValueDebt / total) * afterTaxCostOfDebt;
      return result(`Calculated WACC: ${(wacc * 100).toFixed(2)}%`, { ...input, costOfEquity, afterTaxCostOfDebt, wacc });
    },
  },
  {
    name: "compute_valuation_dcf",
    displayName: "compute.valuation.dcf",
    tier: "deferred",
    description: "Run a free-cash-flow DCF with explicit growth, discount rate, terminal growth, net debt, and shares.",
    tags: ["valuation", "dcf", "intrinsic-value"],
    schema: z.object({
      baseFreeCashFlow: z.number(),
      growthRates: z.array(z.number()).min(1).max(15),
      discountRate: z.number(),
      terminalGrowthRate: z.number(),
      netDebt: z.number(),
      sharesOutstanding: z.number().positive(),
    }),
    execute: async (args) => {
      const input = z.object({ baseFreeCashFlow: z.number(), growthRates: z.array(z.number()).min(1).max(15), discountRate: z.number(), terminalGrowthRate: z.number(), netDebt: z.number(), sharesOutstanding: z.number().positive() }).parse(args);
      if (input.discountRate <= input.terminalGrowthRate) throw new ToolExecutionError("Discount rate must exceed terminal growth rate.");
      let cashFlow = input.baseFreeCashFlow;
      const forecast = input.growthRates.map((growthRate, index) => {
        cashFlow *= 1 + growthRate;
        const presentValue = cashFlow / (1 + input.discountRate) ** (index + 1);
        return { year: index + 1, growthRate, freeCashFlow: cashFlow, presentValue };
      });
      const terminalValue = cashFlow * (1 + input.terminalGrowthRate) / (input.discountRate - input.terminalGrowthRate);
      const terminalPresentValue = terminalValue / (1 + input.discountRate) ** forecast.length;
      const enterpriseValue = forecast.reduce((sum, item) => sum + item.presentValue, 0) + terminalPresentValue;
      const equityValue = enterpriseValue - input.netDebt;
      const valuePerShare = equityValue / input.sharesOutstanding;
      return result(`DCF value per share: ${valuePerShare.toFixed(2)} in the input currency.`, { ...input, forecast, terminalValue, terminalPresentValue, enterpriseValue, equityValue, valuePerShare });
    },
  },
  {
    name: "compute_valuation_dcf_sensitivity",
    displayName: "compute.valuation.dcf_sensitivity",
    tier: "deferred",
    description: "Calculate a DCF value-per-share grid across supplied discount rates and terminal growth rates.",
    tags: ["valuation", "dcf", "sensitivity"],
    schema: z.object({
      baseFreeCashFlow: z.number(), growthRates: z.array(z.number()).min(1), discountRates: z.array(z.number()).min(2), terminalGrowthRates: z.array(z.number()).min(2), netDebt: z.number(), sharesOutstanding: z.number().positive(),
    }),
    execute: async (args) => {
      const input = z.object({ baseFreeCashFlow: z.number(), growthRates: z.array(z.number()).min(1), discountRates: z.array(z.number()).min(2), terminalGrowthRates: z.array(z.number()).min(2), netDebt: z.number(), sharesOutstanding: z.number().positive() }).parse(args);
      const grid = input.discountRates.map((discountRate) => ({
        discountRate,
        values: input.terminalGrowthRates.map((terminalGrowthRate) => {
          if (discountRate <= terminalGrowthRate) return { terminalGrowthRate, valuePerShare: null };
          let cashFlow = input.baseFreeCashFlow;
          let present = 0;
          input.growthRates.forEach((growthRate, index) => {
            cashFlow *= 1 + growthRate;
            present += cashFlow / (1 + discountRate) ** (index + 1);
          });
          const terminal = cashFlow * (1 + terminalGrowthRate) / (discountRate - terminalGrowthRate);
          const enterpriseValue = present + terminal / (1 + discountRate) ** input.growthRates.length;
          return { terminalGrowthRate, valuePerShare: (enterpriseValue - input.netDebt) / input.sharesOutstanding };
        }),
      }));
      return result("DCF sensitivity grid calculated.", { terminalGrowthRates: input.terminalGrowthRates, grid });
    },
  },
  {
    name: "compute_scenario_forecast",
    displayName: "compute.forecast.scenarios",
    tier: "deferred",
    description: "Calculate probability-weighted stock-price scenarios with expected return, dispersion, and explicit horizon.",
    tags: ["forecast", "scenarios", "expected-return"],
    schema: z.object({
      currentPrice: z.number().positive(),
      horizonMonths: z.number().int().min(1).max(120),
      scenarios: z.array(z.object({
        name: z.string().min(1),
        probability: z.number().min(0).max(1),
        returnPct: z.number().min(-1),
        thesis: z.string().optional(),
      })).min(2).max(8),
    }),
    execute: async (args) => {
      const input = z.object({
        currentPrice: z.number().positive(),
        horizonMonths: z.number().int().min(1).max(120),
        scenarios: z.array(z.object({ name: z.string().min(1), probability: z.number().min(0).max(1), returnPct: z.number().min(-1), thesis: z.string().optional() })).min(2).max(8),
      }).parse(args);
      const probabilityTotal = input.scenarios.reduce((sum, item) => sum + item.probability, 0);
      if (Math.abs(probabilityTotal - 1) > 0.001) {
        throw new ToolExecutionError(`Scenario probabilities must sum to 1. Received ${probabilityTotal.toFixed(4)}.`);
      }
      const scenarios = input.scenarios.map((item) => ({
        ...item,
        targetPrice: input.currentPrice * (1 + item.returnPct),
        weightedPrice: input.currentPrice * (1 + item.returnPct) * item.probability,
      }));
      const expectedPrice = scenarios.reduce((sum, item) => sum + item.weightedPrice, 0);
      const expectedReturn = expectedPrice / input.currentPrice - 1;
      const variance = scenarios.reduce((sum, item) => sum + item.probability * (item.targetPrice - expectedPrice) ** 2, 0);
      const priceDispersion = Math.sqrt(variance);
      return result(
        `Probability-weighted ${input.horizonMonths}-month price: ${expectedPrice.toFixed(2)}. Expected return: ${(expectedReturn * 100).toFixed(1)}%.`,
        { ...input, scenarios, expectedPrice, expectedReturn, priceDispersion, probabilityTotal },
      );
    },
  },
  {
    name: "compute_risk_correlation",
    displayName: "compute.risk.correlation",
    tier: "deferred",
    description: "Calculate Pearson correlation from two aligned price or return series with transparent sample size.",
    tags: ["risk", "correlation", "statistics"],
    schema: z.object({ seriesA: z.array(z.number()).min(3), seriesB: z.array(z.number()).min(3), inputType: z.enum(["prices", "returns"]).optional() }),
    execute: async (args) => {
      const input = z.object({ seriesA: z.array(z.number()).min(3), seriesB: z.array(z.number()).min(3), inputType: z.enum(["prices", "returns"]).optional() }).parse(args);
      if (input.seriesA.length !== input.seriesB.length) throw new ToolExecutionError("Series must have equal length.");
      const a = input.inputType === "returns" ? input.seriesA : returns(input.seriesA);
      const b = input.inputType === "returns" ? input.seriesB : returns(input.seriesB);
      const sa = stats(a); const sb = stats(b);
      const covariance = a.reduce((sum, value, index) => sum + (value - sa.mean) * (b[index] - sb.mean), 0) / (a.length - 1);
      const correlation = covariance / (sa.stdDev * sb.stdDev);
      return result(`Pearson correlation: ${correlation.toFixed(4)} across ${a.length} observations.`, { correlation, observations: a.length, covariance });
    },
  },
  {
    name: "compute_risk_beta",
    displayName: "compute.risk.beta",
    tier: "deferred",
    description: "Calculate equity beta from aligned asset and market price or return series using sample covariance.",
    tags: ["risk", "beta", "capm"],
    schema: z.object({ asset: z.array(z.number()).min(3), market: z.array(z.number()).min(3), inputType: z.enum(["prices", "returns"]).optional() }),
    execute: async (args) => {
      const input = z.object({ asset: z.array(z.number()).min(3), market: z.array(z.number()).min(3), inputType: z.enum(["prices", "returns"]).optional() }).parse(args);
      if (input.asset.length !== input.market.length) throw new ToolExecutionError("Series must have equal length.");
      const assetReturns = input.inputType === "returns" ? input.asset : returns(input.asset);
      const marketReturns = input.inputType === "returns" ? input.market : returns(input.market);
      const a = stats(assetReturns); const m = stats(marketReturns);
      const covariance = assetReturns.reduce((sum, value, index) => sum + (value - a.mean) * (marketReturns[index] - m.mean), 0) / (assetReturns.length - 1);
      const beta = covariance / m.variance;
      return result(`Calculated beta: ${beta.toFixed(4)} across ${assetReturns.length} observations.`, { beta, observations: assetReturns.length, covariance, marketVariance: m.variance });
    },
  },
  {
    name: "compute_risk_var",
    displayName: "compute.risk.var",
    tier: "deferred",
    description: "Estimate historical value at risk from a return series at a supplied confidence level and portfolio value.",
    tags: ["risk", "var", "loss"],
    schema: z.object({ returns: z.array(z.number()).min(20), confidence: z.number().min(0.5).max(0.999), portfolioValue: z.number().positive().optional() }),
    execute: async (args) => {
      const input = z.object({ returns: z.array(z.number()).min(20), confidence: z.number().min(0.5).max(0.999), portfolioValue: z.number().positive().optional() }).parse(args);
      const ordered = [...input.returns].sort((a, b) => a - b);
      const index = Math.max(0, Math.ceil((1 - input.confidence) * ordered.length) - 1);
      const quantileReturn = ordered[index];
      const varFraction = Math.max(0, -quantileReturn);
      const valueAtRisk = input.portfolioValue ? varFraction * input.portfolioValue : null;
      return result(`Historical VaR: ${(varFraction * 100).toFixed(2)}% at ${(input.confidence * 100).toFixed(1)}% confidence.`, { ...input, quantileReturn, varFraction, valueAtRisk, observations: ordered.length });
    },
  },
];

export const TOOL_MAP = new Map(toolSpecs.map((tool) => [tool.name, tool]));

export function toolCatalog() {
  return toolSpecs
    .filter((tool) => tool.tier === "deferred")
    .map((tool) => `- ${tool.displayName} (${tool.name}): ${tool.description} Tags: ${tool.tags.join(", ")}.`)
    .join("\n");
}

export function visibleToolSpecs(loadedTools: Set<string>) {
  return toolSpecs.filter((tool) => tool.tier === "core" || loadedTools.has(tool.name));
}

export function openAITools(loadedTools: Set<string>) {
  return visibleToolSpecs(loadedTools).map((tool) => ({
    type: "function" as const,
    name: tool.name,
    description: tool.description,
    parameters: z.toJSONSchema(tool.schema),
  }));
}

export async function executeTool(
  name: string,
  rawArgs: unknown,
  callId: string,
  context: ToolContext,
) {
  const spec = TOOL_MAP.get(name);
  if (!spec) throw new ToolExecutionError(`Unknown tool: ${name}`);
  if (spec.tier === "deferred" && !context.loadedTools.has(name)) {
    throw new ToolExecutionError(`Tool ${name} is deferred. Call load_tool first.`);
  }
  const resolved = resolveReferences(rawArgs, context.results);
  context.emit({ type: "tool_started", at: new Date().toISOString(), callId, tool: name, data: resolved });
  try {
    const output = await spec.execute(resolved, context);
    context.results.set(callId, output);
    context.emit({ type: "tool_completed", at: new Date().toISOString(), callId, tool: name, data: output.structured });
    return output;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown tool error";
    context.emit({ type: "tool_completed", at: new Date().toISOString(), callId, tool: name, message, data: { ok: false } });
    throw error;
  }
}

export const TOOL_COUNT = toolSpecs.length;
