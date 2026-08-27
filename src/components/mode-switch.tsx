"use client";

import { Brain, ChartLineUp, GlobeHemisphereWest } from "@phosphor-icons/react";
import { MODES } from "@/lib/harness/modes";
import type { ResearchMode } from "@/lib/harness/types";

const icons = { auto: Brain, research: GlobeHemisphereWest, analytical: ChartLineUp };

export function ModeSwitch({ value, onChange }: { value: ResearchMode; onChange: (mode: ResearchMode) => void }) {
  return <div className="mode-switch" data-mode={value} role="radiogroup" aria-label="Research mode">{(Object.keys(MODES) as ResearchMode[]).map((mode) => { const Icon = icons[mode]; return <button type="button" role="radio" aria-checked={value === mode} data-active={value === mode} data-mode={mode} key={mode} onClick={() => onChange(mode)} title={MODES[mode].description}><Icon size={16} weight={value === mode ? "fill" : "regular"} />{MODES[mode].label}</button>; })}</div>;
}
