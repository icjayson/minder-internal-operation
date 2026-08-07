"use client";

import { useEffect, useState } from "react";
import { GEO_OPTIONS, WORKER_BANDS } from "@/lib/types";
import { useStore } from "@/lib/factories-store";
import { normalizeUrl } from "@/lib/import-normalization";
import { supabase } from "@/lib/supabase";

export function NewFactoryDrawer({ onClose, asCustomer = false }: { onClose: () => void; asCustomer?: boolean }) {
  const { verticals, networks, openFactory, openCustomer } = useStore();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    vertical_id: verticals[0]?.id ?? "",
    network_id: "",
    geo_tier: "",
    frontline_workers: "",
    hq_location: "",
    website_url: "",
    description: "",
    notes: "",
  });

  useEffect(() => {
    if (!form.vertical_id && verticals[0]) setForm((f) => ({ ...f, vertical_id: verticals[0].id }));
  }, [verticals, form.vertical_id]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && !saving && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose, saving]);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return setError("Name is required.");
    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        vertical_id: form.vertical_id || null,
        network_id: form.network_id || null,
        geo_tier: form.geo_tier || null,
        frontline_workers: form.frontline_workers || null,
        hq_location: form.hq_location.trim() || null,
        website_url: normalizeUrl(form.website_url) || null,
        description: form.description.trim() || null,
        notes: form.notes.trim() || null,
        source: "manual",
        ...(asCustomer ? { is_customer: true, customer_marked_at: new Date().toISOString() } : {}),
      };
      const { data, error: insErr } = await supabase().from("factories").insert(payload).select().single();
      if (insErr) throw new Error(insErr.message);
      if (data?.id) {
        fetch("/api/score-factory", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ factoryId: data.id }),
        }).catch(() => {});
        if (asCustomer) openCustomer(data.id);
        else openFactory(data.id);
      }
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button onClick={() => !saving && onClose()} aria-label="Close" className="fixed inset-0 bg-canvas/70 backdrop-blur-sm z-40" />
      <aside className="fixed right-0 top-0 bottom-0 w-full max-w-[520px] bg-surface border-l border-line-strong z-50 flex flex-col shadow-drawer">
        <header className="relative px-6 pt-5 pb-4 border-b border-line">
          <span className="absolute left-0 top-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-accent/40 to-transparent" />
          <div className="text-[10px] mono uppercase tracking-[0.14em] text-accent mb-1">{asCustomer ? "New customer" : "New factory"}</div>
          <h2 className="text-[22px] font-display text-ink">{asCustomer ? "Add a customer" : "Add a factory"}</h2>
          <p className="text-[12px] text-ink-soft mt-1">AI will score it against the design-partner rubric after save.</p>
        </header>

        <form id="new-factory" onSubmit={submit} className="flex-1 overflow-y-auto px-6 py-5 space-y-3">
          {error && <div className="rounded-md border border-[color:var(--color-danger)]/30 tint-danger px-3 py-2 text-[12px] text-[color:var(--color-danger)]">{error}</div>}
          <Field label="Factory name *"><input autoFocus value={form.name} onChange={(e) => set("name", e.target.value)} className={inp} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Vertical">
              <select value={form.vertical_id} onChange={(e) => set("vertical_id", e.target.value)} className={inp}>
                {verticals.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </Field>
            <Field label="Geo">
              <select value={form.geo_tier} onChange={(e) => set("geo_tier", e.target.value)} className={inp}>
                <option value="">—</option>
                {GEO_OPTIONS.map((g) => <option key={g.key} value={g.key}>{g.label}</option>)}
              </select>
            </Field>
            <Field label="Network (source)">
              <select value={form.network_id} onChange={(e) => set("network_id", e.target.value)} className={inp}>
                <option value="">None</option>
                {(networks ?? []).map((nw) => <option key={nw.id} value={nw.id}>{nw.name}</option>)}
              </select>
            </Field>
            <Field label="Frontline workers">
              <select value={form.frontline_workers} onChange={(e) => set("frontline_workers", e.target.value)} className={inp}>
                <option value="">—</option>
                {WORKER_BANDS.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </Field>
            <Field label="Location"><input value={form.hq_location} onChange={(e) => set("hq_location", e.target.value)} className={inp} /></Field>
            <Field label="Company website"><input value={form.website_url} onChange={(e) => set("website_url", e.target.value)} className={`${inp} mono`} /></Field>
          </div>
          <Field label="Company description"><textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={3} className={`${inp} h-auto py-2 resize-y`} /></Field>
          <Field label="How to approach / Note"><textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={3} className={`${inp} h-auto py-2 resize-y`} /></Field>
        </form>

        <footer className="px-6 py-3 border-t border-line flex items-center gap-2 bg-surface-2/50">
          <button type="button" onClick={() => !saving && onClose()} className="h-9 px-4 rounded-full border border-line-strong bg-surface hover:bg-surface-3 text-[12.5px] font-medium text-ink-soft cursor-pointer">Cancel</button>
          <div className="flex-1" />
          <button type="submit" form="new-factory" disabled={saving} className="h-9 px-5 rounded-full bg-accent hover:bg-[#3a51ff] disabled:opacity-60 text-white text-[12.5px] font-medium cursor-pointer">
            {saving ? "Saving…" : asCustomer ? "Save customer" : "Save factory"}
          </button>
        </footer>
      </aside>
    </>
  );
}

const inp = "w-full h-9 rounded-md border border-line bg-canvas px-3 text-[13px] text-ink placeholder:text-muted focus:border-line-strong focus:outline-none";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[10px] mono uppercase tracking-[0.12em] text-muted block mb-1">{label}</span>
      {children}
    </label>
  );
}
