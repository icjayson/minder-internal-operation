"use client";

import { useMemo, useState } from "react";
import type { Stage } from "@/lib/types";
import { NETWORK_TYPES, PIPELINE_STAGES, STAGES } from "@/lib/types";
import { useStore } from "@/lib/factories-store";
import { PageHeader } from "@/app/components/page-header";
import { PipelineChevrons } from "@/app/components/pipeline-chevrons";
import { StatCard } from "@/app/components/stat-card";
import { NetworkTable } from "@/app/components/network-table";
import { SearchInput, SelectControl } from "@/app/components/controls";

export default function NetworksPage() {
  const {
    networks, contactsOfNetwork, factoriesOfNetwork,
    updateNetwork, deleteNetwork, openNetwork, openNewNetwork,
  } = useStore();
  const [search, setSearch] = useState("");
  const [type, setType] = useState("All");
  const [grade, setGrade] = useState("All");
  const [stage, setStage] = useState<Stage | "All">("All");

  const stats = useMemo(() => {
    if (!networks) return null;
    const byStage = new Map<Stage, number>();
    for (const s of STAGES) byStage.set(s, 0);
    for (const n of networks) byStage.set(n.stage, (byStage.get(n.stage) ?? 0) + 1);
    const scored = networks.filter((n) => n.score != null);
    const today = new Date().toISOString().slice(0, 10);
    return {
      byStage,
      total: networks.length,
      aGrade: networks.filter((n) => n.grade === "A").length,
      avg: scored.length ? Math.round(scored.reduce((s, n) => s + (n.score ?? 0), 0) / scored.length) : 0,
      due: networks.filter((n) => n.next_action_due && n.next_action_due <= today).length,
    };
  }, [networks]);

  const rows = useMemo(() => {
    if (!networks) return null;
    const q = search.trim().toLowerCase();
    return networks
      .filter((n) => {
        if (type !== "All" && n.type !== type) return false;
        if (grade !== "All" && n.grade !== grade) return false;
        if (stage !== "All" && n.stage !== stage) return false;
        if (!q) return true;
        return n.name.toLowerCase().includes(q) || (n.country ?? "").toLowerCase().includes(q);
      })
      .sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
  }, [networks, search, type, grade, stage]);

  return (
    <>
      <PageHeader
        eyebrow="Networks · live"
        title="Network tracker"
        subtitle="Associations, accelerators & institutes that introduce factories"
        right={<><span>{stats ? `${stats.total}` : "—"}</span><span className="opacity-50">networks</span></>}
      >
        <PipelineChevrons
          stages={PIPELINE_STAGES}
          counts={stats?.byStage ?? new Map()}
          activeStage={stage === "All" ? null : stage}
          onSelect={(s) => setStage(stage === s ? "All" : s)}
        />
        {stats && (
          <div className="grid grid-cols-4 gap-3 mt-5">
            <StatCard label="Total networks" value={stats.total} />
            <StatCard label="A-grade" value={stats.aGrade} tone="accent" />
            <StatCard label="Avg score" value={stats.avg || "—"} />
            <StatCard label="Actions due" value={stats.due} tone="warn" />
          </div>
        )}
      </PageHeader>

      <div className="px-8 py-5">
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <div className="flex-1 min-w-[200px] max-w-sm">
            <SearchInput value={search} onChange={setSearch} placeholder="Search network or country…" />
          </div>
          <SelectControl value={type} onChange={setType}
            options={[{ value: "All", label: "All types" }, ...NETWORK_TYPES.map((t) => ({ value: t.key, label: t.label }))]} />
          <SelectControl value={grade} onChange={setGrade}
            options={[{ value: "All", label: "All grades" }, { value: "A", label: "A-grade" }, { value: "B", label: "B-grade" }, { value: "C", label: "C-grade" }]} />
          <div className="flex-1" />
          <button onClick={openNewNetwork}
            className="h-9 px-4 rounded-full bg-accent hover:bg-[#3a51ff] text-white text-[13px] font-medium cursor-pointer inline-flex items-center gap-1.5">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 5v14M5 12h14" strokeWidth="2.2" strokeLinecap="round" /></svg>
            New network
          </button>
        </div>

        {!rows ? (
          <div className="py-20 text-center text-muted text-sm mono uppercase tracking-wider">Loading networks…</div>
        ) : rows.length === 0 ? (
          <div className="rounded-lg border border-dashed border-line bg-surface/50 px-8 py-16 text-center">
            <div className="text-lg font-display mb-2">No networks yet</div>
            <p className="text-sm text-ink-soft max-w-md mx-auto">Add the associations, accelerators and institutes that introduce factories to you.</p>
          </div>
        ) : (
          <NetworkTable
            networks={rows}
            factoryCount={(id) => factoriesOfNetwork(id).length}
            contactCount={(id) => contactsOfNetwork(id).length}
            onSelect={(n) => openNetwork(n.id)}
            onStageChange={(id, s) => updateNetwork(id, { stage: s, last_activity_at: new Date().toISOString() })}
            onDelete={deleteNetwork}
          />
        )}
      </div>
    </>
  );
}
