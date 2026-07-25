"use client";

import type { Stage } from "@/lib/types";

const TONE: Record<Stage, string> = {
  New: "cobalt",
  Contacted: "indigo",
  Replied: "violet",
  "Meeting Booked": "magenta",
  Demo: "magenta",
  "Closed Won": "green",
  "Closed Lost": "rose",
  Nurture: "neutral",
};

export function StagePill({ stage }: { stage: Stage }) {
  return (
    <span
      data-tone={TONE[stage]}
      className="tone inline-flex items-center h-5 px-2.5 rounded-full mono text-[10px] uppercase tracking-[0.1em] font-medium whitespace-nowrap"
    >
      {stage}
    </span>
  );
}
