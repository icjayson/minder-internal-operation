"use client";

import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { Stage } from "@/lib/types";
import { GEO_OPTIONS, PIPELINE_STAGES, STAGES } from "@/lib/types";
import { useStore } from "@/lib/factories-store";
import { PageHeader } from "@/app/components/page-header";
import { PipelineChevrons } from "@/app/components/pipeline-chevrons";
import { StatCard } from "@/app/components/stat-card";
import { FactoryTable } from "@/app/components/factory-table";
import { FactoryTree } from "@/app/components/factory-tree";
import { SearchInput, SelectControl } from "@/app/components/controls";

function FactoriesInner() {
  const {
    factories, verticals, verticalName, contactsOf,
    setFactoryStage, deleteFactory, openFactory, openNewFactory,
  } = useStore();
  const params = useSearchParams();
  const [search, setSearch] = useState("");
  const [vertical, setVertical] = useState(params.get("vertical") ?? "All");
  const [grade, setGrade] = useState("All");
  const [geoTier, setGeoTier] = useState("All");
  const [stage, setStage] = useState<Stage | "All">("All");
  const [view, setView] = useState<"table" | "tree">("table");

  const stats = useMemo(() => {
    if (!factories) return null;
    const byStage = new Map<Stage, number>();
    for (const s of STAGES) byStage.set(s, 0);
    for (const f of factories) byStage.set(f.stage, (byStage.get(f.stage) ?? 0) + 1);
    const scored = factories.filter((f) => f.score != null);
    const today = new Date().toISOString().slice(0, 10);
    return {
      byStage,
      total: factories.length,
      aGrade: factories.filter((f) => f.grade === "A").length,
      avg: scored.length ? Math.round(scored.reduce((s, f) => s + (f.score ?? 0), 0) / scored.length) : 0,
      due: factories.filter((f) => f.next_action_due && f.next_action_due <= today).length,
    };
  }, [factories]);

  const rows = useMemo(() => {
    if (!factories) return null;
    const q = search.trim().toLowerCase();
    return factories
      .filter((f) => {
        if (vertical !== "All" && f.vertical_id !== vertical) return false;
        if (grade !== "All" && f.grade !== grade) return false;
        if (geoTier !== "All" && f.geo_tier !== geoTier) return false;
        if (stage !== "All" && f.stage !== stage) return false;
        if (!q) return true;
        return f.name.toLowerCase().includes(q) || (f.hq_location ?? "").toLowerCase().includes(q);
      })
      .sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
  }, [factories, search, vertical, grade, geoTier, stage]);

  return (
    <>
      <PageHeader
        eyebrow="Factories · live"
        title="Factory tracker"
        subtitle="Every account, scored & routed by the 100-pt IDP rubric"
        right={<><span>{stats ? `${stats.total}` : "—"}</span><span className="opacity-50">factories</span></>}
      >
        <PipelineChevrons
          stages={PIPELINE_STAGES}
          counts={stats?.byStage ?? new Map()}
          activeStage={stage === "All" ? null : stage}
          onSelect={(s) => setStage(stage === s ? "All" : s)}
        />
        {stats && (
          <div className="grid grid-cols-4 gap-3 mt-5">
            <StatCard label="Total factories" value={stats.total} />
            <StatCard label="A-grade" value={stats.aGrade} tone="accent" />
            <StatCard label="Avg score" value={stats.avg || "—"} />
            <StatCard label="Actions due" value={stats.due} tone="warn" />
          </div>
        )}
      </PageHeader>

      <div className="px-8 py-5">
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {/* Table / Tree view toggle */}
          <div className="inline-flex items-center rounded-full border border-line-strong bg-surface-2 p-0.5 shrink-0">
            <ViewBtn active={view === "table"} onClick={() => setView("table")} label="Table">
              <path d="M3 5h18M3 12h18M3 19h18" strokeWidth="1.7" strokeLinecap="round" />
            </ViewBtn>
            <ViewBtn active={view === "tree"} onClick={() => setView("tree")} label="Tree">
              <path d="M5 4h6v4H5V4Zm8 5h6v4h-6V9Zm0 6h6v4h-6v-4ZM8 8v9m0-4h5" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </ViewBtn>
          </div>

          <div className="flex-1 min-w-[200px] max-w-sm">
            <SearchInput value={search} onChange={setSearch} placeholder="Search factory or location…" />
          </div>
          <SelectControl value={vertical} onChange={setVertical}
            options={[{ value: "All", label: "All verticals" }, ...verticals.map((v) => ({ value: v.id, label: v.name }))]} />
          <SelectControl value={grade} onChange={setGrade}
            options={[{ value: "All", label: "All grades" }, { value: "A", label: "A-grade" }, { value: "B", label: "B-grade" }, { value: "C", label: "C-grade" }]} />
          <SelectControl value={geoTier} onChange={setGeoTier}
            options={[{ value: "All", label: "All geos" }, ...GEO_OPTIONS.map((g) => ({ value: g.key, label: g.label }))]} />
          <div className="flex-1" />
          <Link href="/import"
            className="h-9 px-4 rounded-full border border-line-strong bg-surface hover:bg-surface-3 text-[13px] font-medium text-ink-soft hover:text-ink cursor-pointer inline-flex items-center gap-1.5">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 15V3m0 0 4 4m-4-4L8 7M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            Import CSV
          </Link>
          <button onClick={openNewFactory}
            className="h-9 px-4 rounded-full bg-accent hover:bg-[#3a51ff] text-white text-[13px] font-medium cursor-pointer inline-flex items-center gap-1.5">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 5v14M5 12h14" strokeWidth="2.2" strokeLinecap="round" /></svg>
            New factory
          </button>
        </div>

        {!rows ? (
          <div className="py-20 text-center text-muted text-sm mono uppercase tracking-wider">Loading factories…</div>
        ) : rows.length === 0 ? (
          <div className="rounded-lg border border-dashed border-line bg-surface/50 px-8 py-16 text-center">
            <div className="text-lg font-display mb-2">No factories match</div>
            <p className="text-sm text-ink-soft max-w-md mx-auto">Add a factory, import a CSV, or clear the filters.</p>
          </div>
        ) : view === "tree" ? (
          <FactoryTree
            verticals={verticals}
            factories={rows}
            contactsOf={contactsOf}
            onOpenFactory={openFactory}
          />
        ) : (
          <FactoryTable
            factories={rows}
            verticalName={verticalName}
            contactCount={(id) => contactsOf(id).length}
            onSelect={(f) => openFactory(f.id)}
            onStageChange={(id, s) => setFactoryStage(id, s)}
            onDelete={deleteFactory}
          />
        )}
      </div>
    </>
  );
}

function ViewBtn({ active, onClick, label, children }: {
  active: boolean; onClick: () => void; label: string; children: React.ReactNode;
}) {
  return (
    <button onClick={onClick} title={`${label} view`}
      className={`h-8 px-3 rounded-full text-[12px] font-medium cursor-pointer inline-flex items-center gap-1.5 transition-colors ${
        active ? "bg-accent text-white" : "text-ink-soft hover:text-ink"
      }`}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">{children}</svg>
      {label}
    </button>
  );
}

export default function FactoriesPage() {
  return (
    <Suspense fallback={null}>
      <FactoriesInner />
    </Suspense>
  );
}
