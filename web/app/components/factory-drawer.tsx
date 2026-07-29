"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Contact, Factory, Sequence, SequenceStep, Stage } from "@/lib/types";
import {
  GEO_OPTIONS,
  LADDER,
  ROLE_CATEGORIES,
  STAGES,
  WORKER_BANDS,
} from "@/lib/types";
import { useStore } from "@/lib/factories-store";
import { effectiveContactRoleLevel } from "@/lib/contact-role";
import { normalizeUrl } from "@/lib/import-normalization";
import { supabase } from "@/lib/supabase";
import { StagePill } from "./stage-pill";
import { ScoreChip, ScoreBreakdownBars } from "./score-bars";
import { PriorityStars } from "./priority-stars";
import { ContactTree } from "./contact-tree";
import { ContextPanel } from "./context-panel";
import { WorkInventory } from "./work-inventory";

export function FactoryDrawer({
  factoryId,
  contactId,
  onClose,
  variant = "drawer",
}: {
  factoryId: string;
  contactId?: string | null;
  onClose: () => void;
  variant?: "drawer" | "page";
}) {
  const {
    factory,
    verticals,
    networks,
    verticalName,
    contactsOf,
    activitiesOf,
    updateFactory,
    deleteFactory,
    updateContact,
    deleteContact,
    setContactStage,
    setFactoryStage,
    addContact,
    addActivity,
  } = useStore();

  const f = factory(factoryId);
  const contacts = contactsOf(factoryId);
  const activities = activitiesOf(factoryId);

  const [scoring, setScoring] = useState(false);
  const [recommending, setRecommending] = useState(false);
  const [rec, setRec] = useState<{ recommendation: string; workflow?: { title: string; detail: string }[]; source?: string } | null>(null);
  const [ctxStats, setCtxStats] = useState<{ count: number; latestAt: string | null }>({ count: 0, latestAt: null });
  const [error, setError] = useState<string | null>(null);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ subject: string; body: string; contact: string } | null>(null);
  const [editContact, setEditContact] = useState<Contact | "new" | null>(null);
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [steps, setSteps] = useState<SequenceStep[]>([]);
  const [activityNote, setActivityNote] = useState("");
  const [activityContact, setActivityContact] = useState("");
  const contactSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (variant !== "drawer") return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose, variant]);

  useEffect(() => {
    if (!contactId) return;
    const selected = contacts.find((contact) => contact.id === contactId);
    if (selected) {
      setEditContact(selected);
      requestAnimationFrame(() =>
        contactSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
      );
    }
  }, [contactId]);

  useEffect(() => {
    if (!f?.vertical_id) {
      setSequences([]);
      setSteps([]);
      return;
    }
    let live = true;
    (async () => {
      const sb = supabase();
      const { data: seqData } = await sb
        .from("sequences")
        .select("*")
        .eq("vertical_id", f.vertical_id);
      const seqs = (seqData ?? []) as Sequence[];
      if (!live) return;
      setSequences(seqs);
      if (!seqs.length) return setSteps([]);
      const { data: stepData } = await sb
        .from("sequence_steps")
        .select("*")
        .in("sequence_id", seqs.map((s) => s.id))
        .order("step_index");
      if (live) setSteps((stepData ?? []) as SequenceStep[]);
    })();
    return () => { live = false; };
  }, [f?.vertical_id]);

  if (!f) return null;
  const factoryName = f.name;

  const set = (patch: Partial<Factory>) =>
    updateFactory(factoryId, { ...patch, last_activity_at: new Date().toISOString() });

  // Context added after the last score → prompt a re-score.
  // updated_at is a compatibility fallback for databases that have not yet run
  // the scored_at migration. The score route updates it when the score persists.
  const scoreBaseline = f.scored_at ?? (f.score != null ? f.updated_at : null);
  const scoredAtMs = scoreBaseline ? new Date(scoreBaseline).getTime() : null;
  const contextStale =
    f.score != null &&
    (scoredAtMs
      ? activities.some((a) => new Date(a.created_at).getTime() > scoredAtMs) ||
        (ctxStats.latestAt ? new Date(ctxStats.latestAt).getTime() > scoredAtMs : false)
      : activities.length > 0 || ctxStats.count > 0);

  async function score() {
    setScoring(true);
    setError(null);
    try {
      const res = await fetch("/api/score-factory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ factoryId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      // realtime will refresh; nothing else to do
    } catch (e) {
      setError(e instanceof Error ? e.message : "Score failed");
    } finally {
      setScoring(false);
    }
  }

  async function recommend() {
    setRecommending(true);
    setError(null);
    try {
      const res = await fetch("/api/recommend-next", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ factoryId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setRec({ recommendation: data.recommendation ?? "", workflow: data.workflow ?? [], source: data.source });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Recommendation failed");
    } finally {
      setRecommending(false);
    }
  }

  async function generate(contactId: string) {
    setGeneratingId(contactId);
    setError(null);
    try {
      const contact = contacts.find((x) => x.id === contactId);
      const sequenceId = contact?.sequence_id ?? sequences[0]?.id ?? null;
      const sequenceSteps = steps
        .filter((s) => s.sequence_id === sequenceId)
        .sort((a, b) => a.step_index - b.step_index);
      const nextIndex = contact?.sequence_state === "active"
        ? (contact.sequence_step ?? 0) + 1
        : 1;
      const sequenceStep = sequenceSteps.find((s) => s.step_index === nextIndex) ?? sequenceSteps[0];
      const res = await fetch("/api/generate-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId, sequenceStepId: sequenceStep?.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setDraft({ subject: data.subject ?? "", body: data.body ?? "", contact: contact?.full_name ?? "" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Draft failed");
    } finally {
      setGeneratingId(null);
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete ${factoryName}?`)) return;
    await deleteFactory(factoryId);
    onClose();
  }

  return (
    <>
      {variant === "drawer" && (
        <button onClick={onClose} aria-label="Close" className="fixed inset-0 bg-canvas/70 backdrop-blur-sm z-40" />
      )}
      <section className={
        variant === "drawer"
          ? "fixed right-0 top-0 bottom-0 w-full max-w-[560px] bg-surface border-l border-line-strong z-50 flex flex-col shadow-drawer"
          : "min-h-screen w-full bg-surface"
      }>
        {/* Header */}
        <header className="relative px-6 pt-5 pb-4 border-b border-line">
          <span className="absolute left-0 top-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-accent/40 to-transparent" />
          <div className="flex items-start gap-2 mb-3">
            {variant === "drawer" ? (
              <Link
                href={`/factories/${factoryId}`}
                onClick={onClose}
                title="Open full page"
                aria-label="Open factory full page"
                className="mt-0.5 w-7 h-7 rounded-md grid place-items-center text-muted hover:bg-surface-3 hover:text-ink shrink-0"
              >
                <ExpandIcon />
              </Link>
            ) : (
              <button
                onClick={onClose}
                title="Back to factories"
                aria-label="Back to factories"
                className="mt-0.5 w-7 h-7 rounded-md grid place-items-center text-muted hover:bg-surface-3 hover:text-ink cursor-pointer shrink-0"
              >
                <BackIcon />
              </button>
            )}
            <div className="min-w-0 flex-1 pr-4">
              <div className="text-[10px] mono uppercase tracking-[0.14em] text-accent mb-1">
                {verticalName(f.vertical_id)}
              </div>
              <input
                defaultValue={f.name}
                onBlur={(e) => e.target.value.trim() && e.target.value !== f.name && set({ name: e.target.value.trim() })}
                className="block w-full text-[22px] font-display text-ink bg-transparent border-none focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={handleDelete}
                className="w-7 h-7 rounded-md grid place-items-center text-muted hover:text-[color:var(--color-danger)] hover:bg-[color:var(--color-danger)]/10 cursor-pointer"
                aria-label="Delete factory" title="Delete factory">
                <DeleteIcon />
              </button>
              <button onClick={onClose} className="w-7 h-7 rounded-md grid place-items-center text-muted hover:bg-surface-3 hover:text-ink cursor-pointer" aria-label="Close">
                <CloseIcon />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <ScoreChip score={f.score} grade={f.grade} />
            <Divider />
            <span title="Factory stage"><StagePill stage={f.stage} /></span>
            <Divider />
            <PriorityStars value={f.priority} onChange={(p) => set({ priority: p === f.priority ? 0 : p })} size={14} />
          </div>
        </header>

        {error && (
          <div className="mx-6 mt-3 rounded-md border border-[color:var(--color-danger)]/30 tint-danger px-3 py-2 text-xs text-[color:var(--color-danger)]">
            {error}
          </div>
        )}

        <div className={
          variant === "drawer"
            ? "flex-1 overflow-y-auto px-6 py-5"
            : "grid grid-cols-1 xl:grid-cols-2 items-start"
        }>
          <div className={variant === "drawer" ? "space-y-6" : "space-y-6 p-6 lg:p-8"}>
          {/* AI assessment */}
          <Section
            title="AI assessment"
            action={
              <div className="flex items-center gap-1.5">
                <button
                  onClick={recommend}
                  disabled={recommending}
                  className="h-7 px-3 rounded-full border border-line-strong bg-surface-2 hover:bg-surface-3 text-[11.5px] font-medium text-ink-soft hover:text-ink cursor-pointer disabled:opacity-60 transition-colors"
                >
                  {recommending ? "Thinking…" : "Next action"}
                </button>
                <button
                  onClick={score}
                  disabled={scoring}
                  title={contextStale ? "New context logged since last score" : undefined}
                  className={`h-7 px-3 rounded-full text-[11.5px] font-medium cursor-pointer disabled:opacity-60 transition-colors inline-flex items-center gap-1.5 ${
                    contextStale
                      ? "bg-accent text-white hover:bg-[#3a51ff]"
                      : "border border-line-strong bg-surface-2 hover:bg-surface-3 text-ink-soft hover:text-ink"
                  }`}
                >
                  {contextStale && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                  {scoring ? "Scoring…" : f.score != null ? "Re-score" : "Score"}
                </button>
              </div>
            }
          >
            {f.score != null ? (
              <>
                {contextStale && (
                  <p className="mb-2 text-[11.5px] text-[color:var(--color-warn)]">
                    Context changed since last score — re-score to update.
                  </p>
                )}
                <ScoreBreakdownBars breakdown={f.score_breakdown} />
                {f.blocker && (
                  <p className="mt-3 text-[12px] text-[color:var(--color-warn)]">Blocker: {f.blocker}</p>
                )}
                {f.ai_reasoning && <p className="mt-2 text-[13px] text-ink-soft leading-relaxed">{f.ai_reasoning}</p>}
                {f.ai_recommendation && (
                  <p className="mt-2 text-[13px] text-accent leading-relaxed">→ {f.ai_recommendation}</p>
                )}
              </>
            ) : (
              <p className="text-[13px] text-muted">Not scored. Click Score to rate against the 100-pt design-partner rubric.</p>
            )}
            {rec?.workflow && rec.workflow.length > 0 && (
              <WorkflowFlow steps={rec.workflow} template={rec.source !== "ai"} />
            )}
          </Section>

          {/* Profile */}
          <Section title="Profile">
            <div className="grid grid-cols-2 gap-3">
              <SelectField label="Vertical" value={f.vertical_id ?? ""} onChange={(v) => set({ vertical_id: v || null })}
                options={verticals.map((v) => ({ value: v.id, label: v.name }))} />
              <SelectField label="Network (source)" value={f.network_id ?? ""} onChange={(v) => set({ network_id: v || null })}
                placeholder="None"
                options={(networks ?? []).map((nw) => ({ value: nw.id, label: nw.name }))} />
              <SelectField label="Geo" value={f.geo_tier ?? ""} onChange={(v) => set({ geo_tier: v || null })}
                options={GEO_OPTIONS.map((g) => ({ value: g.key, label: g.label }))} />
              <SelectField label="Frontline workers" value={f.frontline_workers ?? ""} onChange={(v) => set({ frontline_workers: v || null })}
                options={WORKER_BANDS.map((b) => ({ value: b, label: b }))} />
              <InputField label="Location" value={f.hq_location} onSave={(v) => set({ hq_location: v || null })} />
              <InputField label="Company website" value={f.website_url ?? f.company_url}
                onSave={(v) => set({ website_url: normalizeUrl(v) || null })} mono />
            </div>
            <TextareaField label="Company description" value={f.description} onSave={(v) => set({ description: v })} />
            <TextareaField label="How to approach / Note" value={f.notes} onSave={(v) => set({ notes: v })} />
          </Section>

          {/* Pipeline */}
          <Section title="Factory pipeline">
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-[10px] mono uppercase tracking-[0.12em] text-muted block mb-1">Factory stage</span>
                <select value={f.stage} onChange={(e) => setFactoryStage(factoryId, e.target.value as Stage)}
                  className="w-full h-9 rounded-md border border-line bg-canvas px-2 text-[13px] text-ink cursor-pointer focus:border-line-strong focus:outline-none">
                  {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="text-[10px] mono uppercase tracking-[0.12em] text-muted block mb-1">Next action due</span>
                <input type="date" value={f.next_action_due ?? ""} onChange={(e) => set({ next_action_due: e.target.value || null })}
                  className="w-full h-9 rounded-md border border-line bg-canvas px-2 text-[13px] text-ink mono focus:border-line-strong focus:outline-none" />
              </label>
              <SelectField label="Relationship ladder" value={String(f.ladder_level ?? 0)}
                onChange={(v) => set({ ladder_level: Number(v) })}
                options={LADDER.map((label, i) => ({ value: String(i), label: `L${i} · ${label}` }))} />
            </div>
          </Section>

          {/* Contacts */}
          <div ref={contactSectionRef} className="scroll-mt-4">
            <Section title={`Contacts · ${contacts.length}`}>
              {editContact && (
                <ContactForm
                  key={editContact === "new" ? "new" : editContact.id}
                  contact={editContact === "new" ? null : editContact}
                  onCancel={() => setEditContact(null)}
                  onSave={async (patch) => {
                    if (editContact === "new") await addContact(factoryId, patch);
                    else await updateContact(editContact.id, patch);
                    setEditContact(null);
                  }}
                />
              )}
              <ContactTree
                factoryName={f.name}
                contacts={contacts}
                onStageChange={(id, s) => setContactStage(id, s)}
                onDelete={deleteContact}
                onAdd={() => setEditContact("new")}
                onEdit={(c) => setEditContact(c)}
              />
            </Section>
          </div>

          {/* Latest draft */}
          {draft && (
            <Section title={`Draft for ${draft.contact}`}>
              {draft.subject && <div className="text-[12px] text-ink-soft mb-1">Subject: {draft.subject}</div>}
              <textarea value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} rows={6}
                className="w-full rounded-md bg-canvas border border-line px-3 py-2 text-[13px] text-ink leading-relaxed resize-y focus:border-line-strong focus:outline-none" />
              <button onClick={() => navigator.clipboard.writeText(draft.body)}
                className="mt-2 h-6 px-2 rounded-full border border-line-strong bg-surface-2 hover:bg-surface-3 text-[11px] mono uppercase tracking-wider text-ink-soft cursor-pointer">
                Copy
              </button>
            </Section>
          )}

          <Section title={`Activity · ${activities.length}`}>
            <div className="flex items-center gap-2">
              <select value={activityContact} onChange={(e) => setActivityContact(e.target.value)}
                title="Attribute this context to a contact (or the factory)"
                className="h-8 shrink-0 max-w-[120px] rounded-md border border-line bg-canvas px-2 text-[11px] text-ink-soft cursor-pointer focus:border-accent focus:outline-none">
                <option value="">Factory</option>
                {contacts.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
              </select>
              <input
                value={activityNote}
                onChange={(e) => setActivityNote(e.target.value)}
                onKeyDown={async (e) => {
                  if (e.key !== "Enter" || !activityNote.trim()) return;
                  await addActivity(factoryId, { type: "note", body: activityNote.trim(), evidence_level: f.evidence_level, contact_id: activityContact || null });
                  setActivityNote("");
                }}
                placeholder="Add a note or evidence update…"
                className="flex-1 h-8 rounded-md border border-line bg-canvas px-2 text-[12px] text-ink focus:border-accent focus:outline-none"
              />
              <button
                onClick={async () => {
                  if (!activityNote.trim()) return;
                  await addActivity(factoryId, { type: "note", body: activityNote.trim(), evidence_level: f.evidence_level, contact_id: activityContact || null });
                  setActivityNote("");
                }}
                className="h-8 px-3 rounded-full bg-accent hover:bg-[#3a51ff] text-white text-[11.5px] font-medium cursor-pointer"
              >
                Add
              </button>
            </div>
            {activities.length === 0 ? (
              <p className="text-[12px] text-muted">No activity recorded yet.</p>
            ) : (
              <div className="border-l border-line ml-1.5 space-y-3">
                {activities.slice(0, 30).map((a) => {
                  const contactName = contacts.find((c) => c.id === a.contact_id)?.full_name;
                  return (
                    <div key={a.id} className="relative pl-4">
                      <span className="absolute -left-[4px] top-1.5 w-1.5 h-1.5 rounded-full bg-accent" />
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] mono uppercase tracking-wider text-accent">{a.type.replace(/_/g, " ")}</span>
                        <span className="text-[10px] mono text-muted">{formatTimestamp(a.created_at)}</span>
                        {a.evidence_level != null && <span className="text-[9px] mono text-muted">E{a.evidence_level}</span>}
                      </div>
                      <p className="text-[12px] text-ink-soft leading-relaxed">
                        {contactName ? `${contactName}: ` : ""}{a.body ?? "—"}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </Section>

          </div>
          <div className={
            variant === "drawer"
              ? "mt-6"
              : "space-y-8 border-t xl:border-t-0 xl:border-l border-line p-6 lg:p-8"
          }>
            {/* Inputted context (files + notes, per-factory) */}
            <ContextPanel entityType="factory" entityId={factoryId} summary={f.context_summary} onStats={setCtxStats} />
            {variant === "page" && <WorkInventory factoryId={factoryId} contacts={contacts} />}
          </div>
        </div>
      </section>
    </>
  );
}

function ContactForm({
  contact,
  onSave,
  onCancel,
}: {
  contact: Contact | null;
  onSave: (patch: Partial<Contact>) => void;
  onCancel: () => void;
}) {
  const [full_name, setName] = useState(contact?.full_name ?? "");
  const [role_title, setRole] = useState(contact?.role_title ?? "");
  const [role_category, setCat] = useState(contact?.role_category ?? "");
  const [email, setEmail] = useState(contact?.email ?? "");
  const [linkedin_url, setLi] = useState(contact?.linkedin_url ?? "");
  const [phone, setPhone] = useState(contact?.phone ?? "");
  const [notes, setNotes] = useState(contact?.notes ?? "");
  const [stage, setStage] = useState<Stage>(contact?.stage ?? "New");

  function submit() {
    if (!full_name.trim()) return;
    const cat = ROLE_CATEGORIES.find((r) => r.key === role_category);
    onSave({
      full_name: full_name.trim(),
      role_title: role_title.trim() || null,
      role_category: role_category || null,
      role_level: effectiveContactRoleLevel(
        role_title,
        (cat?.level as Contact["role_level"]) ?? null,
      ),
      is_primary_target: cat?.primary ?? false,
      stage,
      ...(stage !== (contact?.stage ?? "New") ? { last_activity_at: new Date().toISOString() } : {}),
      email: email.trim() || null,
      linkedin_url: linkedin_url.trim() || null,
      phone: phone.trim() || null,
      notes: notes.trim() || null,
    });
  }

  return (
    <div className="mb-3 rounded-md border border-line-strong bg-surface-2/60 p-3 space-y-2">
      <div className="text-[10px] mono uppercase tracking-[0.12em] text-accent">
        {contact ? `Editing contact · ${contact.full_name}` : "New contact"}
      </div>
      <input autoFocus placeholder="Full name *" value={full_name} onChange={(e) => setName(e.target.value)}
        className="w-full h-8 rounded-md border border-line bg-canvas px-2 text-[13px] text-ink focus:border-accent focus:outline-none" />
      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="text-[9px] mono uppercase tracking-wider text-muted block mb-1">Contact stage</span>
          <select value={stage} onChange={(e) => setStage(e.target.value as Stage)}
            className="w-full h-8 rounded-md border border-line bg-canvas px-2 text-[12px] text-ink cursor-pointer focus:border-accent focus:outline-none">
            {STAGES.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </label>
        <input placeholder="Role title" value={role_title} onChange={(e) => setRole(e.target.value)}
          className="h-8 self-end rounded-md border border-line bg-canvas px-2 text-[13px] text-ink focus:border-accent focus:outline-none" />
        <select value={role_category} onChange={(e) => setCat(e.target.value)}
          className="h-8 rounded-md border border-line bg-canvas px-2 text-[12px] text-ink cursor-pointer focus:border-accent focus:outline-none">
          <option value="">Role category…</option>
          {ROLE_CATEGORIES.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
        </select>
        <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}
          className="h-8 rounded-md border border-line bg-canvas px-2 text-[13px] text-ink mono focus:border-accent focus:outline-none" />
        <input placeholder="LinkedIn URL" value={linkedin_url} onChange={(e) => setLi(e.target.value)}
          className="h-8 rounded-md border border-line bg-canvas px-2 text-[13px] text-ink mono focus:border-accent focus:outline-none" />
        <input placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)}
          className="h-8 rounded-md border border-line bg-canvas px-2 text-[13px] text-ink mono focus:border-accent focus:outline-none" />
      </div>
      <textarea placeholder="Contact notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
        className="w-full rounded-md border border-line bg-canvas px-2 py-1.5 text-[12px] text-ink resize-y focus:border-accent focus:outline-none" />
      <div className="flex gap-2">
        <button onClick={submit} className="h-7 px-3 rounded-full bg-accent hover:bg-[#3a51ff] text-white text-[11.5px] font-medium cursor-pointer">Save</button>
        <button onClick={onCancel} className="h-7 px-3 rounded-full border border-line-strong bg-surface text-[11.5px] text-ink-soft cursor-pointer">Cancel</button>
      </div>
    </div>
  );
}

// ── small field helpers ─────────────────────────────────────────────
function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[10px] mono uppercase tracking-[0.14em] text-muted font-medium">{title}</h3>
        {action}
      </div>
      <div className="space-y-2.5">{children}</div>
    </section>
  );
}
function Divider() { return <span className="h-4 w-px bg-line-strong" />; }
function ExpandIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path d="M14 4h6v6M20 4l-7 7M10 20H4v-6M4 20l7-7" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function BackIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path d="m15 5-7 7 7 7" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path d="m6 6 12 12M18 6 6 18" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
function DeleteIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Vertical flow diagram of the AI-proposed demo workflow.
function WorkflowFlow({ steps, template }: { steps: { title: string; detail: string }[]; template: boolean }) {
  return (
    <div className="mt-3 rounded-md border border-line bg-surface-2/50 p-2.5">
      <div className="text-[9px] mono uppercase tracking-[0.14em] text-accent mb-2">
        Demo workflow{template ? " · template" : ""}
      </div>
      <div className="relative">
        {steps.map((s, i) => (
          <div key={i} className="relative pl-7 pb-2.5 last:pb-0">
            {i < steps.length - 1 && <span className="absolute left-[10px] top-6 bottom-0 w-px bg-line-strong" />}
            <span className="absolute left-0 top-0.5 w-[21px] h-[21px] rounded-full bg-accent text-white text-[10px] font-semibold grid place-items-center mono">{i + 1}</span>
            <div className="rounded-md border border-line bg-surface px-2.5 py-1.5">
              <div className="text-[12px] font-medium text-ink leading-snug">{s.title}</div>
              {s.detail && <div className="text-[11px] text-ink-soft leading-relaxed mt-0.5">{s.detail}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function InputField({ label, value, onSave, type = "text", mono = false }: {
  label: string; value: string | null; onSave: (v: string) => void; type?: string; mono?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-[10px] mono uppercase tracking-[0.12em] text-muted block mb-1">{label}</span>
      <input type={type} defaultValue={value ?? ""} onBlur={(e) => e.target.value !== (value ?? "") && onSave(e.target.value.trim())}
        className={`w-full h-9 rounded-md border border-line bg-canvas px-2 text-[13px] text-ink focus:border-line-strong focus:outline-none ${mono ? "mono" : ""}`} />
    </label>
  );
}
function SelectField({ label, value, onChange, options, placeholder = "—" }: {
  label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-[10px] mono uppercase tracking-[0.12em] text-muted block mb-1">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full h-9 rounded-md border border-line bg-canvas px-2 text-[13px] text-ink cursor-pointer focus:border-line-strong focus:outline-none">
        <option value="">{placeholder}</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}
function TextareaField({ label, value, onSave, rows = 3 }: {
  label: string; value: string | null; onSave: (v: string) => void; rows?: number;
}) {
  return (
    <label className="block">
      <span className="text-[10px] mono uppercase tracking-[0.12em] text-muted block mb-1">{label}</span>
      <textarea defaultValue={value ?? ""} rows={rows}
        onBlur={(e) => e.target.value !== (value ?? "") && onSave(e.target.value.trim())}
        className="w-full rounded-md border border-line bg-canvas px-2 py-1.5 text-[13px] text-ink leading-relaxed resize-y focus:border-line-strong focus:outline-none" />
    </label>
  );
}
