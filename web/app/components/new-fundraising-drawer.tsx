"use client";

import { useEffect, useState } from "react";
import type { FundraisingStage, FundraisingTrack } from "@/lib/types";
import { FUNDRAISING_TRACKS, fundraisingStages, fundraisingTypes } from "@/lib/types";
import { useStore } from "@/lib/factories-store";

export function NewFundraisingDrawer({ track, onClose }: { track: FundraisingTrack; onClose: () => void }) {
  const { createFundraisingLead, openFundraising } = useStore();
  const meta = FUNDRAISING_TRACKS.find((t) => t.key === track)!;
  const types = fundraisingTypes(track);
  const stages = fundraisingStages(track);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    type: types[0]?.key ?? "",
    stage: stages[0] as string,
    contact_person: "",
    amount: "",
    next_touch: "",
    notes: "",
  });

  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && !saving && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose, saving]);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return setError("Name is required.");
    const amount = form.amount.trim() === "" ? null : Number(form.amount);
    if (amount != null && !Number.isFinite(amount)) return setError("Amount must be a number.");
    setSaving(true);
    setError(null);
    try {
      const saved = await createFundraisingLead(track, {
        name: form.name.trim(),
        type: form.type || null,
        stage: form.stage as FundraisingStage,
        contact_person: form.contact_person.trim() || null,
        amount_target_or_offered: amount,
        next_touch: form.next_touch || null,
        notes: form.notes.trim() || null,
        source: "manual",
      });
      if (!saved) throw new Error("Save failed");
      openFundraising(saved.id);
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
          <span className="absolute left-0 top-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
          <div className="text-[10px] mono uppercase tracking-[0.14em] text-primary mb-1">New {meta.noun}</div>
          <h2 className="text-[22px] font-display text-ink">
            {track === "investor" ? "Add an investor" : "Add a competition or programme"}
          </h2>
          <p className="text-[12px] text-ink-soft mt-1">
            {track === "investor"
              ? "An angel, VC, accelerator or family office you’re raising from."
              : "A grant, competition, award, credit or programme you’re pursuing."}
          </p>
        </header>

        <form id="new-fundraising" onSubmit={submit} className="flex-1 overflow-y-auto px-6 py-5 space-y-3">
          {error && <div className="rounded-md border border-[color:var(--color-danger)]/30 tint-danger px-3 py-2 text-[12px] text-[color:var(--color-danger)]">{error}</div>}
          <Field label="Name *"><input autoFocus value={form.name} onChange={(e) => set("name", e.target.value)} className={inp} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Type">
              <select value={form.type} onChange={(e) => set("type", e.target.value)} className={inp}>
                {types.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
              </select>
            </Field>
            <Field label="Stage">
              <select value={form.stage} onChange={(e) => set("stage", e.target.value)} className={inp}>
                {stages.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Contact person"><input value={form.contact_person} onChange={(e) => set("contact_person", e.target.value)} className={inp} /></Field>
            <Field label={track === "investor" ? "Target amount (USD)" : "Amount offered (USD)"}>
              <input type="number" min="0" step="1000" value={form.amount} onChange={(e) => set("amount", e.target.value)} className={`${inp} mono`} placeholder="e.g. 500000" />
            </Field>
            <Field label="Next touch"><input type="date" value={form.next_touch} onChange={(e) => set("next_touch", e.target.value)} className={`${inp} mono`} /></Field>
          </div>
          <Field label="Notes"><textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={3} className={`${inp} h-auto py-2 resize-y`} /></Field>
        </form>

        <footer className="px-6 py-3 border-t border-line flex items-center gap-2 bg-surface-2/50">
          <button type="button" onClick={() => !saving && onClose()} className="h-9 px-4 rounded-full border border-line-strong bg-surface hover:bg-surface-3 text-[12.5px] font-medium text-ink-soft cursor-pointer">Cancel</button>
          <div className="flex-1" />
          <button type="submit" form="new-fundraising" disabled={saving} className="h-9 px-5 rounded-full bg-primary hover:bg-[#3a51ff] disabled:opacity-60 text-white text-[12.5px] font-medium cursor-pointer">
            {saving ? "Saving…" : "Save"}
          </button>
        </footer>
      </aside>
    </>
  );
}

const inp = "w-full h-9 rounded-md border border-line bg-canvas px-3 text-[13px] text-ink placeholder:text-muted-foreground focus:border-line-strong focus:outline-none";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[10px] mono uppercase tracking-[0.12em] text-muted-foreground block mb-1">{label}</span>
      {children}
    </label>
  );
}
