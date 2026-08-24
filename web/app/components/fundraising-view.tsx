"use client";

import { useMemo, useState } from "react";
import type { FundraisingStage, FundraisingTrack } from "@/lib/types";
import { FUNDRAISING_TRACKS, fundraisingPipelineStages, fundraisingStages, fundraisingTypes } from "@/lib/types";
import { useStore } from "@/lib/factories-store";
import { PageHeader } from "@/app/components/page-header";
import { PipelineChevrons } from "@/app/components/pipeline-chevrons";
import { StatCard } from "@/app/components/stat-card";
import { FundraisingTable, formatAmount } from "@/app/components/fundraising-table";
import { SearchInput, SelectControl } from "@/app/components/controls";

export function FundraisingView({ track }: { track: FundraisingTrack }) {
  const { fundraisingLeads, updateFundraisingLead, deleteFundraisingLead, openFundraising, openNewFundraising } = useStore();
  const [search, setSearch] = useState("");
  const [type, setType] = useState("All");
  const [stage, setStage] = useState<FundraisingStage | "All">("All");

  const meta = FUNDRAISING_TRACKS.find((t) => t.key === track)!;
  const types = fundraisingTypes(track);

  // Leads for this track only.
  const trackLeads = useMemo(
    () => (fundraisingLeads ? fundraisingLeads.filter((l) => l.track === track) : null),
    [fundraisingLeads, track],
  );

  const stats = useMemo(() => {
    if (!trackLeads) return null;
    const byStage = new Map<FundraisingStage, number>();
    for (const s of fundraisingStages(track)) byStage.set(s, 0);
    for (const l of trackLeads) byStage.set(l.stage, (byStage.get(l.stage) ?? 0) + 1);
    // Terminal stages differ per track: investors off-ramp to Passed, both close.
    const terminal: FundraisingStage[] = track === "investor" ? ["Closed", "Passed"] : ["Closed"];
    const active = trackLeads.filter((l) => !terminal.includes(l.stage));
    const won = track === "investor"
      ? trackLeads.filter((l) => l.stage === "Committed" || l.stage === "Closed")
      : trackLeads.filter((l) => l.result === "Win");
    const pipelineValue = active.reduce((s, l) => s + (l.amount_target_or_offered ?? 0), 0);
    return {
      byStage,
      total: trackLeads.length,
      active: active.length,
      won: won.length,
      pipelineValue,
    };
  }, [trackLeads, track]);

  const rows = useMemo(() => {
    if (!trackLeads) return null;
    const q = search.trim().toLowerCase();
    return trackLeads
      .filter((l) => {
        if (type !== "All" && l.type !== type) return false;
        if (stage !== "All" && l.stage !== stage) return false;
        if (!q) return true;
        return l.name.toLowerCase().includes(q) || (l.contact_person ?? "").toLowerCase().includes(q);
      })
      .sort((a, b) => (b.amount_target_or_offered ?? -1) - (a.amount_target_or_offered ?? -1));
  }, [trackLeads, search, type, stage]);

  return (
    <>
      <PageHeader
        eyebrow={`Fundraising · ${meta.label.toLowerCase()}`}
        title={track === "investor" ? "Investors tracker" : "Competitions & programmes"}
        subtitle={track === "investor"
          ? "Angels, VCs, accelerators & family offices you’re raising from"
          : "Grants, competitions, awards, credits & programmes you’re pursuing"}
        right={<><span>{stats ? `${stats.total}` : "—"}</span><span className="opacity-50">{track === "investor" ? "investors" : "programmes"}</span></>}
      >
        <PipelineChevrons
          stages={fundraisingPipelineStages(track)}
          counts={stats?.byStage ?? new Map()}
          activeStage={stage === "All" ? null : (stage as FundraisingStage)}
          onSelect={(s) => setStage(stage === s ? "All" : s)}
        />
        {stats && (
          <div className="mt-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
            <StatCard label="Total" value={stats.total} />
            <StatCard label="Active" value={stats.active} tone="accent" />
            <StatCard label={track === "investor" ? "Committed / closed" : "Won"} value={stats.won} />
            <StatCard label={track === "investor" ? "Pipeline target" : "Pipeline value"} value={formatAmount(stats.pipelineValue || null)} tone="warn" />
          </div>
        )}
      </PageHeader>

      <div className="px-4 py-5 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <div className="flex-1 min-w-[200px] max-w-sm">
            <SearchInput value={search} onChange={setSearch} placeholder={track === "investor" ? "Search investor or contact…" : "Search programme or contact…"} />
          </div>
          <SelectControl value={type} onChange={setType}
            options={[{ value: "All", label: "All types" }, ...types.map((t) => ({ value: t.key, label: t.label }))]} />
          <div className="flex-1" />
          <button onClick={() => openNewFundraising(track)}
            className="h-9 px-4 rounded-full bg-primary hover:bg-[#3a51ff] text-white text-[13px] font-medium cursor-pointer inline-flex items-center gap-1.5">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 5v14M5 12h14" strokeWidth="2.2" strokeLinecap="round" /></svg>
            {track === "investor" ? "New investor" : "New programme"}
          </button>
        </div>

        {!rows ? (
          <div className="py-20 text-center text-muted-foreground text-sm mono uppercase tracking-wider">Loading {meta.label.toLowerCase()}…</div>
        ) : rows.length === 0 ? (
          <div className="rounded-lg border border-dashed border-line bg-surface/50 px-8 py-16 text-center">
            <div className="text-lg font-display mb-2">
              {track === "investor" ? "No investors yet" : "No competitions or programmes yet"}
            </div>
            <p className="text-sm text-ink-soft max-w-md mx-auto">
              {track === "investor"
                ? "Add the angels, VCs, accelerators and family offices you’re raising from."
                : "Add the grants, competitions, awards, credits and programmes you’re pursuing."}
            </p>
          </div>
        ) : (
          <FundraisingTable
            track={track}
            leads={rows}
            onSelect={(l) => openFundraising(l.id)}
            onStageChange={(id, s) => updateFundraisingLead(track, id, { stage: s, last_activity_at: new Date().toISOString() })}
            onDelete={(id) => deleteFundraisingLead(track, id)}
          />
        )}
      </div>
    </>
  );
}
