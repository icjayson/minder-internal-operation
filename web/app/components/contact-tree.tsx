"use client";

import type { Contact, Stage } from "@/lib/types";
import { ROLE_LEVELS, STAGES } from "@/lib/types";
import { StagePill } from "./stage-pill";

const LEVEL_LABEL: Record<string, string> = {
  high: "High-level",
  mid: "Mid-level",
  expert: "Expert / Specialist",
};

type Props = {
  factoryName: string;
  contacts: Contact[];
  onStageChange: (id: string, s: Stage) => void;
  onGenerate: (contactId: string) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
  onEdit?: (c: Contact) => void;
  generatingId?: string | null;
};

export function ContactTree({
  factoryName,
  contacts,
  onStageChange,
  onGenerate,
  onDelete,
  onAdd,
  onEdit,
  generatingId,
}: Props) {
  const grouped = ROLE_LEVELS.map((lvl) => ({
    level: lvl,
    rows: contacts.filter((c) => c.role_level === lvl),
  })).filter((g) => g.rows.length > 0);

  const ungrouped = contacts.filter((c) => !c.role_level);

  return (
    <div>
      {/* Factory root node */}
      <div className="flex items-center gap-2 mb-3">
        <span className="w-2 h-2 rounded-full bg-accent" />
        <span className="text-[13px] font-medium text-ink truncate">{factoryName}</span>
        <button
          onClick={onAdd}
          className="ml-auto h-6 px-2 rounded-full border border-line-strong bg-surface-2 hover:bg-surface-3 text-[11px] mono uppercase tracking-wider text-ink-soft hover:text-ink cursor-pointer transition-colors"
        >
          + Contact
        </button>
      </div>

      {contacts.length === 0 && (
        <p className="text-[13px] text-muted pl-4">No contacts yet — add the owner, MD or plant director.</p>
      )}

      <div className="pl-1 border-l border-line ml-1 space-y-4">
        {[...grouped, ...(ungrouped.length ? [{ level: "other", rows: ungrouped }] : [])].map((g) => (
          <div key={g.level} className="pl-4 relative">
            <div className="text-[10px] mono uppercase tracking-[0.14em] text-muted mb-1.5">
              {LEVEL_LABEL[g.level] ?? "Other"}
            </div>
            <div className="space-y-1.5">
              {g.rows.map((c) => (
                <ContactRow
                  key={c.id}
                  c={c}
                  onStageChange={onStageChange}
                  onGenerate={onGenerate}
                  onDelete={onDelete}
                  onEdit={onEdit}
                  generating={generatingId === c.id}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ContactRow({
  c,
  onStageChange,
  onGenerate,
  onDelete,
  onEdit,
  generating,
}: {
  c: Contact;
  onStageChange: (id: string, s: Stage) => void;
  onGenerate: (contactId: string) => void;
  onDelete: (id: string) => void;
  onEdit?: (c: Contact) => void;
  generating: boolean;
}) {
  return (
    <div
      className={`group flex items-center gap-2 rounded-md border px-3 py-2 ${
        c.is_primary_target ? "border-accent/40 bg-accent-dim" : "border-line bg-surface-2/40"
      }`}
    >
      <button onClick={() => onEdit?.(c)} className="min-w-0 flex-1 text-left cursor-pointer" title="Edit contact">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-medium text-ink truncate hover:text-accent transition-colors">{c.full_name}</span>
          {c.is_primary_target && (
            <span className="text-[9px] mono uppercase tracking-wider text-accent">target</span>
          )}
        </div>
        <div className="text-[11px] text-muted truncate">
          {c.role_title ?? "—"}
          {c.sequence_id ? ` · ${c.sequence_state.replace(/_/g, " ")} · step ${c.sequence_step}` : ""}
        </div>
      </button>

      <div className="relative" onClick={(e) => e.stopPropagation()}>
        <StagePill stage={c.stage} />
        <select
          value={c.stage}
          onChange={(e) => onStageChange(c.id, e.target.value as Stage)}
          className="absolute inset-0 opacity-0 cursor-pointer"
          aria-label="Change stage"
        >
          {STAGES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <button
        onClick={() => onGenerate(c.id)}
        disabled={generating}
        title="Draft outreach with AI"
        className="h-6 px-2 rounded-full bg-accent hover:bg-[#3a51ff] disabled:opacity-60 text-white text-[10.5px] font-medium cursor-pointer transition-colors"
      >
        {generating ? "…" : "Draft"}
      </button>
      <button
        onClick={() => { if (confirm(`Remove ${c.full_name}?`)) onDelete(c.id); }}
        className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-md grid place-items-center text-muted hover:text-[color:var(--color-danger)] cursor-pointer transition-all"
        aria-label="Remove contact"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}
