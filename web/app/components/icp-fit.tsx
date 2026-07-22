"use client";

// Horizontal bar + numeric score for ICP fit (1-5).
export function IcpFit({ value }: { value: number | null }) {
  if (value == null) {
    return <span className="text-xs text-muted mono">—</span>;
  }

  const pct = Math.max(0, Math.min(100, (value / 5) * 100));
  const tone =
    value >= 4
      ? { bar: "var(--color-accent)", text: "var(--color-accent)" }
      : value >= 3
        ? { bar: "var(--color-warn)", text: "var(--color-warn)" }
        : { bar: "var(--color-line-strong)", text: "var(--color-muted)" };

  return (
    <div className="inline-flex items-center gap-2 w-24">
      <div className="relative flex-1 h-[3px] rounded-full bg-line overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            width: `${pct}%`,
            background: tone.bar,
            boxShadow:
              value >= 4
                ? "0 0 8px -1px rgba(59,255,160,0.6)"
                : "none",
          }}
        />
      </div>
      <span className="mono text-[11px] font-medium tnum" style={{ color: tone.text }}>
        {value.toFixed(1)}
      </span>
    </div>
  );
}
