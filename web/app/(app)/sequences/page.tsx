"use client";

import { useEffect, useState } from "react";
import type { Sequence, SequenceStep, Vertical } from "@/lib/types";
import { supabase } from "@/lib/supabase";
import { useStore } from "@/lib/factories-store";
import { PageHeader } from "@/app/components/page-header";

export default function SequencesPage() {
  const { contacts, factory } = useStore();
  const [verticals, setVerticals] = useState<Vertical[]>([]);
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [steps, setSteps] = useState<SequenceStep[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [previewContact, setPreviewContact] = useState("");
  const [generatingStep, setGeneratingStep] = useState<string | null>(null);
  const [preview, setPreview] = useState<Record<string, { subject: string; body: string }>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const sb = supabase();
      const [v, s, st] = await Promise.all([
        sb.from("verticals").select("*").order("sort"),
        sb.from("sequences").select("*"),
        sb.from("sequence_steps").select("*").order("step_index"),
      ]);
      setVerticals((v.data ?? []) as Vertical[]);
      setSequences((s.data ?? []) as Sequence[]);
      setSteps((st.data ?? []) as SequenceStep[]);
      setActive(((v.data ?? [])[0] as Vertical | undefined)?.id ?? null);
    })();
  }, []);

  const seq = sequences.find((s) => s.vertical_id === active);
  const seqSteps = steps.filter((s) => s.sequence_id === seq?.id).sort((a, b) => a.step_index - b.step_index);
  const eligibleContacts = (contacts ?? []).filter((c) => factory(c.factory_id)?.vertical_id === active);

  useEffect(() => {
    if (!eligibleContacts.some((c) => c.id === previewContact))
      setPreviewContact(eligibleContacts[0]?.id ?? "");
  }, [active, contacts, previewContact, eligibleContacts]);

  async function saveStep(id: string, patch: Partial<SequenceStep>) {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
    await supabase().from("sequence_steps").update(patch).eq("id", id);
  }

  async function generatePreview(step: SequenceStep) {
    if (!previewContact) return setError("Add or select a contact in this vertical first.");
    setGeneratingStep(step.id);
    setError(null);
    try {
      const res = await fetch("/api/generate-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId: previewContact, sequenceStepId: step.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Draft failed");
      setPreview((prev) => ({
        ...prev,
        [step.id]: { subject: data.subject ?? "", body: data.body ?? "" },
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Draft failed");
    } finally {
      setGeneratingStep(null);
    }
  }

  async function addD51() {
    if (!seq || seqSteps.some((s) => s.day_offset === 51)) return;
    const { data, error: insertError } = await supabase()
      .from("sequence_steps")
      .insert({
        sequence_id: seq.id,
        step_index: Math.max(5, ...seqSteps.map((s) => s.step_index)) + 1,
        day_offset: 51,
        intent: "re_touch",
        subject: "One last useful observation",
        body: "Optional one-month re-touch with a genuinely useful new observation. No pressure and a clear opt-out.",
      })
      .select("*")
      .single();
    if (insertError) return setError(insertError.message);
    setSteps((prev) => [...prev, data as SequenceStep]);
  }

  return (
    <>
      <PageHeader eyebrow="Sequences" title="Outreach sequences"
        subtitle="One 4–5 message cadence per vertical (Day 1 / 4 / 9 / 15 / 21). The AI writer personalises each step per contact." />
      <div className="px-8 py-5">
        {error && (
          <div className="mb-3 max-w-3xl rounded-md border border-[color:var(--color-danger)]/30 tint-danger px-3 py-2 text-[12px] text-[color:var(--color-danger)]">
            {error}
          </div>
        )}
        <div className="flex gap-2 mb-5 flex-wrap">
          {verticals.map((v) => (
            <button key={v.id} onClick={() => setActive(v.id)}
              className={`h-8 px-3 rounded-full text-[12px] font-medium cursor-pointer transition-colors ${
                active === v.id ? "bg-primary text-white" : "border border-border-strong bg-card hover:bg-accent text-foreground/80"
              }`}>
              {v.name}
            </button>
          ))}
        </div>

        <div className="max-w-3xl flex items-center gap-2 mb-3">
          <span className="text-[10px] tabular-nums uppercase tracking-wider text-muted-foreground">Preview as</span>
          <select value={previewContact} onChange={(e) => setPreviewContact(e.target.value)}
            className="h-8 min-w-56 rounded-md border border-border bg-card px-2 text-[12px] text-foreground focus:border-primary focus:outline-none">
            {eligibleContacts.length === 0 && <option value="">No contacts in this vertical</option>}
            {eligibleContacts.map((c) => <option key={c.id} value={c.id}>{c.full_name} · {c.role_title ?? "contact"}</option>)}
          </select>
          <div className="flex-1" />
          {seq && !seqSteps.some((s) => s.day_offset === 51) && (
            <button onClick={addD51}
              className="h-8 px-3 rounded-full border border-border-strong bg-card hover:bg-accent text-[11.5px] text-foreground/80 cursor-pointer">
              + Optional D51
            </button>
          )}
        </div>

        <div className="space-y-3 max-w-3xl">
          {seqSteps.map((s) => (
            <div key={s.id} className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center h-6 px-2.5 rounded-full bg-primary-tint text-primary tabular-nums text-[11px] font-semibold">Day {s.day_offset}</span>
                <span className="text-[11px] tabular-nums uppercase tracking-wider text-muted-foreground">{s.intent}</span>
                <div className="flex-1" />
                <button onClick={() => generatePreview(s)} disabled={!previewContact || generatingStep === s.id}
                  className="h-7 px-3 rounded-full bg-primary hover:bg-[#3a51ff] disabled:opacity-50 text-white text-[11px] font-medium cursor-pointer">
                  {generatingStep === s.id ? "Drafting…" : "AI draft this step"}
                </button>
              </div>
              <input defaultValue={s.subject ?? ""} placeholder="Subject" onBlur={(e) => saveStep(s.id, { subject: e.target.value })}
                className="w-full h-9 rounded-md border border-border bg-background px-3 text-[13px] text-foreground mb-2 focus:border-border-strong focus:outline-none" />
              <textarea defaultValue={s.body ?? ""} rows={3} onBlur={(e) => saveStep(s.id, { body: e.target.value })}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-[13px] text-foreground/80 leading-relaxed resize-y focus:border-border-strong focus:outline-none" />
              {preview[s.id] && (
                <div className="mt-3 rounded-md border border-primary/30 bg-primary-tint p-3">
                  <div className="text-[10px] tabular-nums uppercase tracking-wider text-primary mb-1">Personalized preview · saved to drafts</div>
                  <div className="text-[12px] text-foreground mb-1">Subject: {preview[s.id].subject}</div>
                  <p className="text-[12px] text-foreground/80 leading-relaxed whitespace-pre-wrap">{preview[s.id].body}</p>
                </div>
              )}
            </div>
          ))}
          {seqSteps.length === 0 && <p className="text-sm text-muted-foreground">No steps — run the SQL seed to create the default cadence.</p>}
        </div>
      </div>
    </>
  );
}
