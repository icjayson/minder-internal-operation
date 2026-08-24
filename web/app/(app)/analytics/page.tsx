"use client";

import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, XAxis } from "recharts";

import { PIPELINE_STAGES } from "@/lib/types";
import { useStore } from "@/lib/factories-store";
import { PageHeader } from "@/app/components/page-header";
import { StatCard } from "@/app/components/stat-card";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/design-system/components/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/design-system/components/chart";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/design-system/components/table";

type Datum = { label: string; value: number };

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
            {/* The two funnels are the same measure over different entities, so
                they take two steps of one hue rather than two unrelated ones. */}
            <Distribution
              title="Factory stage funnel"
              description="Where every factory sits in the pipeline"
              data={a.factoryStages}
              fill="var(--chart-3)"
            />
            <Distribution
              title="Contact stage funnel"
              description="The same pipeline, counted by contact"
              data={a.contactStages}
              fill="var(--chart-2)"
            />
            {/* A, B and C mean good, needs-attention and poor — the same reading
                the score rings take from the semantic ramp. */}
            <Distribution
              title="Grade mix"
              description="Scored against the 100-pt IDP rubric"
              data={a.grades}
              fills={["var(--color-success)", "var(--color-warning)", "var(--color-error)"]}
            />
            {/* Verticals are categories with no order, which is what a
                categorical ramp is for. */}
            <Distribution
              title="By vertical"
              description="Portfolio spread across the five verticals"
              data={a.byVertical}
              fills={["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"]}
            />
            <Distribution
              title="Relationship ladder"
              description="L0 researched through L7 active design partner"
              data={a.ladder}
              fill="var(--chart-3)"
            />
            <Distribution
              title="Evidence ladder"
              description="How much evidence each account has produced"
              data={a.evidence}
              fill="var(--chart-2)"
            />

            <Card className="gap-0 overflow-hidden py-0 lg:col-span-2">
              <CardHeader className="border-b px-5 py-3">
                <CardTitle className="text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
                  Per-vertical drill-down
                </CardTitle>
              </CardHeader>
              <CardContent className="px-0">
                <Table className="text-[12px]">
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      {["Vertical", "Factories", "Contacts", "A-grade", "Avg score", "L7 partners"].map((header) => (
                        <TableHead key={header} className="h-auto px-4 py-2 text-[9px] tracking-wider text-muted-foreground uppercase">
                          {header}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {a.verticalDetail.map((row) => (
                      <TableRow key={row.id} className="hover:bg-transparent">
                        <TableCell className="px-4 py-2.5">{row.label}</TableCell>
                        <TableCell className="px-4 py-2.5 tabular-nums text-foreground/80">{row.factories}</TableCell>
                        <TableCell className="px-4 py-2.5 tabular-nums text-foreground/80">{row.contacts}</TableCell>
                        <TableCell className="px-4 py-2.5 tabular-nums text-foreground/80">{row.aGrade}</TableCell>
                        <TableCell className="px-4 py-2.5 tabular-nums text-foreground/80">{row.avgScore ?? "—"}</TableCell>
                        <TableCell className="px-4 py-2.5 tabular-nums text-primary">{row.activePartners}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </>
  );
}

const chartConfig = {
  value: { label: "Factories" },
} satisfies ChartConfig;

/**
 * One horizontal distribution, on the vendored `chart-bar-horizontal` block.
 *
 * `fill` paints every bar the same; `fills` paints them per category, for the
 * two charts whose bars mean different things rather than more of one thing.
 *
 * The height is fixed rather than left on ChartContainer's `aspect-video`,
 * so all six read as one row of charts regardless of how many bars each has.
 */
function Distribution({
  title,
  description,
  data,
  fill,
  fills,
}: {
  title: string;
  description: string;
  data: Datum[];
  fill?: string;
  fills?: string[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-[13px]">{title}</CardTitle>
        <CardDescription className="text-[12px]">{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="aspect-auto h-[220px] w-full">
          <BarChart accessibilityLayer data={data} margin={{ top: 20 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={10}
              interval={0}
              // Stage and vertical names run long; the axis shows a head and
              // the tooltip carries the label in full.
              tickFormatter={(value: string) => (value.length > 12 ? `${value.slice(0, 11)}…` : value)}
            />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            {/* Recharts grows a bar from zero on mount and only paints once the
                first animation frame lands. Six charts re-animating on every
                realtime refresh is noise on an ops dashboard anyway, so they
                are drawn outright. */}
            <Bar dataKey="value" radius={8} isAnimationActive={false} fill={fill ?? "var(--chart-3)"}>
              {fills &&
                data.map((d, index) => <Cell key={d.label} fill={fills[index % fills.length]} />)}
              <LabelList position="top" offset={10} className="fill-foreground" fontSize={12} />
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
