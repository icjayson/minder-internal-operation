"use client";

import { useEffect, useRef, useState } from "react";
import type { Category, Lead, Stage } from "@/lib/types";
import {
  CATEGORIES,
  COMPANY_SIZES,
  SENIORITIES,
  STAGES,
} from "@/lib/types";
import { StagePill } from "./stage-pill";
import { CategoryPill } from "./category-pill";
import { PriorityStars } from "./priority-stars";
import { IcpFit } from "./icp-fit";

type Props = {
  lead: Lead;
  onClose: () => void;
  onUpdate: (patch: Partial<Lead>) => void;
  onDelete: () => void;
};

export function LeadDrawer({ lead, onClose, onUpdate, onDelete }: Props) {
  const [notes, setNotes] = useState(lead.notes ?? "");
  const [draft, setDraft] = useState(lead.outreach_draft ?? "");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setNotes(lead.notes ?? "");
    setDraft(lead.outreach_draft ?? "");
    setError(null);
  }, [lead.id, lead.notes, lead.outreach_draft]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  async function generateOutreach() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/generate-outreach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: lead.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setDraft(data.outreach);
      onUpdate({ outreach_draft: data.outreach });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate");
    } finally {
      setGenerating(false);
    }
  }

  function markContacted() {
    onUpdate({
      stage: "Contacted",
      last_contacted: new Date().toISOString(),
      touch_count: lead.touch_count + 1,
    });
  }

  // Save a field only when its value actually changed, and coerce empty → null
  // so the DB stores null rather than "".
  const save = <K extends keyof Lead>(key: K, raw: string) => {
    const next = raw.trim() === "" ? null : raw.trim();
    if ((lead[key] ?? null) === next) return;
    onUpdate({ [key]: next } as Partial<Lead>);
  };

  return (
    <>
      <button
        onClick={onClose}
        aria-label="Close drawer"
        className="fixed inset-0 bg-canvas/70 backdrop-blur-sm z-40 animate-[fade_160ms_ease-out]"
      />
      <aside className="fixed right-0 top-0 bottom-0 w-full max-w-[520px] bg-surface border-l border-line-strong z-50 flex flex-col shadow-drawer animate-[slideIn_220ms_cubic-bezier(0.2,0.9,0.3,1)]">
        {/* ── Header ─────────────────────────────────── */}
        <header className="relative px-6 pt-5 pb-4 border-b border-line">
          <span className="absolute left-0 top-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-accent/40 to-transparent" />

          <div className="flex items-start justify-between mb-3">
            <div className="min-w-0 pr-4">
              <div className="flex items-center gap-2 mb-1 text-[10px] mono uppercase tracking-[0.14em] text-accent">
                <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                Lead ·{" "}
                {new Date(lead.created_at).toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "short",
                })}
              </div>

              <EditableHeading
                value={lead.full_name}
                onSave={(v) => v.trim() && save("full_name", v)}
                placeholder="Full name"
              />
              <EditableSubtitle
                title={lead.title}
                company={lead.company_name}
                onSaveTitle={(v) => save("title", v)}
                onSaveCompany={(v) => v.trim() && save("company_name", v)}
              />
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-md grid place-items-center text-muted hover:bg-surface-3 hover:text-ink cursor-pointer transition-colors duration-150"
              aria-label="Close"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="m6 6 12 12M18 6 6 18" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <div className="flex items-center gap-3 text-sm flex-wrap">
            <IcpFit value={lead.icp_fit} />
            <Divider />
            <PriorityStars
              value={lead.priority}
              onChange={(p) => onUpdate({ priority: p === lead.priority ? 0 : p })}
              size={14}
            />
            <Divider />
            <StagePill stage={lead.stage} />
            {lead.category && (
              <>
                <Divider />
                <CategoryPill category={lead.category} />
              </>
            )}
          </div>
        </header>

        {/* ── Body ───────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          <Section title="Contact">
            <EditableField
              label="LinkedIn"
              value={lead.linkedin_url}
              onSave={(v) => save("linkedin_url", v)}
              type="url"
              mono
              link
            />
            <EditableField
              label="Email"
              value={lead.email}
              onSave={(v) => save("email", v)}
              type="email"
              mono
              link={lead.email ? `mailto:${lead.email}` : null}
            />
            <EditableField
              label="Phone"
              value={lead.phone}
              onSave={(v) => save("phone", v)}
              mono
            />
            <EditableSelect
              label="Seniority"
              value={lead.seniority}
              options={SENIORITIES as readonly string[]}
              onSave={(v) => save("seniority", v)}
            />
          </Section>

          <Section title="Company">
            <EditableField
              label="Website"
              value={lead.website_url}
              onSave={(v) => save("website_url", v)}
              type="url"
              mono
              link
            />
            <EditableField
              label="Industry"
              value={lead.industry}
              onSave={(v) => save("industry", v)}
            />
            <EditableSelect
              label="Size"
              value={lead.company_size}
              options={COMPANY_SIZES as readonly string[]}
              onSave={(v) => save("company_size", v)}
              mono
            />
            <EditableField
              label="HQ"
              value={lead.hq_location}
              onSave={(v) => save("hq_location", v)}
            />
          </Section>

          {(lead.reasoning || lead.pain_signals?.length || lead.archetype) && (
            <Section title="AI assessment">
              {lead.archetype && (
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-[10px] mono uppercase tracking-[0.12em] text-muted">
                    Archetype
                  </span>
                  <span className="text-[13px] text-ink">{lead.archetype}</span>
                </div>
              )}
              {lead.reasoning && (
                <p className="text-[13px] text-ink-soft leading-relaxed mb-3 whitespace-pre-wrap">
                  {lead.reasoning}
                </p>
              )}
              {lead.pain_signals && lead.pain_signals.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {lead.pain_signals.map((p, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center h-5 px-2 rounded-sm bg-[#2a2110] text-[color:var(--color-warn)] border border-[color:var(--color-warn)]/25 mono text-[10.5px] uppercase tracking-[0.05em]"
                    >
                      {p}
                    </span>
                  ))}
                </div>
              )}
            </Section>
          )}

          <Section title="Notes">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={() => {
                if (notes !== (lead.notes ?? "")) onUpdate({ notes });
              }}
              placeholder="Add notes — autosaves on blur…"
              rows={4}
              className="w-full rounded-md bg-canvas border border-line px-3 py-2 text-[13px] text-ink placeholder:text-muted focus:border-line-strong focus:outline-none transition-colors duration-150 resize-y"
            />
          </Section>

          <Section
            title="Outreach"
            action={
              <button
                onClick={generateOutreach}
                disabled={generating}
                className="h-7 px-3 rounded-md bg-accent hover:bg-[#2bf094] text-canvas text-[11.5px] font-medium cursor-pointer disabled:opacity-60 disabled:cursor-wait transition-colors duration-150 inline-flex items-center gap-1.5"
              >
                {generating ? (
                  <>
                    <Spinner />
                    Generating…
                  </>
                ) : (
                  <>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path d="M12 2 9 9l-7 3 7 3 3 7 3-7 7-3-7-3-3-7Z" strokeWidth="1.6" strokeLinejoin="round" />
                    </svg>
                    {draft ? "Regenerate" : "Generate"}
                  </>
                )}
              </button>
            }
          >
            {error && (
              <div className="mb-2 rounded-md border border-[color:var(--color-danger)]/30 bg-[#2a1515] px-3 py-2 text-xs text-[color:var(--color-danger)]">
                {error}
              </div>
            )}
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={() => {
                if (draft !== (lead.outreach_draft ?? "")) onUpdate({ outreach_draft: draft });
              }}
              placeholder="AI will write a short, pain-specific intro. < 80 words."
              rows={6}
              className="w-full rounded-md bg-canvas border border-line px-3 py-2 text-[13px] text-ink placeholder:text-muted focus:border-line-strong focus:outline-none transition-colors duration-150 resize-y leading-relaxed"
            />
            {draft && (
              <div className="flex items-center gap-2 mt-2">
                <button
                  onClick={() => navigator.clipboard.writeText(draft)}
                  className="h-6 px-2 rounded-sm border border-line-strong bg-surface-2 hover:bg-surface-3 text-[11px] mono uppercase tracking-wider text-ink-soft cursor-pointer transition-colors duration-150"
                >
                  Copy
                </button>
                <span className="text-[10.5px] text-muted mono">
                  {draft.trim().split(/\s+/).length} words
                </span>
              </div>
            )}
          </Section>

          <Section title="Pipeline">
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-[10px] mono uppercase tracking-[0.12em] text-muted block mb-1">
                  Stage
                </span>
                <select
                  value={lead.stage}
                  onChange={(e) => onUpdate({ stage: e.target.value as Stage })}
                  className="w-full h-9 rounded-md border border-line bg-canvas px-2 text-[13px] text-ink cursor-pointer focus:border-line-strong focus:outline-none transition-colors duration-150"
                >
                  {STAGES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-[10px] mono uppercase tracking-[0.12em] text-muted block mb-1">
                  Category
                </span>
                <select
                  value={lead.category ?? ""}
                  onChange={(e) =>
                    onUpdate({
                      category: (e.target.value || null) as Category | null,
                    })
                  }
                  className="w-full h-9 rounded-md border border-line bg-canvas px-2 text-[13px] text-ink cursor-pointer focus:border-line-strong focus:outline-none transition-colors duration-150"
                >
                  <option value="">—</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block col-span-2">
                <span className="text-[10px] mono uppercase tracking-[0.12em] text-muted block mb-1">
                  Next follow-up
                </span>
                <input
                  type="date"
                  value={lead.next_follow_up ?? ""}
                  onChange={(e) => onUpdate({ next_follow_up: e.target.value || null })}
                  className="w-full h-9 rounded-md border border-line bg-canvas px-2 text-[13px] text-ink mono focus:border-line-strong focus:outline-none transition-colors duration-150"
                />
              </label>
            </div>
            <div className="mt-3 text-[11px] text-muted mono">
              {lead.touch_count > 0
                ? `${lead.touch_count} touch${lead.touch_count > 1 ? "es" : ""}`
                : "No touches yet"}
              {lead.last_contacted &&
                ` · last contacted ${new Date(lead.last_contacted).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" })}`}
            </div>
          </Section>
        </div>

        {/* ── Footer ─────────────────────────────────── */}
        <footer className="px-6 py-3 border-t border-line flex items-center gap-2 bg-surface-2/50">
          <button
            onClick={markContacted}
            className="flex-1 h-9 rounded-md bg-accent hover:bg-[#2bf094] text-canvas text-[12.5px] font-medium cursor-pointer transition-colors duration-150 inline-flex items-center justify-center gap-2"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M5 12l4 4L19 6" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Mark contacted
          </button>
          {lead.linkedin_url && (
            <a
              href={lead.linkedin_url}
              target="_blank"
              rel="noreferrer"
              className="h-9 px-3 rounded-md border border-line-strong bg-surface hover:bg-surface-3 text-[12.5px] font-medium text-ink-soft hover:text-ink cursor-pointer transition-colors duration-150 inline-flex items-center gap-1.5"
            >
              LinkedIn
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M7 17 17 7M8 7h9v9" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </a>
          )}
          <button
            onClick={() => {
              if (confirm(`Delete ${lead.full_name}? This cannot be undone.`)) onDelete();
            }}
            className="h-9 w-9 rounded-md border border-line-strong bg-surface hover:bg-[#2a1515] hover:border-[color:var(--color-danger)]/30 text-muted hover:text-[color:var(--color-danger)] cursor-pointer transition-colors duration-150 grid place-items-center"
            aria-label="Delete lead"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path
                d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </footer>
      </aside>

      <style jsx global>{`
        @keyframes slideIn {
          from { transform: translateX(24px); opacity: 0; }
          to   { transform: translateX(0);     opacity: 1; }
        }
        @keyframes fade {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>
    </>
  );
}

// ── Helpers ───────────────────────────────────────────

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[10px] mono uppercase tracking-[0.14em] text-muted font-medium">
          {title}
        </h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function Divider() {
  return <span className="h-4 w-px bg-line-strong" />;
}

/** Click-to-edit heading (the lead name). */
function EditableHeading({
  value,
  onSave,
  placeholder,
}: {
  value: string;
  onSave: (v: string) => void;
  placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setDraft(value), [value]);
  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          setEditing(false);
          if (draft.trim() && draft !== value) onSave(draft);
          else setDraft(value);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "Escape") {
            setDraft(value);
            setEditing(false);
          }
        }}
        placeholder={placeholder}
        className="block w-full text-[22px] font-display text-ink bg-canvas border border-line-strong rounded-md px-2 py-0.5 focus:border-accent focus:outline-none transition-colors duration-150 mb-0.5"
      />
    );
  }

  return (
    <h2
      onClick={() => setEditing(true)}
      title="Click to edit"
      className="text-[22px] font-display text-ink mb-0.5 truncate cursor-text hover:bg-surface-2/60 -mx-2 px-2 rounded-md transition-colors duration-150"
    >
      {value}
    </h2>
  );
}

/** Subtitle row with editable title + company. */
function EditableSubtitle({
  title,
  company,
  onSaveTitle,
  onSaveCompany,
}: {
  title: string | null;
  company: string;
  onSaveTitle: (v: string) => void;
  onSaveCompany: (v: string) => void;
}) {
  return (
    <div className="text-[13px] text-ink-soft truncate flex items-center gap-1 -mx-1 px-1">
      <InlineEdit
        value={title ?? ""}
        placeholder="Add title"
        onSave={onSaveTitle}
        className="text-ink-soft"
      />
      <span className="text-muted">·</span>
      <InlineEdit
        value={company}
        onSave={onSaveCompany}
        className="font-medium text-ink"
      />
    </div>
  );
}

function InlineEdit({
  value,
  onSave,
  placeholder,
  className = "",
}: {
  value: string;
  onSave: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setDraft(value), [value]);
  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          setEditing(false);
          if (draft !== value) onSave(draft);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "Escape") {
            setDraft(value);
            setEditing(false);
          }
        }}
        placeholder={placeholder}
        className={`bg-canvas border border-line-strong rounded px-1.5 py-0.5 focus:border-accent focus:outline-none text-[13px] ${className}`}
        style={{ minWidth: "6ch", width: `${Math.max(draft.length, placeholder?.length ?? 0) + 2}ch` }}
      />
    );
  }

  return (
    <span
      onClick={() => setEditing(true)}
      title="Click to edit"
      className={`cursor-text rounded px-1 hover:bg-surface-2/60 transition-colors duration-150 ${className} ${
        !value ? "text-muted italic" : ""
      }`}
    >
      {value || placeholder || "—"}
    </span>
  );
}

/** Click-to-edit row in Contact / Company sections. */
function EditableField({
  label,
  value,
  onSave,
  type = "text",
  mono = false,
  link,
}: {
  label: string;
  value: string | null;
  onSave: (v: string) => void;
  type?: string;
  mono?: boolean;
  /** `true` uses `value` as the href; string uses that href; `null` = no link. */
  link?: boolean | string | null;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setDraft(value ?? ""), [value]);
  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const href = link === true ? value : typeof link === "string" ? link : null;

  return (
    <div className="flex items-baseline gap-3 py-1.5 border-b border-line-soft last:border-0 group">
      <span className="w-20 shrink-0 text-[10px] mono uppercase tracking-[0.12em] text-muted">
        {label}
      </span>

      {editing ? (
        <input
          ref={inputRef}
          type={type}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            setEditing(false);
            if (draft !== (value ?? "")) onSave(draft);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            if (e.key === "Escape") {
              setDraft(value ?? "");
              setEditing(false);
            }
          }}
          className={`flex-1 h-7 rounded-sm border border-accent bg-canvas px-2 text-[13px] text-ink focus:outline-none ${mono ? "mono" : ""}`}
        />
      ) : (
        <div className="flex-1 min-w-0 flex items-center gap-2">
          {value ? (
            href ? (
              <a
                href={href}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className={`text-accent hover:text-[#2bf094] underline decoration-accent/30 hover:decoration-accent underline-offset-2 transition-colors duration-150 truncate ${mono ? "mono text-[13px]" : "text-[13px]"}`}
              >
                {value}
              </a>
            ) : (
              <span className={`text-ink truncate ${mono ? "mono text-[13px]" : "text-[13px]"}`}>
                {value}
              </span>
            )
          ) : (
            <span className="text-muted text-[13px] italic">—</span>
          )}
          <button
            onClick={() => setEditing(true)}
            aria-label={`Edit ${label}`}
            className="opacity-0 group-hover:opacity-100 w-5 h-5 grid place-items-center text-muted hover:text-ink rounded-sm hover:bg-surface-3 cursor-pointer transition-all duration-150 shrink-0"
            title="Edit"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path
                d="M12 20h9M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5Z"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

/** Editable dropdown row. */
function EditableSelect({
  label,
  value,
  options,
  onSave,
  mono = false,
}: {
  label: string;
  value: string | null;
  options: readonly string[];
  onSave: (v: string) => void;
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline gap-3 py-1.5 border-b border-line-soft last:border-0">
      <span className="w-20 shrink-0 text-[10px] mono uppercase tracking-[0.12em] text-muted">
        {label}
      </span>
      <select
        value={value ?? ""}
        onChange={(e) => onSave(e.target.value)}
        className={`flex-1 h-7 rounded-sm border border-line bg-canvas px-2 text-[13px] text-ink cursor-pointer hover:border-line-strong focus:border-accent focus:outline-none transition-colors duration-150 ${mono ? "mono" : ""}`}
      >
        <option value="">—</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
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
