"use client";

import Link from "next/link";
import { useState } from "react";
import { useStore } from "@/lib/factories-store";
import { PageHeader } from "@/app/components/page-header";

function host() {
  const u = process.env.NEXT_PUBLIC_SUPABASE_URL;
  try { return u ? new URL(u).host : null; } catch { return u ?? null; }
}

export default function SettingsPage() {
  const { factories, contacts } = useStore();
  const manualScanEnabled = process.env.NODE_ENV !== "production";
  const [scan, setScan] = useState<string | null>(null);
  async function runScan() {
    setScan("Running…");
    try {
      const res = await fetch("/api/scan-alerts");
      const data = await res.json();
      setScan(res.ok ? `Created ${data.created}, pushed ${data.pushed}` : `Error: ${data.error}`);
    } catch (e) {
      setScan(e instanceof Error ? e.message : "failed");
    }
  }

  return (
    <>
      <PageHeader eyebrow="Settings" title="Settings & AI context"
        subtitle="Shared AI context, connection status and alert controls." />
      <div className="px-8 py-5 space-y-6 max-w-3xl">
        <Card
          title="Shared AI context"
          action={
            <Link href="/ai-context" className="h-7 rounded-full bg-primary px-3 inline-flex items-center text-[11px] font-medium text-white hover:bg-[#3a51ff]">
              Open context
            </Link>
          }
        >
          <p className="text-[12px] text-foreground/80">
            Product truth, design-partner profile, scoring rubrics, writing guardrails and uploaded shared files
            now live in one editable context layer.
          </p>
        </Card>

        <Card title="Connection & data">
          <Row label="Supabase" value={host() ?? "not configured"} />
          <Row label="Factories" value={factories?.length ?? "—"} />
          <Row label="Contacts" value={contacts?.length ?? "—"} />
          <Row label="Auth mode" value="Single-user · allow-all RLS" />
          <Row label="OpenAI" value="Key configured server-side" />
        </Card>

        <Card title="Alerts" action={manualScanEnabled ? (
          <button onClick={runScan} className="h-7 px-3 rounded-full bg-primary hover:bg-[#3a51ff] text-white text-[11px] font-medium cursor-pointer">Run scan now</button>
        ) : undefined}>
          <p className="text-[12px] text-foreground/80">Flags anything in Replied → Demo with no update in 3+ days (auto-clears when you act), attaches an AI recap, and pushes one Discord embed per entity (set <code className="tabular-nums">DISCORD_WEBHOOK_URL</code>; deep links use <code className="tabular-nums">APP_URL</code>). Optional email digest via <code className="tabular-nums">RESEND_API_KEY</code> + <code className="tabular-nums">ALERT_EMAIL_TO</code>. Vercel Cron hits this daily.</p>
          {scan && <p className="mt-2 text-[12px] text-primary tabular-nums">{scan}</p>}
        </Card>
      </div>
    </>
  );
}

function Card({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[10px] tabular-nums uppercase tracking-[0.14em] text-muted-foreground">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}
function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border/60 last:border-0">
      <span className="text-[10px] tabular-nums uppercase tracking-[0.12em] text-muted-foreground">{label}</span>
      <span className="text-[13px] text-foreground tabular-nums">{value}</span>
    </div>
  );
}
