"use client";

type Tone = "default" | "accent" | "warn" | "danger";

const TONE: Record<Tone, { bg: string; value: string; rail: string }> = {
  default: {
    bg: "bg-surface border-line",
    value: "text-ink",
    rail: "bg-line-strong",
  },
  accent: {
    bg: "bg-[color:var(--color-accent-dim)] border-[color:var(--color-accent)]/30",
    value: "text-accent",
    rail: "bg-accent",
  },
  warn: {
    bg: "bg-[#2a2110] border-[color:var(--color-warn)]/30",
    value: "text-[color:var(--color-warn)]",
    rail: "bg-[color:var(--color-warn)]",
  },
  danger: {
    bg: "bg-[#2a1515] border-[color:var(--color-danger)]/30",
    value: "text-[color:var(--color-danger)]",
    rail: "bg-[color:var(--color-danger)]",
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
    <div
      className={`relative overflow-hidden rounded-md border px-4 py-3 ${t.bg} transition-colors duration-150`}
    >
      <div className={`absolute left-0 top-0 bottom-0 w-[2px] ${t.rail}`} />
      <div className="text-[10.5px] mono uppercase tracking-[0.14em] text-muted mb-1">
        {label}
      </div>
      <div className={`text-[22px] mono tabular-nums leading-none ${t.value}`}>
        {value}
      </div>
      {hint && <div className="text-[11px] text-muted mt-1">{hint}</div>}
    </div>
  );
}
