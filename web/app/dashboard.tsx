"use client";

import { useEffect, useMemo, useState } from "react";
import type { Category, Lead, Stage } from "@/lib/types";
import { PIPELINE_STAGES, STAGES } from "@/lib/types";
import { supabase } from "@/lib/supabase";
import { Sidebar } from "./components/sidebar";
import { PipelineChevrons } from "./components/pipeline-chevrons";
import { LeadTable } from "./components/lead-table";
import { LeadDrawer } from "./components/lead-drawer";
import { NewLeadDrawer } from "./components/new-lead-drawer";
import { Toolbar } from "./components/toolbar";
import { StatCard } from "./components/stat-card";

export default function Dashboard() {
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [stageFilter, setStageFilter] = useState<Stage | "All">("All");
  const [categoryFilter, setCategoryFilter] = useState<Category | "All">("All");
  const [search, setSearch] = useState("");
  const [newLeadOpen, setNewLeadOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initial load + realtime
  useEffect(() => {
    const sb = supabase();
    let mounted = true;

    (async () => {
      const { data, error } = await sb
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false });
      if (!mounted) return;
      if (error) setError(error.message);
      else setLeads((data ?? []) as Lead[]);
    })();

    const channel = sb
      .channel("leads-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "leads" },
        (payload) => {
          setLeads((prev) => {
            if (!prev) return prev;
            const row = (payload.new ?? payload.old) as Lead;
            if (payload.eventType === "INSERT") {
              if (prev.some((l) => l.id === row.id)) return prev;
              return [row, ...prev];
            }
            if (payload.eventType === "UPDATE") {
              return prev.map((l) => (l.id === row.id ? (row as Lead) : l));
            }
            if (payload.eventType === "DELETE") {
              return prev.filter((l) => l.id !== row.id);
            }
            return prev;
          });
        },
      )
      .subscribe();

    return () => {
      mounted = false;
      sb.removeChannel(channel);
    };
  }, []);

  // Optimistic update helper
  async function updateLead(id: string, patch: Partial<Lead>) {
    setLeads((prev) =>
      prev ? prev.map((l) => (l.id === id ? { ...l, ...patch } : l)) : prev,
    );
    const { error } = await supabase().from("leads").update(patch).eq("id", id);
    if (error) setError(error.message);
  }

  async function deleteLead(id: string) {
    setLeads((prev) => (prev ? prev.filter((l) => l.id !== id) : prev));
    if (selectedId === id) setSelectedId(null);
    const { error } = await supabase().from("leads").delete().eq("id", id);
    if (error) setError(error.message);
  }

  const filtered = useMemo(() => {
    if (!leads) return null;
    const q = search.trim().toLowerCase();
    return leads.filter((l) => {
      if (stageFilter !== "All" && l.stage !== stageFilter) return false;
      if (categoryFilter !== "All" && l.category !== categoryFilter) return false;
      if (!q) return true;
      return (
        l.full_name.toLowerCase().includes(q) ||
        l.company_name.toLowerCase().includes(q) ||
        (l.title ?? "").toLowerCase().includes(q) ||
        (l.industry ?? "").toLowerCase().includes(q)
      );
    });
  }, [leads, stageFilter, categoryFilter, search]);

  const stats = useMemo(() => {
    if (!leads) return null;
    const byStage = new Map<Stage, number>();
    for (const s of STAGES) byStage.set(s, 0);
    for (const l of leads) byStage.set(l.stage, (byStage.get(l.stage) ?? 0) + 1);
    const contacted = leads.filter((l) => l.touch_count > 0).length;
    const highFit = leads.filter((l) => (l.icp_fit ?? 0) >= 4).length;
    const dueToday = leads.filter((l) => {
      if (!l.next_follow_up) return false;
      const d = new Date(l.next_follow_up);
      return d <= new Date();
    }).length;
    return { byStage, total: leads.length, contacted, highFit, dueToday };
  }, [leads]);

  const selected = leads?.find((l) => l.id === selectedId) ?? null;

  return (
    <div className="flex min-h-screen bg-canvas text-ink">
      <Sidebar />

      <main className="flex-1 min-w-0">
        <header className="px-8 pt-7 pb-4 border-b border-line">
          <div className="flex items-start justify-between mb-5">
            <div>
              <div className="flex items-center gap-2 mb-1 text-[11px] mono uppercase tracking-[0.14em] text-accent">
                <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-accent">
                  <span className="absolute inset-0 rounded-full bg-accent animate-ping opacity-60" />
                </span>
                Pipeline · live
              </div>
              <h1 className="text-[26px] leading-tight tracking-tight">
                Prospect pipeline
              </h1>
              <p className="text-[13px] text-ink-soft mt-1">
                Minder AI · factory voice assistants · leads scored &amp; routed by Gemini
              </p>
            </div>
            <div className="flex items-center gap-2 text-[11px] mono text-muted uppercase tracking-wider">
              <span>{stats ? `${stats.total}` : "—"}</span>
              <span className="opacity-50">leads indexed</span>
            </div>
          </div>

          <PipelineChevrons
            stages={PIPELINE_STAGES}
            counts={stats?.byStage ?? new Map()}
            activeStage={stageFilter === "All" ? null : stageFilter}
            onSelect={(s) => setStageFilter(stageFilter === s ? "All" : s)}
          />

          {stats && (
            <div className="grid grid-cols-4 gap-3 mt-5">
              <StatCard label="Total leads" value={stats.total} />
              <StatCard label="Contacted" value={stats.contacted} />
              <StatCard label="ICP fit ≥ 4" value={stats.highFit} tone="accent" />
              <StatCard label="Follow-ups due" value={stats.dueToday} tone="warn" />
            </div>
          )}
        </header>

        <div className="px-8 py-5">
          <Toolbar
            search={search}
            onSearch={setSearch}
            stageFilter={stageFilter}
            onStageFilter={setStageFilter}
            categoryFilter={categoryFilter}
            onCategoryFilter={setCategoryFilter}
            onNewLead={() => setNewLeadOpen(true)}
          />

          {error && (
            <div className="mb-4 rounded-md border border-line-strong bg-surface px-4 py-2 text-sm text-[color:var(--color-danger)]">
              {error}
            </div>
          )}

          {!filtered ? (
            <div className="py-20 text-center text-muted text-sm mono uppercase tracking-wider">
              Loading leads…
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState total={leads?.length ?? 0} />
          ) : (
            <LeadTable
              leads={filtered}
              onSelect={(l) => setSelectedId(l.id)}
              onDelete={deleteLead}
              onPriorityChange={(id, p) => updateLead(id, { priority: p })}
              onStageChange={(id, stage) => updateLead(id, { stage })}
            />
          )}
        </div>
      </main>

      {newLeadOpen && <NewLeadDrawer onClose={() => setNewLeadOpen(false)} />}

      {selected && (
        <LeadDrawer
          lead={selected}
          onClose={() => setSelectedId(null)}
          onUpdate={(patch) => updateLead(selected.id, patch)}
          onDelete={() => deleteLead(selected.id)}
        />
      )}
    </div>
  );
}

function EmptyState({ total }: { total: number }) {
  return (
    <div className="rounded-lg border border-dashed border-line bg-surface/50 px-8 py-16 text-center">
      <div className="text-lg font-display mb-2">
        {total === 0 ? "No leads yet" : "No leads match the current filter"}
      </div>
      <p className="text-sm text-ink-soft max-w-md mx-auto">
        {total === 0
          ? 'Install the Chrome extension, open a LinkedIn profile and click "Save Lead." Or run the daily scan scripts to seed the pipeline.'
          : "Clear the stage or search filter to see more."}
      </p>
    </div>
  );
}
