import type { SequenceStep } from "@/lib/types";

export function orderedSteps(steps: SequenceStep[]): SequenceStep[] {
  return [...steps].sort((a, b) => a.step_index - b.step_index);
}

export function stepAfter(
  steps: SequenceStep[],
  currentStepIndex: number,
): SequenceStep | null {
  return orderedSteps(steps).find((step) => step.step_index > currentStepIndex) ?? null;
}

export function addDaysISO(base: Date, days: number): string {
  const next = new Date(base);
  next.setUTCDate(next.getUTCDate() + Math.max(0, days));
  return next.toISOString().slice(0, 10);
}

export function nextFollowUpForStep(
  current: SequenceStep,
  next: SequenceStep | null,
  sentAt = new Date(),
): string | null {
  if (!next) return null;
  return addDaysISO(sentAt, Math.max(1, next.day_offset - current.day_offset));
}
