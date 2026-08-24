"use client";

import { useState } from "react";
import { NETWORK_TYPES, VERTICALS } from "@/lib/types";
import { useStore } from "@/lib/factories-store";
import { supabase } from "@/lib/supabase";
import { Input } from "@/design-system/components/input";
import { Textarea } from "@/design-system/components/textarea";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/design-system/components/native-select";
import { Toggle } from "@/design-system/components/toggle";
import { Field, FormDrawer } from "./form-drawer";

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
    <FormDrawer
      eyebrow="New network"
      title="Add a network"
      description="An association, accelerator or institute that introduces factories."
      formId="new-network"
      submitLabel="Save network"
      saving={saving}
      error={error}
      onClose={onClose}
      onSubmit={submit}
    >
      <Field label="Network name *">
        <Input autoFocus value={form.name} onChange={(e) => set("name", e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Type">
          <NativeSelect
            className="w-full"
            value={form.type}
            onChange={(e) => set("type", e.target.value)}
          >
            {NETWORK_TYPES.map((t) => (
              <NativeSelectOption key={t.key} value={t.key}>
                {t.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Country">
          <Input value={form.country} onChange={(e) => set("country", e.target.value)} />
        </Field>
        <Field label="HQ location">
          <Input value={form.hq_location} onChange={(e) => set("hq_location", e.target.value)} />
        </Field>
        <Field label="Website">
          <Input value={form.website_url} onChange={(e) => set("website_url", e.target.value)} />
        </Field>
      </div>
      <Field label="Focus verticals">
        <div className="flex flex-wrap gap-1.5">
          {VERTICALS.map((v) => (
            <Toggle
              key={v.key}
              size="sm"
              variant="outline"
              pressed={focus.includes(v.key)}
              onPressedChange={() => toggleFocus(v.key)}
              className="h-7 rounded-full px-3 text-[11.5px] data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
            >
              {v.short}
            </Toggle>
          ))}
        </div>
      </Field>
      <Field label="Reach note (how many / which factories they cover)">
        <Input value={form.reach_note} onChange={(e) => set("reach_note", e.target.value)} />
      </Field>
      <Field label="Notes">
        <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={3} />
      </Field>
    </FormDrawer>
  );
}
