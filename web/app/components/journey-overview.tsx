"use client";

import type { Stage } from "@/lib/types";
import { LADDER, PIPELINE_STAGES, TERMINAL_STAGES } from "@/lib/types";
import { JourneyStepper, type JourneyStep } from "./journey-stepper";

const PIPELINE_STEPS: JourneyStep<Stage>[] = PIPELINE_STAGES.map((stage) => ({
  value: stage,
  label: stage,
  shortLabel: stage === "Meeting Booked" ? "Meeting" : stage.replace("Closed ", ""),
}));

const LADDER_STEPS: JourneyStep<number>[] = LADDER.map((label, index) => ({
  value: index,
  label: `L${index} ${label}`,
  shortLabel: `L${index}`,
}));

export function JourneyOverview({
  stage,
  ladderLevel,
  nextActionDue,
  onStageChange,
  onLadderChange,
  compact = false,
}: {
  stage: Stage;
  ladderLevel: number;
  nextActionDue: string | null;
  onStageChange: (stage: Stage) => void;
  onLadderChange: (level: number) => void;
  compact?: boolean;
}) {
  const displayedPipelineStage = PIPELINE_STAGES.includes(stage) ? stage : null;

  return (
    <section className="bg-surface" aria-labelledby="journey-overview-title">
      <JourneyStepper
        label="Factory pipeline"
        current={displayedPipelineStage}
        steps={PIPELINE_STEPS}
        onChange={onStageChange}
        compact={compact}
        meta={
          <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-canvas px-2 py-1">
            <CalendarIcon />
            <span className="text-[10.5px] text-ink-soft">{formatTriggerDate(nextActionDue)}</span>
          </span>
        }
        hint={
          <div className="flex justify-end">
            <span className="inline-flex items-center gap-1.5" aria-label="Pipeline off-ramp statuses">
              <span>Off-ramp:</span>
              {TERMINAL_STAGES.map((terminal) => (
                <button
                  key={terminal}
                  type="button"
                  aria-pressed={stage === terminal}
                  onClick={() => onStageChange(terminal)}
                  className={`rounded-full border px-2 py-0.5 text-[10px] transition-colors ${stage === terminal
                      ? "border-[color:var(--color-warn)]/50 tint-warn text-[color:var(--color-warn)]"
                      : "border-line text-muted hover:border-line-strong hover:text-ink-soft"
                    }`}
                >
                  {terminal}
                </button>
              ))}
            </span>
          </div>
        }
      />

      <div className="my-4 h-px bg-line-soft" />

      <JourneyStepper
        label="Relationship ladder"
        current={Math.min(Math.max(ladderLevel, 0), LADDER.length - 1)}
        steps={LADDER_STEPS}
        onChange={onLadderChange}
        tone="teal"
        compact={compact}
      />
    </section>
  );
}

function CalendarIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden><rect x="3" y="5" width="18" height="16" rx="2" strokeWidth="1.7" /><path d="M8 3v4m8-4v4M3 10h18" strokeWidth="1.7" strokeLinecap="round" /></svg>;
}

function formatTriggerDate(value: string | null): string {
  if (!value) return "No work trigger";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
}
