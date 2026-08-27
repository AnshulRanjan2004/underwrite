"use client";

import {
  ArrowLeft,
  ArrowRight,
  Article,
  Brain,
  CalendarBlank,
  Cards,
  ChartLineUp,
  CheckCircle,
  Cloud,
  Cpu,
  Database,
  FileText,
  Funnel,
  Function as FunctionIcon,
  Gauge,
  GitBranch,
  Globe,
  LinkSimple,
  ListChecks,
  LockKey,
  MagnifyingGlass,
  Moon,
  Path,
  Scales,
  ShareNetwork,
  ShieldCheck,
  Stack,
  Sun,
  ThumbsUp,
  Wrench,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { BRAND } from "@/lib/brand";
import { BrandLogo } from "./brand-logo";

const SOURCE_URL = "https://arxiv.org/abs/2607.27853";

const MODES = [
  { name: "Auto", focus: "Routes each step between research and computation.", icon: Brain },
  { name: "Research", focus: "Prioritizes source discovery, reading, and synthesis.", icon: Globe },
  { name: "Analytical", focus: "Prioritizes market data, valuation, and risk tools.", icon: ChartLineUp },
];

const RUN_STEPS = [
  { title: "Frame the question", detail: "The selected mode changes the reasoning policy while every tool remains available.", icon: Path },
  { title: "Build the plan", detail: "The agent turns the request into visible research steps before expensive work begins.", icon: Stack },
  { title: "Load what is needed", detail: "Core tools stay ready. Specialist schemas load only when the trajectory calls for them.", icon: Wrench },
  { title: "Gather and calculate", detail: "Web evidence and structured financial outputs share one result-chaining contract.", icon: FunctionIcon },
  { title: "Assemble the report", detail: "Sources, assumptions, calculations, and conclusions arrive with an inspectable trace.", icon: CheckCircle },
];

const PRODUCT_FACTS = [
  { value: "3", label: "reasoning modes", note: "One constant registry" },
  { value: "23", label: "financial tools", note: "Core and deferred" },
  { value: "6", label: "workflow skills", note: "Loaded on demand" },
  { value: "14", label: "maximum rounds", note: "Bounded execution" },
];

const AUDIT_ROWS = [
  { layer: "Orchestration, modes, tools, runtime, model adapters", status: "Live", detail: "Implemented in the current product" },
  { layer: "Live web and global Yahoo market data", status: "Live", detail: "US, India, ETFs, indices, funds, futures, FX, and crypto where available" },
  { layer: "Point-in-time corpus, embeddings, and vector index", status: "Reference only", detail: "Not part of the deployed runtime" },
  { layer: "Semantic graph, question generation, and rubrics", status: "Reference only", detail: "Offline benchmark construction, not product behavior" },
  { layer: "Expert curation and reinforcement training", status: "Reference only", detail: "Evaluation infrastructure, not active model training" },
];

const ABLATION_ROWS = [
  { label: "Model with search", total: 25.3, pre: 36.1, post: 8.7 },
  { label: "Basic orchestration", total: 29.6, pre: 41.8, post: 10.7 },
  { label: "Full orchestration", total: 32.4, pre: 45.7, post: 11.8 },
  { label: "Full orchestration + training", total: 32.8, pre: 46.2, post: 12.1 },
];

const BACKBONE_ROWS = [
  { name: "GPT-5.5", faithfulness: 4.36, grounding: 4.47, coherence: 4.92, completeness: 4.98 },
  { name: "Qwen3.6-27B", faithfulness: 4.02, grounding: 4.20, coherence: 4.68, completeness: 4.76 },
  { name: "Gemini-3.5-Flash", faithfulness: 3.85, grounding: 3.97, coherence: 4.78, completeness: 5.00 },
  { name: "Overall", faithfulness: 4.08, grounding: 4.21, coherence: 4.80, completeness: 4.91 },
];

type FrontierGroup = "runtime" | "react" | "agentic" | "finetuned";

const FRONTIER_POINTS: Array<{
  name: string;
  cost: number;
  score: number;
  group: FrontierGroup;
  label?: boolean;
  dx?: number;
  dy?: number;
}> = [
  { name: "Claude Opus 5", cost: 3.3, score: 44.9, group: "runtime", label: true, dx: 13, dy: 5 },
  { name: "Claude Opus 4.7", cost: 1.15, score: 40.0, group: "runtime", label: true, dx: 13, dy: 5 },
  { name: "Claude Opus 4.8", cost: 0.65, score: 38.3, group: "runtime", label: true, dx: 13, dy: 5 },
  { name: "Gemini 3.1 Pro", cost: 0.32, score: 35.0, group: "runtime", label: true, dx: 13, dy: -14 },
  { name: "Gemini 3 Flash", cost: 0.12, score: 34.9, group: "runtime", label: true, dx: -12, dy: 28 },
  { name: "Qwen 3.6 27B", cost: 0.062, score: 32.4, group: "runtime", label: true, dx: -12, dy: 8 },
  { name: "Claude Opus 4.7", cost: 2.0, score: 34.1, group: "react" },
  { name: "GPT-5.5", cost: 2.05, score: 31.8, group: "react" },
  { name: "Gemini 3.1 Pro", cost: 0.75, score: 33.2, group: "react" },
  { name: "Gemini 3 Flash", cost: 0.2, score: 30.2, group: "react" },
  { name: "GLM-5", cost: 0.15, score: 30.4, group: "react" },
  { name: "DeepSeek v3.2", cost: 0.075, score: 28.9, group: "react" },
  { name: "Qwen3 235B", cost: 0.075, score: 26.8, group: "react" },
  { name: "Gemma 4 26B", cost: 0.03, score: 25.7, group: "react" },
  { name: "gpt-oss 120B", cost: 0.04, score: 18.7, group: "react" },
  { name: "TTD-DR", cost: 0.5, score: 31.5, group: "agentic", label: true, dx: 12, dy: 5 },
  { name: "GPT-Researcher", cost: 0.055, score: 30.4, group: "agentic", label: true, dx: 12, dy: 5 },
  { name: "deepagents", cost: 0.35, score: 28.1, group: "agentic" },
  { name: "OpenClaw", cost: 0.3, score: 27.7, group: "agentic" },
  { name: "STORM", cost: 0.2, score: 27.4, group: "agentic" },
  { name: "Tongyi-DR", cost: 0.035, score: 28.2, group: "finetuned", label: true, dx: -12, dy: 5 },
  { name: "OpenResearcher", cost: 0.035, score: 27.2, group: "finetuned" },
  { name: "MiroThinker", cost: 0.035, score: 21.2, group: "finetuned" },
];

const COST_TICKS = [3, 2, 1, 0.5, 0.3, 0.2, 0.1, 0.05, 0.03];
const SCORE_TICKS = [20, 25, 30, 35, 40, 45];
const costX = (cost: number) => 100 + ((Math.log10(4) - Math.log10(cost)) / (Math.log10(4) - Math.log10(0.025))) * 830;
const scoreY = (score: number) => 500 - ((score - 17) / 30) * 430;

function DiagramNode({ icon, children }: { icon?: React.ReactNode; children: React.ReactNode }) {
  return <div className="map-node">{icon}<span>{children}</span></div>;
}

function DetailedArchitectureMap() {
  return (
    <section className="full-system-map" id="pipeline">
      <div className="map-section-copy">
        <h2>The full research system</h2>
        <p>Every stage from source intake to model execution, benchmark construction, quality control, and training.</p>
        <div className="map-legend"><span><i data-kind="live" /> Live in Underwrite</span><span><i data-kind="reference" /> Reference evaluation layer</span></div>
      </div>

      <div className="system-map-scroll" role="region" aria-label="Detailed Underwrite research architecture" tabIndex={0}>
        <div className="system-map-canvas">
          <div className="map-top-row">
            <section className="map-corpus map-reference-zone">
              <div className="map-zone-heading"><h3>Evidence infrastructure</h3><span>Reference layer</span></div>
              <div className="map-corpus-grid">
                <div className="map-source-chain">
                  <DiagramNode icon={<Database size={22} />}>Web corpus</DiagramNode>
                  <div className="map-down-label">Domain filter</div>
                  <DiagramNode icon={<Article size={22} />}>Financial articles and filings</DiagramNode>
                  <div className="map-down-label">Key facts extraction</div>
                </div>
                <div className="map-sandbox">
                  <div className="map-sandbox-title"><strong>Sandbox environment</strong><small>Point-in-time search sandbox</small></div>
                  <DiagramNode icon={<FunctionIcon size={22} />}>Embedding model</DiagramNode>
                  <DiagramNode icon={<MagnifyingGlass size={22} />}>Vector index</DiagramNode>
                </div>
              </div>
              <div className="map-env-link"><span>Corpus</span><ArrowRight size={18} /><span>Search environment</span></div>
            </section>

            <section className="map-runtime map-live-zone">
              <div className="map-zone-heading"><h3>Underwrite</h3><span>Live runtime</span></div>
              <div className="map-runtime-cells">
                <div><Path size={28} /><strong>Orchestration</strong></div>
                <div><Brain size={28} /><strong>Capability</strong></div>
                <div><Wrench size={28} /><strong>Tools</strong></div>
                <div><Cpu size={28} /><strong>Runtime</strong></div>
                <div><Cloud size={28} /><strong>Model layer</strong></div>
              </div>
              <p>Agent execution stack combining provider adapters, modular tooling, and specialized finance workflows.</p>
              <div className="map-runtime-link" aria-hidden="true"><ArrowLeft size={18} /></div>
            </section>
          </div>

          <div className="map-vertical-connectors" aria-hidden="true"><span /><span /></div>

          <section className="map-data-factory map-reference-zone">
            <div className="map-factory-grid">
              <article className="map-factory-column map-graph-column">
                <DiagramNode icon={<ShareNetwork size={25} />}>Semantic graph</DiagramNode>
                <span className="map-column-label">Motif mining algorithm</span>
                <div className="map-inner-dashed">
                  <div className="map-entity-title">Finance entity graph</div>
                  <div className="map-entity-rows">
                    <div><strong>Linkage</strong><span>Policy change → sector margin → listed company</span></div>
                    <div><strong>Narrative</strong><span>AI capex → power demand → infrastructure spend</span></div>
                    <div><strong>Divergence</strong><span>Consensus growth versus price and margin evidence</span></div>
                  </div>
                  <DiagramNode icon={<Cards size={22} />}>Situations</DiagramNode>
                </div>
                <h3>Graph building</h3>
              </article>

              <article className="map-factory-column map-question-column">
                <div className="map-cutoff-node"><CalendarBlank size={25} /><div><strong>Cutoff-date selection</strong><small>z(volume) × entity diversity × relevance entropy</small></div></div>
                <span className="map-column-label">Finance narratives</span>
                <div className="map-inner-dashed map-generation-box">
                  <div className="map-entity-title">Conditional generation</div>
                  <div className="map-question-tree">
                    <div><strong>Questions</strong><span>How could oil prices and refining spreads affect Reliance?</span></div>
                    <div><strong>Rubrics</strong><span>Quantify segment sensitivity and cite each assumption.</span></div>
                    <div><strong>Thesis</strong><span>Trace the valuation impact through O2C EBITDA and capex.</span></div>
                  </div>
                </div>
                <DiagramNode icon={<Database size={22} />}>Question pool</DiagramNode>
                <h3>Question generation</h3>
              </article>

              <article className="map-factory-column map-training-column">
                <div className="map-training-environment">
                  <strong>Training environment</strong>
                  <div className="map-training-lane">
                    <span>Question</span><ArrowRight size={14} /><span>Policy model</span><ArrowRight size={14} /><span>Report</span><ArrowRight size={14} /><span>Rubric reward</span>
                  </div>
                  <div className="map-training-lane">
                    <span>Question</span><ArrowRight size={14} /><span>Candidate group</span><ArrowRight size={14} /><span>Judge scores</span><ArrowRight size={14} /><span>Advantage</span>
                  </div>
                  <small>Model serving and reinforcement-learning frameworks</small>
                </div>
                <div className="map-curation-grid">
                  <DiagramNode icon={<ThumbsUp size={20} />}>Expert rating</DiagramNode>
                  <DiagramNode icon={<Scales size={20} />}>Group balancing</DiagramNode>
                  <DiagramNode icon={<Funnel size={20} />}>Curation chain</DiagramNode>
                  <DiagramNode icon={<ListChecks size={20} />}>Quality control</DiagramNode>
                </div>
                <h3>Curation and training</h3>
              </article>
            </div>
            <div className="map-factory-flow" aria-hidden="true">
              <span>Situations</span><ArrowRight size={18} /><span>Question pool</span><ArrowRight size={18} /><span>Curated training set</span>
            </div>
            <div className="map-factory-title"><GitBranch size={21} /><strong>Evaluation data factory</strong></div>
          </section>
        </div>
      </div>
      <p className="map-disclosure">Solid border marks the deployed Underwrite runtime. Dashed regions reproduce the full research evaluation and training path but are not active product features.</p>
    </section>
  );
}

export function ArchitectureOverview() {
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    queueMicrotask(() => {
      const savedTheme = localStorage.getItem("underwrite-theme") as "light" | "dark" | null;
      const nextTheme = savedTheme || (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
      setTheme(nextTheme);
      document.documentElement.dataset.theme = nextTheme;
    });
  }, []);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    localStorage.setItem("underwrite-theme", next);
  }

  return (
    <main className="architecture-page">
      <header className="architecture-nav">
        <Link className="architecture-brand" href="/"><BrandLogo size={34} /><span>{BRAND.name}</span></Link>
        <nav aria-label="Architecture page navigation">
          <a href="#pipeline">Pipeline</a><a href="#modes">Modes</a><a href="#evidence">Evidence</a><a href="#controls">Controls</a>
        </nav>
        <div className="architecture-nav-actions">
          <button className="icon-button" type="button" onClick={toggleTheme} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}>
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <Link className="architecture-open" href="/">Open workbench <ArrowRight size={15} /></Link>
        </div>
      </header>

      <section className="architecture-hero architecture-hero-intro" id="overview">
        <div className="architecture-hero-copy">
          <span className="architecture-kicker">System architecture</span>
          <h1>Inside Underwrite.</h1>
          <p>Underwrite combines model reasoning, live evidence, and deterministic finance tools in one inspectable execution loop.</p>
          <Link className="architecture-back" href="/"><ArrowLeft size={16} /> Open workbench</Link>
        </div>
        <div className="hero-runtime-summary" aria-label="Live Underwrite runtime summary">
          <div><Path size={24} /><span><strong>Orchestrate</strong><small>Plan and route</small></span></div>
          <div><Database size={24} /><span><strong>Ground</strong><small>Fetch and normalize</small></span></div>
          <div><FunctionIcon size={24} /><span><strong>Calculate</strong><small>Value and stress</small></span></div>
          <div><FileText size={24} /><span><strong>Report</strong><small>Cite and stream</small></span></div>
        </div>
      </section>

      <DetailedArchitectureMap />

      <section className="architecture-facts" aria-label="Current implementation facts">
        <div className="facts-intro"><h2>What is running today</h2><p>These numbers describe the current product implementation, not a performance benchmark.</p></div>
        <div className="fact-grid">{PRODUCT_FACTS.map((fact) => <div className="fact" key={fact.label}><strong>{fact.value}</strong><span>{fact.label}</span><small>{fact.note}</small></div>)}</div>
      </section>

      <section className="architecture-audit">
        <div className="section-copy">
          <span className="architecture-kicker">Implementation boundary</span>
          <h2>What matches. What does not.</h2>
          <p>The product uses the same core agent runtime pattern. Offline evaluation and training infrastructure is kept separate and is not presented as live functionality.</p>
        </div>
        <div className="audit-table" role="table" aria-label="Architecture implementation audit">
          {AUDIT_ROWS.map((row) => <div className="audit-row" role="row" key={row.layer} data-live={row.status === "Live"}><strong role="cell">{row.layer}</strong><span role="cell">{row.status}</span><small role="cell">{row.detail}</small></div>)}
        </div>
      </section>

      <section className="mode-architecture" id="modes">
        <div className="section-copy"><h2>One registry. Three reasoning policies.</h2><p>Switching modes changes the agent&apos;s priorities. It never removes a tool that an active trajectory may still need.</p></div>
        <div className="mode-registry-map">
          <div className="mode-list">{MODES.map((mode) => { const Icon = mode.icon; return <div className="mode-explainer" key={mode.name}><Icon size={20} /><div><strong>{mode.name}</strong><span>{mode.focus}</span></div><ArrowRight size={17} /></div>; })}</div>
          <div className="constant-registry">
            <div className="registry-heading"><Database size={21} /><span>Constant tool registry</span></div>
            <div className="registry-groups"><span>Research</span><span>Global instruments</span><span>Valuation</span><span>Risk</span><span>Forecasting</span><span>Workflow</span></div>
            <p>Every mode sees the same catalog. Full deferred schemas load only after selection.</p>
          </div>
        </div>
      </section>

      <section className="run-sequence">
        <div className="section-copy"><h2>From question to auditable output</h2><p>Each transition has a concrete job, a visible state, and a bounded failure surface.</p></div>
        <div className="run-steps">{RUN_STEPS.map((step) => { const Icon = step.icon; return <article key={step.title}><Icon size={21} /><h3>{step.title}</h3><p>{step.detail}</p></article>; })}</div>
      </section>

      <section className="reference-results" id="evidence">
        <div className="reference-heading">
          <div className="section-copy"><span className="architecture-kicker">Source-backed evaluation</span><h2>Measured results, clearly labeled.</h2><p>These values reproduce a public reference evaluation. They validate the architecture pattern, not the current Underwrite build.</p></div>
          <a className="source-link" href={SOURCE_URL} target="_blank" rel="noreferrer"><LinkSimple size={16} /> Reference methodology and data</a>
        </div>

        <div className="evaluation-facts" aria-label="Reference evaluation dataset facts">
          <div><strong>400</strong><span>expert-reviewed questions</span></div>
          <div><strong>2,464</strong><span>annotated rubric items</span></div>
          <div><strong>82%</strong><span>professional review pass rate</span></div>
          <div><strong>12</strong><span>monthly cutoff buckets</span></div>
        </div>

        <div className="evaluation-grid">
          <figure className="scale-figure">
            <div className="figure-heading"><div><span>Cost-quality frontier</span><strong>Harness results across model backbones</strong></div><small>Estimated cost per query</small></div>
            <div className="frontier-legend" aria-label="Chart legend">
              <span data-group="runtime"><i />Underwrite runtime (reference run)</span>
              <span data-group="react"><i />ReAct baseline</span>
              <span data-group="agentic"><i />Other agentic systems</span>
              <span data-group="finetuned"><i />Fine-tuned research agent</span>
            </div>
            <svg viewBox="0 0 1000 580" role="img" aria-labelledby="frontier-title frontier-description">
              <title id="frontier-title">Reference cost and quality results across model backbones</title>
              <desc id="frontier-description">The specialized runtime reaches 44.9 percent with Claude Opus 5 and 32.4 percent with Qwen 3.6 27B. Cost is logarithmic and cheaper configurations appear farther right.</desc>
              <path d="M100 45 H930 V238 H790 V315 H650 V345 H520 V280 H360 V205 H205 V145 H100 Z" className="frontier-zone" />
              <text x="906" y="87" textAnchor="end" className="frontier-zone-label">Efficient zone</text>
              {SCORE_TICKS.map((tick) => <g key={tick}><line x1="100" y1={scoreY(tick)} x2="930" y2={scoreY(tick)} className="chart-grid-line" /><text x="82" y={scoreY(tick) + 4} textAnchor="end" className="chart-tick">{tick}</text></g>)}
              {COST_TICKS.map((tick) => <g key={tick}><line x1={costX(tick)} y1="45" x2={costX(tick)} y2="500" className="chart-grid-line" /><text x={costX(tick)} y="528" textAnchor="middle" className="chart-tick">${tick}</text></g>)}
              <line x1="100" y1="45" x2="100" y2="500" className="chart-axis" /><line x1="100" y1="500" x2="930" y2="500" className="chart-axis" />
              {FRONTIER_POINTS.map((point, index) => {
                const x = costX(point.cost);
                const y = scoreY(point.score);
                const anchor = (point.dx || 0) < 0 ? "end" : "start";
                return (
                  <g key={`${point.group}-${point.name}-${index}`} className={`frontier-point frontier-point-${point.group}`}>
                    {point.group === "runtime" && <circle cx={x} cy={y} r="7" />}
                    {point.group === "react" && <rect x={x - 6} y={y - 6} width="12" height="12" rx="1" />}
                    {point.group === "agentic" && <polygon points={`${x},${y - 8} ${x - 8},${y + 7} ${x + 8},${y + 7}`} />}
                    {point.group === "finetuned" && <polygon points={`${x},${y - 8} ${x - 8},${y} ${x},${y + 8} ${x + 8},${y}`} />}
                    {point.label && <text x={x + (point.dx || 10)} y={y + (point.dy || -10)} textAnchor={anchor}>{point.name} ({point.score}%)</text>}
                  </g>
                );
              })}
              <text x="515" y="570" textAnchor="middle" className="chart-axis-label">Estimated cost per query, log scale. Cheaper to the right.</text>
              <text x="20" y="275" textAnchor="middle" className="chart-axis-label" transform="rotate(-90 20 275)">Overall rubric score (%)</text>
            </svg>
            <figcaption>Published reference scores with chart-estimated query costs. This is the model matrix for the architecture pattern, not a benchmark rerun on the current repository.</figcaption>
          </figure>

          <article className="ablation-card">
            <div className="figure-heading"><div><span>Fixed-backbone ablation</span><strong>Orchestration drives most of the lift</strong></div><small>Normalized rubric score (%)</small></div>
            <div className="metric-table" role="table" aria-label="Fixed-backbone ablation results">
              <div className="metric-row metric-header" role="row"><span role="columnheader">Configuration</span><span role="columnheader">Total</span><span role="columnheader">Pre</span><span role="columnheader">Post</span></div>
              {ABLATION_ROWS.map((row) => <div className="metric-row" role="row" key={row.label}><strong role="rowheader">{row.label}</strong><span role="cell">{row.total.toFixed(1)}</span><span role="cell">{row.pre.toFixed(1)}</span><span role="cell">{row.post.toFixed(1)}</span></div>)}
            </div>
            <p className="ablation-callout"><strong>+7.1 points</strong> from search-only to full orchestration. Training adds a further 0.4 point in this evaluation.</p>
          </article>
        </div>

        <div className="backbone-table-wrap">
          <div className="figure-heading"><div><span>Cross-backbone coverage suite</span><strong>Same runtime, different models</strong></div><small>Dual-model judging, 1 to 5 scale</small></div>
          <div className="backbone-table" role="table" aria-label="Cross-backbone evaluation metrics">
            <div className="backbone-row backbone-header" role="row"><span role="columnheader">Backbone</span><span role="columnheader">Faithfulness</span><span role="columnheader">Grounding</span><span role="columnheader">Coherence</span><span role="columnheader">Completeness</span></div>
            {BACKBONE_ROWS.map((row) => <div className="backbone-row" role="row" key={row.name}><strong role="rowheader">{row.name}</strong><span role="cell">{row.faithfulness.toFixed(2)}</span><span role="cell">{row.grounding.toFixed(2)}</span><span role="cell">{row.coherence.toFixed(2)}</span><span role="cell">{row.completeness.toFixed(2)}</span></div>)}
          </div>
          <p className="table-note">Reference coverage suite: 11 tasks, three runs per task and backbone. These scores have not yet been rerun on this repository.</p>
        </div>
      </section>

      <section className="control-system" id="controls">
        <div className="control-statement"><Gauge size={30} /><h2>Control lives outside the model.</h2><p>The model proposes the next action. Underwrite owns validation, execution, limits, result chaining, and the event stream.</p></div>
        <div className="control-details">
          <article><LockKey size={21} /><div><h3>Bring your own model</h3><p>OpenAI, Gemini, Ollama, or any compatible endpoint can sit behind the same contract.</p></div></article>
          <article><ShieldCheck size={21} /><div><h3>Validate every call</h3><p>Typed request and tool schemas reject malformed inputs before they touch the data layer.</p></div></article>
          <article><Database size={21} /><div><h3>Use global market symbols</h3><p>Yahoo Finance currently supplies lookup and price history for US, Indian, and other supported exchanges and security types.</p></div></article>
          <article><Path size={21} /><div><h3>Keep the trace visible</h3><p>Plans, phases, sources, tool events, errors, and the report stream to the interface as they happen.</p></div></article>
        </div>
      </section>

      <footer className="architecture-footer">
        <div><BrandLogo size={30} /><span><strong>{BRAND.name}</strong><small>Evidence in. Decisions out.</small></span></div>
        <Link href="/">Open workbench <ArrowRight size={15} /></Link>
      </footer>
    </main>
  );
}
