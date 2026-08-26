# Underwrite

Underwrite is an auditable financial research workbench built with Next.js. It
recreates the core FinanceHarness ideas as a web product: stable reasoning
modes, a constant typed tool registry, deferred schema loading, structured
result chaining, reusable financial workflows, and a live run trajectory.

![Underwrite mark](src/app/icon.svg)

## What works

- Three stable modes: `auto`, `research`, and `analytical`
- BYOK model settings for OpenAI, Gemini, Ollama, and OpenAI-compatible APIs
- Editable model IDs plus provider model discovery
- 22 tools across web research, market data, valuation, risk, and scenario
  forecasting
- Six reusable skills, including DCF, relative valuation, deep dive, and
  probability-weighted stock forecasting
- `prev:<call_id>.<path>` reference chaining between structured tool results
- Server-Sent Events for plans, phases, tool calls, sources, and report output
- Dark and light themes, responsive workspace, and no-key live preview
- Production builds for Vercel or a standalone Docker container

The no-key preview performs a real market-data run, so the application can be
evaluated without first configuring an LLM.

## Quick start

Requirements: Node.js 22+ and pnpm.

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### Use your OpenAI key

The easiest path is the UI:

1. Open **Model connection** in the top-right corner.
2. Choose **OpenAI**.
3. Paste the key, enter any tool-capable model ID, and save.
4. Leave **Remember key** off unless this is your personal device.

Alternatively, configure the server:

```bash
AI_PROVIDER=openai
OPENAI_API_KEY=your_key
OPENAI_MODEL=gpt-5.6
```

The OpenAI implementation uses the Responses API function-calling loop. The
selected model must support function calling.

### Run fully free with Ollama

Install Ollama, then pull a model with reliable tool support:

```bash
ollama pull qwen3:8b
ollama serve
```

Choose **Ollama** in Underwrite and use:

```text
Base URL: http://127.0.0.1:11434
Model ID: qwen3:8b
```

Ollama is best when Underwrite and Ollama run on the same machine or trusted
private server. A browser cannot make a public Vercel function reach Ollama on
your laptop.

## Model support

Underwrite does not hard-code an allowlist. You can type any model ID exposed
by the selected provider.

| Provider | Protocol | Key |
| --- | --- | --- |
| OpenAI | Responses API | Required in UI or environment |
| Gemini | `generateContent` function calling | Required in UI or environment |
| Ollama | Local `/api/chat` tools | Not required |
| OpenAI-compatible | Chat Completions tool calling | Provider-dependent |

Full harness runs require model-side function or tool calling. A text-only
model cannot safely decide when to invoke valuation or market-data code.

## Modes

Modes change the research policy while the registry stays constant.

| Mode | Behavior |
| --- | --- |
| `auto` | Balances evidence and computation for the question |
| `research` | Leads with web evidence, dates, comparison, and citations |
| `analytical` | Leads with structured data, formulas, units, and sensitivities |

## Forecasting policy

Underwrite does not present one certain future stock price. The scenario tool
requires:

- a dated current price;
- an explicit forecast horizon;
- at least two named scenarios;
- probabilities that sum to one;
- an expected return and price dispersion calculation;
- a thesis and invalidation conditions supplied by the agent's evidence.

Outputs are research, not personalized investment advice.

## Deploy

### Vercel

1. Push this repository to GitHub.
2. Import it into Vercel as a Next.js project.
3. Add server-side provider variables if you want a shared model, or leave them
   unset and use BYOK in the UI.
4. Deploy.

The no-key preview and browser-entered OpenAI key work without a database.
Long research runs remain subject to the execution limits of the chosen host
and plan.

### Docker

```bash
docker build -t underwrite .
docker run --rm -p 3000:3000 --env-file .env.local underwrite
```

The image uses the Next.js standalone output and runs as an unprivileged user.

## Verify

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

## Repository map

```text
src/app/api/             SSE research, model discovery, health
src/components/          Underwrite workspace and model settings
src/lib/harness/         modes, providers, tools, skills, agent loops
docs/ARCHITECTURE.md     paper versus public repo and product design
```

Read [the architecture note](docs/ARCHITECTURE.md) for the boundary between
the public FinanceHarness runtime and the larger FinanceGym research system.

## Attribution

Underwrite is an independent TypeScript implementation inspired by
[FinanceHarness](https://github.com/Yijia-Xiao/FinanceHarness) and the paper
[FinanceHarness: Autonomous Financial Deep Research Framework](https://arxiv.org/abs/2607.27853).
See [NOTICE](NOTICE) for details.

