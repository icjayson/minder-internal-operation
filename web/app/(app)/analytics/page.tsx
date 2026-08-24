"use client";

import { useMemo } from "react";
import { PIPELINE_STAGES } from "@/lib/types";
import { useStore } from "@/lib/factories-store";
import { PageHeader } from "@/app/components/page-header";
import { StatCard } from "@/app/components/stat-card";

export default function AnalyticsPage() {
  const { factories, contacts, verticals } = useStore();

  const a = useMemo(() => {
    if (!factories) return null;
    const stage = (arr: { stage: string }[]) =>
      PIPELINE_STAGES.map((s) => ({ label: s, value: arr.filter((x) => x.stage === s).length }));
    const grades = ["A", "B", "C"].map((g) => ({ label: `${g}-grade`, value: factories.filter((f) => f.grade === g).length }));
    const byVertical = verticals.map((v) => ({ label: v.name, value: factories.filter((f) => f.vertical_id === v.id).length }));
    const ladder = Array.from({ length: 8 }, (_, level) => ({
      label: `L${level}`,
      value: factories.filter((f) => f.ladder_level === level).length,
    }));
    const evidence = Array.from({ length: 6 }, (_, level) => ({
      label: `E${level}`,
      value: factories.filter((f) => f.evidence_level === level).length,
    }));
    const verticalDetail = verticals.map((v) => {
      const rows = factories.filter((f) => f.vertical_id === v.id);
      const contactCount = (contacts ?? []).filter((c) => rows.some((f) => f.id === c.factory_id)).length;
      const scoredRows = rows.filter((f) => f.score != null);
      return {
        id: v.id,
        label: v.name,
        factories: rows.length,
        contacts: contactCount,
        aGrade: rows.filter((f) => f.grade === "A").length,
        avgScore: scoredRows.length
          ? Math.round(scoredRows.reduce((sum, f) => sum + (f.score ?? 0), 0) / scoredRows.length)
          : null,
        activePartners: rows.filter((f) => f.ladder_level === 7).length,
      };
    });
    const scored = factories.filter((f) => f.score != null);
    return {
      total: factories.length,
      contacts: contacts?.length ?? 0,
      avg: scored.length ? Math.round(scored.reduce((s, f) => s + (f.score ?? 0), 0) / scored.length) : 0,
      won: factories.filter((f) => f.stage === "Closed Won").length,
      factoryStages: stage(factories),
      contactStages: stage(contacts ?? []),
      grades,
      byVertical,
      ladder,
      evidence,
      verticalDetail,
    };
  }, [factories, contacts, verticals]);

  return (
    <>
      <PageHeader eyebrow="Analytics" title="Pipeline analytics"
        subtitle="Stage funnel, grade mix and vertical spread"
        right={<><span>{a ? `${a.total}` : "—"}</span><span className="opacity-50">factories</span></>}>
        {a && (
          <div className="grid grid-cols-4 gap-3 mt-5">
            <StatCard label="Factories" value={a.total} />
            <StatCard label="Contacts" value={a.contacts} />
            <StatCard label="Avg score" value={a.avg || "—"} tone="accent" />
            <StatCard label="Closed won" value={a.won} tone="accent" />
          </div>
        )}
      </PageHeader>
      <div className="px-8 py-5">
        {!a ? (
          <div className="py-20 text-center text-muted-foreground text-sm tabular-nums uppercase tracking-wider">Loading…</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card title="Factory stage funnel"><Bars data={a.factoryStages} color="var(--color-primary)" /></Card>
            <Card title="Contact stage funnel"><Bars data={a.contactStages} color="var(--color-info)" /></Card>
            <Card title="Grade mix"><Bars data={a.grades} color="var(--color-warn)" /></Card>
            <Card title="By vertical"><Bars data={a.byVertical} color="var(--color-violet)" /></Card>
            <Card title="Relationship ladder"><Bars data={a.ladder} color="var(--color-primary)" /></Card>
            <Card title="Evidence ladder"><Bars data={a.evidence} color="var(--color-info)" /></Card>
            <div className="lg:col-span-2 rounded-lg border border-border bg-card overflow-hidden">
              <div className="px-5 py-3 border-b border-border">
                <h3 className="text-[10px] tabular-nums uppercase tracking-[0.14em] text-muted-foreground">Per-vertical drill-down</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="bg-muted/40 text-muted-foreground">
                      {["Vertical", "Factories", "Contacts", "A-grade", "Avg score", "L7 partners"].map((header) => (
                        <th key={header} className="px-4 py-2 text-left tabular-nums uppercase tracking-wider text-[9px]">{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {a.verticalDetail.map((row) => (
                      <tr key={row.id} className="border-t border-border/60">
                        <td className="px-4 py-2.5 text-foreground">{row.label}</td>
                        <td className="px-4 py-2.5 tabular-nums text-foreground/80">{row.factories}</td>
                        <td className="px-4 py-2.5 tabular-nums text-foreground/80">{row.contacts}</td>
                        <td className="px-4 py-2.5 tabular-nums text-foreground/80">{row.aGrade}</td>
                        <td className="px-4 py-2.5 tabular-nums text-foreground/80">{row.avgScore ?? "—"}</td>
                        <td className="px-4 py-2.5 tabular-nums text-primary">{row.activePartners}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <h3 className="text-[10px] tabular-nums uppercase tracking-[0.14em] text-muted-foreground mb-4">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Bars({ data, color }: { data: { label: string; value: number }[]; color: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <>
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-3">
          <span className="w-28 shrink-0 text-right text-[11px] text-foreground/80 truncate">{d.label}</span>
          <div className="flex-1 h-5 rounded-sm bg-muted overflow-hidden">
            <div className="h-full rounded-sm" style={{ width: `${(d.value / max) * 100}%`, background: d.value > 0 ? color : "transparent" }} />
          </div>
          <span className="w-8 shrink-0 text-right tabular-nums text-[12px] tabular-nums text-foreground">{d.value}</span>
        </div>
      ))}
    </>
  );
}
