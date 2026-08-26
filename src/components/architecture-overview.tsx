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
  LockKey,
  Moon,
  Path,
  ShieldCheck,
  Stack,
  Sun,
  Wrench,
} from "@phosphor-icons/react";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { BRAND } from "@/lib/brand";
import { BrandLogo } from "./brand-logo";

const MODES = [
  {
    name: "Auto",
    focus: "Routes each step between research and computation.",
    icon: Brain,
  },
  {
    name: "Research",
    focus: "Prioritizes source discovery, reading, and synthesis.",
    icon: Globe,
  },
  {
    name: "Analytical",
    focus: "Prioritizes market data, valuation, and risk tools.",
    icon: ChartLineUp,
  },
];

const RUN_STEPS = [
  {
    title: "Frame the question",
    detail: "The selected mode changes the reasoning policy while every tool remains available.",
    icon: Path,
  },
  {
    title: "Build the plan",
    detail: "The agent turns the request into visible research steps before expensive work begins.",
    icon: Stack,
  },
  {
    title: "Load what is needed",
    detail: "Core tools stay ready. Specialist schemas load only when the trajectory calls for them.",
    icon: Wrench,
  },
  {
    title: "Gather and calculate",
    detail: "Web evidence and structured financial outputs share one result-chaining contract.",
    icon: FunctionIcon,
  },
  {
    title: "Assemble the report",
    detail: "Sources, assumptions, calculations, and conclusions arrive with an inspectable trace.",
    icon: CheckCircle,
  },
];

const PRODUCT_FACTS = [
  { value: "3", label: "reasoning modes", note: "One constant registry" },
  { value: "22", label: "financial tools", note: "Core and deferred" },
  { value: "6", label: "workflow skills", note: "Loaded on demand" },
  { value: "14", label: "maximum rounds", note: "Bounded execution" },
];

export function ArchitectureOverview() {
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    queueMicrotask(() => {
      const savedTheme = localStorage.getItem("underwrite-theme") as "light" | "dark" | null;
      const nextTheme =
        savedTheme || (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
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
        <Link className="architecture-brand" href="/">
          <BrandLogo size={34} />
          <span>{BRAND.name}</span>
        </Link>
        <nav aria-label="Architecture page navigation">
          <a href="#pipeline">Pipeline</a>
          <a href="#modes">Modes</a>
          <a href="#models">Models</a>
          <a href="#controls">Controls</a>
        </nav>
        <div className="architecture-nav-actions">
          <button
            className="icon-button"
            type="button"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <Link className="architecture-open" href="/">
            Open workbench <ArrowRight size={15} />
          </Link>
        </div>
      </header>

      <section className="architecture-hero" id="pipeline">
        <div className="architecture-hero-copy">
          <span className="architecture-kicker">System architecture</span>
          <h1>Inside Underwrite.</h1>
          <p>
            Underwrite combines model reasoning, live evidence, and deterministic finance tools in one
            inspectable execution loop.
          </p>
          <Link className="architecture-back" href="/">
            <ArrowLeft size={16} /> Open workbench
          </Link>
        </div>

        <div className="architecture-blueprint" aria-label="Underwrite system architecture">
          <div className="blueprint-upper">
            <section className="blueprint-inputs">
              <h2>Research inputs</h2>
              <div className="blueprint-node"><Brain size={18} /><span>User question</span></div>
              <div className="blueprint-node"><Globe size={18} /><span>Public evidence</span></div>
              <div className="blueprint-node"><Database size={18} /><span>Market data</span></div>
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
              <div className="stage-node"><Database size={17} /><span>Fetch structured data</span></div>
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
          <div className="blueprint-result">
            <ShieldCheck size={19} />
            <span><strong>Auditable output</strong> Evidence, assumptions, calculations, and conclusions stay connected.</span>
          </div>
        </div>
      </section>

      <section className="architecture-facts" aria-label="Current implementation facts">
        <div className="facts-intro">
          <h2>What is running today</h2>
          <p>These numbers describe the current product implementation, not a performance benchmark.</p>
        </div>
        <div className="fact-grid">
          {PRODUCT_FACTS.map((fact) => (
            <div className="fact" key={fact.label}>
              <strong>{fact.value}</strong>
              <span>{fact.label}</span>
              <small>{fact.note}</small>
            </div>
          ))}
        </div>
      </section>

      <section className="mode-architecture" id="modes">
        <div className="section-copy">
          <h2>One registry. Three reasoning policies.</h2>
          <p>
            Switching modes changes the agent&apos;s priorities. It never removes a tool that an active
            trajectory may still need.
          </p>
        </div>
        <div className="mode-registry-map">
          <div className="mode-list">
            {MODES.map((mode) => {
              const Icon = mode.icon;
              return (
                <div className="mode-explainer" key={mode.name}>
                  <Icon size={20} />
                  <div><strong>{mode.name}</strong><span>{mode.focus}</span></div>
                  <ArrowRight size={17} />
                </div>
              );
            })}
          </div>
          <div className="constant-registry">
            <div className="registry-heading"><Database size={21} /><span>Constant tool registry</span></div>
            <div className="registry-groups">
              <span>Research</span><span>Market data</span><span>Valuation</span><span>Risk</span><span>Forecasting</span><span>Workflow</span>
            </div>
            <p>Every mode sees the same catalog. Full deferred schemas load only after selection.</p>
          </div>
        </div>
      </section>

      <section className="run-sequence">
        <div className="section-copy">
          <h2>From question to auditable output</h2>
          <p>Each transition has a concrete job, a visible state, and a bounded failure surface.</p>
        </div>
        <div className="run-steps">
          {RUN_STEPS.map((step) => {
            const Icon = step.icon;
            return (
              <article key={step.title}>
                <Icon size={21} />
                <h3>{step.title}</h3>
                <p>{step.detail}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="evidence-visual" id="evidence">
        <div className="section-copy">
          <h2>Evidence becomes structure.</h2>
          <p>
            Underwrite narrows scattered documents, data points, and assumptions into one traceable
            analytical path.
          </p>
        </div>
        <figure>
          <Image
            src="/underwrite-evidence-network.png"
            alt="Abstract financial evidence flowing through analytical layers into one decision output"
            width={1586}
            height={992}
            sizes="(max-width: 760px) 100vw, 1200px"
          />
          <figcaption>Source signals stay connected as the system filters, calculates, and synthesizes.</figcaption>
        </figure>
      </section>

      <section className="model-strategy" id="models">
        <div className="section-copy">
          <h2>Choose the operating point.</h2>
          <p>
            The product contract stays fixed while you choose the model that fits your speed, cost,
            privacy, and reasoning needs.
          </p>
        </div>
        <div className="model-chart-wrap">
          <div className="model-chart-legend" aria-label="Model configuration legend">
            <span><i data-kind="local" />Local</span>
            <span><i data-kind="fast" />Fast cloud</span>
            <span><i data-kind="frontier" />Frontier cloud</span>
            <span><i data-kind="custom" />Compatible endpoint</span>
          </div>
          <div className="model-chart" role="img" aria-label="Conceptual map comparing model configurations by operating cost and reasoning depth">
            <div className="model-efficient-zone"><span>High-depth zone</span></div>
            <div className="model-y-label">More reasoning depth</div>
            <div className="model-x-label">Lower operating cost</div>
            <div className="model-point model-point-local"><i /><strong>Local model</strong><span>Private and free to run</span></div>
            <div className="model-point model-point-fast"><i /><strong>Fast cloud</strong><span>Quick iteration</span></div>
            <div className="model-point model-point-frontier"><i /><strong>Frontier model</strong><span>Deepest synthesis</span></div>
            <div className="model-point model-point-custom"><i /><strong>Your endpoint</strong><span>Control the trade-off</span></div>
          </div>
          <p className="model-chart-note">Conceptual configuration guide. Positions are not benchmark scores or price quotes.</p>
        </div>
      </section>

      <section className="control-system" id="controls">
        <div className="control-statement">
          <Gauge size={30} />
          <h2>Control lives outside the model.</h2>
          <p>
            The model proposes the next action. Underwrite owns validation, execution, limits, result
            chaining, and the event stream.
          </p>
        </div>
        <div className="control-details">
          <article>
            <LockKey size={21} />
            <div><h3>Bring your own model</h3><p>OpenAI, Gemini, Ollama, or any compatible endpoint can sit behind the same contract.</p></div>
          </article>
          <article>
            <ShieldCheck size={21} />
            <div><h3>Validate every call</h3><p>Typed request and tool schemas reject malformed inputs before they touch the data layer.</p></div>
          </article>
          <article>
            <Path size={21} />
            <div><h3>Keep the trace visible</h3><p>Plans, phases, sources, tool events, errors, and the report stream to the interface as they happen.</p></div>
          </article>
        </div>
      </section>

      <footer className="architecture-footer">
        <div><BrandLogo size={30} /><span><strong>{BRAND.name}</strong><small>Evidence in. Decisions out.</small></span></div>
        <Link href="/">Open workbench <ArrowRight size={15} /></Link>
      </footer>
    </main>
  );
}
