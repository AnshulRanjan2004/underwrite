"use client";

import * as Tabs from "@radix-ui/react-tabs";
import {
  ArrowRight,
  ArrowsClockwise,
  ArrowUpRight,
  BookOpenText,
  Check,
  Clipboard,
  ClockCounterClockwise,
  Code,
  Database,
  FileText,
  Globe,
  Moon,
  PaperPlaneTilt,
  SpinnerGap,
  Stack,
  Stop,
  Sun,
  Wrench,
  XCircle,
} from "@phosphor-icons/react";
import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Link from "next/link";
import { BRAND } from "@/lib/brand";
import type { ModelConfig, ResearchMode, RunEvent } from "@/lib/harness/types";
import { ModeSwitch } from "./mode-switch";
import { ModelSettings } from "./model-settings";
import { BrandLogo } from "./brand-logo";

const EXAMPLES = [
  "Estimate NVDA's intrinsic value with a DCF and sensitivity table.",
  "How defensible is Apple's services growth over the next three years?",
  "Compare Microsoft and Alphabet on quality, valuation, and key risks.",
];

const MODE_WORKBENCH: Record<ResearchMode, {
  kicker: string;
  headline: string;
  emphasis: string;
  description: string;
  placeholder: string;
  hint: string;
  action: string;
  examples: string[];
  railTitle: string;
  railDescription: string;
  railSteps: string[];
  briefLabel: string;
  briefValue: string;
  briefRows: Array<[string, string]>;
  activityTitle: string;
  activityEmpty: string;
  sourceTitle: string;
  sourceEmpty: string;
}> = {
  auto: {
    kicker: "Investment command desk",
    headline: "Take a position.",
    emphasis: "Show the proof.",
    description: "Research a company, test a thesis, or stress a valuation with live evidence and an inspectable trail.",
    placeholder: "Ask about a company, thesis, valuation, market event, or risk...",
    hint: "Balances source work with valuation and risk tools.",
    action: "Run research",
    examples: EXAMPLES,
    railTitle: "Automatic routing",
    railDescription: "The agent chooses the right sequence for the question in front of it.",
    railSteps: ["Frame the question", "Gather the evidence", "Calculate what matters"],
    briefLabel: "Research lens",
    briefValue: "Adaptive",
    briefRows: [["Model", "Choose a model"], ["Coverage", "US, India, global"], ["Method", "Evidence + valuation"]],
    activityTitle: "Live trajectory",
    activityEmpty: "Plans, tool calls, and phases will stream here.",
    sourceTitle: "Visited evidence",
    sourceEmpty: "Sources read by the agent will appear here.",
  },
  research: {
    kicker: "Evidence reading room",
    headline: "Read the market.",
    emphasis: "Keep the trail.",
    description: "Investigate filings, reporting, transcripts, and current events with source comparison at the center.",
    placeholder: "Ask about a company, filing, industry event, reporting claim, or market narrative...",
    hint: "Prioritizes reading, source comparison, and citations.",
    action: "Start investigation",
    examples: [
      "What changed in Reliance Industries' latest results and what matters next?",
      "Build a sourced view on India's defence spending beneficiaries.",
      "Map the current drivers and risks for Apple services growth.",
    ],
    railTitle: "Evidence standard",
    railDescription: "Research starts with a source trail, then separates fact, inference, and open questions.",
    railSteps: ["Compare primary sources", "Check the date", "Cite material claims"],
    briefLabel: "Reading policy",
    briefValue: "Source-first",
    briefRows: [["Model", "Choose a model"], ["Evidence", "Web + filings"], ["Output", "Cited narrative"]],
    activityTitle: "Evidence log",
    activityEmpty: "Source reads, comparisons, and open questions will appear here.",
    sourceTitle: "Source library",
    sourceEmpty: "Every source used in the investigation will appear here.",
  },
  analytical: {
    kicker: "Valuation canvas",
    headline: "Stress the numbers.",
    emphasis: "See the range.",
    description: "Start with market data and structured assumptions. Turn a thesis into scenarios, sensitivities, and valuation context.",
    placeholder: "Ask for a DCF, sensitivity, multiple comparison, scenario, or risk calculation...",
    hint: "Prioritizes market data, assumptions, and deterministic calculation.",
    action: "Run analysis",
    examples: [
      "Value HDFC Bank with a residual income model and sensitivity table.",
      "Compare TCS and Infosys on growth, margins, and valuation multiples.",
      "Stress test a DCF for NVIDIA using revenue growth and margin scenarios.",
    ],
    railTitle: "Valuation frame",
    railDescription: "Every output names the unit, assumption, formula, and range behind the conclusion.",
    railSteps: ["Set the base case", "Stress key drivers", "Name the downside"],
    briefLabel: "Calculation policy",
    briefValue: "Numbers-first",
    briefRows: [["Model", "Choose a model"], ["Toolkit", "Market + valuation"], ["Output", "Scenarios + range"]],
    activityTitle: "Calculation trace",
    activityEmpty: "Inputs, calculations, and sensitivity work will appear here.",
    sourceTitle: "Market inputs",
    sourceEmpty: "Market data and supporting context will appear here.",
  },
};

const DEFAULT_MODEL: ModelConfig = { provider: "auto", model: "" };

type Health = {
  provider?: { label?: string; model?: string; configured?: boolean };
  tools?: number;
  skills?: number;
};

function parseFrame(frame: string) {
  const data = frame.split("\n").find((line) => line.startsWith("data: "));
  if (!data) return null;
  try { return JSON.parse(data.slice(6)) as RunEvent; } catch { return null; }
}

function activityIcon(event: RunEvent) {
  if (event.type === "tool_started") return <Wrench size={15} />;
  if (event.type === "tool_completed") return <Check size={15} />;
  if (event.type === "source") return <Globe size={15} />;
  if (event.type === "error") return <XCircle size={15} />;
  if (event.type === "phase") return <ArrowsClockwise size={15} />;
  return <Code size={15} />;
}

function activityTitle(event: RunEvent) {
  if (event.type === "tool_started") return `Called ${event.tool}`;
  if (event.type === "tool_completed") return event.message ? `${event.tool} returned an issue` : `Completed ${event.tool}`;
  if (event.type === "source") return event.title || "Source added";
  if (event.type === "error") return "Run error";
  return event.label || event.type.replaceAll("_", " ");
}

export function ResearchWorkspace() {
  const [mode, setMode] = useState<ResearchMode>("auto");
  const [modelConfig, setModelConfig] = useState<ModelConfig>(DEFAULT_MODEL);
  const [question, setQuestion] = useState("");
  const [submittedQuestion, setSubmittedQuestion] = useState("");
  const [events, setEvents] = useState<RunEvent[]>([]);
  const [report, setReport] = useState("");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [health, setHealth] = useState<Health>({});
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [recent, setRecent] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    void fetch("/api/health").then((response) => response.json()).then(setHealth).catch(() => undefined);
    queueMicrotask(() => {
      const saved = localStorage.getItem("underwrite-model-config");
      if (saved) {
        try { setModelConfig(JSON.parse(saved) as ModelConfig); } catch { /* ignore invalid local state */ }
      }
      const savedRecent = localStorage.getItem("underwrite-recent");
      if (savedRecent) {
        try { setRecent(JSON.parse(savedRecent) as string[]); } catch { /* ignore invalid local state */ }
      }
      const savedTheme = localStorage.getItem("underwrite-theme") as "light" | "dark" | null;
      const nextTheme = savedTheme || (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
      setTheme(nextTheme);
      document.documentElement.dataset.theme = nextTheme;
    });
  }, []);

  const plan = useMemo(() => {
    const event = [...events].reverse().find((item) => item.type === "plan");
    return Array.isArray(event?.data) ? event.data as Array<{ title: string; status: string }> : [];
  }, [events]);
  const sources = useMemo(() => events.filter((event) => event.type === "source"), [events]);
  const activity = useMemo(() => events.filter((event) => !["report_delta", "report_completed", "done", "plan"].includes(event.type)), [events]);
  const activePhase = [...events].reverse().find((event) => event.type === "phase")?.label;
  const hasStarted = Boolean(submittedQuestion);
  const modeWorkbench = MODE_WORKBENCH[mode];

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    localStorage.setItem("underwrite-theme", next);
  }

  function applyEvent(event: RunEvent) {
    setEvents((current) => [...current, event]);
    if (event.type === "report_delta" && event.delta) setReport((current) => current + event.delta);
    if (event.type === "report_completed" && event.report) setReport(event.report);
    if (event.type === "error") setError(event.message || "The research run failed.");
  }

  async function startRun(prompt = question) {
    const clean = prompt.trim();
    if (clean.length < 3 || running) return;
    setQuestion(clean);
    setSubmittedQuestion(clean);
    setEvents([]);
    setReport("");
    setError("");
    setRunning(true);
    const nextRecent = [clean, ...recent.filter((item) => item !== clean)].slice(0, 6);
    setRecent(nextRecent);
    localStorage.setItem("underwrite-recent", JSON.stringify(nextRecent));
    const controller = new AbortController();
    controllerRef.current = controller;

    try {
      const response = await fetch("/api/research", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: clean, mode, modelConfig }),
        signal: controller.signal,
      });
      if (!response.ok || !response.body) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error || `Request failed with ${response.status}.`);
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const frames = buffer.split("\n\n");
        buffer = frames.pop() || "";
        frames.forEach((frame) => {
          const event = parseFrame(frame);
          if (event) applyEvent(event);
        });
      }
    } catch (runError) {
      if ((runError as Error).name !== "AbortError") setError(runError instanceof Error ? runError.message : "The research run failed.");
    } finally {
      setRunning(false);
      controllerRef.current = null;
    }
  }

  function stopRun() {
    controllerRef.current?.abort();
    setRunning(false);
  }

  async function copyReport() {
    await navigator.clipboard.writeText(report);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <main className="app-shell" data-mode={mode}>
      <header className="topbar">
        <div className="brand-lockup"><BrandLogo /><span><strong>{BRAND.name}</strong><small>Investment research, with receipts</small></span></div>
        <ModeSwitch value={mode} onChange={setMode} />
        <div className="topbar-actions"><Link className="system-map-link" href="/architecture" aria-label="Open system map"><Stack size={17} /><span>System map</span><ArrowUpRight size={14} /></Link><button className="icon-button" type="button" onClick={toggleTheme} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}>{theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}</button><ModelSettings value={modelConfig} onChange={setModelConfig} /></div>
      </header>

      <div className="workspace-grid">
        <aside className="left-rail">
          <button className="new-research" type="button" onClick={() => { setSubmittedQuestion(""); setQuestion(""); setReport(""); setEvents([]); setError(""); }}>Start fresh <ArrowRight size={16} /></button>
          <section className="rail-section"><h2><ClockCounterClockwise size={15} />Recent</h2>{recent.length ? <div className="recent-list">{recent.map((item) => <button type="button" key={item} onClick={() => void startRun(item)}>{item}</button>)}</div> : <p className="rail-empty">Your latest questions will appear here.</p>}</section>
          <section className="rail-section mode-rail-section"><h2>{modeWorkbench.railTitle}</h2><p>{modeWorkbench.railDescription}</p><div>{modeWorkbench.railSteps.map((step) => <span key={step}>{step}</span>)}</div></section>
          <section className="rail-section capability-section"><h2><Database size={15} />Research engine</h2><div className="registry-stat"><strong>{health.tools || 23}</strong><span>constant tools</span></div><div className="registry-stat"><strong>{health.skills || 6}</strong><span>workflow skills</span></div><p>Modes change the reasoning policy, never the available trajectory.</p></section>
          <footer className="rail-footer"><span>Informational research only</span><Link href="/architecture">Explore the system map <ArrowUpRight size={12} /></Link></footer>
        </aside>

        <section className="research-stage">
          {!hasStarted ? (
            <div className="empty-workspace">
              <div className="entry-layout">
                <div className="entry-main">
                  <div className="empty-kicker"><span />{modeWorkbench.kicker}</div>
                  <h1>{modeWorkbench.headline}<br /><span>{modeWorkbench.emphasis}</span></h1>
                  <p>{modeWorkbench.description}</p>
                  <div className="composer composer-large">
                    <textarea value={question} onChange={(event) => setQuestion(event.target.value)} placeholder={modeWorkbench.placeholder} rows={4} onKeyDown={(event) => { if ((event.metaKey || event.ctrlKey) && event.key === "Enter") void startRun(); }} />
                    <div className="composer-footer"><span>{modeWorkbench.hint}</span><button className="send-button" type="button" disabled={question.trim().length < 3} onClick={() => void startRun()}><PaperPlaneTilt size={17} weight="fill" />{modeWorkbench.action}</button></div>
                  </div>
                </div>
                <aside className="research-brief" aria-label="Current research configuration">
                  <div className="brief-heading"><span>{modeWorkbench.briefLabel}</span><strong>{modeWorkbench.briefValue}</strong></div>
                  {modeWorkbench.briefRows.map(([label, value]) => <div className="brief-line" key={label}><span>{label}</span><strong>{label === "Model" ? modelConfig.model || health.provider?.model || value : value}</strong></div>)}
                  <Link href="/architecture" className="brief-map-link">See how it works <ArrowUpRight size={15} /></Link>
                </aside>
              </div>
              <div className="example-prompts">{modeWorkbench.examples.map((example) => <button type="button" key={example} onClick={() => { setQuestion(example); void startRun(example); }}>{example}<ArrowRight size={14} /></button>)}</div>
            </div>
          ) : (
            <div className="report-workspace">
              <div className="report-header"><div><span className="report-mode">{modeWorkbench.briefValue}</span><h1>{submittedQuestion}</h1></div>{report && <button className="secondary-button" type="button" onClick={copyReport}>{copied ? <Check size={16} /> : <Clipboard size={16} />}{copied ? "Copied" : "Copy report"}</button>}</div>
              {running && !report && <div className="report-skeleton" aria-label="Research in progress"><span /><span /><span /><span /></div>}
              {error && <div className="error-panel"><XCircle size={20} /><div><strong>Research stopped</strong><p>{error}</p></div></div>}
              {report && <article className="report-body"><ReactMarkdown remarkPlugins={[remarkGfm]}>{report}</ReactMarkdown></article>}
              {running && <div className="running-bar"><span><SpinnerGap className="spin" size={16} />{activePhase || "Working"}</span><button type="button" onClick={stopRun}><Stop size={14} weight="fill" />Stop</button></div>}
              {!running && <div className="followup-composer"><textarea value={question} onChange={(event) => setQuestion(event.target.value)} rows={2} placeholder="Refine the question or start another analysis..." /><button type="button" onClick={() => void startRun()} aria-label="Run follow-up"><PaperPlaneTilt size={18} weight="fill" /></button></div>}
            </div>
          )}
        </section>

        <aside className="right-rail">
          <Tabs.Root defaultValue="activity" className="trajectory-tabs">
            <Tabs.List aria-label="Run details"><Tabs.Trigger value="activity">Activity <span>{activity.length}</span></Tabs.Trigger><Tabs.Trigger value="sources">Sources <span>{sources.length}</span></Tabs.Trigger></Tabs.List>
            <Tabs.Content value="activity">
              {plan.length > 0 && <section className="plan-panel"><h2>Investigation plan</h2>{plan.map((item, index) => <div className="plan-item" key={`${item.title}-${index}`} data-status={item.status}><span>{item.status === "completed" ? <Check size={13} /> : index + 1}</span><p>{item.title}</p></div>)}</section>}
              <section className="activity-list"><h2>{modeWorkbench.activityTitle}</h2>{activity.length ? activity.map((event, index) => <div className="activity-item" key={`${event.at}-${index}`} data-type={event.type}><span className="activity-icon">{activityIcon(event)}</span><div><strong>{activityTitle(event)}</strong>{event.message && <small>{event.message}</small>}<time>{new Date(event.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</time></div></div>) : <div className="panel-empty"><Code size={22} /><p>{modeWorkbench.activityEmpty}</p></div>}</section>
            </Tabs.Content>
            <Tabs.Content value="sources">
              <section className="source-list"><h2>{modeWorkbench.sourceTitle}</h2>{sources.length ? sources.map((source, index) => <a href={source.url} target="_blank" rel="noreferrer" key={`${source.url}-${index}`}><span>{index + 1}</span><div><strong>{source.title}</strong><small>{source.url ? new URL(source.url).hostname : "Source"}</small></div><ArrowRight size={14} /></a>) : <div className="panel-empty"><BookOpenText size={22} /><p>{modeWorkbench.sourceEmpty}</p></div>}</section>
            </Tabs.Content>
          </Tabs.Root>
          <div className="connection-foot"><span className="provider-status" /><div><strong>{modelConfig.provider === "auto" ? health.provider?.label || "No-key preview" : modelConfig.provider}</strong><small>{modelConfig.model || health.provider?.model || "Configure a model"}</small></div><FileText size={16} /></div>
        </aside>
      </div>
    </main>
  );
}
