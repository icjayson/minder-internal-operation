"use client";

import type { Factory, Stage } from "@/lib/types";
import { STAGES } from "@/lib/types";
import { StagePill } from "./stage-pill";
import { ScoreChip } from "./score-bars";
import { DataTable, type Column } from "./data-table";

type Props = {
  factories: Factory[];
  verticalName: (id: string | null) => string;
  contactCount: (factoryId: string) => number;
  onSelect: (f: Factory) => void;
  onStageChange: (id: string, s: Stage) => void;
  onDelete: (id: string) => void;
};

const STALE_MS = 7 * 86400000;

export function FactoryTable({
  factories,
  verticalName,
  contactCount,
  onSelect,
  onStageChange,
  onDelete,
}: Props) {
  const columns: Column<Factory>[] = [
    {
      key: "name",
      header: "Factory",
      width: 230,
      minWidth: 140,
      sortable: true,
      sortValue: (f) => f.name.toLowerCase(),
      render: (f) => {
        const stale = f.last_activity_at
          ? Date.now() - new Date(f.last_activity_at).getTime() > STALE_MS
          : false;
        return (
          <div className="flex items-center gap-3 min-w-0">
            {stale && (
              <span
                title="No update in 7+ days"
                className="w-1.5 h-1.5 rounded-full shrink-0 bg-[color:var(--color-warn)]"
              />
            )}
            <div className="min-w-0">
              <div className="font-medium truncate text-ink">{f.name}</div>
              {f.hq_location && <div className="text-[11px] text-muted truncate">{f.hq_location}</div>}
            </div>
          </div>
        );
      },
    },
    {
      key: "vertical",
      header: "Vertical",
      width: 150,
      sortable: true,
      sortValue: (f) => verticalName(f.vertical_id),
      render: (f) => <span className="text-ink-soft truncate block">{verticalName(f.vertical_id)}</span>,
    },
    {
      key: "region",
      header: "Region",
      width: 120,
      sortable: true,
      sortValue: (f) => f.geo_tier ?? "",
      render: (f) => <span className="text-ink-soft mono text-[11px]">{f.geo_tier ?? "—"}</span>,
    },
    {
      key: "workers",
      header: "Workers",
      width: 100,
      align: "right",
      sortable: true,
      sortValue: (f) => f.frontline_workers ?? -1,
      render: (f) => <span className="text-ink-soft mono">{f.frontline_workers ?? "—"}</span>,
    },
    {
      key: "score",
      header: "Score",
      width: 150,
      sortable: true,
      sortValue: (f) => f.score ?? -1,
      render: (f) => <ScoreChip score={f.score} grade={f.grade} />,
    },
    {
      key: "stage",
      header: "Stage",
      width: 150,
      sortable: true,
      sortValue: (f) => STAGES.indexOf(f.stage),
      render: (f) => <StageSelect stage={f.stage} onChange={(s) => onStageChange(f.id, s)} />,
    },
    {
      key: "contacts",
      header: "Contacts",
      width: 100,
      align: "center",
      sortable: true,
      sortValue: (f) => contactCount(f.id),
      render: (f) => <span className="text-ink-soft mono">{contactCount(f.id)}</span>,
    },
    {
      key: "last",
      header: "Last activity",
      width: 130,
      sortable: true,
      sortValue: (f) => (f.last_activity_at ? new Date(f.last_activity_at).getTime() : 0),
      render: (f) => <span className="text-ink-soft mono text-[11px] whitespace-nowrap">{formatDate(f.last_activity_at)}</span>,
    },
    {
      key: "next",
      header: "Next action",
      width: 170,
      sortable: true,
      sortValue: (f) => (f.next_action ?? "").toLowerCase(),
      render: (f) => <span className="text-ink-soft text-[12px] truncate block">{f.next_action ?? "—"}</span>,
    },
    {
      key: "actions",
      header: "",
      width: 52,
      minWidth: 44,
      render: (f) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (confirm(`Delete ${f.name}? This removes its contacts too.`)) onDelete(f.id);
          }}
          className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-md grid place-items-center text-muted hover:text-[color:var(--color-danger)] hover:bg-surface-3 cursor-pointer transition-all duration-150"
          aria-label={`Delete ${f.name}`}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      ),
    },
  ];

  return <DataTable columns={columns} rows={factories} onRowClick={onSelect} storageKey="factories" />;
}

function StageSelect({ stage, onChange }: { stage: Stage; onChange: (s: Stage) => void }) {
  return (
    <div className="relative inline-block" onClick={(e) => e.stopPropagation()}>
      <StagePill stage={stage} />
      <select
        value={stage}
        onChange={(e) => onChange(e.target.value as Stage)}
        className="absolute inset-0 opacity-0 cursor-pointer"
        aria-label="Change stage"
      >
        {STAGES.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
    </div>
  );
}

function formatDate(d: string | null): string {
  if (!d) return "—";
  const date = new Date(d);
  if (isNaN(date.getTime())) return "—";
  const now = new Date();
  const sameYear = date.getFullYear() === now.getFullYear();
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", ...(sameYear ? {} : { year: "2-digit" }) });
}
