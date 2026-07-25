"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useStore } from "@/lib/factories-store";
import { PageHeader } from "@/app/components/page-header";
import { StatCard } from "@/app/components/stat-card";

export default function VerticalsPage() {
  const { verticals, factories, openNewFactory } = useStore();

  const stats = useMemo(() => {
    if (!factories) return null;
    const total = factories.length;
    const a = factories.filter((f) => f.grade === "A").length;
    const scored = factories.filter((f) => f.score != null);
    const avg = scored.length ? scored.reduce((s, f) => s + (f.score ?? 0), 0) / scored.length : 0;
    const won = factories.filter((f) => f.stage === "Closed Won").length;
    return { total, a, avg, won };
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
        title="Verticals"
        subtitle="Industrial design-partner pipeline · scored by the 100-pt IDP rubric"
        right={<><span>{stats ? `${stats.total}` : "—"}</span><span className="opacity-50">factories</span></>}
      >
        {stats && (
          <div className="grid grid-cols-4 gap-3 mt-5">
            <StatCard label="Factories" value={stats.total} />
            <StatCard label="A-grade" value={stats.a} tone="accent" />
            <StatCard label="Avg score" value={stats.avg ? Math.round(stats.avg) : "—"} />
            <StatCard label="Closed won" value={stats.won} tone="accent" />
          </div>
        )}
      </PageHeader>

      <div className="px-8 py-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[13px] mono uppercase tracking-[0.14em] text-muted">By vertical</h2>
          <button onClick={openNewFactory}
            className="h-9 px-4 rounded-full bg-accent hover:bg-[#3a51ff] text-white text-[13px] font-medium cursor-pointer inline-flex items-center gap-1.5">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 5v14M5 12h14" strokeWidth="2.2" strokeLinecap="round" /></svg>
            New factory
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {perVertical.map(({ v, count, grades, ladder }) => (
            <Link key={v.id} href={`/factories?vertical=${v.id}`}
              className="rounded-lg border border-line bg-surface hover:bg-surface-2/60 p-5 transition-colors">
              <div className="text-[15px] font-medium text-ink mb-1">{v.name}</div>
              {v.wedge_note && <p className="text-[12px] text-muted leading-relaxed line-clamp-2 mb-3">{v.wedge_note}</p>}
              <div className="flex items-center gap-4">
                <span className="text-[26px] mono tabular-nums text-ink leading-none">{count}</span>
                <div className="flex gap-1.5">
                  <GradeDot tone="green" n={grades.A} label="A" />
                  <GradeDot tone="amber" n={grades.B} label="B" />
                  <GradeDot tone="neutral" n={grades.C} label="C" />
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-line-soft">
                <div className="text-[9px] mono uppercase tracking-[0.12em] text-muted mb-1.5">Relationship ladder</div>
                <div className="grid grid-cols-8 gap-1" title="Factories at ladder levels 0–7">
                  {ladder.map((n, level) => (
                    <div key={level} className="text-center">
                      <div className={`h-1.5 rounded-full ${n ? "bg-accent" : "bg-surface-3"}`} />
                      <span className="text-[9px] mono text-muted">L{level}·{n}</span>
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

function GradeDot({ tone, n, label }: { tone: string; n: number; label: string }) {
  return (
    <span data-tone={tone} className="tone inline-flex items-center gap-1 h-5 px-2 rounded-full mono text-[10px] font-medium">
      {label} {n}
    </span>
  );
}
