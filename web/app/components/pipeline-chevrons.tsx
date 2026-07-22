"use client";

import type { Stage } from "@/lib/types";

type Props = {
  stages: Stage[];
  counts: Map<Stage, number>;
  activeStage: Stage | null;
  onSelect: (s: Stage) => void;
};

// Sharper / flatter chevrons. Colors come from CSS variables so the whole
// pipeline tracks the current palette.
export function PipelineChevrons({ stages, counts, activeStage, onSelect }: Props) {
  const W = 156;      // body width
  const H = 42;       // height (denser than before)
  const tip = 12;     // chevron tip depth
  const gap = 2;

  return (
    <div className="overflow-x-auto -mx-1 pb-1">
      <div className="flex items-stretch" style={{ gap: `${gap}px` }}>
        {stages.map((stage, i) => {
          const isFirst = i === 0;
          const isLast = i === stages.length - 1;
          const isActive = activeStage === stage;
          const count = counts.get(stage) ?? 0;

          const leftNotch = isFirst ? 0 : tip;
          const rightTip = isLast ? 0 : tip;
          const width = W + rightTip;

          const path = [
            `M 0 0`,
            `L ${W} 0`,
            `L ${W + rightTip} ${H / 2}`,
            `L ${W} ${H}`,
            `L 0 ${H}`,
            isFirst ? "" : `L ${leftNotch} ${H / 2}`,
            "Z",
          ]
            .filter(Boolean)
            .join(" ");

          const fill = isActive ? "var(--color-accent-dim)" : "var(--color-surface)";
          const stroke = isActive ? "var(--color-accent)" : "var(--color-line)";
          const textColor = isActive ? "var(--color-accent)" : "var(--color-ink-soft)";
          const countColor = isActive
            ? "var(--color-accent)"
            : count > 0
              ? "var(--color-ink)"
              : "var(--color-muted)";

          return (
            <button
              key={stage}
              onClick={() => onSelect(stage)}
              className="relative shrink-0 cursor-pointer transition-transform duration-150 hover:-translate-y-px"
              style={{ width, height: H }}
              aria-pressed={isActive}
              title={`Filter: ${stage}`}
            >
              <svg
                width={width}
                height={H}
                viewBox={`0 0 ${width} ${H}`}
                className="absolute inset-0"
                preserveAspectRatio="none"
              >
                <path d={path} fill={fill} stroke={stroke} strokeWidth={1} />
              </svg>
              <div
                className="relative z-10 h-full flex items-center justify-center gap-2 pl-2 pr-1"
                style={{ color: textColor }}
              >
                <span
                  className="truncate text-[11px] mono uppercase tracking-[0.12em]"
                  style={{ color: textColor }}
                >
                  {stage}
                </span>
                <span
                  className="mono text-[12px] min-w-[22px] text-center px-1.5 rounded-sm border"
                  style={{
                    color: countColor,
                    borderColor: isActive
                      ? "var(--color-accent)"
                      : "var(--color-line-strong)",
                    background: isActive
                      ? "rgba(59,255,160,0.08)"
                      : "var(--color-surface-2)",
                  }}
                >
                  {count}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
