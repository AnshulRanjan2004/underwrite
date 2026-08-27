"use client";

import * as Tabs from "@radix-ui/react-tabs";
import {
  ArrowRight,
  ArrowsClockwise,
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
import { MODES } from "@/lib/harness/modes";
import type { ModelConfig, ResearchMode, RunEvent } from "@/lib/harness/types";
import { ModeSwitch } from "./mode-switch";
import { ModelSettings } from "./model-settings";
import { BrandLogo } from "./brand-logo";

const EXAMPLES = [
  "Estimate NVDA's intrinsic value with a DCF and sensitivity table.",
  "How defensible is Apple's services growth over the next three years?",
  "Compare Microsoft and Alphabet on quality, valuation, and key risks.",
];

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
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-lockup"><BrandLogo /><span><strong>{BRAND.name}</strong><small>Financial research workbench</small></span></div>
        <ModeSwitch value={mode} onChange={setMode} />
        <div className="topbar-actions"><Link className="icon-button" href="/architecture" aria-label="How Underwrite works"><Stack size={18} /></Link><button className="icon-button" type="button" onClick={toggleTheme} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}>{theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}</button><ModelSettings value={modelConfig} onChange={setModelConfig} /></div>
      </header>

      <div className="workspace-grid">
        <aside className="left-rail">
          <button className="new-research" type="button" onClick={() => { setSubmittedQuestion(""); setQuestion(""); setReport(""); setEvents([]); setError(""); }}>New research <ArrowRight size={16} /></button>
          <section className="rail-section"><h2><ClockCounterClockwise size={15} />Recent</h2>{recent.length ? <div className="recent-list">{recent.map((item) => <button type="button" key={item} onClick={() => void startRun(item)}>{item}</button>)}</div> : <p className="rail-empty">Your latest questions will appear here.</p>}</section>
          <section className="rail-section capability-section"><h2><Database size={15} />Harness</h2><div className="registry-stat"><strong>{health.tools || 23}</strong><span>constant tools</span></div><div className="registry-stat"><strong>{health.skills || 6}</strong><span>workflow skills</span></div><p>Modes change the reasoning policy, never the available trajectory.</p></section>
          <footer className="rail-footer"><span>Informational research only</span><Link href="/architecture">How Underwrite works</Link></footer>
        </aside>

        <section className="research-stage">
          {!hasStarted ? (
            <div className="empty-workspace">
              <div className="empty-kicker"><span />Evidence in. Decisions out.</div>
              <h1>Research the market.<br /><span>Show your work.</span></h1>
              <p>Underwrite plans the question, gathers live evidence, runs financial tools, and keeps the entire reasoning trail inspectable.</p>
              <div className="composer composer-large">
                <textarea value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ask about a company, thesis, valuation, market event, or risk..." rows={4} onKeyDown={(event) => { if ((event.metaKey || event.ctrlKey) && event.key === "Enter") void startRun(); }} />
                <div className="composer-footer"><span>{MODES[mode].description}</span><button className="send-button" type="button" disabled={question.trim().length < 3} onClick={() => void startRun()}><PaperPlaneTilt size={17} weight="fill" />Run research</button></div>
              </div>
              <div className="example-prompts">{EXAMPLES.map((example) => <button type="button" key={example} onClick={() => { setQuestion(example); void startRun(example); }}>{example}<ArrowRight size={14} /></button>)}</div>
            </div>
          ) : (
            <div className="report-workspace">
              <div className="report-header"><div><span className="report-mode">{MODES[mode].label} mode</span><h1>{submittedQuestion}</h1></div>{report && <button className="secondary-button" type="button" onClick={copyReport}>{copied ? <Check size={16} /> : <Clipboard size={16} />}{copied ? "Copied" : "Copy report"}</button>}</div>
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
              <section className="activity-list"><h2>Live trajectory</h2>{activity.length ? activity.map((event, index) => <div className="activity-item" key={`${event.at}-${index}`} data-type={event.type}><span className="activity-icon">{activityIcon(event)}</span><div><strong>{activityTitle(event)}</strong>{event.message && <small>{event.message}</small>}<time>{new Date(event.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</time></div></div>) : <div className="panel-empty"><Code size={22} /><p>Plans, tool calls, and phases will stream here.</p></div>}</section>
            </Tabs.Content>
            <Tabs.Content value="sources">
              <section className="source-list"><h2>Visited evidence</h2>{sources.length ? sources.map((source, index) => <a href={source.url} target="_blank" rel="noreferrer" key={`${source.url}-${index}`}><span>{index + 1}</span><div><strong>{source.title}</strong><small>{source.url ? new URL(source.url).hostname : "Source"}</small></div><ArrowRight size={14} /></a>) : <div className="panel-empty"><BookOpenText size={22} /><p>Sources read by the agent will appear here.</p></div>}</section>
            </Tabs.Content>
          </Tabs.Root>
          <div className="connection-foot"><span className="provider-status" /><div><strong>{modelConfig.provider === "auto" ? health.provider?.label || "No-key preview" : modelConfig.provider}</strong><small>{modelConfig.model || health.provider?.model || "Configure a model"}</small></div><FileText size={16} /></div>
        </aside>
      </div>
    </main>
  );
}
