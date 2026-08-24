"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Contact, Factory, FactoryWorkItem, Sequence, SequenceStep, Stage } from "@/lib/types";
import {
  GEO_OPTIONS,
  ROLE_CATEGORIES,
  STAGES,
  WORKER_BANDS,
} from "@/lib/types";
import { useStore } from "@/lib/factories-store";
import { effectiveContactRoleLevel } from "@/lib/contact-role";
import { normalizeUrl } from "@/lib/import-normalization";
import { supabase } from "@/lib/supabase";
import { StagePill } from "./stage-pill";
import { AssessmentScoreBadge, ScoreChip, ScoreBreakdownBars } from "./score-bars";
import { PriorityStars } from "./priority-stars";
import { ContactTree } from "./contact-tree";
import { ContextPanel } from "./context-panel";
import { FdeDeploymentProgress } from "./fde-deployment-progress";
import { WorkInventory } from "./work-inventory";
import { JourneyOverview } from "./journey-overview";
import { FactoryNotificationModal } from "./factory-notification-modal";
import { ActivityRowActions } from "./activity-alert-countdown";
import { PanelShell } from "./form-drawer";
import { toast } from "sonner";
import { Button } from "@/design-system/components/button";
import { Input } from "@/design-system/components/input";
import { Textarea } from "@/design-system/components/textarea";
import { NativeSelect, NativeSelectOption } from "@/design-system/components/native-select";

export function FactoryDrawer({
  factoryId,
  contactId,
  onClose,
  variant = "drawer",
  basePath = "/factories",
  showNotifications = true,
}: {
  factoryId: string;
  contactId?: string | null;
  onClose: () => void;
  variant?: "drawer" | "page";
  // Where the header expand / work-item links point ("/factories" or "/customers").
  basePath?: string;
  // Discord notifications are skipped in the Customer tracker.
  showNotifications?: boolean;
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
    markFactoryAsCustomer,
    unmarkFactoryAsCustomer,
    updateContact,
    deleteContact,
    setContactStage,
    setFactoryStage,
    addContact,
    addActivity,
    deleteActivity,
  } = useStore();
  // Customer context = viewing this record inside the Customer tracker.
  const isCustomerContext = basePath === "/customers";

  const f = factory(factoryId);
  const contacts = contactsOf(factoryId);
  const activities = activitiesOf(factoryId);

  const [scoring, setScoring] = useState(false);
  const [ctxStats, setCtxStats] = useState<{ count: number; latestAt: string | null }>({ count: 0, latestAt: null });
  const [error, setError] = useState<string | null>(null);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ subject: string; body: string; contact: string } | null>(null);
  const [editContact, setEditContact] = useState<Contact | "new" | null>(null);
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [steps, setSteps] = useState<SequenceStep[]>([]);
  const [activityNote, setActivityNote] = useState("");
  const [activityContact, setActivityContact] = useState("");
  const [editingProfile, setEditingProfile] = useState(false);
  const [assessmentOpen, setAssessmentOpen] = useState(false);
  const [nextWorkItem, setNextWorkItem] = useState<FactoryWorkItem | null>(null);
  const contactSectionRef = useRef<HTMLDivElement>(null);
  const workInventoryRef = useRef<HTMLDivElement>(null);
  const [notificationOpen, setNotificationOpen] = useState(false);

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

  useEffect(() => {
    const sb = supabase();
    let live = true;
    const loadNextWorkItem = async () => {
      const { data } = await sb
        .from("factory_work_items")
        .select("*")
        .eq("factory_id", factoryId)
        .neq("status", "done")
        .not("trigger_on", "is", null)
        .order("trigger_on", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (live) setNextWorkItem((data as FactoryWorkItem | null) ?? null);
    };
    void loadNextWorkItem();
    const channel = sb
      .channel(`factory-next-work-${factoryId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "factory_work_items", filter: `factory_id=eq.${factoryId}` },
        () => { void loadNextWorkItem(); },
      )
      .subscribe();
    return () => {
      live = false;
      sb.removeChannel(channel);
    };
  }, [factoryId]);

  if (!f) return null;
  const factoryName = f.name;
  const sourceNetwork = (networks ?? []).find((network) => network.id === f.network_id);
  const notificationDestination = sourceNetwork && (f.stage === "New" || f.stage === "Contacted")
    ? `Network · ${sourceNetwork.name}`
    : `Factory · ${f.name}`;

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

  async function changeStage(next: Stage) {
    const currentFactory = factory(factoryId);
    if (!currentFactory || next === currentFactory.stage) return;
    const previous = currentFactory.stage;
    await setFactoryStage(factoryId, next);
    toast.success(`Pipeline moved to ${next}`, {
      action: { label: "Undo", onClick: () => void setFactoryStage(factoryId, previous) },
    });
  }

  async function changeLadder(next: number) {
    const currentFactory = factory(factoryId);
    if (!currentFactory || next === currentFactory.ladder_level) return;
    const previous = currentFactory.ladder_level;
    await set({ ladder_level: next });
    toast.success(`Relationship moved to L${next}`, {
      action: { label: "Undo", onClick: () => void set({ ladder_level: previous }) },
    });
  }

  return (
    <>
      {showNotifications && notificationOpen && (
        <FactoryNotificationModal
          factoryId={factoryId}
          factoryName={f.name}
          destination={notificationDestination}
          onClose={() => setNotificationOpen(false)}
        />
      )}
      <PanelShell
        variant={variant}
        title={f.name}
        description="Factory details"
        width="sm:max-w-[720px]"
        onClose={onClose}
      >
        {/* Header */}
        <header className="relative bg-card px-5 py-4 border-b border-border sm:px-6">
          <span className="absolute left-0 top-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
          <div className="flex items-center gap-3">
            {variant === "drawer" ? (
              <Link
                href={`${basePath}/${factoryId}`}
                onClick={onClose}
                title="Open full page"
                aria-label="Open factory full page"
                className="mt-0.5 w-7 h-7 rounded-md grid place-items-center text-muted-foreground hover:bg-accent hover:text-foreground shrink-0"
              >
                <ExpandIcon />
              </Link>
            ) : (
              <Button variant="ghost" size="icon-sm" onClick={onClose} title="Back to factories" aria-label="Back to factories" className="mt-0.5 w-7 h-7 shrink-0">
                <BackIcon />
              </Button>
            )}
            <div className="min-w-0 flex-1">
              <div className="text-[10px] tabular-nums uppercase tracking-[0.14em] text-primary mb-1">
                {verticalName(f.vertical_id)}
              </div>
              {editingProfile ? (
                <Input defaultValue={f.name} aria-label="Factory name" onBlur={(e) => e.target.value.trim() && e.target.value !== f.name && set({ name: e.target.value.trim() })} className="block w-full px-2 py-1 text-[20px] font-display" />
              ) : (
                <h1 className="truncate text-heading-3 text-foreground">{f.name}</h1>
              )}
            </div>
            <div className="hidden items-center gap-2 sm:flex">
              {isCustomerContext && (
                <Button variant="outline" size="sm" type="button" onClick={async () => { if (!confirm(`Move ${f.name} back to the Factory tracker? It will be removed from Customers.`)) return; await unmarkFactoryAsCustomer(factoryId); onClose(); }} title="Undo customer — return this account to the Factory tracker" className="h-8 gap-1.5 rounded-full px-3.5 text-[11.5px] text-foreground/80 hover:text-foreground">
                  <UndoIcon /> Move to Factories
                </Button>
              )}
              {!isCustomerContext && (
                f.is_customer ? (
                  <span className="inline-flex items-center gap-1">
                    <Link
                      href={`/customers/${factoryId}`}
                      title="This account is tracked as a customer — open in the Customer tracker"
                      className="inline-flex h-8 items-center gap-1.5 rounded-full border border-success/40 bg-success-light px-3 text-[11.5px] font-medium text-success-dark"
                    >
                      <CustomerIcon /> Customer
                    </Link>
                    <Button variant="ghost" size="icon-sm" type="button" onClick={() => { void unmarkFactoryAsCustomer(factoryId); }} title="Undo — remove from the Customer tracker" aria-label="Undo mark as customer" className="h-8 w-8 rounded-full border border-border-strong bg-muted hover:text-[color:var(--color-danger)]">
                      <UndoIcon />
                    </Button>
                  </span>
                ) : (
                  <Button variant="outline" size="sm" type="button" onClick={() => { void markFactoryAsCustomer(factoryId); }} title="Promote this factory to the Customer tracker" className="h-8 gap-1.5 rounded-full px-3.5 text-[11.5px] text-foreground/80 hover:text-foreground">
                    <CustomerIcon /> Mark as Customer
                  </Button>
                )
              )}
              {showNotifications && (
                <Button size="sm" type="button" onClick={() => setNotificationOpen(true)} className="px-3.5 text-[11.5px]">
                  Create notification
                </Button>
              )}
              <button
                type="button"
                onClick={() => setEditingProfile((value) => !value)}
                className={`h-8 rounded-full border px-3.5 text-[11.5px] font-medium ${editingProfile ? "border-primary bg-primary-tint text-primary" : "border-border-strong bg-muted text-foreground/80 hover:text-foreground"}`}
              >
                {editingProfile ? "Done" : "Edit"}
              </button>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button variant="ghost" size="icon-sm" onClick={handleDelete} className="w-7 h-7 hover:text-[color:var(--color-danger)] hover:bg-[color:var(--color-danger)]/10" aria-label="Delete factory" title="Delete factory">
                <DeleteIcon />
              </Button>
              {variant === "drawer" && (
                <Button variant="ghost" size="icon-sm" onClick={onClose} className="w-7 h-7" aria-label="Close">
                  <CloseIcon />
                </Button>
              )}
            </div>
          </div>
          <div className="mt-3 flex items-center gap-3 flex-wrap pl-10">
            <ScoreChip score={f.score} grade={f.grade} />
            <Divider />
            <span title="Factory stage"><StagePill stage={f.stage} /></span>
            <Divider />
            <PriorityStars value={f.priority} onChange={(p) => set({ priority: p === f.priority ? 0 : p })} size={14} />
            <button type="button" onClick={() => { void set({ is_customer: !f.is_customer }); }} className={`h-7 rounded-full border px-2.5 text-[10.5px] font-medium ${f.is_customer ? "border-primary bg-primary-tint text-primary" : "border-border-strong bg-muted text-muted-foreground hover:text-foreground"}`} title="Customer status">{f.is_customer ? "Customer · FDE KIT" : "Mark as customer"}</button>
          </div>
        </header>

        {error && (
          <div className="mx-6 mt-3 rounded-md border border-[color:var(--color-danger)]/30 tint-danger px-3 py-2 text-xs text-[color:var(--color-danger)]">
            {error}
          </div>
        )}

        <div className={variant === "drawer" ? "flex-1 overflow-y-auto" : ""}>
          <div className="border-b border-border bg-card px-4 py-5 sm:px-6 lg:px-8">
            <JourneyOverview
              stage={f.stage}
              ladderLevel={f.ladder_level ?? 0}
              nextActionDue={f.next_action_due}
              onStageChange={(next) => { void changeStage(next); }}
              onLadderChange={(next) => { void changeLadder(next); }}
              compact={variant === "drawer"}
            />
          </div>

          <div className={variant === "drawer" ? "flex flex-col bg-card px-4 sm:px-6" : "grid grid-cols-1 items-start xl:grid-cols-[minmax(0,1.55fr)_minmax(360px,0.85fr)]"}>
            <div className={variant === "drawer" ? "contents" : "space-y-0 px-5 sm:px-6 lg:px-8"}>
              {/* Activity first: this is the account's operating narrative. */}
              <Section title={`Activity · ${activities.length}`} className={variant === "drawer" ? "order-[8]" : ""}>
                <div className="flex items-center gap-2 rounded-lg border border-border bg-background p-1.5 transition-colors focus-within:border-border-strong focus-within:bg-muted/35">
                  <NativeSelect value={activityContact} onChange={(e) => setActivityContact(e.target.value)} aria-label="Attribute activity to" className="h-8 shrink-0 max-w-[132px] bg-muted px-2 text-[11px] text-foreground/80">
                    <NativeSelectOption value="">Factory</NativeSelectOption>
                    {contacts.map((c) => <NativeSelectOption key={c.id} value={c.id}>{c.full_name}</NativeSelectOption>)}
                  </NativeSelect>
                  <input
                value={activityNote}
                    onChange={(e) => setActivityNote(e.target.value)}
                    onKeyDown={async (e) => {
                      if (e.key !== "Enter" || !activityNote.trim()) return;
                      await addActivity(factoryId, { type: "note", body: activityNote.trim(), evidence_level: f.evidence_level, contact_id: activityContact || null });
                      setActivityNote("");
                    }}
                    placeholder="Log a call, note, reply or evidence…"
                    className="h-8 min-w-0 flex-1 bg-transparent px-1 text-[12px] text-foreground focus:outline-none focus-visible:outline-none"
                  />
                  <Button size="sm" type="button" onClick={async () => { if (!activityNote.trim()) return; await addActivity(factoryId, { type: "note", body: activityNote.trim(), evidence_level: f.evidence_level, contact_id: activityContact || null }); setActivityNote(""); }} className="px-3 text-[11.5px]">
                    Add
                  </Button>
                </div>
                {activities.length === 0 ? (
                  <EmptyState title="No activity yet" body="Log the first touchpoint to start this account timeline." />
                ) : (
                  <div className="relative ml-2 space-y-0 border-l border-border">
                    {activities.slice(0, 30).map((a) => {
                      const contactName = contacts.find((c) => c.id === a.contact_id)?.full_name;
                      return (
                        <article key={a.id} className="group relative py-3 pl-6">
                          <span className="absolute -left-[11px] top-3.5 grid h-5 w-5 place-items-center rounded-full border border-border bg-card text-primary"><ActivityIcon type={a.type} /></span>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">{a.type.replace(/_/g, " ")}</span>
                            <span className="text-[10px] tabular-nums text-muted-foreground">{formatTimestamp(a.created_at)}</span>
                            {a.evidence_level != null && <span className="text-[9px] tabular-nums text-muted-foreground">E{a.evidence_level}</span>}
                            <ActivityRowActions
                              createdAt={a.created_at}
                              onDelete={() => { void deleteActivity(a.id); }}
                            />
                          </div>
                          <p className="mt-0.5 text-[12px] leading-relaxed text-foreground/80">
                            <strong className="font-medium text-foreground">{contactName ?? "Factory"}: </strong>{a.body ?? "—"}
                          </p>
                        </article>
                      );
                    })}
                  </div>
                )}
              </Section>

              {/* AI assessment is summarized first and expanded on demand. */}
              <Section
                title="AI assessment"
                className={variant === "drawer" ? "order-[4]" : ""}
                action={
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={score}
                      disabled={scoring}
                      title={contextStale ? "New context logged since last score" : undefined}
                      className={`h-7 px-3 rounded-full text-[11.5px] font-medium cursor-pointer disabled:opacity-60 transition-colors inline-flex items-center gap-1.5 ${contextStale
                          ? "bg-primary text-primary-foreground"
                          : "border border-border-strong bg-muted hover:bg-accent text-foreground/80 hover:text-foreground"
                        }`}
                    >
                      {contextStale && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                      {scoring ? "Scoring…" : f.score != null ? "Re-score" : "Score"}
                    </button>
                  </div>
                }
              >
                <div className="flex items-start gap-3 bg-primary-tint/35 px-3 py-2.5 rounded-xl">
                  <AssessmentScoreBadge score={f.score} grade={f.grade} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[12.5px] leading-relaxed text-foreground/80">
                      {f.score != null
                        ? "Qualification score based on the current factory profile, evidence and context."
                        : "Score this account against the design-partner qualification rubric."}
                    </p>
                    <Button variant="link" size="sm" type="button" onClick={() => setAssessmentOpen((value) => !value)} className="mt-2 text-[11px]">
                      {assessmentOpen ? "Hide score details" : "View score details"}
                    </Button>
                  </div>
                </div>
                {assessmentOpen && f.score != null && (
                  <div className="mt-3 border-t border-border/60 pt-3">
                    {contextStale && <p className="mb-2 text-[11.5px] text-[color:var(--color-warn)]">Context changed since last score — re-score to update.</p>}
                    <ScoreBreakdownBars breakdown={f.score_breakdown} />
                    {f.blocker && <p className="mt-3 text-[12px] text-[color:var(--color-warn)]">Blocker: {f.blocker}</p>}
                    {f.ai_reasoning && <p className="mt-3 text-[12px] leading-relaxed text-foreground/80">{f.ai_reasoning}</p>}
                  </div>
                )}
              </Section>

              {/* Profile */}
              <Section
                title="Profile"
                className={variant === "drawer" ? "order-[3]" : ""}
                action={<Button variant="link" size="sm" type="button" onClick={() => setEditingProfile((value) => !value)} className="text-[11px]">{editingProfile ? "Done editing" : "Edit profile"}</Button>}
              >
                {editingProfile ? <>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                      onSave={(v) => set({ website_url: normalizeUrl(v) || null })} tabular />
                  </div>
                  <TextareaField label="Company description" value={f.description} onSave={(v) => set({ description: v })} />
                  <TextareaField label="How to approach / Note" value={f.notes} onSave={(v) => set({ notes: v })} />
                </> : <ProfileSummary factory={f} vertical={verticalName(f.vertical_id)} network={(networks ?? []).find((network) => network.id === f.network_id)?.name ?? "No source network"} />}
              </Section>

              {/* Contacts */}
              <div ref={contactSectionRef} className={`scroll-mt-4 ${variant === "drawer" ? "order-[5]" : ""}`}>
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
                    onTargetChange={(id, isTarget) => updateContact(id, { is_primary_target: isTarget })}
                    onDelete={deleteContact}
                    onAdd={() => setEditContact("new")}
                    onEdit={(c) => setEditContact(c)}
                  />
                </Section>
              </div>

              {/* Latest draft */}
              {draft && (
                <Section title={`Draft for ${draft.contact}`} className={variant === "drawer" ? "order-[5]" : ""}>
                  {draft.subject && <div className="text-[12px] text-foreground/80 mb-1">Subject: {draft.subject}</div>}
                  <Textarea value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} rows={6} className="w-full px-3 py-2 text-[13px] leading-relaxed resize-y" />
                  <Button variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(draft.body)} className="mt-2 h-6 px-2 rounded-full text-[11px] tabular-nums uppercase tracking-wider text-foreground/80">
                    Copy
                  </Button>
                </Section>
              )}

            </div>
            <div className={
              variant === "drawer"
                ? "contents"
                : "space-y-4 border-t border-border px-5 py-5 sm:px-6 lg:px-8 xl:sticky xl:top-0 xl:border-l xl:border-t-0"
            }>
              <div className={variant === "drawer" ? "order-[6] border-b border-border/60 py-5" : ""}>
                <NextActionCard
                  item={nextWorkItem}
                  pic={contacts.find((contact) => contact.id === nextWorkItem?.pic_contact_id) ?? null}
                  onViewWork={() => {
                    if (workInventoryRef.current) {
                      workInventoryRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
                    } else {
                      window.location.assign(`${basePath}/${factoryId}`);
                    }
                  }}
                />
              </div>
              {/* Inputted context (files + notes, per-factory) */}
              <div className={variant === "drawer" ? "order-[7] border-b border-border/60 py-5" : ""}>
                <ContextPanel entityType="factory" entityId={factoryId} summary={f.context_summary} onStats={setCtxStats} />
              </div>
              {f.is_customer && (
                <div className={variant === "drawer" ? "order-[7] border-b border-border/60 py-5" : ""}>
                  <FdeDeploymentProgress factoryId={factoryId} />
                </div>
              )}
              {variant === "page" && (
                <div ref={workInventoryRef} className="scroll-mt-4">
                  <WorkInventory
                    factoryId={factoryId}
                    contacts={contacts}
                    onNextWorkItemChange={setNextWorkItem}
                    onNearestTriggerChange={(date) => {
                      // The nearest open work trigger is the single source of
                      // truth for the factory's next-action due date.
                      if (date !== (f.next_action_due ?? null)) {
                        updateFactory(factoryId, { next_action_due: date });
                      }
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </PanelShell>
    </>
  );
}

function NextActionCard({
  item,
  pic,
  onViewWork,
}: {
  item: FactoryWorkItem | null;
  pic: Contact | null;
  onViewWork: () => void;
}) {
  return (
    <section className="relative overflow-hidden rounded-lg border border-primary/25 bg-primary-tint p-4">
      <span className="absolute right-0 top-0 h-24 w-24 rounded-full bg-primary/10 blur-2xl" aria-hidden />
      <div className="relative flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground shadow-glow"><AlertIcon /></span>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-primary">Next best action</div>
          <p className="mt-1 text-[13px] font-medium leading-relaxed text-foreground">
            {item?.title || "No open work item has a next-step trigger."}
          </p>
          {item?.body && <p className="mt-1 line-clamp-2 text-[11.5px] leading-relaxed text-foreground/80">{item.body}</p>}
          {pic && <p className="mt-1 text-[10.5px] text-muted-foreground">PIC: <span className="text-foreground/80">{pic.full_name}</span></p>}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button size="sm" type="button" onClick={onViewWork} className="px-3.5 text-[11.5px]">
              {item ? "View work item" : "Open work inventory"}
            </Button>
            {item?.trigger_on && <span className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-border bg-card/70 px-2.5 py-1 text-[10.5px] text-foreground/80"><CalendarSmallIcon /> {formatShortDate(item.trigger_on)}</span>}
          </div>
        </div>
      </div>
    </section>
  );
}

function ProfileSummary({ factory, vertical, network }: { factory: Factory; vertical: string; network: string }) {
  const website = factory.website_url ?? factory.company_url;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-x-5 gap-y-3 sm:grid-cols-3">
        <ProfileDatum label="Vertical" value={vertical} />
        <ProfileDatum label="Source" value={network} />
        <ProfileDatum label="Region" value={factory.geo_tier ?? "Not set"} />
        <ProfileDatum label="Workers" value={factory.frontline_workers ?? "Not set"} />
        <ProfileDatum label="Location" value={factory.hq_location ?? "Not set"} />
        <div>
          <div className="text-[9.5px] font-semibold uppercase tracking-[0.11em] text-muted-foreground">Website</div>
          {website ? <a href={website} target="_blank" rel="noreferrer" className="mt-0.5 block truncate text-[12px] text-primary hover:underline">{website.replace(/^https?:\/\//, "")}</a> : <p className="mt-0.5 text-[12px] text-muted-foreground">Not set</p>}
        </div>
      </div>
      {(factory.description || factory.notes) && <div className="grid gap-3 sm:grid-cols-2">
        {factory.description && <ReadBlock label="Company snapshot" body={factory.description} />}
        {factory.notes && <ReadBlock label="Approach" body={factory.notes} />}
      </div>}
    </div>
  );
}

function ProfileDatum({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0"><div className="text-[9.5px] font-semibold uppercase tracking-[0.11em] text-muted-foreground">{label}</div><div className="mt-0.5 truncate text-[12px] text-foreground/80" title={value}>{value}</div></div>;
}

function ReadBlock({ label, body }: { label: string; body: string }) {
  const [expanded, setExpanded] = useState(false);
  const isApproach = label === "Approach";

  return (
    <article className="rounded-xl border border-border/60 bg-muted/55 p-3.5 shadow-sm transition-colors hover:border-border-strong">
      <div className="flex items-center gap-2.5">
        <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${isApproach ? "bg-success-light text-success-dark" : "bg-primary-tint text-primary"}`}>
          <ProfileCardIcon kind={isApproach ? "approach" : "company"} />
        </span>
        <h4 className="text-[10.5px] font-semibold uppercase tracking-[0.11em] text-foreground/80">{label}</h4>
      </div>
      <p className={`mt-2.5 text-[12px] leading-[1.55] text-foreground/80 ${expanded ? "whitespace-pre-line" : "line-clamp-2"}`}>
        {body}
      </p>
      <Button variant="link" size="sm" type="button" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)} className="mt-2 gap-1 text-[11px]">
        {expanded ? "Show less" : "Show more"}
        <ChevronIcon expanded={expanded} />
      </Button>
    </article>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return <div className="border-y border-dashed border-border px-4 py-5 text-center"><div className="text-[12px] font-medium text-foreground">{title}</div><p className="mx-auto mt-1 max-w-sm text-[11px] text-muted-foreground">{body}</p></div>;
}

function ActivityIcon({ type }: { type: string }) {
  if (type.includes("email") || type.includes("message")) return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 6h16v12H4zM4 7l8 6 8-6" strokeWidth="1.8" strokeLinejoin="round" /></svg>;
  if (type.includes("call")) return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M5 4h4l2 5-2.5 1.5a14 14 0 0 0 5 5L15 13l5 2v4c0 1-1 2-2 2C10 20 4 14 3 6c0-1 1-2 2-2Z" strokeWidth="1.6" strokeLinejoin="round" /></svg>;
  return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M6 4h12v16H6zM9 8h6m-6 4h6" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function AlertIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden><path d="M12 3 2.8 19h18.4L12 3Z" strokeWidth="1.7" strokeLinejoin="round" /><path d="M12 9v4.5m0 2.8v.2" strokeWidth="1.9" strokeLinecap="round" /></svg>;
}

function CalendarSmallIcon() {
  return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="5" width="18" height="16" rx="2" strokeWidth="1.7" /><path d="M8 3v4m8-4v4M3 10h18" strokeWidth="1.7" strokeLinecap="round" /></svg>;
}

function ChevronIcon({ expanded = false }: { expanded?: boolean }) {
  return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" className={`transition-transform ${expanded ? "rotate-180" : ""}`}><path d="m6 9 6 6 6-6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function ProfileCardIcon({ kind }: { kind: "company" | "approach" }) {
  if (kind === "approach") {
    return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden><circle cx="12" cy="12" r="8" strokeWidth="1.7" /><circle cx="12" cy="12" r="3" strokeWidth="1.7" /><path d="M12 2v3m0 14v3M2 12h3m14 0h3" strokeWidth="1.7" strokeLinecap="round" /></svg>;
  }
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden><path d="M4 20V7l8-4 8 4v13M8 20v-4h8v4M8 9h1m3 0h1m3 0h1M8 12h1m3 0h1m3 0h1" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function formatShortDate(value: string): string {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined });
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
      stage,
      ...(stage !== (contact?.stage ?? "New") ? { last_activity_at: new Date().toISOString() } : {}),
      email: email.trim() || null,
      linkedin_url: linkedin_url.trim() || null,
      phone: phone.trim() || null,
      notes: notes.trim() || null,
    });
  }

  return (
    <div className="mb-3 rounded-md border border-border-strong bg-muted/60 p-3 space-y-2">
      <div className="text-[10px] tabular-nums uppercase tracking-[0.12em] text-primary">
        {contact ? `Editing contact · ${contact.full_name}` : "New contact"}
      </div>
      <Input autoFocus placeholder="Full name *" value={full_name} onChange={(e) => setName(e.target.value)} className="w-full h-8 px-2 text-[13px]" />
      <div className="grid grid-cols-2 gap-2">
        <label className="block [&_[data-slot=native-select-wrapper]]:w-full">
          <span className="text-[9px] tabular-nums uppercase tracking-wider text-muted-foreground block mb-1">Contact stage</span>
          <NativeSelect value={stage} onChange={(e) => setStage(e.target.value as Stage)} className="w-full h-8 px-2 text-[12px]">
            {STAGES.map((option) => <NativeSelectOption key={option} value={option}>{option}</NativeSelectOption>)}
          </NativeSelect>
        </label>
        <Input placeholder="Role title" value={role_title} onChange={(e) => setRole(e.target.value)} className="h-8 self-end px-2 text-[13px]" />
        <NativeSelect value={role_category} onChange={(e) => setCat(e.target.value)} className="h-8 px-2 text-[12px]">
          <NativeSelectOption value="">Role category…</NativeSelectOption>
          {ROLE_CATEGORIES.map((r) => <NativeSelectOption key={r.key} value={r.key}>{r.label}</NativeSelectOption>)}
        </NativeSelect>
        <Input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-8 px-2 text-[13px] tabular-nums" />
        <Input placeholder="LinkedIn URL" value={linkedin_url} onChange={(e) => setLi(e.target.value)} className="h-8 px-2 text-[13px] tabular-nums" />
        <Input placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="h-8 px-2 text-[13px] tabular-nums" />
      </div>
      <Textarea placeholder="Contact notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full px-2 py-1.5 text-[12px] resize-y" />
      <div className="flex gap-2">
        <Button size="sm" onClick={submit} className="h-7 px-3 text-[11.5px]">Save</Button>
        <Button variant="outline" size="sm" onClick={onCancel} className="h-7 px-3 text-[11.5px] text-foreground/80">Cancel</Button>
      </div>
    </div>
  );
}

// ── small field helpers ─────────────────────────────────────────────
function Section({ title, action, children, className = "" }: { title: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`border-b border-border/60 py-5 last:border-b-0 ${className}`}>
      <div className="flex items-center justify-between gap-3 mb-3">
        <h3 className="text-[13px] font-semibold text-foreground">{title}</h3>
        {action}
      </div>
      <div className="space-y-2.5">{children}</div>
    </section>
  );
}
function Divider() { return <span className="h-4 w-px bg-border-strong" />; }
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
function CustomerIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
      <circle cx="9" cy="8" r="3" strokeWidth="1.6" />
      <path d="M3 20c0-3.3 2.7-6 6-6 1.4 0 2.7.5 3.7 1.3" strokeWidth="1.6" strokeLinecap="round" />
      <path d="m15 18 2 2 4-4" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function UndoIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
      <path d="M9 14 4 9l5-5" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 9h11a5 5 0 0 1 0 10h-3" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
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

function InputField({ label, value, onSave, type = "text", tabular = false }: {
  label: string; value: string | null; onSave: (v: string) => void; type?: string; tabular?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-[10px] tabular-nums uppercase tracking-[0.12em] text-muted-foreground block mb-1">{label}</span>
      <input type={type} defaultValue={value ?? ""} onBlur={(e) => e.target.value !== (value ?? "") && onSave(e.target.value.trim())}
        className={`w-full h-9 rounded-md border border-border bg-background px-2 text-[13px] text-foreground focus:border-border-strong focus:outline-none ${tabular ? "tabular-nums" : ""}`} />
    </label>
  );
}
function SelectField({ label, value, onChange, options, placeholder = "—" }: {
  label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; placeholder?: string;
}) {
  return (
    <label className="block [&_[data-slot=native-select-wrapper]]:w-full">
      <span className="text-[10px] tabular-nums uppercase tracking-[0.12em] text-muted-foreground block mb-1">{label}</span>
      <NativeSelect value={value} onChange={(e) => onChange(e.target.value)} className="w-full h-9 px-2 text-[13px]">
        <NativeSelectOption value="">{placeholder}</NativeSelectOption>
        {options.map((o) => <NativeSelectOption key={o.value} value={o.value}>{o.label}</NativeSelectOption>)}
      </NativeSelect>
    </label>
  );
}
function TextareaField({ label, value, onSave, rows = 3 }: {
  label: string; value: string | null; onSave: (v: string) => void; rows?: number;
}) {
  return (
    <label className="block">
      <span className="text-[10px] tabular-nums uppercase tracking-[0.12em] text-muted-foreground block mb-1">{label}</span>
      <Textarea defaultValue={value ?? ""} rows={rows} onBlur={(e) => e.target.value !== (value ?? "") && onSave(e.target.value.trim())} className="w-full px-2 py-1.5 text-[13px] leading-relaxed resize-y" />
    </label>
  );
}
