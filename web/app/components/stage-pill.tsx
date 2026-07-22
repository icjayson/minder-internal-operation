"use client";

import type { Stage } from "@/lib/types";

const STAGE_STYLE: Record<
  Stage,
  { bg: string; text: string; border: string }
> = {
  New: {
    bg: "var(--color-stage-new)",
    text: "#a8c3ff",
    border: "rgba(168,195,255,0.25)",
  },
  Researching: {
    bg: "var(--color-stage-research)",
    text: "#c7b9ff",
    border: "rgba(199,185,255,0.25)",
  },
  Contacted: {
    bg: "var(--color-stage-contact)",
    text: "#f5c281",
    border: "rgba(245,194,129,0.3)",
  },
  Replied: {
    bg: "var(--color-stage-reply)",
    text: "#ffcf87",
    border: "rgba(255,207,135,0.35)",
  },
  "Meeting Booked": {
    bg: "var(--color-stage-meet)",
    text: "#84d7cc",
    border: "rgba(132,215,204,0.3)",
  },
  Demo: {
    bg: "var(--color-stage-demo)",
    text: "#93ecd5",
    border: "rgba(147,236,213,0.35)",
  },
  Proposal: {
    bg: "var(--color-stage-proposal)",
    text: "#b8ffe0",
    border: "rgba(184,255,224,0.4)",
  },
  "Closed Won": {
    bg: "var(--color-accent-dim)",
    text: "var(--color-accent)",
    border: "var(--color-accent)",
  },
  "Closed Lost": {
    bg: "var(--color-stage-lost)",
    text: "#f2a1a1",
    border: "rgba(242,161,161,0.3)",
  },
  Nurture: {
    bg: "var(--color-stage-nurture)",
    text: "#c5b4ff",
    border: "rgba(197,180,255,0.25)",
  },
};

export function StagePill({ stage }: { stage: Stage }) {
  const s = STAGE_STYLE[stage];
  return (
    <span
      className="inline-flex items-center h-5 px-2 rounded-sm mono text-[10px] uppercase tracking-[0.1em] font-medium whitespace-nowrap border"
      style={{
        background: s.bg,
        color: s.text,
        borderColor: s.border,
      }}
    >
      {stage}
    </span>
  );
}
