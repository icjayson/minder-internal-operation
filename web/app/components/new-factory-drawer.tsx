"use client";

import { useEffect, useState } from "react";
import { GEO_OPTIONS, WORKER_BANDS } from "@/lib/types";
import { useStore } from "@/lib/factories-store";
import { normalizeUrl } from "@/lib/import-normalization";
import { supabase } from "@/lib/supabase";
import { Checkbox } from "@/design-system/components/checkbox";
import { Input } from "@/design-system/components/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/design-system/components/native-select";
import { Textarea } from "@/design-system/components/textarea";
import { Field, FormDrawer } from "./form-drawer";

export function NewFactoryDrawer({ onClose, asCustomer = false }: { onClose: () => void; asCustomer?: boolean }) {
  const { verticals, networks, openFactory, openCustomer } = useStore();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    vertical_id: verticals[0]?.id ?? "",
    network_id: "",
    geo_tier: "",
    frontline_workers: "",
    hq_location: "",
    website_url: "",
    description: "",
    notes: "",
    is_customer: false,
  });

  useEffect(() => {
    if (!form.vertical_id && verticals[0]) setForm((f) => ({ ...f, vertical_id: verticals[0].id }));
  }, [verticals, form.vertical_id]);

  const set =(k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return setError("Name is required.");
    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        vertical_id: form.vertical_id || null,
        network_id: form.network_id || null,
        geo_tier: form.geo_tier || null,
        frontline_workers: form.frontline_workers || null,
        hq_location: form.hq_location.trim() || null,
        website_url: normalizeUrl(form.website_url) || null,
        description: form.description.trim() || null,
        notes: form.notes.trim() || null,
        source: "manual",
        is_customer: asCustomer || form.is_customer,
        ...(asCustomer || form.is_customer ? { customer_marked_at: new Date().toISOString() } : {}),
      };
      const { data, error: insErr } = await supabase().from("factories").insert(payload).select().single();
      if (insErr) throw new Error(insErr.message);
      if (data?.id) {
        fetch("/api/score-factory", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ factoryId: data.id }),
        }).catch(() => {});
        if (asCustomer) openCustomer(data.id);
        else openFactory(data.id);
      }
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <FormDrawer
      eyebrow={asCustomer ? "New customer" : "New factory"}
      title={asCustomer ? "Add a customer" : "Add a factory"}
      description="AI will score it against the design-partner rubric after save."
      formId="new-factory"
      submitLabel={asCustomer ? "Save customer" : "Save factory"}
      saving={saving}
      error={error}
      onClose={onClose}
      onSubmit={submit}
    >
      <Field label="Factory name *">
        <Input autoFocus value={form.name} onChange={(e) => set("name", e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Vertical">
          <NativeSelect
            className="w-full"
            value={form.vertical_id}
            onChange={(e) => set("vertical_id", e.target.value)}
          >
            {verticals.map((v) => (
              <NativeSelectOption key={v.id} value={v.id}>
                {v.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Geo">
          <NativeSelect
            className="w-full"
            value={form.geo_tier}
            onChange={(e) => set("geo_tier", e.target.value)}
          >
            <NativeSelectOption value="">—</NativeSelectOption>
            {GEO_OPTIONS.map((g) => (
              <NativeSelectOption key={g.key} value={g.key}>
                {g.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Network (source)">
          <NativeSelect
            className="w-full"
            value={form.network_id}
            onChange={(e) => set("network_id", e.target.value)}
          >
            <NativeSelectOption value="">None</NativeSelectOption>
            {(networks ?? []).map((nw) => (
              <NativeSelectOption key={nw.id} value={nw.id}>
                {nw.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Frontline workers">
          <NativeSelect
            className="w-full"
            value={form.frontline_workers}
            onChange={(e) => set("frontline_workers", e.target.value)}
          >
            <NativeSelectOption value="">—</NativeSelectOption>
            {WORKER_BANDS.map((b) => (
              <NativeSelectOption key={b} value={b}>
                {b}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Location">
          <Input value={form.hq_location} onChange={(e) => set("hq_location", e.target.value)} />
        </Field>
        <Field label="Company website">
          <Input value={form.website_url} onChange={(e) => set("website_url", e.target.value)} />
        </Field>
      </div>
      <Field label="Company description">
        <Textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={3} />
      </Field>
      <Field label="How to approach / Note">
        <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={3} />
      </Field>
      <label className="flex items-start gap-2.5 rounded-md border bg-muted/40 px-3 py-2.5 text-[12px]">
        <Checkbox
          className="mt-0.5"
          checked={form.is_customer}
          onCheckedChange={(checked) =>
            setForm((current) => ({ ...current, is_customer: checked === true }))
          }
        />
        <span>
          <strong className="font-medium text-foreground">Customer / design partner</strong>
          <br />
          <span className="text-[11px] text-muted-foreground">
            Create the FDE KIT deployment and checklist automatically after saving.
          </span>
        </span>
      </label>
    </FormDrawer>
  );
}
