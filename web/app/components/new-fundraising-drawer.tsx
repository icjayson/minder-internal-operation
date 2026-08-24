"use client";

import { useState } from "react";
import type { FundraisingStage, FundraisingTrack } from "@/lib/types";
import { FUNDRAISING_TRACKS, fundraisingStages, fundraisingTypes } from "@/lib/types";
import { useStore } from "@/lib/factories-store";
import { Input } from "@/design-system/components/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/design-system/components/native-select";
import { Textarea } from "@/design-system/components/textarea";
import { Field, FormDrawer } from "./form-drawer";
import { DateField } from "./date-field";

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
    <FormDrawer
      eyebrow={`New ${meta.noun}`}
      title={track === "investor" ? "Add an investor" : "Add a competition or programme"}
      description={
        track === "investor"
          ? "An angel, VC, accelerator or family office you\u2019re raising from."
          : "A grant, competition, award, credit or programme you\u2019re pursuing."
      }
      formId="new-fundraising"
      submitLabel="Save"
      saving={saving}
      error={error}
      onClose={onClose}
      onSubmit={submit}
    >
      <Field label="Name *">
        <Input autoFocus value={form.name} onChange={(e) => set("name", e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Type">
          <NativeSelect
            className="w-full"
            value={form.type}
            onChange={(e) => set("type", e.target.value)}
          >
            {types.map((t) => (
              <NativeSelectOption key={t.key} value={t.key}>
                {t.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Stage">
          <NativeSelect
            className="w-full"
            value={form.stage}
            onChange={(e) => set("stage", e.target.value)}
          >
            {stages.map((s) => (
              <NativeSelectOption key={s} value={s}>
                {s}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Contact person">
          <Input
            value={form.contact_person}
            onChange={(e) => set("contact_person", e.target.value)}
          />
        </Field>
        <Field label={track === "investor" ? "Target amount (USD)" : "Amount offered (USD)"}>
          <Input
            type="number"
            min="0"
            step="1000"
            placeholder="e.g. 500000"
            value={form.amount}
            onChange={(e) => set("amount", e.target.value)}
          />
        </Field>
        <Field label="Next touch">
          <DateField value={form.next_touch} onChange={(v) => set("next_touch", v)} />
        </Field>
      </div>
      <Field label="Notes">
        <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={3} />
      </Field>
    </FormDrawer>
  );
}
