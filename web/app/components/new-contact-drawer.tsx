"use client";

import { useEffect, useState } from "react";
import type { Contact } from "@/lib/types";
import { ROLE_CATEGORIES } from "@/lib/types";
import { useStore } from "@/lib/factories-store";
import { effectiveContactRoleLevel } from "@/lib/contact-role";
import { supabase } from "@/lib/supabase";

// Add a contact from the Contacts page. You can attach it to an existing
// factory or create a new factory inline — either way the Factory page syncs
// via realtime, and a factory can hold any number of contacts.
export function NewContactDrawer({ onClose }: { onClose: () => void }) {
  const { factories, verticals, openFactory } = useStore();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [full_name, setName] = useState("");
  const [role_title, setRole] = useState("");
  const [role_category, setCat] = useState("");
  const [email, setEmail] = useState("");
  const [linkedin_url, setLi] = useState("");
  const [phone, setPhone] = useState("");
  const [next_follow_up, setNextFollowUp] = useState("");
  const [notes, setNotes] = useState("");

  const [factoryMode, setFactoryMode] = useState<"existing" | "new">(
    (factories?.length ?? 0) > 0 ? "existing" : "new",
  );
  const [factoryId, setFactoryId] = useState("");
  const [newFactoryName, setNewFactoryName] = useState("");
  const [newFactoryVertical, setNewFactoryVertical] = useState("");

  useEffect(() => {
    if (factoryMode === "existing" && !factoryId && factories?.[0]) setFactoryId(factories[0].id);
    if (!newFactoryVertical && verticals[0]) setNewFactoryVertical(verticals[0].id);
  }, [factories, verticals, factoryMode, factoryId, newFactoryVertical]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && !saving && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose, saving]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!full_name.trim()) return setError("Contact name is required.");
    if (factoryMode === "existing" && !factoryId) return setError("Pick a factory.");
    if (factoryMode === "new" && !newFactoryName.trim()) return setError("New factory needs a name.");

    setSaving(true);
    setError(null);
    try {
      const sb = supabase();
      let fid = factoryId;

      // Create the factory first if needed → then the Factory page shows it.
      if (factoryMode === "new") {
        const { data, error: fErr } = await sb
          .from("factories")
          .insert({ name: newFactoryName.trim(), vertical_id: newFactoryVertical || null, source: "manual" })
          .select()
          .single();
        if (fErr) throw new Error(fErr.message);
        fid = data.id;
        fetch("/api/score-factory", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ factoryId: fid }),
        }).catch(() => {});
      }

      const cat = ROLE_CATEGORIES.find((r) => r.key === role_category);
      const contact: Partial<Contact> = {
        full_name: full_name.trim(),
        role_title: role_title.trim() || null,
        role_category: role_category || null,
        role_level: effectiveContactRoleLevel(
          role_title,
          (cat?.level as Contact["role_level"]) ?? null,
        ),
        email: email.trim() || null,
        linkedin_url: linkedin_url.trim() || null,
        phone: phone.trim() || null,
        next_follow_up: next_follow_up || null,
        notes: notes.trim() || null,
      };
      const { error: cErr } = await sb.from("contacts").insert({ factory_id: fid, ...contact });
      if (cErr) throw new Error(cErr.message);

      openFactory(fid);
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
      <aside className="fixed right-0 top-0 bottom-0 w-full max-w-[480px] bg-surface border-l border-line-strong z-50 flex flex-col shadow-drawer">
        <header className="relative px-6 pt-5 pb-4 border-b border-line">
          <span className="absolute left-0 top-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-accent/40 to-transparent" />
          <div className="text-[10px] mono uppercase tracking-[0.14em] text-accent mb-1">New contact</div>
          <h2 className="text-[22px] font-display text-ink">Add a contact</h2>
          <p className="text-[12px] text-ink-soft mt-1">Attach to a factory (or create one). It syncs to the Factory page instantly.</p>
        </header>

        <form id="new-contact" onSubmit={submit} className="flex-1 overflow-y-auto px-6 py-5 space-y-3">
          {error && <div className="rounded-md border border-[color:var(--color-danger)]/30 tint-danger px-3 py-2 text-[12px] text-[color:var(--color-danger)]">{error}</div>}

          <Field label="Full name *"><input autoFocus value={full_name} onChange={(e) => setName(e.target.value)} className={inp} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Role title"><input value={role_title} onChange={(e) => setRole(e.target.value)} className={inp} /></Field>
            <Field label="Role category">
              <select value={role_category} onChange={(e) => setCat(e.target.value)} className={inp}>
                <option value="">—</option>
                {ROLE_CATEGORIES.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
              </select>
            </Field>
            <Field label="Email"><input value={email} onChange={(e) => setEmail(e.target.value)} className={`${inp} mono`} /></Field>
            <Field label="LinkedIn"><input value={linkedin_url} onChange={(e) => setLi(e.target.value)} className={`${inp} mono`} /></Field>
            <Field label="Phone"><input value={phone} onChange={(e) => setPhone(e.target.value)} className={`${inp} mono`} /></Field>
            <Field label="Next follow-up"><input type="date" value={next_follow_up} onChange={(e) => setNextFollowUp(e.target.value)} className={`${inp} mono`} /></Field>
          </div>
          <Field label="Notes"><textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={`${inp} h-auto py-2 resize-y`} /></Field>

          {/* Factory picker */}
          <div className="pt-2 border-t border-line-soft">
            <div className="flex gap-2 mb-2">
              <Toggle active={factoryMode === "existing"} onClick={() => setFactoryMode("existing")} disabled={(factories?.length ?? 0) === 0}>Existing factory</Toggle>
              <Toggle active={factoryMode === "new"} onClick={() => setFactoryMode("new")}>New factory</Toggle>
            </div>
            {factoryMode === "existing" ? (
              <Field label="Factory">
                <select value={factoryId} onChange={(e) => setFactoryId(e.target.value)} className={inp}>
                  {(factories ?? []).map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </Field>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Factory name"><input value={newFactoryName} onChange={(e) => setNewFactoryName(e.target.value)} className={inp} /></Field>
                <Field label="Vertical">
                  <select value={newFactoryVertical} onChange={(e) => setNewFactoryVertical(e.target.value)} className={inp}>
                    {verticals.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                </Field>
              </div>
            )}
          </div>
        </form>

        <footer className="px-6 py-3 border-t border-line flex items-center gap-2 bg-surface-2/50">
          <button type="button" onClick={() => !saving && onClose()} className="h-9 px-4 rounded-full border border-line-strong bg-surface hover:bg-surface-3 text-[12.5px] font-medium text-ink-soft cursor-pointer">Cancel</button>
          <div className="flex-1" />
          <button type="submit" form="new-contact" disabled={saving} className="h-9 px-5 rounded-full bg-accent hover:bg-[#3a51ff] disabled:opacity-60 text-white text-[12.5px] font-medium cursor-pointer">
            {saving ? "Saving…" : "Save contact"}
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
function Toggle({ active, onClick, disabled, children }: { active: boolean; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      className={`h-8 px-3 rounded-full text-[12px] font-medium cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
        active ? "bg-accent text-white" : "border border-line-strong bg-surface hover:bg-surface-3 text-ink-soft"
      }`}>
      {children}
    </button>
  );
}
