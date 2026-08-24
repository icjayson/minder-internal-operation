"use client";

import { useState } from "react";
import type { Contact, Network, Stage } from "@/lib/types";
import { NETWORK_SCORE_DIMENSIONS, NETWORK_TYPES, ROLE_CATEGORIES, STAGES, VERTICALS } from "@/lib/types";
import { useStore } from "@/lib/factories-store";
import { effectiveContactRoleLevel } from "@/lib/contact-role";
import { StagePill } from "./stage-pill";
import { ScoreChip, ScoreBreakdownBars } from "./score-bars";
import { PriorityStars } from "./priority-stars";
import { ContextPanel } from "./context-panel";
import { ActivityRowActions } from "./activity-alert-countdown";
import { DetailDrawer } from "./form-drawer";
import { Button } from "@/design-system/components/button";
import { Input } from "@/design-system/components/input";
import { Textarea } from "@/design-system/components/textarea";
import { NativeSelect, NativeSelectOption } from "@/design-system/components/native-select";
import { DateField } from "./date-field";

export function NetworkDrawer({ networkId, onClose }: { networkId: string; onClose: () => void }) {
  const {
    network, contactsOfNetwork, factoriesOfNetwork, activitiesOfNetwork,
    updateNetwork, deleteNetwork, addNetworkContact, updateContact, deleteContact,
    addNetworkActivity, deleteActivity, openFactory,
  } = useStore();

  const n = network(networkId);
  const contacts = contactsOfNetwork(networkId);
  const factories = factoriesOfNetwork(networkId);
  const activities = activitiesOfNetwork(networkId);
  const [editContact, setEditContact] = useState<Contact | "new" | null>(null);
  const [scoring, setScoring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ctxStats, setCtxStats] = useState<{ count: number; latestAt: string | null }>({ count: 0, latestAt: null });
  const [activityNote, setActivityNote] = useState("");
  const [activityContact, setActivityContact] = useState("");

  const scoredAtMs = n?.scored_at ? new Date(n.scored_at).getTime() : null;
  const contextStale =
    !!n && n.score != null && scoredAtMs != null && ctxStats.latestAt != null &&
    new Date(ctxStats.latestAt).getTime() > scoredAtMs;

  async function score() {
    setScoring(true);
    setError(null);
    try {
      const res = await fetch("/api/score-network", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ networkId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Score failed");
    } finally {
      setScoring(false);
    }
  }

  if (!n) return null;

  const set = (patch: Partial<Network>) =>
    updateNetwork(networkId, { ...patch, last_activity_at: new Date().toISOString() });

  const focus = n.focus_verticals ?? [];
  const toggleFocus = (key: string) =>
    set({ focus_verticals: focus.includes(key) ? focus.filter((k) => k !== key) : [...focus, key] });

  async function logActivity() {
    if (!activityNote.trim()) return;
    await addNetworkActivity(networkId, {
      type: "note",
      body: activityNote.trim(),
      contact_id: activityContact || null,
    });
    setActivityNote("");
  }

  return (
    <DetailDrawer title={n.name} description="Network details" onClose={onClose}>
        <header className="relative px-6 pt-5 pb-4 border-b border-border">
          <span className="absolute left-0 top-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
          <div className="flex items-start justify-between mb-3">
            <div className="min-w-0 pr-4">
              <div className="text-[10px] tabular-nums uppercase tracking-[0.14em] text-primary mb-1">
                {NETWORK_TYPES.find((t) => t.key === n.type)?.label ?? "Network"}
              </div>
              <input
                defaultValue={n.name}
                onBlur={(e) => e.target.value.trim() && e.target.value !== n.name && set({ name: e.target.value.trim() })}
                className="block w-full text-[22px] font-display text-foreground bg-transparent border-none focus:outline-none"
              />
            </div>
            <Button variant="ghost" size="icon-sm" onClick={onClose} className="w-7 h-7" aria-label="Close">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="m6 6 12 12M18 6 6 18" strokeWidth="1.8" strokeLinecap="round" /></svg>
            </Button>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <ScoreChip score={n.score} grade={n.grade} />
            <Divider />
            <span title="Network stage"><StagePill stage={n.stage} /></span>
            <Divider />
            <PriorityStars value={n.priority} onChange={(p) => set({ priority: p === n.priority ? 0 : p })} size={14} />
          </div>
        </header>

        {error && (
          <div className="mx-6 mt-3 rounded-md border border-[color:var(--color-danger)]/30 tint-danger px-3 py-2 text-xs text-[color:var(--color-danger)]">
            {error}
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* AI assessment */}
          <Section
            title="AI assessment"
            action={
              <button
                onClick={score}
                disabled={scoring}
                title={contextStale ? "New context added since last score" : undefined}
                className={`h-7 px-3 rounded-full text-[11.5px] font-medium cursor-pointer disabled:opacity-60 transition-colors inline-flex items-center gap-1.5 ${
                  contextStale
                    ? "bg-primary text-primary-foreground"
                    : "border border-border-strong bg-muted hover:bg-accent text-foreground/80 hover:text-foreground"
                }`}
              >
                {contextStale && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                {scoring ? "Scoring…" : n.score != null ? "Re-score" : "Score"}
              </button>
            }
          >
            {n.score != null ? (
              <>
                {contextStale && (
                  <p className="mb-2 text-[11.5px] text-[color:var(--color-warn)]">Context changed since last score — re-score to update.</p>
                )}
                <ScoreBreakdownBars breakdown={n.score_breakdown} dimensions={NETWORK_SCORE_DIMENSIONS} />
                {n.blocker && <p className="mt-3 text-[12px] text-[color:var(--color-warn)]">Blocker: {n.blocker}</p>}
                {n.ai_reasoning && <p className="mt-2 text-[13px] text-foreground/80 leading-relaxed">{n.ai_reasoning}</p>}
                {n.ai_recommendation && <p className="mt-2 text-[13px] text-primary leading-relaxed">→ {n.ai_recommendation}</p>}
              </>
            ) : (
              <p className="text-[13px] text-muted-foreground">Not scored. Click Score to rate this network on the 100-pt referral rubric.</p>
            )}
          </Section>

          {/* Profile */}
          <Section title="Profile">
            <div className="grid grid-cols-2 gap-3">
              <SelectField label="Type" value={n.type ?? ""} onChange={(v) => set({ type: (v || null) as Network["type"] })}
                options={NETWORK_TYPES.map((t) => ({ value: t.key, label: t.label }))} />
              <InputField label="Country" value={n.country} onSave={(v) => set({ country: v })} />
              <InputField label="HQ location" value={n.hq_location} onSave={(v) => set({ hq_location: v })} />
              <InputField label="Website" value={n.website_url} onSave={(v) => set({ website_url: v })} tabular />
            </div>
            <div className="mt-1">
              <span className="text-[10px] tabular-nums uppercase tracking-[0.12em] text-muted-foreground block mb-1">Focus verticals</span>
              <div className="flex flex-wrap gap-1.5">
                {VERTICALS.map((v) => {
                  const on = focus.includes(v.key);
                  return (
                    <button key={v.key} type="button" onClick={() => toggleFocus(v.key)}
                      className={`h-7 px-3 rounded-full text-[11.5px] font-medium cursor-pointer border transition-colors ${
                        on ? "bg-primary text-primary-foreground border-primary" : "border-border-strong bg-muted text-foreground/80 hover:text-foreground"
                      }`}>
                      {v.short}
                    </button>
                  );
                })}
              </div>
            </div>
            <InputField label="Reach note" value={n.reach_note} onSave={(v) => set({ reach_note: v })} />
          </Section>

          {/* Pipeline */}
          <Section title="Network pipeline">
            <div className="grid grid-cols-2 gap-3">
              <label className="block [&_[data-slot=native-select-wrapper]]:w-full">
                <span className="text-[10px] tabular-nums uppercase tracking-[0.12em] text-muted-foreground block mb-1">Stage</span>
                <NativeSelect value={n.stage} onChange={(e) => set({ stage: e.target.value as Stage })} className="w-full h-9 px-2 text-[13px]">
                  {STAGES.map((s) => <NativeSelectOption key={s} value={s}>{s}</NativeSelectOption>)}
                </NativeSelect>
              </label>
              <label className="block">
                <span className="text-[10px] tabular-nums uppercase tracking-[0.12em] text-muted-foreground block mb-1">Next action due</span>
                <DateField value={n.next_action_due} onChange={(v) => set({ next_action_due: v || null })} className="h-9 text-[13px]" />
              </label>
            </div>
            <InputField label="Next action" value={n.next_action} onSave={(v) => set({ next_action: v })} />
          </Section>

          {/* Network + network-contact activities share one timeline. */}
          <Section title={`Activity · ${activities.length}`}>
            <div className="flex items-center gap-2 rounded-lg border border-border bg-background p-1.5 transition-colors focus-within:border-border-strong focus-within:bg-muted/35">
              <NativeSelect value={activityContact} onChange={(event) => setActivityContact(event.target.value)} aria-label="Attribute network activity to" className="h-8 max-w-[132px] shrink-0 bg-muted px-2 text-[11px] text-foreground/80">
                <NativeSelectOption value="">Network</NativeSelectOption>
                {contacts.map((contact) => <NativeSelectOption key={contact.id} value={contact.id}>{contact.full_name}</NativeSelectOption>)}
              </NativeSelect>
              <input value={activityNote} onChange={(event) => setActivityNote(event.target.value)}
                onKeyDown={(event) => { if (event.key === "Enter") void logActivity(); }}
                placeholder="Log a call, note, reply or evidence…"
                className="h-8 min-w-0 flex-1 bg-transparent px-1 text-[12px] text-foreground focus:outline-none focus-visible:outline-none" />
              <Button size="sm" type="button" onClick={() => { void logActivity(); }} disabled={!activityNote.trim()} className="px-3 text-[11.5px]">
                Add
              </Button>
            </div>
            {activities.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border px-4 py-5 text-center text-[11.5px] text-muted-foreground">No network activity yet.</p>
            ) : (
              <div className="relative ml-2 border-l border-border">
                {activities.slice(0, 30).map((activity) => {
                  const contactName = contacts.find((contact) => contact.id === activity.contact_id)?.full_name;
                  return (
                    <article key={activity.id} className="group relative py-3 pl-6">
                      <span className="absolute -left-[11px] top-3.5 grid h-5 w-5 place-items-center rounded-full border border-border bg-card text-primary"><NetworkActivityIcon /></span>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">{activity.type.replace(/_/g, " ")}</span>
                        <span className="text-[10px] tabular-nums text-muted-foreground">{formatActivityTimestamp(activity.created_at)}</span>
                        <ActivityRowActions
                          createdAt={activity.created_at}
                          onDelete={() => { void deleteActivity(activity.id); }}
                        />
                      </div>
                      <p className="mt-0.5 text-[12px] leading-relaxed text-foreground/80"><strong className="font-medium text-foreground">{contactName ?? "Network"}: </strong>{activity.body ?? "—"}</p>
                    </article>
                  );
                })}
              </div>
            )}
          </Section>

          {/* Sourced factories */}
          <Section title={`Factories sourced · ${factories.length}`}>
            {factories.length === 0 ? (
              <p className="text-[12px] text-muted-foreground">No factories linked yet. Set a factory&apos;s “Network” field to this network.</p>
            ) : (
              <div className="space-y-1">
                {factories.map((f) => (
                  <button key={f.id} onClick={() => openFactory(f.id)}
                    className="w-full flex items-center gap-2 h-10 px-3 rounded-md hover:bg-muted cursor-pointer text-left group">
                    <span className="min-w-0 flex-1">
                      <span className="text-[13px] font-medium text-foreground group-hover:text-primary transition-colors truncate block">{f.name}</span>
                      {f.hq_location && <span className="text-[11px] text-muted-foreground truncate block">{f.hq_location}</span>}
                    </span>
                    <ScoreChip score={f.score} grade={f.grade} />
                    <StagePill stage={f.stage} />
                  </button>
                ))}
              </div>
            )}
          </Section>

          {/* Direct contacts */}
          <Section title={`Contacts · ${contacts.length}`}>
            {editContact && (
              <NetworkContactForm
                key={editContact === "new" ? "new" : editContact.id}
                contact={editContact === "new" ? null : editContact}
                onCancel={() => setEditContact(null)}
                onSave={async (patch) => {
                  if (editContact === "new") await addNetworkContact(networkId, patch);
                  else await updateContact(editContact.id, patch);
                  setEditContact(null);
                }}
              />
            )}
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] text-muted-foreground">People you work with at this network.</span>
              <Button variant="outline" size="sm" onClick={() => setEditContact("new")} className="h-7 px-3 rounded-full text-[11.5px] text-foreground/80 hover:text-foreground">
                + Contact
              </Button>
            </div>
            {contacts.length === 0 ? (
              <p className="text-[12px] text-muted-foreground">No contacts yet.</p>
            ) : (
              <div className="space-y-1">
                {contacts.map((c) => (
                  <div key={c.id} className="group flex items-center gap-2 h-11 px-2 rounded-md hover:bg-muted/70">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${c.is_primary_target ? "bg-primary" : "bg-muted-foreground/40"}`} />
                    <button onClick={() => setEditContact(c)} className="min-w-0 flex-1 text-left cursor-pointer">
                      <span className="text-[13px] text-foreground truncate block">{c.full_name}</span>
                      {c.role_title && <span className="text-[11px] text-muted-foreground truncate block">{c.role_title}</span>}
                    </button>
                    <div className="relative inline-block" onClick={(e) => e.stopPropagation()}>
                      <StagePill stage={c.stage} />
                      <select value={c.stage}
                        onChange={(e) => updateContact(c.id, { stage: e.target.value as Stage, last_activity_at: new Date().toISOString() })}
                        className="absolute inset-0 opacity-0 cursor-pointer" aria-label="Change stage">
                        {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <Button variant="ghost" size="icon-sm" onClick={() => { if (confirm(`Delete ${c.full_name}?`)) deleteContact(c.id); }} className="opacity-0 group-hover:opacity-100 w-7 h-7 hover:text-[color:var(--color-danger)]" aria-label="Delete contact">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* Inputted context (files + notes, per-network) */}
          <ContextPanel entityType="network" entityId={networkId} summary={n.context_summary} onStats={setCtxStats} />

          {/* Notes */}
          <Section title="Notes">
            <Textarea defaultValue={n.notes ?? ""} onBlur={(e) => e.target.value !== (n.notes ?? "") && set({ notes: e.target.value })} rows={4} placeholder="Context, who introduced them, what they can unlock…" className="w-full px-3 py-2 text-[13px] resize-y" />
          </Section>
        </div>

        <footer className="px-6 py-3 border-t border-border flex items-center gap-2 bg-muted/50">
          {n.website_url && (
            <a href={n.website_url} target="_blank" rel="noreferrer"
              className="h-9 px-3 rounded-full border border-border-strong bg-card hover:bg-accent text-[12.5px] font-medium text-foreground/80 hover:text-foreground inline-flex items-center gap-1.5">
              Website
            </a>
          )}
          <div className="flex-1" />
          <Button variant="ghost" size="icon-sm" onClick={() => { if (confirm(`Delete ${n.name}?`)) { deleteNetwork(networkId); onClose(); } }} className="h-9 w-9 rounded-full border border-border-strong bg-card hover:bg-[color:var(--color-danger)]/10 hover:text-[color:var(--color-danger)]" aria-label="Delete network">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </Button>
        </footer>
    </DetailDrawer>
  );
}

function NetworkContactForm({
  contact, onSave, onCancel,
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
  const [next_follow_up, setNextFollowUp] = useState(contact?.next_follow_up ?? "");
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
      stage,
      ...(stage !== (contact?.stage ?? "New") ? { last_activity_at: new Date().toISOString() } : {}),
      email: email.trim() || null,
      linkedin_url: linkedin_url.trim() || null,
      phone: phone.trim() || null,
      next_follow_up: next_follow_up || null,
      notes: notes.trim() || null,
    });
  }

  return (
    <div className="mb-3 rounded-md border border-border-strong bg-muted/60 p-3 space-y-2">
      <div className="text-[10px] tabular-nums uppercase tracking-[0.12em] text-primary">
        {contact ? `Editing contact · ${contact.full_name}` : "New network contact"}
      </div>
      <Input autoFocus placeholder="Full name *" value={full_name} onChange={(e) => setName(e.target.value)} className="w-full h-8 px-2 text-[13px]" />
      <div className="grid grid-cols-2 gap-2">
        <label className="block [&_[data-slot=native-select-wrapper]]:w-full">
          <span className="text-[9px] tabular-nums uppercase tracking-wider text-muted-foreground block mb-1">Stage</span>
          <NativeSelect value={stage} onChange={(e) => setStage(e.target.value as Stage)} className="w-full h-8 px-2 text-[12px]">
            {STAGES.map((option) => <NativeSelectOption key={option} value={option}>{option}</NativeSelectOption>)}
          </NativeSelect>
        </label>
        <Input placeholder="Role title" value={role_title} onChange={(e) => setRole(e.target.value)} className="h-8 px-2 text-[13px]" />
        <NativeSelect value={role_category} onChange={(e) => setCat(e.target.value)} className="h-8 px-2 text-[12px]">
          <NativeSelectOption value="">Role category…</NativeSelectOption>
          {ROLE_CATEGORIES.map((r) => <NativeSelectOption key={r.key} value={r.key}>{r.label}</NativeSelectOption>)}
        </NativeSelect>
        <Input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-8 px-2 text-[13px] tabular-nums" />
        <Input placeholder="LinkedIn URL" value={linkedin_url} onChange={(e) => setLi(e.target.value)} className="h-8 px-2 text-[13px] tabular-nums" />
        <Input placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="h-8 px-2 text-[13px] tabular-nums" />
        <DateField size="sm" title="Next follow-up" placeholder="Next follow-up" value={next_follow_up} onChange={setNextFollowUp} className="h-8 text-[12px]" />
      </div>
      <Textarea placeholder="Contact notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full px-2 py-1.5 text-[12px] resize-y" />
      <div className="flex gap-2">
        <Button size="sm" onClick={submit} className="h-7 px-3 text-[11.5px]">Save</Button>
        <Button variant="outline" size="sm" onClick={onCancel} className="h-7 px-3 rounded-full text-[11.5px] text-foreground/80">Cancel</Button>
      </div>
    </div>
  );
}

// ── small field helpers ─────────────────────────────────────────────
function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[10px] tabular-nums uppercase tracking-[0.14em] text-muted-foreground font-medium">{title}</h3>
        {action}
      </div>
      <div className="space-y-2.5">{children}</div>
    </section>
  );
}
function Divider() { return <span className="h-4 w-px bg-border-strong" />; }

function NetworkActivityIcon() {
  return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden><path d="M6 4h12v16H6zM9 8h6m-6 4h6" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function formatActivityTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function InputField({ label, value, onSave, tabular = false }: {
  label: string; value: string | null; onSave: (v: string) => void; tabular?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-[10px] tabular-nums uppercase tracking-[0.12em] text-muted-foreground block mb-1">{label}</span>
      <input defaultValue={value ?? ""} onBlur={(e) => e.target.value !== (value ?? "") && onSave(e.target.value.trim())}
        className={`w-full h-9 rounded-md border border-border bg-background px-2 text-[13px] text-foreground focus:border-border-strong focus:outline-none ${tabular ? "tabular-nums" : ""}`} />
    </label>
  );
}
function SelectField({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[];
}) {
  return (
    <label className="block [&_[data-slot=native-select-wrapper]]:w-full">
      <span className="text-[10px] tabular-nums uppercase tracking-[0.12em] text-muted-foreground block mb-1">{label}</span>
      <NativeSelect value={value} onChange={(e) => onChange(e.target.value)} className="w-full h-9 px-2 text-[13px]">
        <NativeSelectOption value="">—</NativeSelectOption>
        {options.map((o) => <NativeSelectOption key={o.value} value={o.value}>{o.label}</NativeSelectOption>)}
      </NativeSelect>
    </label>
  );
}
