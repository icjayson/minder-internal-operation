"use client";

import { useEffect, useState } from "react";
import type { ContextDoc } from "@/lib/types";
import { supabase } from "@/lib/supabase";
import { useStore } from "@/lib/factories-store";
import { PageHeader } from "@/app/components/page-header";

function host() {
  const u = process.env.NEXT_PUBLIC_SUPABASE_URL;
  try { return u ? new URL(u).host : null; } catch { return u ?? null; }
}

export default function SettingsPage() {
  const { factories, contacts } = useStore();
  const manualScanEnabled = process.env.NODE_ENV !== "production";
  const [docs, setDocs] = useState<ContextDoc[]>([]);
  const [scan, setScan] = useState<string | null>(null);

  async function load() {
    const { data } = await supabase().from("context_docs").select("*").order("created_at");
    setDocs((data ?? []) as ContextDoc[]);
  }
  useEffect(() => { load(); }, []);

  async function save(id: string, patch: Partial<ContextDoc>) {
    setDocs((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));
    await supabase().from("context_docs").update(patch).eq("id", id);
  }
  async function add() {
    await supabase().from("context_docs").insert({ scope: "global", title: "New context", body: "", kind: "both" });
    load();
  }
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
        subtitle="The scoring/writing context here grounds the AI. Plus connection status and the alert scan." />
      <div className="px-8 py-5 space-y-6 max-w-3xl">
        <Card title="Scoring & writing context" action={
          <button onClick={add} className="h-7 px-3 rounded-full border border-line-strong bg-surface-2 hover:bg-surface-3 text-[11px] mono uppercase tracking-wider text-ink-soft cursor-pointer">+ Add</button>
        }>
          <p className="text-[12px] text-ink-soft mb-3">Docs scoped <code className="mono text-accent">global</code> or a vertical key feed the scorer &amp; writer. Keep the IDP definition, product wedge and dos/don&apos;ts here.</p>
          <div className="space-y-3">
            {docs.map((d) => (
              <div key={d.id} className="rounded-md border border-line bg-surface-2/40 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <input defaultValue={d.title} onBlur={(e) => save(d.id, { title: e.target.value })}
                    className="flex-1 h-8 rounded-md border border-line bg-canvas px-2 text-[13px] font-medium text-ink focus:border-accent focus:outline-none" />
                  <input defaultValue={d.scope} onBlur={(e) => save(d.id, { scope: e.target.value })} title="global or vertical key"
                    className="w-28 h-8 rounded-md border border-line bg-canvas px-2 text-[12px] mono text-ink-soft focus:border-accent focus:outline-none" />
                  <select value={d.kind} onChange={(e) => save(d.id, { kind: e.target.value as ContextDoc["kind"] })}
                    className="h-8 rounded-md border border-line bg-canvas px-2 text-[12px] text-ink cursor-pointer focus:border-accent focus:outline-none">
                    <option value="scoring">scoring</option><option value="writing">writing</option><option value="both">both</option>
                  </select>
                  <label className="flex items-center gap-1 text-[11px] text-muted">
                    <input type="checkbox" checked={d.active} onChange={(e) => save(d.id, { active: e.target.checked })} /> active
                  </label>
                </div>
                <textarea defaultValue={d.body} rows={4} onBlur={(e) => save(d.id, { body: e.target.value })}
                  className="w-full rounded-md border border-line bg-canvas px-3 py-2 text-[13px] text-ink-soft leading-relaxed resize-y focus:border-accent focus:outline-none" />
              </div>
            ))}
            {docs.length === 0 && <p className="text-sm text-muted">No context docs — run the SQL seed or add one.</p>}
          </div>
        </Card>

        <Card title="Connection & data">
          <Row label="Supabase" value={host() ?? "not configured"} />
          <Row label="Factories" value={factories?.length ?? "—"} />
          <Row label="Contacts" value={contacts?.length ?? "—"} />
          <Row label="Auth mode" value="Single-user · allow-all RLS" />
          <Row label="OpenAI" value="Key configured server-side" />
        </Card>

        <Card title="Alerts" action={manualScanEnabled ? (
          <button onClick={runScan} className="h-7 px-3 rounded-full bg-accent hover:bg-[#3a51ff] text-white text-[11px] font-medium cursor-pointer">Run scan now</button>
        ) : undefined}>
          <p className="text-[12px] text-ink-soft">Scans for stale (&gt;7d) and due items, creates in-app alerts, and pushes a digest via Resend + Discord (set <code className="mono">RESEND_API_KEY</code>, <code className="mono">ALERT_EMAIL_TO</code>, <code className="mono">DISCORD_WEBHOOK_URL</code>). Vercel Cron hits this daily.</p>
          {scan && <p className="mt-2 text-[12px] text-accent mono">{scan}</p>}
        </Card>
      </div>
    </>
  );
}

function Card({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-line bg-surface p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[10px] mono uppercase tracking-[0.14em] text-muted">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}
function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-line-soft last:border-0">
      <span className="text-[10px] mono uppercase tracking-[0.12em] text-muted">{label}</span>
      <span className="text-[13px] text-ink mono">{value}</span>
    </div>
  );
}
