"use client";

// Chevron status bar — the stage pipeline shown at the top of Factories,
// Contacts, Networks & Fundraising. Clicking a chevron filters by that stage
// (click again to clear). Generic over the stage string union so it works for
// both the sales pipeline (Stage) and the fundraising pipeline.
export function PipelineChevrons<S extends string>({
  stages,
  counts,
  activeStage,
  onSelect,
}: {
  stages: S[];
  counts: Map<S, number>;
  activeStage: S | null;
  onSelect: (s: S) => void;
}) {
  return (
    <div className="flex items-stretch w-full overflow-x-auto pb-1">
      {stages.map((s, i) => {
        const active = activeStage === s;
        const n = counts.get(s) ?? 0;
        const isFirst = i === 0;
        const clip = isFirst
          ? "polygon(0 0, calc(100% - 14px) 0, 100% 50%, calc(100% - 14px) 100%, 0 100%)"
          : "polygon(0 0, calc(100% - 14px) 0, 100% 50%, calc(100% - 14px) 100%, 0 100%, 14px 50%)";
        return (
          <button
            key={s}
            onClick={() => onSelect(s)}
            style={{ clipPath: clip, marginLeft: isFirst ? 0 : -10 }}
            className={`relative flex-1 min-w-[130px] h-11 pl-5 pr-3 flex items-center justify-between text-[11px] mono uppercase tracking-[0.1em] cursor-pointer transition-colors duration-150 ${
              active
                ? "bg-accent-dim text-accent"
                : "bg-surface-2 text-ink-soft hover:bg-surface-3"
            }`}
          >
            <span className="truncate">{s}</span>
            <span
              className={`ml-2 min-w-5 h-5 px-1.5 rounded-full grid place-items-center text-[10px] font-medium ${
                active ? "bg-accent text-white" : "bg-surface-3 text-ink-soft"
              }`}
            >
              {n}
            </span>
          </button>
        );
      })}
    </div>
  );
}
