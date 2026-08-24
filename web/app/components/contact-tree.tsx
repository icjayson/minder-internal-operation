"use client";

import type { Contact, RoleLevel, Stage } from "@/lib/types";
import { ROLE_CATEGORIES, ROLE_LEVELS, STAGES } from "@/lib/types";
import { isTopLevelContactTitle } from "@/lib/contact-role";
import { normalizeUrl } from "@/lib/import-normalization";
import { StagePill, StagePillSelect } from "./stage-pill";
import { Button } from "@/design-system/components/button";

const LEVEL_LABEL: Record<string, string> = {
  high: "High-level",
  mid: "Mid-level",
  low: "Low-level",
  specialist: "Specialist & Executive",
};

// Rank a contact by its role category (Direction/Manager/Lead/rest). A founder/owner-style
// title always outranks to high; contacts with no category fall back to any stored level.
function contactLevel(c: Contact): RoleLevel | null {
  if (isTopLevelContactTitle(c.role_title)) return "high";
  const cat = ROLE_CATEGORIES.find((r) => r.key === c.role_category);
  if (cat) return cat.level as RoleLevel;
  // Fall back to a stored level; map the retired "expert" tier onto specialist.
  const stored = (c.role_level as string | null) === "expert" ? "specialist" : c.role_level;
  return (stored as RoleLevel) ?? null;
}

type Props = {
  factoryName: string;
  contacts: Contact[];
  onStageChange: (id: string, s: Stage) => void;
  onTargetChange: (id: string, isTarget: boolean) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
  onEdit?: (c: Contact) => void;
};

export function ContactTree({
  factoryName,
  contacts,
  onStageChange,
  onTargetChange,
  onDelete,
  onAdd,
  onEdit,
}: Props) {
  const grouped = ROLE_LEVELS.map((lvl) => ({
    level: lvl,
    rows: contacts.filter((c) => contactLevel(c) === lvl),
  })).filter((g) => g.rows.length > 0);

  const ungrouped = contacts.filter((c) => !contactLevel(c));

  return (
    <div>
      {/* Factory root node */}
      <div className="flex items-center gap-2 mb-3">
        <span className="w-2 h-2 rounded-full bg-primary" />
        <span className="text-[13px] font-medium text-foreground truncate">{factoryName}</span>
        <Button variant="outline" size="sm" onClick={onAdd} className="ml-auto h-6 px-2 text-[11px] tabular-nums uppercase tracking-wider text-foreground/80 hover:text-foreground">
          + Contact
        </Button>
      </div>

      {contacts.length === 0 && (
        <p className="text-[13px] text-muted-foreground pl-4">No contacts yet — add the owner, MD or plant director.</p>
      )}

      <div className="pl-1 border-l border-border ml-1 space-y-4">
        {[...grouped, ...(ungrouped.length ? [{ level: "other", rows: ungrouped }] : [])].map((g) => (
          <div key={g.level} className="pl-4 relative">
            <div className={`text-[10px] tabular-nums uppercase tracking-[0.14em] mb-1.5 ${
              g.level === "high" ? "text-primary font-medium" : "text-muted-foreground"
            }`}>
              {LEVEL_LABEL[g.level] ?? "Other"}
            </div>
            <div className="space-y-1.5">
              {g.rows.map((c) => (
                <ContactRow
                  key={c.id}
                  c={c}
                  onStageChange={onStageChange}
                  onTargetChange={onTargetChange}
                  onDelete={onDelete}
                  onEdit={onEdit}
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
  onTargetChange,
  onDelete,
  onEdit,
}: {
  c: Contact;
  onStageChange: (id: string, s: Stage) => void;
  onTargetChange: (id: string, isTarget: boolean) => void;
  onDelete: (id: string) => void;
  onEdit?: (c: Contact) => void;
}) {
  const isHighLevel = contactLevel(c) === "high";
  const isTopLevelTitle = isTopLevelContactTitle(c.role_title);

  return (
    <div
      className={`group flex items-center gap-2 rounded-md border px-3 py-2 ${
        isTopLevelTitle
          ? "border-primary bg-primary-tint shadow-[inset_3px_0_0_var(--color-primary)]"
          : isHighLevel
            ? "border-primary/25 bg-primary-tint/45"
            : c.is_primary_target
              ? "border-primary/40 bg-primary-tint"
              : "border-border bg-muted/40"
      }`}
    >
      <button
        type="button"
        onClick={() => onTargetChange(c.id, !c.is_primary_target)}
        aria-label={c.is_primary_target ? `Remove ${c.full_name} from primary targets` : `Mark ${c.full_name} as a primary target`}
        aria-pressed={c.is_primary_target}
        title={c.is_primary_target ? "Confirmed primary target — click to remove" : "Confirm as primary target"}
        className={`grid h-7 w-7 shrink-0 place-items-center rounded-full transition-colors ${
          c.is_primary_target
            ? "bg-primary text-primary-foreground shadow-glow"
            : "text-muted-foreground hover:bg-primary-tint hover:text-primary"
        }`}
      >
        <TargetStarIcon filled={c.is_primary_target} />
      </button>
      <button onClick={() => onEdit?.(c)} className="min-w-0 flex-1 text-left cursor-pointer" title="Edit contact">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-medium text-foreground truncate hover:text-primary transition-colors">{c.full_name}</span>
          {c.is_primary_target && (
            <span className="text-[9px] tabular-nums uppercase tracking-wider text-primary">target</span>
          )}
        </div>
        <div className="text-[11px] text-muted-foreground truncate">
          {c.role_title ?? "—"}
          {c.sequence_id ? ` · ${c.sequence_state.replace(/_/g, " ")} · step ${c.sequence_step}` : ""}
        </div>
      </button>

      <StagePillSelect value={c.stage} options={STAGES} onChange={(next) => onStageChange(c.id, next)}>
        <StagePill stage={c.stage} />
      </StagePillSelect>

      {c.linkedin_url && (
        /* A link that acts as a button, so it is a Button that renders an
           anchor rather than an anchor wearing the button's classes. */
        <Button size="xs" className="shrink-0" asChild>
        <a
          href={normalizeUrl(c.linkedin_url)}
          target="_blank"
          rel="noopener noreferrer"
          title="Open LinkedIn in a new tab"
        >
          LinkedIn
          <svg
            aria-hidden="true"
            viewBox="0 0 16 16"
            className="h-3 w-3"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 11 11 5" />
            <path d="M6 5h5v5" />
          </svg>
        </a>
        </Button>
      )}
      <Button variant="ghost" size="icon-xs" onClick={() => { if (confirm(`Remove ${c.full_name}?`)) onDelete(c.id); }} className="opacity-0 group-hover:opacity-100 w-6 h-6 hover:text-[color:var(--color-danger)] transition-all" aria-label="Remove contact">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Button>
    </div>
  );
}

function TargetStarIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z" />
    </svg>
  );
}
