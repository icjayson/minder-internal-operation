"use client";

import { SCORE_DIMENSIONS, type ScoreBreakdown } from "@/lib/types";

// Compact 0–100 score chip used in the factory table.
export function ScoreChip({ score, grade }: { score: number | null; grade: string | null }) {
  if (score == null) return <span className="text-xs text-muted mono">—</span>;
  const tone = grade === "A" ? "green" : grade === "B" ? "amber" : "neutral";
  return (
    <span className="inline-flex items-center gap-2 w-24">
      <span className="relative flex-1 h-[3px] rounded-full bg-line overflow-hidden">
        <span
          data-tone={tone}
          className="absolute inset-y-0 left-0 rounded-full tone"
          style={{ width: `${Math.max(0, Math.min(100, score))}%`, border: "none" }}
        />
      </span>
      <span className="mono text-[11px] font-medium tnum text-ink">{Math.round(score)}</span>
      {grade && (
        <span
          data-tone={tone}
          className="tone inline-flex items-center justify-center w-4 h-4 rounded-full mono text-[9px] font-semibold"
        >
          {grade}
        </span>
      )}
    </span>
  );
}

// Full 8-dimension breakdown shown in the drawer.
export function ScoreBreakdownBars({ breakdown }: { breakdown: ScoreBreakdown | null }) {
  if (!breakdown) return null;
  return (
    <div className="space-y-1.5">
      {SCORE_DIMENSIONS.map((d) => {
        const v = breakdown[d.key] ?? 0;
        const pct = (v / d.max) * 100;
        return (
          <div key={d.key} className="flex items-center gap-3">
            <span className="w-40 shrink-0 text-[11px] text-ink-soft truncate">{d.label}</span>
            <div className="flex-1 h-2 rounded-full bg-surface-2 overflow-hidden">
              <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
            </div>
            <span className="w-10 shrink-0 text-right mono text-[11px] tabular-nums text-ink-soft">
              {v}/{d.max}
            </span>
          </div>
        );
      })}
    </div>
  );
}
