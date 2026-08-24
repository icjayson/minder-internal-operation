"use client";

import type { FundraisingLead, FundraisingStage, FundraisingTrack } from "@/lib/types";
import { fundraisingStages, fundraisingTypeLabel } from "@/lib/types";
import { FundStagePill, ResultPill } from "./fund-stage-pill";
import { DataTable, type Column } from "./data-table";

type Props = {
  track: FundraisingTrack;
  leads: FundraisingLead[];
  onSelect: (l: FundraisingLead) => void;
  onStageChange: (id: string, s: FundraisingStage) => void;
  onDelete: (id: string) => void;
};

const STALE_MS = 3 * 86400000;

export function FundraisingTable({ track, leads, onSelect, onStageChange, onDelete }: Props) {
  const columns: Column<FundraisingLead>[] = [
    {
      key: "name",
      header: track === "investor" ? "Investor" : "Programme",
      width: 240,
      minWidth: 150,
      sortable: true,
      sortValue: (l) => l.name.toLowerCase(),
      render: (l) => {
        const stale = l.last_activity_at
          ? Date.now() - new Date(l.last_activity_at).getTime() > STALE_MS
          : false;
        return (
          <div className="flex items-center gap-3 min-w-0">
            {stale && (
              <span
                title="No update in 3+ days"
                className="w-1.5 h-1.5 rounded-full shrink-0 bg-[color:var(--color-warn)]"
              />
            )}
            <div className="min-w-0">
              <div className="font-medium truncate text-foreground">{l.name}</div>
              {l.contact_person && <div className="text-[11px] text-muted-foreground truncate">{l.contact_person}</div>}
            </div>
          </div>
        );
      },
    },
    {
      key: "type",
      header: "Type",
      width: 160,
      sortable: true,
      sortValue: (l) => fundraisingTypeLabel(track, l.type),
      render: (l) => <span className="text-foreground/80 truncate block">{fundraisingTypeLabel(track, l.type)}</span>,
    },
    {
      key: "amount",
      header: track === "investor" ? "Target" : "Offered",
      width: 120,
      align: "right",
      sortable: true,
      sortValue: (l) => l.amount_target_or_offered ?? -1,
      render: (l) => <span className="text-foreground/80 tabular-nums whitespace-nowrap">{formatAmount(l.amount_target_or_offered)}</span>,
    },
    {
      key: "stage",
      header: "Stage",
      width: 170,
      sortable: true,
      sortValue: (l) => fundraisingStages(track).indexOf(l.stage),
      render: (l) => (
        <div className="flex items-center gap-1.5">
          <StageSelect stage={l.stage} stages={fundraisingStages(track)} onChange={(s) => onStageChange(l.id, s)} />
          {l.result && <ResultPill result={l.result} />}
        </div>
      ),
    },
    {
      key: "last",
      header: "Last activity",
      width: 130,
      sortable: true,
      sortValue: (l) => (l.last_activity_at ? new Date(l.last_activity_at).getTime() : 0),
      render: (l) => <span className="text-foreground/80 tabular-nums text-[11px] whitespace-nowrap">{formatDate(l.last_activity_at)}</span>,
    },
    {
      key: "next",
      header: "Next touch",
      width: 130,
      sortable: true,
      sortValue: (l) => (l.next_touch ? new Date(l.next_touch).getTime() : 0),
      render: (l) => <span className="text-foreground/80 tabular-nums text-[11px] whitespace-nowrap">{formatDate(l.next_touch)}</span>,
    },
    {
      key: "actions",
      header: "",
      width: 52,
      minWidth: 44,
      render: (l) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (confirm(`Delete ${l.name}? This can’t be undone.`)) onDelete(l.id);
          }}
          className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-md grid place-items-center text-muted-foreground hover:text-[color:var(--color-danger)] hover:bg-accent cursor-pointer transition-all duration-150"
          aria-label={`Delete ${l.name}`}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      ),
    },
  ];

  return <DataTable columns={columns} rows={leads} onRowClick={onSelect} storageKey={`fundraising-${track}`} />;
}

function StageSelect({ stage, stages, onChange }: { stage: FundraisingStage; stages: FundraisingStage[]; onChange: (s: FundraisingStage) => void }) {
  return (
    <div className="relative inline-block" onClick={(e) => e.stopPropagation()}>
      <FundStagePill stage={stage} />
      <select
        value={stage}
        onChange={(e) => onChange(e.target.value as FundraisingStage)}
        className="absolute inset-0 opacity-0 cursor-pointer"
        aria-label="Change stage"
      >
        {stages.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
    </div>
  );
}

export function formatAmount(v: number | null): string {
  if (v == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(v);
}

function formatDate(d: string | null): string {
  if (!d) return "—";
  const date = new Date(d);
  if (isNaN(date.getTime())) return "—";
  const now = new Date();
  const sameYear = date.getFullYear() === now.getFullYear();
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", ...(sameYear ? {} : { year: "2-digit" }) });
}
