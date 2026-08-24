"use client";

import { SCORE_DIMENSIONS, type ScoreBreakdown, type ScoreDimension } from "@/lib/types";

// Compact 0–100 score chip used in the factory table.
export function ScoreChip({ score, grade }: { score: number | null; grade: string | null }) {
  if (score == null) return <span className="text-xs text-muted-foreground mono">—</span>;
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

// Prominent score treatment used inside the AI assessment summary.
export function AssessmentScoreBadge({ score, grade }: { score: number | null; grade: string | null }) {
  const tone = grade === "A"
    ? { ring: "border-[#27ad7c] bg-[#e8f8f2] text-[#087454]", mark: "bg-[#15986b] text-white" }
    : grade === "B"
      ? { ring: "border-[#e0a62f] bg-[#fff7df] text-[#9a6500]", mark: "bg-[#ca8611] text-white" }
      : { ring: "border-[#dd6571] bg-[#fff0f1] text-[#a82d3a]", mark: "bg-[#c74452] text-white" };

  return (
    <div className="relative mb-1 h-12 w-12 shrink-0" aria-label={score == null ? "Not scored" : `Score ${Math.round(score)} out of 100, grade ${grade ?? "ungraded"}`}>
      <div className={`grid h-12 w-12 place-items-center rounded-full border-[3px] ${score == null ? "border-line-strong bg-surface-2 text-muted-foreground" : tone.ring}`}>
        <span className="text-[18px] font-bold leading-none tabular-nums">{score == null ? "—" : Math.round(score)}</span>
      </div>
      {grade && (
        <span className={`absolute -bottom-1 left-1/2 grid h-[18px] min-w-[18px] -translate-x-1/2 place-items-center rounded-full border-2 border-surface px-1 text-[9px] font-bold shadow-sm ${tone.mark}`}>
          {grade}
        </span>
      )}
    </div>
  );
}

// Full dimension breakdown shown in the drawer (factory rubric by default).
export function ScoreBreakdownBars({
  breakdown,
  dimensions = SCORE_DIMENSIONS as readonly ScoreDimension[],
}: {
  breakdown: ScoreBreakdown | null;
  dimensions?: readonly ScoreDimension[];
}) {
  if (!breakdown) return null;
  return (
    <div className="space-y-1.5">
      {dimensions.map((d) => {
        const v = breakdown[d.key] ?? 0;
        const pct = (v / d.max) * 100;
        return (
          <div key={d.key} className="flex items-center gap-3">
            <span className="w-40 shrink-0 text-[11px] text-ink-soft truncate">{d.label}</span>
            <div className="flex-1 h-2 rounded-full bg-surface-2 overflow-hidden">
              <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
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
