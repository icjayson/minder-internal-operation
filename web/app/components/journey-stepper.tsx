"use client";

import type { CSSProperties } from "react";

export type JourneyStep<T extends string | number> = {
  value: T;
  label: string;
  shortLabel?: string;
};

type JourneyTone = "indigo" | "teal";

const TONES: Record<JourneyTone, { accent: string; soft: string }> = {
  indigo: { accent: "var(--color-primary)", soft: "var(--color-primary-tint)" },
  teal: { accent: "#0fa79b", soft: "color-mix(in srgb, #0fa79b 14%, transparent)" },
};

export function JourneyStepper<T extends string | number>({
  label,
  current,
  steps,
  onChange,
  tone = "indigo",
  hint,
  meta,
  compact = false,
}: {
  label: string;
  current: T | null;
  steps: JourneyStep<T>[];
  onChange: (value: T) => void;
  tone?: JourneyTone;
  hint?: React.ReactNode;
  meta?: React.ReactNode;
  compact?: boolean;
}) {
  const currentIndex = current == null ? -1 : steps.findIndex((step) => step.value === current);
  const progress = currentIndex > 0 && steps.length > 1 ? (currentIndex / (steps.length - 1)) * 100 : 0;
  const railInset = `${50 / Math.max(steps.length, 1)}%`;
  const palette = TONES[tone];
  const style = {
    "--journey-accent": palette.accent,
    "--journey-soft": palette.soft,
  } as CSSProperties;

  return (
    <section style={style} aria-label={label}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="journey-section-icon" aria-hidden>
            {tone === "indigo" ? <PipelineIcon /> : <RelationshipIcon />}
          </span>
          <h3 className="text-[13px] font-semibold text-foreground">{label}</h3>
        </div>
        {meta && <div className="text-[11px] text-muted-foreground">{meta}</div>}
      </div>

      <div className="overflow-x-auto pb-1">
        <div
          className="relative grid min-w-[620px]"
          style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(${compact ? "72px" : "92px"}, 1fr))` }}
          role="radiogroup"
          aria-label={label}
        >
          <div
            aria-hidden
            className="absolute top-[21px] h-[2px] overflow-hidden rounded-full bg-border-strong"
            style={{ left: railInset, right: railInset }}
          >
            <span
              className="block h-full rounded-full bg-[var(--journey-accent)] transition-[width] duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          {steps.map((step, index) => {
            const completed = index < currentIndex;
            const active = index === currentIndex;
            return (
              <button
                key={String(step.value)}
                type="button"
                role="radio"
                aria-checked={active}
                aria-label={`Set ${label} to ${step.label}`}
                onClick={() => onChange(step.value)}
                className="group relative z-[1] flex min-w-0 cursor-pointer flex-col items-center px-1 text-center"
              >
                <span className="grid h-11 w-11 place-items-center rounded-full">
                  <span
                    className={`grid h-6 w-6 place-items-center rounded-full border text-[10px] font-semibold transition-all duration-200 ${
                      completed
                        ? "border-[var(--journey-accent)] bg-[var(--journey-accent)] text-white"
                        : active
                          ? "border-[var(--journey-accent)] bg-[var(--journey-accent)] text-white ring-[7px] ring-[var(--journey-soft)] shadow-[0_0_0_1px_var(--journey-accent)]"
                          : "border-border-strong bg-card text-muted-foreground group-hover:border-[var(--journey-accent)] group-hover:text-[var(--journey-accent)]"
                    }`}
                  >
                    {completed ? <CheckIcon /> : index + 1}
                  </span>
                </span>
                <span
                  className={`mt-1 max-w-full text-[10.5px] leading-tight transition-colors ${
                    active ? "font-semibold text-foreground" : completed ? "text-foreground/80" : "text-muted-foreground group-hover:text-foreground/80"
                  }`}
                  title={step.label}
                >
                  <span className="hidden sm:inline">{step.label}</span>
                  <span className="sm:hidden">{step.shortLabel ?? step.label}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {hint && <div className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{hint}</div>}
    </section>
  );
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
      <path d="m5 12 4 4L19 6" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PipelineIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path d="M5 18V7m0 0 3 3M5 7 2 10m7 8v-6m0 0 3 3m-3-3-3 3m9 3V4m0 0 3 3m-3-3-3 3" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function RelationshipIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <circle cx="8" cy="8" r="3" strokeWidth="1.6" />
      <circle cx="17" cy="7" r="2.5" strokeWidth="1.6" />
      <path d="M2.5 20c0-3.6 2.5-6 5.5-6s5.5 2.4 5.5 6M14 13.5c3.7-.7 7 1.5 7 5.5" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
