import { describe, expect, it } from "vitest";
import { resolveReference, resolveReferences } from "./chaining";
import { isResearchMode } from "./modes";
import { assertSafeOutboundUrl, isPrivateAddress } from "./network";
import { executeTool } from "./tools";
import { tickerFrom } from "./demo";
import type { ToolContext, ToolResult } from "./types";

function context(loaded: string[] = []): ToolContext {
  return {
    results: new Map<string, ToolResult>(),
    loadedTools: new Set(loaded),
    emit: () => undefined,
  };
}

describe("mode contract", () => {
  it("accepts only the three stable reasoning modes", () => {
    expect(isResearchMode("auto")).toBe(true);
    expect(isResearchMode("research")).toBe(true);
    expect(isResearchMode("analytical")).toBe(true);
    expect(isResearchMode("valuation")).toBe(false);
  });
});

describe("preview ticker parsing", () => {
  it("does not mistake ordinary sentence words for ticker symbols", () => {
    expect(tickerFrom("Give me an NVDA snapshot")).toBe("NVDA");
    expect(tickerFrom("research $msft valuation")).toBe("MSFT");
    expect(tickerFrom("Estimate a DCF for Apple")).toBe("AAPL");
    expect(tickerFrom("Review RELIANCE.NS on the NSE")).toBe("RELIANCE.NS");
    expect(tickerFrom("Compare ^NSEI with ^GSPC")).toBe("^NSEI");
    expect(tickerFrom("Analyze the NIFTYBEES.NS ETF")).toBe("NIFTYBEES.NS");
  });
});

describe("reference chaining", () => {
  it("resolves nested object and array paths without retyping data", () => {
    const results = new Map<string, ToolResult>([
      [
        "prices_1",
        {
          markdown: "prices",
          structured: { series: [{ close: 101 }, { close: 106 }] },
        },
      ],
    ]);
    expect(resolveReference("prev:prices_1.series[1].close", results)).toBe(106);
    expect(
      resolveReferences(
        { baseFreeCashFlow: "prev:prices_1.series[0].close" },
        results,
      ),
    ).toEqual({ baseFreeCashFlow: 101 });
  });

  it("rejects unknown calls and paths", () => {
    expect(() => resolveReference("prev:missing.value", new Map())).toThrow(
      "Unknown tool call reference",
    );
  });
});

describe("financial compute tools", () => {
  it("evaluates bounded arithmetic without dynamic code execution", async () => {
    const output = await executeTool("calc", { expression: "(1,250 + 250) * 2^2" }, "calc_1", context());
    expect(output.structured.value).toBe(6000);
    await expect(executeTool("calc", { expression: "process.exit()" }, "calc_2", context())).rejects.toThrow("unsupported characters");
  });

  it("calculates WACC with CAPM and after-tax debt cost", async () => {
    const ctx = context(["compute_valuation_wacc"]);
    const output = await executeTool(
      "compute_valuation_wacc",
      {
        riskFreeRate: 0.04,
        beta: 1.1,
        equityRiskPremium: 0.05,
        preTaxCostOfDebt: 0.055,
        taxRate: 0.21,
        marketValueEquity: 800,
        marketValueDebt: 200,
      },
      "wacc_1",
      ctx,
    );
    expect(output.structured.wacc).toBeCloseTo(0.08469, 5);
    expect(ctx.results.get("wacc_1")).toEqual(output);
  });

  it("produces a traceable DCF value per share", async () => {
    const ctx = context(["compute_valuation_dcf"]);
    const output = await executeTool(
      "compute_valuation_dcf",
      {
        baseFreeCashFlow: 100,
        growthRates: [0.1, 0.08, 0.06, 0.05, 0.04],
        discountRate: 0.09,
        terminalGrowthRate: 0.025,
        netDebt: 50,
        sharesOutstanding: 100,
      },
      "dcf_1",
      ctx,
    );
    expect(output.structured.valuePerShare).toEqual(expect.any(Number));
    expect(output.structured.forecast).toHaveLength(5);
    expect(output.markdown).toContain("DCF value per share");
  });

  it("blocks a deferred tool until it is loaded", async () => {
    await expect(
      executeTool(
        "compute_valuation_dcf",
        {},
        "dcf_blocked",
        context(),
      ),
    ).rejects.toThrow("Call load_tool first");
  });

  it("weights explicit forecast scenarios without hiding uncertainty", async () => {
    const ctx = context(["compute_scenario_forecast"]);
    const output = await executeTool(
      "compute_scenario_forecast",
      {
        currentPrice: 100,
        horizonMonths: 12,
        scenarios: [
          { name: "Bear", probability: 0.25, returnPct: -0.3 },
          { name: "Base", probability: 0.5, returnPct: 0.1 },
          { name: "Bull", probability: 0.25, returnPct: 0.5 },
        ],
      },
      "forecast_1",
      ctx,
    );
    expect(output.structured.expectedPrice).toBeCloseTo(110, 5);
    expect(output.structured.priceDispersion).toEqual(expect.any(Number));
  });
});

describe("outbound network safety", () => {
  it("recognizes non-public IP ranges while allowing public address literals", () => {
    expect(isPrivateAddress("127.0.0.1")).toBe(true);
    expect(isPrivateAddress("10.0.0.8")).toBe(true);
    expect(isPrivateAddress("169.254.169.254")).toBe(true);
    expect(isPrivateAddress("::1")).toBe(true);
    expect(isPrivateAddress("8.8.8.8")).toBe(false);
  });

  it("rejects localhost before an outbound request is attempted", async () => {
    await expect(assertSafeOutboundUrl("http://127.0.0.1:3000")).rejects.toThrow("Private and local network URLs");
  });
});
