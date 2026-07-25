"use client";

import { useEffect, useState } from "react";
import { CHANNELS, GEO_TIERS } from "@/lib/types";
import { useStore } from "@/lib/factories-store";
import { supabase } from "@/lib/supabase";

export function NewFactoryDrawer({ onClose }: { onClose: () => void }) {
  const { verticals, openFactory } = useStore();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    vertical_id: verticals[0]?.id ?? "",
    geo_tier: "",
    hq_location: "",
    country: "",
    frontline_workers: "",
    website_url: "",
    company_url: "",
    channel: "manual",
    parent_company: "",
    systems: "",
    machinery_note: "",
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
        geo_tier: form.geo_tier || null,
        hq_location: form.hq_location.trim() || null,
        country: form.country.trim() || null,
        frontline_workers: form.frontline_workers ? Number(form.frontline_workers) : null,
        website_url: form.website_url.trim() || null,
        company_url: form.company_url.trim() || null,
        channel: form.channel || null,
        parent_company: form.parent_company.trim() || null,
        systems: form.systems ? form.systems.split(",").map((s) => s.trim()).filter(Boolean) : null,
        machinery_note: form.machinery_note.trim() || null,
        notes: form.notes.trim() || null,
        source: "manual",
      };
      const { data, error: insErr } = await supabase().from("factories").insert(payload).select().single();
      if (insErr) throw new Error(insErr.message);
      if (data?.id) {
        fetch("/api/score-factory", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ factoryId: data.id }),
        }).catch(() => {});
        openFactory(data.id);
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
          <div className="text-[10px] mono uppercase tracking-[0.14em] text-accent mb-1">New factory</div>
          <h2 className="text-[22px] font-display text-ink">Add a factory</h2>
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
            <Field label="Geo tier">
              <select value={form.geo_tier} onChange={(e) => set("geo_tier", e.target.value)} className={inp}>
                <option value="">—</option>
                {GEO_TIERS.map((g) => <option key={g.key} value={g.key}>{g.label}</option>)}
              </select>
            </Field>
            <Field label="HQ location"><input value={form.hq_location} onChange={(e) => set("hq_location", e.target.value)} className={inp} /></Field>
            <Field label="Country"><input value={form.country} onChange={(e) => set("country", e.target.value)} className={inp} /></Field>
            <Field label="Frontline workers"><input type="number" value={form.frontline_workers} onChange={(e) => set("frontline_workers", e.target.value)} className={inp} /></Field>
            <Field label="Channel">
              <select value={form.channel} onChange={(e) => set("channel", e.target.value)} className={inp}>
                {CHANNELS.map((c) => <option key={c} value={c}>{c.replace(/_/g, " ")}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Website"><input value={form.website_url} onChange={(e) => set("website_url", e.target.value)} className={`${inp} mono`} /></Field>
          <Field label="Company URL"><input value={form.company_url} onChange={(e) => set("company_url", e.target.value)} placeholder="LinkedIn or company profile URL" className={`${inp} mono`} /></Field>
          <Field label="Parent company"><input value={form.parent_company} onChange={(e) => set("parent_company", e.target.value)} className={inp} /></Field>
          <Field label="Systems (comma-sep: ERP, MES, paper…)"><input value={form.systems} onChange={(e) => set("systems", e.target.value)} className={inp} /></Field>
          <Field label="Machinery note"><input value={form.machinery_note} onChange={(e) => set("machinery_note", e.target.value)} className={inp} /></Field>
          <Field label="Notes"><textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={3} className={`${inp} h-auto py-2 resize-y`} /></Field>
        </form>

        <footer className="px-6 py-3 border-t border-line flex items-center gap-2 bg-surface-2/50">
          <button type="button" onClick={() => !saving && onClose()} className="h-9 px-4 rounded-full border border-line-strong bg-surface hover:bg-surface-3 text-[12.5px] font-medium text-ink-soft cursor-pointer">Cancel</button>
          <div className="flex-1" />
          <button type="submit" form="new-factory" disabled={saving} className="h-9 px-5 rounded-full bg-accent hover:bg-[#3a51ff] disabled:opacity-60 text-white text-[12.5px] font-medium cursor-pointer">
            {saving ? "Saving…" : "Save factory"}
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
