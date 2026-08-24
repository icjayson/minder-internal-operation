"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useStore } from "@/lib/factories-store";
import { PageHeader } from "@/app/components/page-header";
import { StatCard } from "@/app/components/stat-card";

export default function VerticalsPage() {
  const { verticals, factories, openFactory, openNewFactory } = useStore();

  const stats = useMemo(() => {
    if (!factories) return null;
    const total = factories.length;
    const a = factories.filter((f) => f.grade === "A").length;
    const scored = factories.filter((f) => f.score != null);
    const avg = scored.length ? scored.reduce((s, f) => s + (f.score ?? 0), 0) / scored.length : 0;
    const today = new Date().toISOString().slice(0, 10);
    const staleBefore = Date.now() - 7 * 86400000;
    const due = factories.filter((f) => f.next_action_due && f.next_action_due <= today).length;
    const stalled = factories.filter((f) => f.stage !== "Closed Won" && f.stage !== "Closed Lost" && (!f.last_activity_at || new Date(f.last_activity_at).getTime() < staleBefore)).length;
    return { total, a, avg, due, stalled };
  }, [factories]);

  const priorities = useMemo(() => {
    if (!factories) return [];
    const today = new Date().toISOString().slice(0, 10);
    return [...factories]
      .filter((factory) => factory.next_action_due && factory.next_action_due <= today)
      .sort((a, b) => (a.next_action_due ?? "").localeCompare(b.next_action_due ?? "") || (b.score ?? 0) - (a.score ?? 0))
      .slice(0, 4);
  }, [factories]);

  const perVertical = useMemo(() => {
    return verticals.map((v) => {
      const rows = (factories ?? []).filter((f) => f.vertical_id === v.id);
      const grades = { A: 0, B: 0, C: 0 } as Record<string, number>;
      rows.forEach((f) => { if (f.grade) grades[f.grade]++; });
      const ladder = Array.from({ length: 8 }, (_, level) =>
        rows.filter((f) => f.ladder_level === level).length,
      );
      return { v, count: rows.length, grades, ladder };
    });
  }, [verticals, factories]);

  return (
    <>
      <PageHeader
        eyebrow="Design partners · live"
        title="Design partner workspace"
        subtitle="Know what needs attention, why it matters, and what to do next."
        right={<><span>{stats ? `${stats.total}` : "—"}</span><span className="opacity-50">factories</span></>}
      >
        {stats && (
          <div className="mt-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
            <StatCard label="Accounts" value={stats.total} />
            <StatCard label="Needs action" value={stats.due} tone="warn" hint="Due today or overdue" />
            <StatCard label="Stalled" value={stats.stalled} tone="danger" hint="No update in 7+ days" />
            <StatCard label="High potential" value={stats.a} tone="accent" hint={`Avg score ${stats.avg ? Math.round(stats.avg) : "—"}`} />
          </div>
        )}
      </PageHeader>

      <div className="px-4 py-5 sm:px-6 lg:px-8">
        <section className="mb-7" aria-labelledby="today-heading">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div><h2 id="today-heading" className="text-[15px] font-semibold text-foreground">Today</h2><p className="text-[11.5px] text-muted-foreground">Start with the accounts that need a decision or follow-up.</p></div>
            <Link href="/factories?focus=needs_action" className="text-[11.5px] font-semibold text-primary hover:underline">View action queue →</Link>
          </div>
          {priorities.length ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {priorities.map((factory) => (
                <button key={factory.id} type="button" onClick={() => openFactory(factory.id)} className="group rounded-lg border border-border bg-card p-4 text-left shadow-mo-soft transition-all hover:-translate-y-0.5 hover:border-border-strong">
                  <div className="flex items-start justify-between gap-3"><span className="line-clamp-2 text-[13px] font-semibold text-foreground">{factory.name}</span><span data-tone={factory.grade === "A" ? "green" : factory.grade === "B" ? "amber" : "neutral"} className="tone rounded-full px-2 py-0.5 text-[9px] font-semibold">{factory.score ?? "—"}</span></div>
                  <p className="mt-2 line-clamp-2 min-h-8 text-[11px] leading-relaxed text-muted-foreground">{factory.ai_recommendation || "Review this account and set a clear next action."}</p>
                  <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-2 text-[10px]"><span className="text-foreground/80">{factory.stage}</span><span className="font-medium text-[color:var(--color-warn)]">Due {formatDue(factory.next_action_due)}</span></div>
                </button>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border bg-card/60 px-5 py-7 text-center"><div className="text-[13px] font-medium text-foreground">You’re caught up</div><p className="mt-1 text-[11px] text-muted-foreground">No account actions are due today.</p></div>
          )}
        </section>

        <div className="flex items-center justify-between mb-4">
          <div><h2 className="text-[15px] font-semibold text-foreground">Explore by vertical</h2><p className="text-[11.5px] text-muted-foreground">Compare portfolio shape and relationship maturity.</p></div>
          <button onClick={openNewFactory}
            className="h-9 px-4 rounded-full bg-primary hover:bg-[#3a51ff] text-white text-[13px] font-medium cursor-pointer inline-flex items-center gap-1.5">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 5v14M5 12h14" strokeWidth="2.2" strokeLinecap="round" /></svg>
            New factory
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {perVertical.map(({ v, count, grades, ladder }) => (
            <Link key={v.id} href={`/factories?vertical=${v.id}`}
              className="rounded-lg border border-border bg-card hover:bg-muted/60 p-5 transition-colors">
              <div className="text-[15px] font-medium text-foreground mb-1">{v.name}</div>
              {v.wedge_note && <p className="text-[12px] text-muted-foreground leading-relaxed line-clamp-2 mb-3">{v.wedge_note}</p>}
              <div className="flex items-center gap-4">
                <span className="text-[26px] tabular-nums text-foreground leading-none">{count}</span>
                <div className="flex gap-1.5">
                  <GradeDot tone="green" n={grades.A} label="A" />
                  <GradeDot tone="amber" n={grades.B} label="B" />
                  <GradeDot tone="neutral" n={grades.C} label="C" />
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-border/60">
                <div className="text-[9px] tabular-nums uppercase tracking-[0.12em] text-muted-foreground mb-1.5">Relationship ladder</div>
                <div className="grid grid-cols-8 gap-1" title="Factories at ladder levels 0–7">
                  {ladder.map((n, level) => (
                    <div key={level} className="text-center">
                      <div className={`h-1.5 rounded-full ${n ? "bg-primary" : "bg-accent"}`} />
                      <span className="text-[9px] tabular-nums text-muted-foreground">L{level}·{n}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}

function formatDue(value: string | null): string {
  if (!value) return "unscheduled";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function GradeDot({ tone, n, label }: { tone: string; n: number; label: string }) {
  return (
    <span data-tone={tone} className="tone inline-flex items-center gap-1 h-5 px-2 rounded-full tabular-nums text-[10px] font-medium">
      {label} {n}
    </span>
  );
}
