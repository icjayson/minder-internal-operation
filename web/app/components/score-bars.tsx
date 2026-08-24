"use client";

import { SCORE_DIMENSIONS, type ScoreBreakdown, type ScoreDimension } from "@/lib/types";

// Compact 0–100 score chip used in the factory table.
export function ScoreChip({ score, grade }: { score: number | null; grade: string | null }) {
  if (score == null) return <span className="text-xs text-muted-foreground tabular-nums">—</span>;
  const tone = grade === "A" ? "green" : grade === "B" ? "amber" : "neutral";
  return (
    <span className="inline-flex items-center gap-2 w-24">
      <span className="relative flex-1 h-[3px] rounded-full bg-border overflow-hidden">
        <span
          data-tone={tone}
          className="absolute inset-y-0 left-0 rounded-full tone"
          style={{ width: `${Math.max(0, Math.min(100, score))}%`, border: "none" }}
        />
      </span>
      <span className="tabular-nums text-[11px] font-medium text-foreground">{Math.round(score)}</span>
      {grade && (
        <span
          data-tone={tone}
          className="tone inline-flex items-center justify-center w-4 h-4 rounded-full tabular-nums text-[9px] font-semibold"
        >
          {grade}
        </span>
      )}
    </span>
  );
}

// Prominent score treatment used inside the AI assessment summary.
export function AssessmentScoreBadge({ score, grade }: { score: number | null; grade: string | null }) {
  // A / B / C already mean good / needs attention / poor, which is exactly what
  // the semantic ramp is for — so the grades read it rather than carrying their
  // own three triads of hand-picked hex.
  const tone = grade === "A"
    ? { ring: "border-success bg-success-light text-success-dark", mark: "bg-success text-white" }
    : grade === "B"
      ? { ring: "border-warning bg-warning-light text-warning-dark", mark: "bg-warning text-white" }
      : { ring: "border-error bg-error-light text-error-dark", mark: "bg-error text-white" };

  return (
    <div className="relative mb-1 h-12 w-12 shrink-0" aria-label={score == null ? "Not scored" : `Score ${Math.round(score)} out of 100, grade ${grade ?? "ungraded"}`}>
      <div className={`grid h-12 w-12 place-items-center rounded-full border-[3px] ${score == null ? "border-border-strong bg-muted text-muted-foreground" : tone.ring}`}>
        <span className="text-[18px] font-bold leading-none tabular-nums">{score == null ? "—" : Math.round(score)}</span>
      </div>
      {grade && (
        <span className={`absolute -bottom-1 left-1/2 grid h-[18px] min-w-[18px] -translate-x-1/2 place-items-center rounded-full border-2 border-card px-1 text-[9px] font-bold shadow-sm ${tone.mark}`}>
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
            <span className="w-40 shrink-0 text-[11px] text-foreground/80 truncate">{d.label}</span>
            <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
            </div>
            <span className="w-10 shrink-0 text-right tabular-nums text-[11px] tabular-nums text-foreground/80">
              {v}/{d.max}
            </span>
          </div>
        );
      })}
    </div>
  );
}
