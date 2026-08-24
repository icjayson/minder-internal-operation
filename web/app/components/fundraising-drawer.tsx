"use client";

import Link from "next/link";
import { useState } from "react";
import type { FundraisingLead, FundraisingStage } from "@/lib/types";
import { FUNDRAISING_TRACKS, fundraisingTypes } from "@/lib/types";
import { useStore } from "@/lib/factories-store";
import { FundStagePill, ResultPill } from "./fund-stage-pill";
import { PriorityStars } from "./priority-stars";
import { FundraisingJourney } from "./fundraising-journey";
import { FundraisingWorkInventory } from "./fundraising-work-inventory";
import { ActivityRowActions } from "./activity-alert-countdown";
import { PanelShell } from "./form-drawer";
import { Button } from "@/design-system/components/button";
import { Input } from "@/design-system/components/input";
import { Textarea } from "@/design-system/components/textarea";
import { DateField } from "./date-field";
import { SelectField } from "./select-field";

export function FundraisingDrawer({
  leadId,
  onClose,
  variant = "drawer",
}: {
  leadId: string;
  onClose: () => void;
  variant?: "drawer" | "page";
}) {
  const {
    fundraisingLead,
    updateFundraisingLead,
    deleteFundraisingLead,
    activitiesOfFundraising,
    addFundraisingActivity,
    deleteActivity,
  } = useStore();
  const l = fundraisingLead(leadId);
  const [activityNote, setActivityNote] = useState("");

  if (!l) return null;

  const track = l.track;
  const meta = FUNDRAISING_TRACKS.find((t) => t.key === track)!;
  const types = fundraisingTypes(track);
  const activities = activitiesOfFundraising(track, leadId);
  const detailHref = `/fundraising/${track === "investor" ? "investors" : "competitions"}/${leadId}`;

  // Every edit bumps the stale timer, mirroring the network drawer.
  const set = (patch: Partial<FundraisingLead>) =>
    updateFundraisingLead(track, leadId, { ...patch, last_activity_at: new Date().toISOString() });

  async function logActivity() {
    if (!activityNote.trim()) return;
    await addFundraisingActivity(track, leadId, { type: "note", body: activityNote.trim() });
    setActivityNote("");
  }

  return (
    <PanelShell
      variant={variant}
      title={l.name}
      description="Fundraising lead details"
      width="sm:max-w-[640px]"
      onClose={onClose}
    >
        {/* Header */}
        <header className="relative bg-card px-5 py-4 border-b border-border sm:px-6">
          <span className="absolute left-0 top-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
          <div className="flex items-center gap-3">
            {variant === "drawer" ? (
              <Link
                href={detailHref}
                onClick={onClose}
                title="Open full page"
                aria-label="Open full page"
                className="mt-0.5 w-7 h-7 rounded-md grid place-items-center text-muted-foreground hover:bg-accent hover:text-foreground shrink-0"
              >
                <ExpandIcon />
              </Link>
            ) : (
              <Button variant="ghost" size="icon-sm" onClick={onClose} title={`Back to ${meta.label}`} aria-label={`Back to ${meta.label}`} className="mt-0.5 w-7 h-7 shrink-0">
                <BackIcon />
              </Button>
            )}
            <div className="min-w-0 flex-1">
              <div className="text-[10px] tabular-nums uppercase tracking-[0.14em] text-primary mb-1">
                {types.find((t) => t.key === l.type)?.label ?? meta.label}
              </div>
              <input
                defaultValue={l.name}
                aria-label="Name"
                onBlur={(e) => e.target.value.trim() && e.target.value !== l.name && set({ name: e.target.value.trim() })}
                className="block w-full text-heading-3 text-foreground bg-transparent border-none focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button variant="ghost" size="icon-sm" onClick={() => { if (confirm(`Delete ${l.name}?`)) { deleteFundraisingLead(track, leadId); onClose(); } }} className="w-7 h-7 hover:text-[color:var(--color-danger)] hover:bg-[color:var(--color-danger)]/10" aria-label="Delete" title="Delete">
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
            <span title="Stage"><FundStagePill stage={l.stage} /></span>
            {l.result && <span title="Result"><ResultPill result={l.result} /></span>}
            <Divider />
            <PriorityStars value={l.priority} onChange={(p) => set({ priority: p === l.priority ? 0 : p })} size={14} />
          </div>
        </header>

        <div className={variant === "drawer" ? "flex-1 overflow-y-auto" : ""}>
          {/* Pipeline stepper */}
          <div className="border-b border-border bg-card px-4 py-5 sm:px-6 lg:px-8">
            <FundraisingJourney
              track={track}
              stage={l.stage}
              result={l.result ?? null}
              nextTouch={l.next_touch}
              onStageChange={(next) => set({ stage: next })}
              onResultChange={(r) => set(r ? { result: r, stage: "Closed" } : { result: null })}
              compact={variant === "drawer"}
            />
          </div>

          <div className={variant === "drawer" ? "flex flex-col bg-card px-4 sm:px-6" : "grid grid-cols-1 items-start xl:grid-cols-[minmax(0,1.55fr)_minmax(360px,0.85fr)]"}>
            <div className={variant === "drawer" ? "contents" : "space-y-0 px-5 sm:px-6 lg:px-8"}>
              {/* Activity */}
              <Section title={`Activity · ${activities.length}`}>
                <div className="flex items-center gap-2 rounded-lg border border-border bg-background p-1.5 transition-colors focus-within:border-border-strong focus-within:bg-muted/35">
                  <input
                    value={activityNote}
                    onChange={(e) => setActivityNote(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") void logActivity(); }}
                    placeholder="Log a call, note, reply or update…"
                    className="h-8 min-w-0 flex-1 bg-transparent px-1 text-[12px] text-foreground focus:outline-none focus-visible:outline-none"
                  />
                  <Button size="sm" type="button" onClick={() => { void logActivity(); }} disabled={!activityNote.trim()} className="px-3 text-[11.5px]">
                    Add
                  </Button>
                </div>
                {activities.length === 0 ? (
                  <EmptyState title="No activity yet" body="Log the first touchpoint to start this timeline." />
                ) : (
                  <div className="relative ml-2 border-l border-border">
                    {activities.slice(0, 30).map((a) => (
                      <article key={a.id} className="group relative py-3 pl-6">
                        <span className="absolute -left-[11px] top-3.5 grid h-5 w-5 place-items-center rounded-full border border-border bg-card text-primary"><ActivityIcon /></span>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">{a.type.replace(/_/g, " ")}</span>
                          <span className="text-[10px] tabular-nums text-muted-foreground">{formatTimestamp(a.created_at)}</span>
                          <ActivityRowActions createdAt={a.created_at} onDelete={() => { void deleteActivity(a.id); }} />
                        </div>
                        <p className="mt-0.5 text-[12px] leading-relaxed text-foreground/80">{a.body ?? "—"}</p>
                      </article>
                    ))}
                  </div>
                )}
              </Section>

              {/* Profile */}
              <Section title="Profile">
                <div className="grid grid-cols-2 gap-3">
                  <LabelledSelect label="Type" value={l.type ?? ""} onChange={(v) => set({ type: v || null })}
                    options={types.map((t) => ({ value: t.key, label: t.label }))} />
                  <InputField label="Contact person" value={l.contact_person} onSave={(v) => set({ contact_person: v || null })} />
                  <NumberField
                    label={track === "investor" ? "Target amount (USD)" : "Amount offered (USD)"}
                    value={l.amount_target_or_offered}
                    onSave={(v) => set({ amount_target_or_offered: v })}
                  />
                  <label className="block">
                    <span className="text-[10px] tabular-nums uppercase tracking-[0.12em] text-muted-foreground block mb-1">Next touch</span>
                    <DateField value={l.next_touch} onChange={(v) => set({ next_touch: v || null })} className="h-9 text-[13px]" />
                  </label>
                </div>
              </Section>

              {/* Notes */}
              <Section title="Notes">
                <Textarea defaultValue={l.notes ?? ""} onBlur={(e) => e.target.value !== (l.notes ?? "") && set({ notes: e.target.value })} rows={4} placeholder="Terms discussed, contacts, requirements, deadlines…" className="w-full px-3 py-2 text-[13px] resize-y" />
              </Section>
            </div>

            <div className={
              variant === "drawer"
                ? "contents"
                : "space-y-4 border-t border-border px-5 py-5 sm:px-6 lg:px-8 xl:sticky xl:top-0 xl:border-l xl:border-t-0"
            }>
              {variant === "page" && (
                <FundraisingWorkInventory
                  track={track}
                  leadId={leadId}
                  onNearestTriggerChange={(date) => {
                    if (date !== (l.next_touch ?? null)) updateFundraisingLead(track, leadId, { next_touch: date });
                  }}
                />
              )}
            </div>
          </div>
        </div>
    </PanelShell>
  );
}

// ── small field helpers ─────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-border/60 py-5 last:border-b-0">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h3 className="text-[13px] font-semibold text-foreground">{title}</h3>
      </div>
      <div className="space-y-2.5">{children}</div>
    </section>
  );
}
function Divider() { return <span className="h-4 w-px bg-border-strong" />; }
function EmptyState({ title, body }: { title: string; body: string }) {
  return <div className="border-y border-dashed border-border px-4 py-5 text-center"><div className="text-[12px] font-medium text-foreground">{title}</div><p className="mx-auto mt-1 max-w-sm text-[11px] text-muted-foreground">{body}</p></div>;
}
function ActivityIcon() {
  return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M6 4h12v16H6zM9 8h6m-6 4h6" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
function ExpandIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M14 4h6v6M20 4l-7 7M10 20H4v-6M4 20l7-7" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
function BackIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="m15 5-7 7 7 7" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
function CloseIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="m6 6 12 12M18 6 6 18" strokeWidth="1.8" strokeLinecap="round" /></svg>;
}
function DeleteIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}
function InputField({ label, value, onSave }: { label: string; value: string | null; onSave: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-[10px] tabular-nums uppercase tracking-[0.12em] text-muted-foreground block mb-1">{label}</span>
      <Input defaultValue={value ?? ""} onBlur={(e) => e.target.value !== (value ?? "") && onSave(e.target.value.trim())} className="w-full h-9 px-2 text-[13px]" />
    </label>
  );
}
function NumberField({ label, value, onSave }: { label: string; value: number | null; onSave: (v: number | null) => void }) {
  return (
    <label className="block">
      <span className="text-[10px] tabular-nums uppercase tracking-[0.12em] text-muted-foreground block mb-1">{label}</span>
      <Input type="number" min="0" step="1000" defaultValue={value ?? ""} onBlur={(e) => { const raw = e.target.value.trim(); const next = raw === "" ? null : Number(raw); if (next != null && !Number.isFinite(next)) return; if (next !== (value ?? null)) onSave(next); }} className="w-full h-9 px-2 text-[13px] tabular-nums" />
    </label>
  );
}
function LabelledSelect({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[];
}) {
  return (
    <label className="block">
      <span className="text-[10px] tabular-nums uppercase tracking-[0.12em] text-muted-foreground block mb-1">{label}</span>
      <SelectField
        value={value}
        onChange={onChange}
        options={options}
        emptyLabel={"—"}
        className="h-9 text-[13px]"
      />
    </label>
  );
}
