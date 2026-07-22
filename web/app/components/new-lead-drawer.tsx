"use client";

import { useEffect, useState } from "react";
import type { Category, Stage } from "@/lib/types";
import {
  CATEGORIES,
  COMPANY_SIZES,
  SENIORITIES,
  STAGES,
} from "@/lib/types";
import { supabase } from "@/lib/supabase";
import { PriorityStars } from "./priority-stars";

type FormState = {
  full_name: string;
  title: string;
  seniority: string;
  linkedin_url: string;
  email: string;
  phone: string;
  company_name: string;
  website_url: string;
  industry: string;
  company_size: string;
  hq_location: string;
  category: string;
  stage: Stage;
  priority: number;
  notes: string;
};

const empty: FormState = {
  full_name: "",
  title: "",
  seniority: "",
  linkedin_url: "",
  email: "",
  phone: "",
  company_name: "",
  website_url: "",
  industry: "",
  company_size: "",
  hq_location: "",
  category: "",
  stage: "New",
  priority: 0,
  notes: "",
};

export function NewLeadDrawer({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState<FormState>(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && !saving && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose, saving]);

  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.full_name.trim() || !form.company_name.trim()) {
      setError("Name and company are required.");
      return;
    }
    setSaving(true);
    setError(null);

    // Coerce empties to null.
    const payload: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(form)) {
      if (v === "" || v === 0) continue;
      payload[k] = v;
    }
    // Always set stage (default "New") and source.
    payload.stage = form.stage;
    payload.source = "manual";

    try {
      const { data, error: insErr } = await supabase()
        .from("leads")
        .insert(payload)
        .select()
        .single();
      if (insErr) throw new Error(insErr.message);

      // Trigger scoring asynchronously — realtime will update the row in the table.
      if (data?.id) {
        fetch("/api/score-lead", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ leadId: data.id }),
        }).catch(() => {
          /* non-fatal: user can hit "npm run score" later */
        });
      }

      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        onClick={() => !saving && onClose()}
        aria-label="Close drawer"
        className="fixed inset-0 bg-canvas/70 backdrop-blur-sm z-40 animate-[fade_160ms_ease-out]"
      />
      <aside className="fixed right-0 top-0 bottom-0 w-full max-w-[520px] bg-surface border-l border-line-strong z-50 flex flex-col shadow-drawer animate-[slideIn_220ms_cubic-bezier(0.2,0.9,0.3,1)]">
        <header className="relative px-6 pt-5 pb-4 border-b border-line">
          <span className="absolute left-0 top-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-accent/40 to-transparent" />
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1 text-[10px] mono uppercase tracking-[0.14em] text-accent">
                <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                New lead · manual entry
              </div>
              <h2 className="text-[22px] font-display text-ink">Add a prospect</h2>
              <p className="text-[12px] text-ink-soft mt-1">
                Gemini will score ICP fit + priority after save.
              </p>
            </div>
            <button
              onClick={() => !saving && onClose()}
              className="w-7 h-7 rounded-md grid place-items-center text-muted hover:bg-surface-3 hover:text-ink cursor-pointer transition-colors duration-150"
              aria-label="Close"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="m6 6 12 12M18 6 6 18" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </header>

        <form
          id="new-lead-form"
          onSubmit={submit}
          className="flex-1 overflow-y-auto px-6 py-5 space-y-6"
        >
          {error && (
            <div className="rounded-md border border-[color:var(--color-danger)]/30 bg-[#2a1515] px-3 py-2 text-[12px] text-[color:var(--color-danger)]">
              {error}
            </div>
          )}

          <Section title="Person">
            <Input label="Full name *" value={form.full_name} onChange={(v) => set("full_name", v)} autoFocus />
            <Row>
              <Input label="Title" value={form.title} onChange={(v) => set("title", v)} />
              <Select
                label="Seniority"
                value={form.seniority}
                onChange={(v) => set("seniority", v)}
                options={SENIORITIES as readonly string[]}
              />
            </Row>
            <Input
              label="LinkedIn URL"
              value={form.linkedin_url}
              onChange={(v) => set("linkedin_url", v)}
              type="url"
              mono
            />
            <Row>
              <Input label="Email" value={form.email} onChange={(v) => set("email", v)} type="email" mono />
              <Input label="Phone" value={form.phone} onChange={(v) => set("phone", v)} mono />
            </Row>
          </Section>

          <Section title="Company">
            <Input
              label="Company name *"
              value={form.company_name}
              onChange={(v) => set("company_name", v)}
            />
            <Input
              label="Website"
              value={form.website_url}
              onChange={(v) => set("website_url", v)}
              type="url"
              mono
            />
            <Row>
              <Input label="Industry" value={form.industry} onChange={(v) => set("industry", v)} />
              <Select
                label="Size"
                value={form.company_size}
                onChange={(v) => set("company_size", v)}
                options={COMPANY_SIZES as readonly string[]}
              />
            </Row>
            <Input label="HQ location" value={form.hq_location} onChange={(v) => set("hq_location", v)} />
          </Section>

          <Section title="Pipeline">
            <Row>
              <Select
                label="Stage"
                value={form.stage}
                onChange={(v) => set("stage", v as Stage)}
                options={STAGES as readonly string[]}
                allowEmpty={false}
              />
              <Select
                label="Category"
                value={form.category}
                onChange={(v) => set("category", v as Category | "")}
                options={CATEGORIES as readonly string[]}
              />
            </Row>
            <label className="block">
              <span className="text-[10px] mono uppercase tracking-[0.12em] text-muted block mb-1">
                Priority
              </span>
              <div className="h-9 px-3 rounded-md bg-canvas border border-line inline-flex items-center">
                <PriorityStars
                  value={form.priority || null}
                  onChange={(p) => set("priority", p === form.priority ? 0 : p)}
                  size={15}
                />
              </div>
            </label>
          </Section>

          <Section title="Notes">
            <textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              rows={4}
              placeholder="Why you're adding this lead, context, source…"
              className="w-full rounded-md bg-canvas border border-line px-3 py-2 text-[13px] text-ink placeholder:text-muted focus:border-line-strong focus:outline-none transition-colors duration-150 resize-y"
            />
          </Section>
        </form>

        <footer className="px-6 py-3 border-t border-line flex items-center gap-2 bg-surface-2/50">
          <button
            type="button"
            onClick={() => !saving && onClose()}
            className="h-9 px-4 rounded-md border border-line-strong bg-surface hover:bg-surface-3 text-[12.5px] font-medium text-ink-soft hover:text-ink cursor-pointer transition-colors duration-150"
          >
            Cancel
          </button>
          <div className="flex-1" />
          <button
            type="submit"
            form="new-lead-form"
            disabled={saving}
            className="h-9 px-5 rounded-md bg-accent hover:bg-[#2bf094] disabled:opacity-60 disabled:cursor-wait text-canvas text-[12.5px] font-medium cursor-pointer transition-colors duration-150 inline-flex items-center gap-2"
          >
            {saving ? (
              <>
                <Spinner />
                Saving…
              </>
            ) : (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M12 5v14M5 12h14" strokeWidth="2.2" strokeLinecap="round" />
                </svg>
                Save lead
              </>
            )}
          </button>
        </footer>
      </aside>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-[10px] mono uppercase tracking-[0.14em] text-muted font-medium mb-2">
        {title}
      </h3>
      <div className="space-y-2.5">{children}</div>
    </section>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-2.5">{children}</div>;
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  mono = false,
  autoFocus = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  mono?: boolean;
  autoFocus?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-[10px] mono uppercase tracking-[0.12em] text-muted block mb-1">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoFocus={autoFocus}
        className={`w-full h-9 rounded-md border border-line bg-canvas px-3 text-[13px] text-ink placeholder:text-muted focus:border-line-strong focus:outline-none transition-colors duration-150 ${mono ? "mono" : ""}`}
      />
    </label>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
  allowEmpty = true,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
  allowEmpty?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-[10px] mono uppercase tracking-[0.12em] text-muted block mb-1">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-9 rounded-md border border-line bg-canvas px-2 text-[13px] text-ink cursor-pointer focus:border-line-strong focus:outline-none transition-colors duration-150"
      >
        {allowEmpty && <option value="">—</option>}
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

function Spinner() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" className="animate-spin">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
