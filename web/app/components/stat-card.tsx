"use client";

import { Card } from "@/design-system/components/card";
import { cn } from "@/design-system/lib/utils";

type Tone = "default" | "accent" | "warn" | "danger";

/**
 * The tinted tones read the semantic ramp directly now that it is a real part
 * of the theme, rather than going through the `.tint-*` helper classes. Each
 * pairs the ramp's own `-light` step with its `-dark` type on the light sky,
 * and inverts to a wash on the dark one — the same recipe the toasts use.
 */
const TONE: Record<Tone, { surface: string; value: string; rail: string }> = {
  default: {
    surface: "",
    value: "text-foreground",
    rail: "bg-muted-foreground/30",
  },
  accent: {
    surface: "border-primary/30 bg-primary-tint",
    value: "text-primary",
    rail: "bg-primary",
  },
  warn: {
    surface: "border-warning/30 bg-warning-light dark:bg-warning/15",
    value: "text-warning-dark dark:text-warning",
    rail: "bg-warning",
  },
  danger: {
    surface: "border-error/30 bg-error-light dark:bg-error/15",
    value: "text-error-dark dark:text-error",
    rail: "bg-error",
  },
};

export function StatCard({
  label,
  value,
  tone = "default",
  hint,
}: {
  label: string;
  value: number | string;
  tone?: Tone;
  hint?: string;
}) {
  const t = TONE[tone];
  return (
    <Card
      // A stat tile is denser than the Card default, which is sized for prose:
      // the gap and vertical padding go, and the radius steps down one.
      className={cn(
        "relative gap-0 overflow-hidden rounded-lg px-4 py-3 transition-colors duration-150",
        t.surface
      )}
    >
      <div className={cn("absolute top-0 bottom-0 left-0 w-[2px]", t.rail)} />
      <div className="mb-1 text-[10.5px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
        {label}
      </div>
      <div className={cn("text-[22px] leading-none tabular-nums", t.value)}>
        {value}
      </div>
      {hint && <div className="mt-1 text-[11px] text-muted-foreground">{hint}</div>}
    </Card>
  );
}
