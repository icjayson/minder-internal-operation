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

export default function ContactsPage() {
  const { contacts, factory, network, verticalName, openContact } = useStore();
  const [search, setSearch] = useState("");
  const [stage, setStage] = useState<Stage | "All">("All");
  const [showNew, setShowNew] = useState(false);

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
    return contacts.filter((c) => {
      if (stage !== "All" && c.stage !== stage) return false;
      if (!q) return true;
      const parentName = c.factory_id ? factory(c.factory_id)?.name : network(c.network_id)?.name;
      return (
        c.full_name.toLowerCase().includes(q) ||
        (c.role_title ?? "").toLowerCase().includes(q) ||
        (parentName ?? "").toLowerCase().includes(q)
      );
    });
  }, [contacts, search, stage, factory, network]);

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
          <span className="font-medium text-ink truncate">{c.full_name}</span>
          {c.is_primary_target && <span className="text-[9px] mono uppercase tracking-wider text-accent shrink-0">target</span>}
        </div>
      ),
    },
    {
      key: "role",
      header: "Role",
      width: 180,
      sortable: true,
      sortValue: (c) => (c.role_title ?? "").toLowerCase(),
      render: (c) => <span className="text-ink-soft truncate block">{c.role_title ?? "—"}</span>,
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
            <span className="text-[9px] mono uppercase tracking-wider text-muted shrink-0">{isNet ? "NET" : "FAC"}</span>
            <span className="text-ink-soft truncate">{nm ?? "—"}</span>
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
      render: (c) => <span className="text-ink-soft truncate block">{verticalName(factory(c.factory_id)?.vertical_id ?? null)}</span>,
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
      key: "followup",
      header: "Next follow-up",
      width: 140,
      sortable: true,
      sortValue: (c) => c.next_follow_up ?? "",
      render: (c) => <span className="mono text-[11px] text-ink-soft">{c.next_follow_up ?? "—"}</span>,
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
          <div className="grid grid-cols-4 gap-3 mt-5">
            <StatCard label="Total contacts" value={stats.total} />
            <StatCard label="Primary targets" value={stats.targets} tone="accent" />
            <StatCard label="Replied+" value={stats.engaged} />
            <StatCard label="Follow-ups due" value={stats.due} tone="warn" />
          </div>
        )}
      </PageHeader>

      <div className="px-8 py-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex-1 max-w-md"><SearchInput value={search} onChange={setSearch} placeholder="Search name, role or factory…" /></div>
          <div className="flex-1" />
          <button onClick={() => setShowNew(true)}
            className="h-9 px-4 rounded-full bg-accent hover:bg-[#3a51ff] text-white text-[13px] font-medium cursor-pointer inline-flex items-center gap-1.5">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 5v14M5 12h14" strokeWidth="2.2" strokeLinecap="round" /></svg>
            New contact
          </button>
        </div>

        {!rows ? (
          <div className="py-20 text-center text-muted text-sm mono uppercase tracking-wider">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="rounded-lg border border-dashed border-line bg-surface/50 px-8 py-16 text-center text-sm text-ink-soft">
            No contacts match. Add one with “New contact” — you can create its factory inline.
          </div>
        ) : (
          <DataTable columns={columns} rows={rows} onRowClick={(c) => openContact(c.id)} storageKey="contacts" />
        )}
      </div>

      {showNew && <NewContactDrawer onClose={() => setShowNew(false)} />}
    </>
  );
}
