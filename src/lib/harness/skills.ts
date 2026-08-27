export type SkillDefinition = {
  name: string;
  description: string;
  tools: string[];
  guidance: string;
};

export const SKILLS: SkillDefinition[] = [
  {
    name: "ticker-snapshot",
    description: "Create a concise identity, price, and trend snapshot for a global stock, ETF, index, fund, future, currency, or crypto instrument.",
    tools: ["data_instrument_search", "data_equity_reference", "data_equity_prices", "data_equity_ratios"],
    guidance: "Resolve the provider symbol first, gather the latest price and recent history, then add ratios only when the selected instrument exposes fundamental data. Always include exchange, currency, dates, and units.",
  },
  {
    name: "dcf-valuation",
    description: "Estimate intrinsic equity value with an explicit DCF and sensitivity analysis.",
    tools: [
      "data_equity_fundamentals",
      "data_market_rates",
      "compute_valuation_wacc",
      "compute_valuation_dcf",
      "compute_valuation_dcf_sensitivity",
    ],
    guidance: "Gather normalized cash flow inputs, calculate WACC, state forecast assumptions, run DCF, and test terminal growth and discount-rate sensitivity.",
  },
  {
    name: "relative-valuation",
    description: "Compare a company with peers and derive an implied valuation range from observed multiples.",
    tools: ["data_equity_comps", "data_equity_ratios", "calc"],
    guidance: "Choose economically comparable peers, compare consistent multiples, use medians, and explain outliers before deriving a range.",
  },
  {
    name: "consensus-check",
    description: "Compare sell-side estimates and price targets with current evidence from the web.",
    tools: ["data_equity_estimates", "data_equity_reference", "compose_citations"],
    guidance: "Date-stamp consensus data, compare the range rather than only the mean, and corroborate catalysts and risks with current sources.",
  },
  {
    name: "scenario-forecast",
    description: "Build an auditable bull, base, and bear stock-price forecast from explicit probabilities and return assumptions.",
    tools: ["data_equity_reference", "data_equity_estimates", "compute_scenario_forecast"],
    guidance: "Anchor the current price and horizon, derive scenario assumptions from evidence, make probabilities sum to one, and discuss what would invalidate each case.",
  },
  {
    name: "equity-deep-dive",
    description: "Run a full qualitative, fundamental, DCF, relative valuation, and risk review for one equity.",
    tools: [
      "data_equity_reference",
      "data_equity_prices",
      "data_equity_fundamentals",
      "data_equity_ratios",
      "data_equity_comps",
      "data_equity_estimates",
      "compute_valuation_wacc",
      "compute_valuation_dcf",
      "compute_valuation_dcf_sensitivity",
      "compute_risk_beta",
      "compute_scenario_forecast",
      "compose_citations",
    ],
    guidance: "Build the business and industry picture first, then financial quality, valuation, consensus, catalysts, and risks. Keep every number traceable.",
  },
];
