export type ResearchMode = "auto" | "research" | "analytical";
export type ModelProvider =
  | "auto"
  | "openai"
  | "gemini"
  | "ollama"
  | "openai-compatible";

export type ModelConfig = {
  provider: ModelProvider;
  model?: string;
  apiKey?: string;
  baseUrl?: string;
};

export type EventType =
  | "run_started"
  | "phase"
  | "plan"
  | "tool_started"
  | "tool_completed"
  | "source"
  | "report_delta"
  | "report_completed"
  | "error"
  | "done";

export type RunEvent = {
  type: EventType;
  at: string;
  callId?: string;
  tool?: string;
  label?: string;
  message?: string;
  delta?: string;
  report?: string;
  data?: unknown;
  title?: string;
  url?: string;
};

export type ResearchRequest = {
  question: string;
  mode: ResearchMode;
  demo?: boolean;
  modelConfig?: ModelConfig;
};

export type ToolResult = {
  markdown: string;
  structured: Record<string, unknown>;
  meta?: Record<string, unknown>;
};

export type ToolEventEmitter = (event: RunEvent) => void;

export type ToolContext = {
  results: Map<string, ToolResult>;
  loadedTools: Set<string>;
  emit: ToolEventEmitter;
};
