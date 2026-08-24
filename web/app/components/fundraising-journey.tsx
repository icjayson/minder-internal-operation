"use client";

import type { CompetitionResult, FundraisingStage, FundraisingTrack } from "@/lib/types";
import { COMPETITION_RESULTS, INVESTOR_OFF_RAMP, fundraisingPipelineStages } from "@/lib/types";
import { JourneyStepper, type JourneyStep } from "./journey-stepper";

export function FundraisingJourney({
  track,
  stage,
  result,
  nextTouch,
  onStageChange,
  onResultChange,
  compact = false,
}: {
  track: FundraisingTrack;
  stage: FundraisingStage;
  result: CompetitionResult | null;
  nextTouch: string | null;
  onStageChange: (stage: FundraisingStage) => void;
  onResultChange: (result: CompetitionResult | null) => void;
  compact?: boolean;
}) {
  const pipeline = fundraisingPipelineStages(track);
  const steps: JourneyStep<FundraisingStage>[] = pipeline.map((s) => ({
    value: s,
    label: s,
    shortLabel: s === "Researching" ? "Research" : s,
  }));
  const displayedStage = pipeline.includes(stage) ? stage : null;

  return (
    <section className="bg-card" aria-labelledby="fundraising-journey-title">
      <JourneyStepper
        label="Fundraising pipeline"
        current={displayedStage}
        steps={steps}
        onChange={onStageChange}
        compact={compact}
        meta={
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-2 py-1">
            <CalendarIcon />
            <span className="text-[10.5px] text-foreground/80">{formatTouchDate(nextTouch)}</span>
          </span>
        }
        hint={
          <div className="flex justify-end">
            {track === "investor" ? (
              <span className="inline-flex items-center gap-1.5" aria-label="Pipeline off-ramp statuses">
                <span>Off-ramp:</span>
                {INVESTOR_OFF_RAMP.map((terminal) => (
                  <button
                    key={terminal}
                    type="button"
                    aria-pressed={stage === terminal}
                    onClick={() => onStageChange(terminal)}
                    className={`rounded-full border px-2 py-0.5 text-[10px] transition-colors ${stage === terminal
                        ? "border-[color:var(--color-warn)]/50 tint-warn text-[color:var(--color-warn)]"
                        : "border-border text-muted-foreground hover:border-border-strong hover:text-foreground/80"
                      }`}
                  >
                    {terminal}
                  </button>
                ))}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5" aria-label="Competition result">
                <span>Result:</span>
                {COMPETITION_RESULTS.map((r) => {
                  const active = result === r;
                  const tone = r === "Win" ? "green" : "rose";
                  return (
                    <button
                      key={r}
                      type="button"
                      aria-pressed={active}
                      onClick={() => onResultChange(active ? null : r)}
                      data-tone={active ? tone : undefined}
                      className={`rounded-full border px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] transition-colors ${active
                          ? "tone border-transparent"
                          : "border-border text-muted-foreground hover:border-border-strong hover:text-foreground/80"
                        }`}
                    >
                      {r}
                    </button>
                  );
                })}
              </span>
            )}
          </div>
        }
      />
    </section>
  );
}

function CalendarIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden><rect x="3" y="5" width="18" height="16" rx="2" strokeWidth="1.7" /><path d="M8 3v4m8-4v4M3 10h18" strokeWidth="1.7" strokeLinecap="round" /></svg>;
}

function formatTouchDate(value: string | null): string {
  if (!value) return "No next touch";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
}
