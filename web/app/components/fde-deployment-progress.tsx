"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FdeDeployment, FdeDeploymentTask } from "@/lib/types";
import { supabase } from "@/lib/supabase";

export function FdeDeploymentProgress({ factoryId }: { factoryId: string }) {
  const [deployment, setDeployment] = useState<FdeDeployment | null>(null);
  const [tasks, setTasks] = useState<FdeDeploymentTask[]>([]);

  const load = useCallback(async () => {
    const sb = supabase();
    const { data: deploymentRow } = await sb
      .from("fde_deployments")
      .select("*")
      .eq("factory_id", factoryId)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!deploymentRow) {
      setDeployment(null);
      setTasks([]);
      return;
    }
    setDeployment(deploymentRow as FdeDeployment);
    const { data: taskRows } = await sb
      .from("fde_deployment_tasks")
      .select("*")
      .eq("deployment_id", deploymentRow.id)
      .order("phase")
      .order("group_key");
    setTasks((taskRows ?? []) as FdeDeploymentTask[]);
  }, [factoryId]);

  useEffect(() => {
    void load();
    const sb = supabase();
    const channel = sb
      .channel(`fde-progress-${factoryId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "fde_deployments", filter: `factory_id=eq.${factoryId}` }, () => { void load(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "fde_deployment_tasks" }, () => { void load(); })
      .subscribe();
    return () => { void sb.removeChannel(channel); };
  }, [factoryId, load]);

  const done = tasks.filter((task) => task.status === "done").length;
  const percent = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
  const phaseCounts = useMemo(() => ["pre", "during", "after"].map((phase) => {
    const rows = tasks.filter((task) => task.phase === phase);
    return { phase, done: rows.filter((task) => task.status === "done").length, total: rows.length };
  }), [tasks]);

  if (!deployment) return null;
  return (
    <section className="rounded-lg border border-line bg-surface-2/45 p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[9.5px] font-semibold uppercase tracking-[0.12em] text-accent">FDE KIT deployment</div>
          <h3 className="mt-1 truncate text-[13px] font-medium text-ink">{deployment.name}</h3>
        </div>
        <span className="shrink-0 rounded-full border border-line-strong px-2 py-1 text-[10px] mono uppercase text-muted">{deployment.status}</span>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line"><div className="h-full rounded-full bg-accent transition-all" style={{ width: `${percent}%` }} /></div>
        <span className="text-[11px] mono text-ink-soft">{done}/{tasks.length}</span>
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10.5px] text-muted">
        {phaseCounts.filter((row) => row.total > 0).map((row) => <span key={row.phase}>{row.phase}: {row.done}/{row.total}</span>)}
      </div>
    </section>
  );
}
