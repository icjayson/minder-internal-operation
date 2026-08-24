"use client";

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
import { useFdeDeploymentProgressByFactory } from "@/app/components/fde-deployment-progress";
import { SearchInput, SelectControl } from "@/app/components/controls";
import { Button } from "@/design-system/components/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/design-system/components/empty";

type SavedView = "all" | "needs_action" | "high_potential" | "stalled";

function CustomersInner() {
  const {
    factories: allFactories, verticals, verticalName, contactsOf,
    setFactoryStage, deleteFactory, openCustomer, openNewCustomer,
  } = useStore();
  // The Customer tracker is the set of factories promoted to customers.
  const factories = useMemo(
    () => allFactories?.filter((f) => f.is_customer) ?? null,
    [allFactories],
  );
  const params = useSearchParams();
  const [search, setSearch] = useState("");
  const [vertical, setVertical] = useState(params.get("vertical") ?? "All");
  const [grade, setGrade] = useState("All");
  const [geoTier, setGeoTier] = useState("All");
  const [stage, setStage] = useState<Stage | "All">("All");
  const [view, setView] = useState<"table" | "tree">("table");
  const focusParam = params.get("focus");
  const [savedView, setSavedView] = useState<SavedView>(
    focusParam === "needs_action" || focusParam === "high_potential" || focusParam === "stalled" ? focusParam : "all",
  );

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
    const staleBefore = Date.now() - 7 * 86400000;
    return factories
      .filter((f) => {
        if (vertical !== "All" && f.vertical_id !== vertical) return false;
        if (grade !== "All" && f.grade !== grade) return false;
        if (geoTier !== "All" && f.geo_tier !== geoTier) return false;
        if (stage !== "All" && f.stage !== stage) return false;
        // "Next-action needed": any customer with a next action scheduled
        // (upcoming or overdue), not only those already due.
        if (savedView === "needs_action" && f.next_action_due == null) return false;
        if (savedView === "high_potential" && !(f.grade === "A" || (f.score ?? 0) >= 75)) return false;
        if (savedView === "stalled") {
          const active = f.stage !== "Closed Won" && f.stage !== "Closed Lost";
          const stale = !f.last_activity_at || new Date(f.last_activity_at).getTime() < staleBefore;
          if (!active || !stale) return false;
        }
        if (!q) return true;
        return f.name.toLowerCase().includes(q) || (f.hq_location ?? "").toLowerCase().includes(q);
      })
      .sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
  }, [factories, search, vertical, grade, geoTier, stage, savedView]);

  const savedViewCounts = useMemo(() => {
    const all = factories ?? [];
    const staleBefore = Date.now() - 7 * 86400000;
    return {
      all: all.length,
      needs_action: all.filter((f) => f.next_action_due != null).length,
      high_potential: all.filter((f) => f.grade === "A" || (f.score ?? 0) >= 75).length,
      stalled: all.filter((f) => f.stage !== "Closed Won" && f.stage !== "Closed Lost" && (!f.last_activity_at || new Date(f.last_activity_at).getTime() < staleBefore)).length,
    };
  }, [factories]);
  const deploymentProgress = useFdeDeploymentProgressByFactory(
    rows?.map((factory) => factory.id) ?? [],
  );

  return (
    <>
      <PageHeader
        eyebrow="Customers · live"
        title="Customer tracker"
        subtitle="Design partners promoted to customers — same 100-pt rubric, own pipeline"
        right={<><span>{stats ? `${stats.total}` : "—"}</span><span className="opacity-50">customers</span></>}
      >
        <PipelineChevrons
          stages={PIPELINE_STAGES}
          counts={stats?.byStage ?? new Map()}
          activeStage={stage === "All" ? null : stage}
          onSelect={(s) => setStage(stage === s ? "All" : s)}
        />
        {stats && (
          <div className="mt-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
            <StatCard label="Total customers" value={stats.total} />
            <StatCard label="A-grade" value={stats.aGrade} tone="accent" />
            <StatCard label="Avg score" value={stats.avg || "—"} />
            <StatCard label="Actions due" value={stats.due} tone="warn" />
          </div>
        )}
      </PageHeader>

      <div className="px-4 py-5 sm:px-6 lg:px-8">
        <div className="mb-4 flex items-center gap-2 overflow-x-auto pb-1" aria-label="Saved customer views">
          <span className="mr-1 shrink-0 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Focus</span>
          <SavedViewButton label="All customers" count={savedViewCounts.all} active={savedView === "all"} onClick={() => setSavedView("all")} />
          <SavedViewButton label="Next-action needed" count={savedViewCounts.needs_action} active={savedView === "needs_action"} tone="warn" onClick={() => setSavedView("needs_action")} />
          <SavedViewButton label="High potential" count={savedViewCounts.high_potential} active={savedView === "high_potential"} onClick={() => setSavedView("high_potential")} />
          <SavedViewButton label="Stalled" count={savedViewCounts.stalled} active={savedView === "stalled"} tone="danger" onClick={() => setSavedView("stalled")} />
        </div>
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {/* Table / Tree view toggle */}
          <div className="inline-flex items-center rounded-full border border-border-strong bg-muted p-0.5 shrink-0">
            <ViewBtn active={view === "table"} onClick={() => setView("table")} label="Table">
              <path d="M3 5h18M3 12h18M3 19h18" strokeWidth="1.7" strokeLinecap="round" />
            </ViewBtn>
            <ViewBtn active={view === "tree"} onClick={() => setView("tree")} label="Tree">
              <path d="M5 4h6v4H5V4Zm8 5h6v4h-6V9Zm0 6h6v4h-6v-4ZM8 8v9m0-4h5" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </ViewBtn>
          </div>

          <div className="flex-1 min-w-[200px] max-w-sm">
            <SearchInput value={search} onChange={setSearch} placeholder="Search customer or location…" />
          </div>
          <SelectControl value={vertical} onChange={setVertical}
            options={[{ value: "All", label: "All verticals" }, ...verticals.map((v) => ({ value: v.id, label: v.name }))]} />
          <SelectControl value={grade} onChange={setGrade}
            options={[{ value: "All", label: "All grades" }, { value: "A", label: "A-grade" }, { value: "B", label: "B-grade" }, { value: "C", label: "C-grade" }]} />
          <SelectControl value={geoTier} onChange={setGeoTier}
            options={[{ value: "All", label: "All geos" }, ...GEO_OPTIONS.map((g) => ({ value: g.key, label: g.label }))]} />
          <div className="flex-1" />
          <Button onClick={openNewCustomer} className="px-4 gap-1.5">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 5v14M5 12h14" strokeWidth="2.2" strokeLinecap="round" /></svg>
            New customer
          </Button>
        </div>

        {!rows ? (
          <FactoryTableSkeleton />
        ) : rows.length === 0 ? (
          <Empty className="border bg-card/50 py-16">
            <EmptyHeader>
              <EmptyTitle className="font-display text-lg">No customers yet</EmptyTitle>
              <EmptyDescription className="text-sm">Mark a factory as a customer from its page, or add one directly.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : view === "tree" ? (
          <FactoryTree
            verticals={verticals}
            factories={rows}
            contactsOf={contactsOf}
            onOpenFactory={openCustomer}
          />
        ) : (
          <FactoryTable
            customerMode
            factories={rows}
            verticalName={verticalName}
            contactsOf={contactsOf}
            deploymentProgress={deploymentProgress}
            onSelect={(f) => openCustomer(f.id)}
            onStageChange={(id, s) => setFactoryStage(id, s)}
            onDelete={deleteFactory}
          />
        )}
      </div>
    </>
  );
}

function SavedViewButton({ label, count, active, tone = "default", onClick }: { label: string; count: number; active: boolean; tone?: "default" | "warn" | "danger"; onClick: () => void }) {
  const activeTone = tone === "warn"
    ? "border-[color:var(--color-warn)]/40 tint-warn text-[color:var(--color-warn)]"
    : tone === "danger"
      ? "border-[color:var(--color-danger)]/40 tint-danger text-[color:var(--color-danger)]"
      : "border-primary/40 bg-primary-tint text-primary";
  return (
    <button type="button" onClick={onClick} aria-pressed={active}
      className={`inline-flex h-8 shrink-0 items-center gap-2 rounded-full border px-3 text-[11px] font-medium transition-colors ${active ? activeTone : "border-border bg-card text-foreground/80 hover:border-border-strong hover:text-foreground"}`}>
      {label}<span className="grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[9px] text-muted-foreground">{count}</span>
    </button>
  );
}

function FactoryTableSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card" aria-label="Loading customers">
      <div className="h-10 animate-pulse border-b border-border bg-muted/60" />
      {Array.from({ length: 7 }, (_, index) => <div key={index} className="flex h-14 items-center gap-6 border-b border-border/60 px-4 last:border-0"><span className="h-3 w-48 animate-pulse rounded bg-accent" /><span className="h-3 w-20 animate-pulse rounded bg-accent" /><span className="h-3 w-32 animate-pulse rounded bg-accent" /><span className="ml-auto h-3 w-24 animate-pulse rounded bg-accent" /></div>)}
    </div>
  );
}

function ViewBtn({ active, onClick, label, children }: {
  active: boolean; onClick: () => void; label: string; children: React.ReactNode;
}) {
  return (
    <button onClick={onClick} title={`${label} view`}
      className={`h-8 px-3 rounded-full text-[12px] font-medium cursor-pointer inline-flex items-center gap-1.5 transition-colors ${
        active ? "bg-primary text-primary-foreground" : "text-foreground/80 hover:text-foreground"
      }`}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">{children}</svg>
      {label}
    </button>
  );
}

export default function CustomersPage() {
  return (
    <Suspense fallback={null}>
      <CustomersInner />
    </Suspense>
  );
}
