"use client";

import type { Network, Stage } from "@/lib/types";
import { NETWORK_TYPES, STAGES } from "@/lib/types";
import { StagePill } from "./stage-pill";
import { ScoreChip } from "./score-bars";
import { DataTable, type Column } from "./data-table";
import { Button } from "@/design-system/components/button";

type Props = {
  networks: Network[];
  factoryCount: (networkId: string) => number;
  contactCount: (networkId: string) => number;
  onSelect: (n: Network) => void;
  onStageChange: (id: string, s: Stage) => void;
  onDelete: (id: string) => void;
};

const STALE_MS = 3 * 86400000;

function typeLabel(key: string | null): string {
  return NETWORK_TYPES.find((t) => t.key === key)?.label ?? "—";
}

export function NetworkTable({
  networks,
  factoryCount,
  contactCount,
  onSelect,
  onStageChange,
  onDelete,
}: Props) {
  const columns: Column<Network>[] = [
    {
      key: "name",
      header: "Network",
      width: 240,
      minWidth: 150,
      sortable: true,
      sortValue: (n) => n.name.toLowerCase(),
      render: (n) => {
        const stale = n.last_activity_at
          ? Date.now() - new Date(n.last_activity_at).getTime() > STALE_MS
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
              <div className="font-medium truncate text-foreground">{n.name}</div>
              {n.country && <div className="text-[11px] text-muted-foreground truncate">{n.country}</div>}
            </div>
          </div>
        );
      },
    },
    {
      key: "type",
      header: "Type",
      width: 140,
      sortable: true,
      sortValue: (n) => typeLabel(n.type),
      render: (n) => <span className="text-foreground/80 truncate block">{typeLabel(n.type)}</span>,
    },
    {
      key: "score",
      header: "Score",
      width: 150,
      sortable: true,
      sortValue: (n) => n.score ?? -1,
      render: (n) => <ScoreChip score={n.score} grade={n.grade} />,
    },
    {
      key: "stage",
      header: "Stage",
      width: 150,
      sortable: true,
      sortValue: (n) => STAGES.indexOf(n.stage),
      render: (n) => <StageSelect stage={n.stage} onChange={(s) => onStageChange(n.id, s)} />,
    },
    {
      key: "factories",
      header: "Factories",
      width: 100,
      align: "center",
      sortable: true,
      sortValue: (n) => factoryCount(n.id),
      render: (n) => <span className="text-foreground/80 tabular-nums">{factoryCount(n.id)}</span>,
    },
    {
      key: "contacts",
      header: "Contacts",
      width: 100,
      align: "center",
      sortable: true,
      sortValue: (n) => contactCount(n.id),
      render: (n) => <span className="text-foreground/80 tabular-nums">{contactCount(n.id)}</span>,
    },
    {
      key: "last",
      header: "Last activity",
      width: 130,
      sortable: true,
      sortValue: (n) => (n.last_activity_at ? new Date(n.last_activity_at).getTime() : 0),
      render: (n) => <span className="text-foreground/80 tabular-nums text-[11px] whitespace-nowrap">{formatDate(n.last_activity_at)}</span>,
    },
    {
      key: "next",
      header: "Next action",
      width: 170,
      sortable: true,
      sortValue: (n) => (n.next_action ?? "").toLowerCase(),
      render: (n) => <span className="text-foreground/80 text-[12px] truncate block">{n.next_action ?? "—"}</span>,
    },
    {
      key: "actions",
      header: "",
      width: 52,
      minWidth: 44,
      render: (n) => (
        <Button variant="ghost" size="icon-sm" onClick={(e) => { e.stopPropagation(); if (confirm(`Delete ${n.name}? Its direct contacts are removed; sourced factories are kept (unlinked).`)) onDelete(n.id); }} className="opacity-0 group-hover:opacity-100 w-7 h-7 hover:text-[color:var(--color-danger)] transition-all duration-150" aria-label={`Delete ${n.name}`}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Button>
      ),
    },
  ];

  return <DataTable columns={columns} rows={networks} onRowClick={onSelect} storageKey="networks" />;
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
