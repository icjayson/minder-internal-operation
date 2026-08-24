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
            /* An idle chevron used to be `bg-muted`, which is the same step as
               the page itself — the bar dissolved into the canvas. It sits one
               step further down the neutral ramp now, and hovers to the next,
               so the segments read as a bar without competing with the active
               one for attention. */
            className={`relative flex-1 min-w-[130px] h-11 pl-5 pr-3 flex items-center justify-between text-[11px] tabular-nums uppercase tracking-[0.1em] cursor-pointer transition-colors duration-150 ${
              active
                ? "bg-primary-tint text-primary"
                : "bg-accent text-foreground/80 hover:bg-border"
            }`}
          >
            <span className="truncate">{s}</span>
            <span
              className={`ml-2 min-w-5 h-5 px-1.5 rounded-full grid place-items-center text-[10px] font-medium ${
                active ? "bg-primary text-primary-foreground" : "bg-card text-foreground/80"
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
