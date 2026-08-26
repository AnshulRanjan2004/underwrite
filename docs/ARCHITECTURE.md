# Underwrite architecture

## What the upstream project actually contains

The public FinanceHarness repository ships a Python agent harness, CLI, FastAPI
service, provider adapters, financial tools, and five markdown workflow skills.
It does not ship the complete point-in-time corpus, finance entity graph,
benchmark-generation pipeline, or full training environment described in the
paper. Those larger systems are research infrastructure around the public
runtime.

Underwrite recreates the public runtime contract as a deployable Next.js
product. It does not claim to reproduce FinanceGym or its private corpus.

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

## Stable invariants

- `auto`, `research`, and `analytical` are prompt policies over one registry.
- Every run gets fresh loaded-tool and result state.
- Deferred tool schemas appear only after `load_tool` or `load_skill`.
- Tool output has Markdown for the model and structured data for chaining.
- The browser receives lifecycle events over SSE.
- A selected model changes the backbone, not the tools or mode semantics.
- Forecasts are explicit probability-weighted scenarios, not guaranteed prices.

## Security boundary

API keys entered in the UI are held in React state. They are sent only to the
Underwrite research or model-list route selected by the user. The app does not
write them to a server database or include them in streamed events. Browser
local storage is opt-in. Public production deployments block private network
model URLs unless `ALLOW_PRIVATE_MODEL_ENDPOINTS=true` is explicitly set.

For a multi-user commercial deployment, add authentication, encrypted secret
storage, persistent rate limiting, durable sessions, and an audit log before
allowing shared provider credentials.

