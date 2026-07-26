"use client";

import { useEffect, useState } from "react";
import { NETWORK_TYPES, VERTICALS } from "@/lib/types";
import { useStore } from "@/lib/factories-store";
import { supabase } from "@/lib/supabase";

export function NewNetworkDrawer({ onClose }: { onClose: () => void }) {
  const { openNetwork } = useStore();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focus, setFocus] = useState<string[]>([]);
  const [form, setForm] = useState({
    name: "",
    type: "association",
    country: "",
    hq_location: "",
    website_url: "",
    reach_note: "",
    notes: "",
  });

  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && !saving && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose, saving]);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const toggleFocus = (key: string) =>
    setFocus((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return setError("Name is required.");
    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        type: form.type || null,
        country: form.country.trim() || null,
        hq_location: form.hq_location.trim() || null,
        website_url: form.website_url.trim() || null,
        focus_verticals: focus.length ? focus : null,
        reach_note: form.reach_note.trim() || null,
        notes: form.notes.trim() || null,
        source: "manual",
      };
      const { data, error: insErr } = await supabase().from("networks").insert(payload).select().single();
      if (insErr) throw new Error(insErr.message);
      if (data?.id) openNetwork(data.id);
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
          <div className="text-[10px] mono uppercase tracking-[0.14em] text-accent mb-1">New network</div>
          <h2 className="text-[22px] font-display text-ink">Add a network</h2>
          <p className="text-[12px] text-ink-soft mt-1">An association, accelerator or institute that introduces factories.</p>
        </header>

        <form id="new-network" onSubmit={submit} className="flex-1 overflow-y-auto px-6 py-5 space-y-3">
          {error && <div className="rounded-md border border-[color:var(--color-danger)]/30 tint-danger px-3 py-2 text-[12px] text-[color:var(--color-danger)]">{error}</div>}
          <Field label="Network name *"><input autoFocus value={form.name} onChange={(e) => set("name", e.target.value)} className={inp} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Type">
              <select value={form.type} onChange={(e) => set("type", e.target.value)} className={inp}>
                {NETWORK_TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
              </select>
            </Field>
            <Field label="Country"><input value={form.country} onChange={(e) => set("country", e.target.value)} className={inp} /></Field>
            <Field label="HQ location"><input value={form.hq_location} onChange={(e) => set("hq_location", e.target.value)} className={inp} /></Field>
            <Field label="Website"><input value={form.website_url} onChange={(e) => set("website_url", e.target.value)} className={`${inp} mono`} /></Field>
          </div>
          <Field label="Focus verticals">
            <div className="flex flex-wrap gap-1.5">
              {VERTICALS.map((v) => {
                const on = focus.includes(v.key);
                return (
                  <button key={v.key} type="button" onClick={() => toggleFocus(v.key)}
                    className={`h-7 px-3 rounded-full text-[11.5px] font-medium cursor-pointer border transition-colors ${
                      on ? "bg-accent text-white border-accent" : "border-line-strong bg-surface-2 text-ink-soft hover:text-ink"
                    }`}>
                    {v.short}
                  </button>
                );
              })}
            </div>
          </Field>
          <Field label="Reach note (how many / which factories they cover)"><input value={form.reach_note} onChange={(e) => set("reach_note", e.target.value)} className={inp} /></Field>
          <Field label="Notes"><textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={3} className={`${inp} h-auto py-2 resize-y`} /></Field>
        </form>

        <footer className="px-6 py-3 border-t border-line flex items-center gap-2 bg-surface-2/50">
          <button type="button" onClick={() => !saving && onClose()} className="h-9 px-4 rounded-full border border-line-strong bg-surface hover:bg-surface-3 text-[12.5px] font-medium text-ink-soft cursor-pointer">Cancel</button>
          <div className="flex-1" />
          <button type="submit" form="new-network" disabled={saving} className="h-9 px-5 rounded-full bg-accent hover:bg-[#3a51ff] disabled:opacity-60 text-white text-[12.5px] font-medium cursor-pointer">
            {saving ? "Saving…" : "Save network"}
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
