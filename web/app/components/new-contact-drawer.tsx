"use client";

import { useEffect, useState } from "react";
import type { Contact } from "@/lib/types";
import { ROLE_CATEGORIES } from "@/lib/types";
import { useStore } from "@/lib/factories-store";
import { effectiveContactRoleLevel } from "@/lib/contact-role";
import { supabase } from "@/lib/supabase";
import { Input } from "@/design-system/components/input";
import { Textarea } from "@/design-system/components/textarea";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/design-system/components/toggle-group";
import { Field, FormDrawer } from "./form-drawer";
import { DateField } from "./date-field";
import { SelectField } from "./select-field";

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
    <FormDrawer
      eyebrow="New contact"
      title="Add a contact"
      description="Attach to a factory (or create one). It syncs to the Factory page instantly."
      formId="new-contact"
      submitLabel="Save contact"
      saving={saving}
      error={error}
      onClose={onClose}
      onSubmit={submit}
      className="sm:max-w-[480px]"
    >
      <Field label="Full name *">
        <Input autoFocus value={full_name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Role title">
          <Input value={role_title} onChange={(e) => setRole(e.target.value)} />
        </Field>
        <Field label="Role category">
          <SelectField
            value={role_category}
            onChange={(next) => setCat(next)}
            options={ROLE_CATEGORIES.map((r) => ({ value: r.key, label: r.label }))}
            emptyLabel="—"
          />
        </Field>
        <Field label="Email">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="LinkedIn">
          <Input value={linkedin_url} onChange={(e) => setLi(e.target.value)} />
        </Field>
        <Field label="Phone">
          <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </Field>
        <Field label="Next follow-up">
          <DateField value={next_follow_up} onChange={setNextFollowUp} />
        </Field>
      </div>
      <Field label="Notes">
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
      </Field>

      {/* Factory picker */}
      <div className="border-t pt-3">
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          value={factoryMode}
          // A group with `type="single"` hands back "" when the pressed item is
          // pressed again; the panel always needs one of the two modes.
          onValueChange={(value) => value && setFactoryMode(value as "existing" | "new")}
          className="mb-2"
        >
          <ToggleGroupItem value="existing" disabled={(factories?.length ?? 0) === 0}>
            Existing factory
          </ToggleGroupItem>
          <ToggleGroupItem value="new">New factory</ToggleGroupItem>
        </ToggleGroup>
        {factoryMode === "existing" ? (
          <Field label="Factory">
            <SelectField
              value={factoryId}
              onChange={setFactoryId}
              options={(factories ?? []).map((f) => ({ value: f.id, label: f.name }))}
            />
          </Field>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Factory name">
              <Input
                value={newFactoryName}
                onChange={(e) => setNewFactoryName(e.target.value)}
              />
            </Field>
            <Field label="Vertical">
              <SelectField
            value={newFactoryVertical}
            onChange={(next) => setNewFactoryVertical(next)}
            options={verticals.map((v) => ({ value: v.id, label: v.name }))}
          />
            </Field>
          </div>
        )}
      </div>
    </FormDrawer>
  );
}
