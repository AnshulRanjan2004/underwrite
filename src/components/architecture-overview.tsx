"use client";

import {
  ArrowLeft,
  ArrowRight,
  Brain,
  ChartLineUp,
  CheckCircle,
  Cloud,
  Cpu,
  Database,
  Function as FunctionIcon,
  Gauge,
  Globe,
  Lightning,
  LinkSimple,
  LockKey,
  Moon,
  Path,
  ShieldCheck,
  Stack,
  Sun,
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

const SCALE_POINTS = [
  { name: "Gemma-4-26B", size: 26, score: 25.7, dx: -4, dy: 26 },
  { name: "Specialized runtime", size: 27, score: 32.4, dx: 12, dy: -12, primary: true },
  { name: "Tongyi-DR-30B", size: 30, score: 28.2, dx: 12, dy: -12 },
  { name: "gpt-oss-120B", size: 120, score: 18.7, dx: 12, dy: -12 },
  { name: "Qwen3-235B", size: 235, score: 26.8, dx: 12, dy: -12 },
  { name: "DeepSeek-v3.2", size: 600, score: 28.9, dx: -132, dy: -12 },
];

const xForSize = (size: number) => 82 + ((Math.log10(size) - Math.log10(20)) / (Math.log10(700) - Math.log10(20))) * 758;
const yForScore = (score: number) => 390 - ((score - 15) / 20) * 340;

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

      <section className="architecture-hero" id="pipeline">
        <div className="architecture-hero-copy">
          <span className="architecture-kicker">System architecture</span>
          <h1>Inside Underwrite.</h1>
          <p>Underwrite combines model reasoning, live evidence, and deterministic finance tools in one inspectable execution loop.</p>
          <Link className="architecture-back" href="/"><ArrowLeft size={16} /> Open workbench</Link>
        </div>

        <div className="architecture-blueprint" aria-label="Underwrite system architecture">
          <div className="blueprint-upper">
            <section className="blueprint-inputs">
              <h2>Live inputs</h2>
              <div className="blueprint-node"><Brain size={18} /><span>User question</span></div>
              <div className="blueprint-node"><Globe size={18} /><span>Public web evidence</span></div>
              <div className="blueprint-node"><Database size={18} /><span>Global market instruments</span></div>
            </section>
            <section className="blueprint-engine">
              <h2>Underwrite engine</h2>
              <div className="engine-cells">
                <div><Path size={19} /><span>Orchestration</span></div>
                <div><Brain size={19} /><span>Modes</span></div>
                <div><Wrench size={19} /><span>Tools</span></div>
                <div><Cpu size={19} /><span>Runtime</span></div>
                <div><Cloud size={19} /><span>Models</span></div>
              </div>
            </section>
          </div>
          <div className="blueprint-flow" aria-hidden="true"><span /><ArrowRight size={20} /><span /></div>
          <div className="blueprint-lower">
            <section className="blueprint-stage blueprint-evidence">
              <h2>Evidence intake</h2>
              <div className="stage-node"><Globe size={17} /><span>Search and read</span></div>
              <div className="stage-node"><Database size={17} /><span>Resolve and fetch instruments</span></div>
              <div className="stage-node"><ShieldCheck size={17} /><span>Normalize sources</span></div>
            </section>
            <section className="blueprint-stage blueprint-analysis">
              <h2>Analysis plane</h2>
              <div className="stage-node"><Stack size={17} /><span>Plan and route skills</span></div>
              <div className="stage-node"><FunctionIcon size={17} /><span>Value and stress test</span></div>
              <div className="stage-node"><ChartLineUp size={17} /><span>Build scenarios</span></div>
            </section>
            <section className="blueprint-stage blueprint-output">
              <h2>Report assembly</h2>
              <div className="stage-node"><Path size={17} /><span>Chain tool results</span></div>
              <div className="stage-node"><CheckCircle size={17} /><span>Compose citations</span></div>
              <div className="stage-node"><Lightning size={17} /><span>Stream report and trace</span></div>
            </section>
          </div>
          <div className="blueprint-result"><ShieldCheck size={19} /><span><strong>Auditable output</strong> Evidence, assumptions, calculations, and conclusions stay connected.</span></div>
        </div>
      </section>

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
            <div className="figure-heading"><div><span>Outcome versus model scale</span><strong>Smaller can still compete</strong></div><small>Normalized rubric score (%)</small></div>
            <svg viewBox="0 0 900 450" role="img" aria-labelledby="scale-title scale-description">
              <title id="scale-title">Reference outcome score by model parameter count</title>
              <desc id="scale-description">Six open-weight systems plotted on a logarithmic parameter scale, with the specialized 27 billion parameter runtime scoring 32.4 percent.</desc>
              {[20, 25, 30, 35].map((tick) => <g key={tick}><line x1="82" y1={yForScore(tick)} x2="840" y2={yForScore(tick)} className="chart-grid-line" /><text x="66" y={yForScore(tick) + 4} textAnchor="end" className="chart-tick">{tick}</text></g>)}
              {[30, 100, 300, 700].map((tick) => <g key={tick}><line x1={xForSize(tick)} y1="50" x2={xForSize(tick)} y2="390" className="chart-grid-line" /><text x={xForSize(tick)} y="418" textAnchor="middle" className="chart-tick">{tick}B</text></g>)}
              <line x1="82" y1="50" x2="82" y2="390" className="chart-axis" /><line x1="82" y1="390" x2="840" y2="390" className="chart-axis" />
              {SCALE_POINTS.map((point) => { const x = xForSize(point.size); const y = yForScore(point.score); return <g key={point.name} className={point.primary ? "scale-point scale-point-primary" : "scale-point"}><circle cx={x} cy={y} r={point.primary ? 8 : 6} /><text x={x + point.dx} y={y + point.dy} textAnchor={point.dx < 0 ? "end" : "start"}>{point.name} ({point.score}%)</text></g>; })}
              <text x="460" y="446" textAnchor="middle" className="chart-axis-label">Model size, log scale</text>
            </svg>
            <figcaption>Values reproduced from the public reference evaluation. “Specialized runtime” is a neutral label for the evaluated 27B configuration.</figcaption>
          </figure>

          <article className="ablation-card">
            <div className="figure-heading"><div><span>Fixed-backbone ablation</span><strong>Orchestration drives most of the lift</strong></div><small>Normalized rubric score (%)</small></div>
            <div className="metric-table" role="table" aria-label="Fixed-backbone ablation results">
              <div className="metric-row metric-header" role="row"><span>Configuration</span><span>Total</span><span>Pre</span><span>Post</span></div>
              {ABLATION_ROWS.map((row) => <div className="metric-row" role="row" key={row.label}><strong>{row.label}</strong><span>{row.total.toFixed(1)}</span><span>{row.pre.toFixed(1)}</span><span>{row.post.toFixed(1)}</span></div>)}
            </div>
            <p className="ablation-callout"><strong>+7.1 points</strong> from search-only to full orchestration. Training adds a further 0.4 point in this evaluation.</p>
          </article>
        </div>

        <div className="backbone-table-wrap">
          <div className="figure-heading"><div><span>Cross-backbone coverage suite</span><strong>Same runtime, different models</strong></div><small>Dual-model judging, 1 to 5 scale</small></div>
          <div className="backbone-table" role="table" aria-label="Cross-backbone evaluation metrics">
            <div className="backbone-row backbone-header" role="row"><span>Backbone</span><span>Faithfulness</span><span>Grounding</span><span>Coherence</span><span>Completeness</span></div>
            {BACKBONE_ROWS.map((row) => <div className="backbone-row" role="row" key={row.name}><strong>{row.name}</strong><span>{row.faithfulness.toFixed(2)}</span><span>{row.grounding.toFixed(2)}</span><span>{row.coherence.toFixed(2)}</span><span>{row.completeness.toFixed(2)}</span></div>)}
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
