# Underwrite architecture

Underwrite is a deployable Next.js product with a provider-independent agent
runtime, typed financial tools, reusable workflows, and a streamed research
interface. The system is designed around an auditable contract: model reasoning
can change, but tool schemas, result chaining, limits, and visible events remain
under application control.

## Product layers

1. `src/components`: the browser workspace, model settings, mode switch,
   activity trajectory, source list, and Markdown report renderer.
2. `src/app/api`: streamed research, provider model discovery, and health
   endpoints implemented as Next.js route handlers.
3. `src/lib/harness/agent.ts`: provider-independent bounded agent loops for
   OpenAI Responses, Gemini function calling, Ollama tools, and generic
   OpenAI-compatible chat completions.
4. `src/lib/harness/tools.ts`: the constant typed registry, deferred loading,
   live market data, valuation, risk, forecasting, web reading, and citation
   tools.
5. `src/lib/harness/chaining.ts`: structured result references such as
   `prev:prices_1.series[0].close`.
6. `src/lib/harness/skills.ts`: reusable workflows that reveal and coordinate
   existing tools without adding application code.

Market instruments are resolved through Yahoo Finance search and chart
endpoints. The same price-history path supports provider-listed stocks, ETFs,
funds, indices, futures, currencies, and crypto symbols, including NSE and BSE
suffixes.

## Stable invariants

- `auto`, `research`, and `analytical` are prompt policies over one registry.
- Every run gets fresh loaded-tool and result state.
- Deferred tool schemas appear only after `load_tool` or `load_skill`.
- Tool output has Markdown for the model and structured data for chaining.
- The browser receives lifecycle events over SSE.
- A selected model changes the backbone, not the tools or mode semantics.
- Forecasts are explicit probability-weighted scenarios, not guaranteed prices.

## Reference architecture boundary

The deployed product implements the model-agnostic runtime portion of the
reference architecture: orchestration, prompt modes, a constant tiered tool
registry, schema validation, result chaining, multiple model providers, and an
inspectable report trace.

The offline evaluation and training system is intentionally not represented as
deployed functionality. A point-in-time document corpus, embedding and vector
index, semantic entity graph, benchmark question and rubric generation, expert
curation, and reinforcement training are future evaluation infrastructure. The
architecture page marks these components as reference-only so that research
results are not confused with metrics measured on this application.

The source-backed evaluation values displayed on the architecture page come
from [the public reference methodology](https://arxiv.org/abs/2607.27853).
The full system map reproduces the complete evidence, graph-building, question
generation, curation, and training path while marking deployed and reference-only
layers separately. The cost-quality frontier uses published outcome scores and
query-cost positions estimated from the published chart. It is not presented as
a benchmark rerun on this repository.

## Security boundary

API keys entered in the UI are held in React state. They are sent only to the
Underwrite research or model-list route selected by the user. The app does not
write them to a server database or include them in streamed events. Browser
local storage is opt-in. Public production deployments block private network
model URLs unless `ALLOW_PRIVATE_MODEL_ENDPOINTS=true` is explicitly set.
Browser-entered source pages are restricted to public HTTP(S) hosts, redirects
are rechecked, and page size is capped. The API applies conservative in-memory
limits to model discovery and research runs; multi-instance deployments should
replace this with a shared limiter.

For a multi-user commercial deployment, add authentication, encrypted secret
storage, persistent rate limiting, durable sessions, and an audit log before
allowing shared provider credentials.
