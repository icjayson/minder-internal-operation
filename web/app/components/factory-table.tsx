"use client";

import type { Contact, Factory, Stage } from "@/lib/types";
import { LADDER, STAGES } from "@/lib/types";
import { customerContactNames, customerLocation } from "@/lib/customer-table";
import type { FdeProgressSummary } from "@/lib/fde-progress";
import { StagePill } from "./stage-pill";
import { ScoreChip } from "./score-bars";
import { DataTable, type Column } from "./data-table";

type Props = {
  factories: Factory[];
  verticalName: (id: string | null) => string;
  contactCount?: (factoryId: string) => number;
  contactsOf?: (factoryId: string) => Contact[];
  customerMode?: boolean;
  deploymentProgress?: ReadonlyMap<string, FdeProgressSummary>;
  onSelect: (f: Factory) => void;
  onStageChange: (id: string, s: Stage) => void;
  onDelete: (id: string) => void;
};

const STALE_MS = 7 * 86400000;

export function FactoryTable({
  factories,
  verticalName,
  contactCount,
  contactsOf,
  customerMode = false,
  deploymentProgress = new Map(),
  onSelect,
  onStageChange,
  onDelete,
}: Props) {
  const contactsFor = (factoryId: string): Contact[] => contactsOf?.(factoryId) ?? [];
  const contactCountFor = (factoryId: string): number => contactCount?.(factoryId) ?? contactsFor(factoryId).length;
  const accountColumn: Column<Factory> = {
      key: "name",
      header: "Account",
      width: 300,
      minWidth: 220,
      sortable: true,
      sortValue: (f) => f.name.toLowerCase(),
      render: (f) => {
        const website = f.website_url ?? f.company_url;
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
              {website ? (
                <a
                  href={website}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="font-medium truncate text-primary hover:underline block"
                  title={website}
                >
                  {f.name}
                </a>
              ) : (
                <div className="font-medium truncate text-ink">{f.name}</div>
              )}
              <div className="mt-0.5 flex items-center gap-1.5 truncate text-[10.5px] text-muted-foreground">
                <span className="truncate">{verticalName(f.vertical_id)}</span>
                {!customerMode && (f.geo_tier || f.hq_location) && <span aria-hidden>·</span>}
                {!customerMode && <span className="truncate">{f.geo_tier ?? f.hq_location}</span>}
              </div>
            </div>
          </div>
        );
      },
    };
  const scoreColumn: Column<Factory> = {
      key: "score",
      header: "Score",
      width: 110,
      sortable: true,
      sortValue: (f) => f.score ?? -1,
      render: (f) => <ScoreChip score={f.score} grade={f.grade} />,
    };
  const stageColumn: Column<Factory> = {
      key: "stage",
      header: "Pipeline",
      width: 160,
      sortable: true,
      sortValue: (f) => STAGES.indexOf(f.stage),
      render: (f) => <StageSelect stage={f.stage} onChange={(s) => onStageChange(f.id, s)} />,
    };
  const relationshipColumn: Column<Factory> = {
      key: "relationship",
      header: "Relationship",
      width: 210,
      sortable: true,
      sortValue: (f) => f.ladder_level ?? 0,
      render: (f) => <RelationshipMini level={f.ladder_level ?? 0} />,
    };
  const dueColumn: Column<Factory> = {
      key: "due",
      header: "Next action",
      width: 140,
      sortable: true,
      sortValue: (f) => f.next_action_due ?? "9999-12-31",
      render: (f) => <DueDate value={f.next_action_due} />,
    };
  const lastActivityColumn: Column<Factory> = {
      key: "last",
      header: "Last activity",
      width: 120,
      sortable: true,
      sortValue: (f) => (f.last_activity_at ? new Date(f.last_activity_at).getTime() : 0),
      render: (f) => <span className="text-ink-soft mono text-[11px] whitespace-nowrap">{formatDate(f.last_activity_at)}</span>,
    };
  const actionsColumn: Column<Factory> = {
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
          className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-md grid place-items-center text-muted-foreground hover:text-[color:var(--color-danger)] hover:bg-surface-3 cursor-pointer transition-all duration-150"
          aria-label={`Delete ${f.name}`}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      ),
    };

  const columns: Column<Factory>[] = customerMode ? [
    accountColumn,
    {
      key: "location",
      header: "Location",
      width: 170,
      sortable: true,
      sortValue: (f) => customerLocation(f).toLowerCase(),
      render: (f) => <span className="block truncate text-[11.5px] text-ink-soft" title={customerLocation(f)}>{customerLocation(f)}</span>,
    },
    stageColumn,
    {
      key: "contacts",
      header: "Contacts",
      width: 220,
      sortable: true,
      sortValue: (f) => customerContactNames(contactsFor(f.id)).toLowerCase(),
      render: (f) => {
        const names = customerContactNames(contactsFor(f.id));
        return <span className="line-clamp-2 text-[11.5px] text-ink-soft" title={names}>{names}</span>;
      },
    },
    lastActivityColumn,
    {
      key: "fde-progress",
      header: "FDE progress",
      width: 300,
      sortable: true,
      sortValue: (f) => deploymentProgress.get(f.id)?.percent,
      render: (f) => <FdeProgressCell progress={deploymentProgress.get(f.id)} />,
    },
    dueColumn,
    actionsColumn,
  ] : [
    accountColumn,
    scoreColumn,
    stageColumn,
    relationshipColumn,
    dueColumn,
    {
      key: "contacts",
      header: "Contacts",
      width: 90,
      align: "center",
      sortable: true,
      sortValue: (f) => contactCountFor(f.id),
      render: (f) => <span className="text-ink-soft mono">{contactCountFor(f.id)}</span>,
    },
    lastActivityColumn,
    actionsColumn,
  ];

  return <DataTable columns={columns} rows={factories} onRowClick={onSelect} storageKey={customerMode ? "customers" : "factories"} />;
}

function FdeProgressCell({ progress }: { progress?: FdeProgressSummary }) {
  if (!progress) return <span className="text-[11px] text-muted-foreground">Not started</span>;
  return (
    <div title={progress.deploymentName}>
      <div className="flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
          <div className="h-full rounded-full bg-primary" style={{ width: `${progress.percent}%` }} />
        </div>
        <span className="shrink-0 text-[10.5px] mono text-ink-soft">{progress.done}/{progress.total}</span>
      </div>
      <div className="mt-1 flex items-center gap-2 truncate text-[9.5px] text-muted-foreground">
        <a
          href={`${process.env.NEXT_PUBLIC_FDE_KIT_URL ?? "https://fde-kit-web.vercel.app"}/deployments/${progress.deploymentId}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(event) => event.stopPropagation()}
          className="rounded-full border border-line-strong px-1.5 py-0.5 mono uppercase hover:border-primary hover:text-primary transition-colors"
        >
          Details
        </a>
        {progress.phases.filter((phase) => phase.total > 0).map((phase) => (
          <span key={phase.phase}>{phase.phase}: {phase.done}/{phase.total}</span>
        ))}
      </div>
    </div>
  );
}

function RelationshipMini({ level }: { level: number }) {
  const safeLevel = Math.min(Math.max(level, 0), LADDER.length - 1);
  return (
    <div title={`L${safeLevel} · ${LADDER[safeLevel]}`}>
      <div className="flex items-center gap-1" aria-hidden>
        {LADDER.map((_, index) => (
          <span key={index} className={`h-1.5 flex-1 rounded-full ${index <= safeLevel ? "bg-[#0fa79b]" : "bg-surface-3"}`} />
        ))}
      </div>
      <div className="mt-1 truncate text-[10px] text-ink-soft">L{safeLevel} · {LADDER[safeLevel]}</div>
    </div>
  );
}

function DueDate({ value }: { value: string | null }) {
  if (!value) return <span className="text-[11px] text-muted-foreground">Not scheduled</span>;
  const today = new Date().toISOString().slice(0, 10);
  const overdue = value < today;
  const dueToday = value === today;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[10.5px] ${
      overdue
        ? "border-[color:var(--color-danger)]/30 tint-danger text-[color:var(--color-danger)]"
        : dueToday
          ? "border-[color:var(--color-warn)]/30 tint-warn text-[color:var(--color-warn)]"
          : "border-line bg-surface-2 text-ink-soft"
    }`}>
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="5" width="18" height="16" rx="2" strokeWidth="1.7" /><path d="M8 3v4m8-4v4M3 10h18" strokeWidth="1.7" strokeLinecap="round" /></svg>
      {overdue ? "Overdue · " : dueToday ? "Today · " : ""}{formatDate(value)}
    </span>
  );
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
