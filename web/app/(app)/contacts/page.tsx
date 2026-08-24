"use client";

import { useMemo, useState } from "react";
import type { Contact, Stage } from "@/lib/types";
import { PIPELINE_STAGES, STAGES } from "@/lib/types";
import { useStore } from "@/lib/factories-store";
import { PageHeader } from "@/app/components/page-header";
import { PipelineChevrons } from "@/app/components/pipeline-chevrons";
import { StatCard } from "@/app/components/stat-card";
import { SearchInput } from "@/app/components/controls";
import { StagePill } from "@/app/components/stage-pill";
import { DataTable, type Column } from "@/app/components/data-table";
import { NewContactDrawer } from "@/app/components/new-contact-drawer";
import { Button } from "@/design-system/components/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/design-system/components/empty";
import { Toggle } from "@/design-system/components/toggle";

type ContactFocus = "all" | "targets" | "engaged" | "due";

export default function ContactsPage() {
  const { contacts, factory, network, verticalName, openContact } = useStore();
  const [search, setSearch] = useState("");
  const [stage, setStage] = useState<Stage | "All">("All");
  const [showNew, setShowNew] = useState(false);
  const [focus, setFocus] = useState<ContactFocus>("all");

  const stats = useMemo(() => {
    if (!contacts) return null;
    const byStage = new Map<Stage, number>();
    for (const s of STAGES) byStage.set(s, 0);
    for (const c of contacts) byStage.set(c.stage, (byStage.get(c.stage) ?? 0) + 1);
    const repliedIdx = PIPELINE_STAGES.indexOf("Replied");
    const today = new Date().toISOString().slice(0, 10);
    return {
      byStage,
      total: contacts.length,
      targets: contacts.filter((c) => c.is_primary_target).length,
      engaged: contacts.filter((c) => PIPELINE_STAGES.indexOf(c.stage) >= repliedIdx).length,
      due: contacts.filter((c) => c.next_follow_up && c.next_follow_up <= today).length,
    };
  }, [contacts]);

  const rows = useMemo(() => {
    if (!contacts) return null;
    const q = search.trim().toLowerCase();
    const today = new Date().toISOString().slice(0, 10);
    const repliedIdx = PIPELINE_STAGES.indexOf("Replied");
    return contacts.filter((c) => {
      if (stage !== "All" && c.stage !== stage) return false;
      if (focus === "targets" && !c.is_primary_target) return false;
      if (focus === "engaged" && PIPELINE_STAGES.indexOf(c.stage) < repliedIdx) return false;
      if (focus === "due" && !(c.next_follow_up && c.next_follow_up <= today)) return false;
      if (!q) return true;
      const parentName = c.factory_id ? factory(c.factory_id)?.name : network(c.network_id)?.name;
      return (
        c.full_name.toLowerCase().includes(q) ||
        (c.role_title ?? "").toLowerCase().includes(q) ||
        (parentName ?? "").toLowerCase().includes(q)
      );
    });
  }, [contacts, search, stage, focus, factory, network]);

  const columns: Column<Contact>[] = [
    {
      key: "name",
      header: "Contact",
      width: 200,
      minWidth: 130,
      sortable: true,
      sortValue: (c) => c.full_name.toLowerCase(),
      render: (c) => (
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground truncate">{c.full_name}</span>
          {c.is_primary_target && <span className="text-[9px] tabular-nums uppercase tracking-wider text-primary shrink-0">target</span>}
        </div>
      ),
    },
    {
      key: "role",
      header: "Role",
      width: 180,
      sortable: true,
      sortValue: (c) => (c.role_title ?? "").toLowerCase(),
      render: (c) => <span className="text-foreground/80 truncate block">{c.role_title ?? "—"}</span>,
    },
    {
      key: "parent",
      header: "Belongs to",
      width: 190,
      sortable: true,
      sortValue: (c) => ((c.factory_id ? factory(c.factory_id)?.name : network(c.network_id)?.name) ?? "").toLowerCase(),
      render: (c) => {
        const isNet = !c.factory_id;
        const nm = isNet ? network(c.network_id)?.name : factory(c.factory_id)?.name;
        return (
          <span className="flex items-center gap-1.5 min-w-0">
            <span className="text-[9px] tabular-nums uppercase tracking-wider text-muted-foreground shrink-0">{isNet ? "NET" : "FAC"}</span>
            <span className="text-foreground/80 truncate">{nm ?? "—"}</span>
          </span>
        );
      },
    },
    {
      key: "vertical",
      header: "Vertical",
      width: 150,
      sortable: true,
      sortValue: (c) => verticalName(factory(c.factory_id)?.vertical_id ?? null),
      render: (c) => <span className="text-foreground/80 truncate block">{verticalName(factory(c.factory_id)?.vertical_id ?? null)}</span>,
    },
    {
      key: "stage",
      header: "Stage",
      width: 130,
      sortable: true,
      sortValue: (c) => STAGES.indexOf(c.stage),
      render: (c) => <StagePill stage={c.stage} />,
    },
    {
      key: "last_activity",
      header: "Last activity",
      width: 140,
      sortable: true,
      sortValue: (c) => (c.last_activity_at ? new Date(c.last_activity_at).getTime() : 0),
      render: (c) => <span className="tabular-nums text-[11px] text-foreground/80">{formatDate(c.last_activity_at)}</span>,
    },
    {
      key: "next_follow_up",
      header: "Next touch",
      width: 130,
      sortable: true,
      sortValue: (c) => c.next_follow_up ?? "9999-12-31",
      render: (c) => <FollowUpDate value={c.next_follow_up} />,
    },
  ];

  return (
    <>
      <PageHeader eyebrow="Contacts · live" title="Contact tracker"
        subtitle="Owners, directors and operators across every factory"
        right={<><span>{stats ? `${stats.total}` : "—"}</span><span className="opacity-50">contacts</span></>}>
        <PipelineChevrons
          stages={PIPELINE_STAGES}
          counts={stats?.byStage ?? new Map()}
          activeStage={stage === "All" ? null : stage}
          onSelect={(s) => setStage(stage === s ? "All" : s)}
        />
        {stats && (
          <div className="mt-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
            <StatCard label="Total contacts" value={stats.total} />
            <StatCard label="Primary targets" value={stats.targets} tone="accent" />
            <StatCard label="Replied+" value={stats.engaged} />
            <StatCard label="Follow-ups due" value={stats.due} tone="warn" />
          </div>
        )}
      </PageHeader>

      <div className="px-4 py-5 sm:px-6 lg:px-8">
        {stats && <div className="mb-4 flex items-center gap-2 overflow-x-auto pb-1" aria-label="Saved contact views">
          <span className="mr-1 shrink-0 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Focus</span>
          <FocusButton label="All contacts" count={stats.total} active={focus === "all"} onClick={() => setFocus("all")} />
          <FocusButton label="Primary targets" count={stats.targets} active={focus === "targets"} onClick={() => setFocus("targets")} />
          <FocusButton label="Engaged" count={stats.engaged} active={focus === "engaged"} onClick={() => setFocus("engaged")} />
          <FocusButton label="Follow-ups due" count={stats.due} active={focus === "due"} tone="warn" onClick={() => setFocus("due")} />
        </div>}
        <div className="flex items-center gap-2 mb-4">
          <div className="flex-1 max-w-md"><SearchInput value={search} onChange={setSearch} placeholder="Search name, role or factory…" /></div>
          <div className="flex-1" />
          <Button onClick={() => setShowNew(true)} className="px-4 text-[13px] gap-1.5">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 5v14M5 12h14" strokeWidth="2.2" strokeLinecap="round" /></svg>
            New contact
          </Button>
        </div>

        {!rows ? (
          <div className="py-20 text-center text-muted-foreground text-sm tabular-nums uppercase tracking-wider">Loading…</div>
        ) : rows.length === 0 ? (
          <Empty className="border bg-card/50 py-16">
            <EmptyDescription className="text-sm">No contacts match. Add one with “New contact” — you can create its factory inline.</EmptyDescription>
          </Empty>
        ) : (
          <DataTable columns={columns} rows={rows} onRowClick={(c) => openContact(c.id)} storageKey="contacts" />
        )}
      </div>

      {showNew && <NewContactDrawer onClose={() => setShowNew(false)} />}
    </>
  );
}

function FocusButton({ label, count, active, tone = "default", onClick }: { label: string; count: number; active: boolean; tone?: "default" | "warn"; onClick: () => void }) {
  return (
    <Toggle
      variant="outline"
      size="sm"
      pressed={active}
      onPressedChange={onClick}
      className={`h-8 shrink-0 gap-2 rounded-full px-3 text-[11px] ${active ? tone === "warn" ? "border-[color:var(--color-warn)]/40 tint-warn text-[color:var(--color-warn)]" : "border-primary/40 bg-primary-tint text-primary" : "border-border bg-card text-foreground/80 hover:border-border-strong"}`}
    >
      {label}
      <span className="grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[9px] text-muted-foreground">{count}</span>
    </Toggle>
  );
}

function FollowUpDate({ value }: { value: string | null }) {
  if (!value) return <span className="text-[11px] text-muted-foreground">Not scheduled</span>;
  const today = new Date().toISOString().slice(0, 10);
  const due = value <= today;
  return <span className={`inline-flex rounded-full border px-2 py-1 text-[10.5px] ${due ? "border-[color:var(--color-warn)]/30 tint-warn text-[color:var(--color-warn)]" : "border-border bg-muted text-foreground/80"}`}>{due && value === today ? "Today · " : due ? "Due · " : ""}{formatDate(value)}</span>;
}

function formatDate(d: string | null): string {
  if (!d) return "—";
  const date = new Date(d);
  if (isNaN(date.getTime())) return "—";
  const now = new Date();
  const sameYear = date.getFullYear() === now.getFullYear();
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", ...(sameYear ? {} : { year: "2-digit" }) });
}
