"use client";

import { useMemo, useState } from "react";
import type { Contact, Factory, Vertical } from "@/lib/types";
import { StagePill } from "./stage-pill";
import { ScoreChip } from "./score-bars";

type Props = {
  verticals: Vertical[];
  factories: Factory[];
  contactsOf: (factoryId: string) => Contact[];
  onOpenFactory: (id: string) => void;
};

const STALE_MS = 7 * 86400000;

// Vertical ▸ Factory ▸ Contact tree. Collapsible, with connector lines so the
// route from a vertical down to a single contact is always visible.
export function FactoryTree({ verticals, factories, contactsOf, onOpenFactory }: Props) {
  const groups = useMemo(() => {
    const byV = verticals.map((v) => ({
      key: v.id,
      name: v.name,
      rows: factories.filter((f) => f.vertical_id === v.id),
    }));
    const un = factories.filter((f) => !f.vertical_id);
    const list = [...byV];
    if (un.length) list.push({ key: "unassigned", name: "Unassigned", rows: un });
    return list.filter((g) => g.rows.length > 0);
  }, [verticals, factories]);

  const [openV, setOpenV] = useState<Set<string>>(new Set());
  const [openF, setOpenF] = useState<Set<string>>(new Set());

  const toggleV = (k: string) => setOpenV((s) => flip(s, k));
  const toggleF = (k: string) => setOpenF((s) => flip(s, k));

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border">
        <span className="text-[10px] tabular-nums uppercase tracking-[0.14em] text-muted-foreground mr-auto">
          {groups.length} verticals · {factories.length} factories
        </span>
        <button onClick={() => setOpenV(new Set(groups.map((g) => g.key)))}
          className="h-7 px-3 rounded-full border border-border-strong bg-muted hover:bg-accent text-[11px] tabular-nums uppercase tracking-wider text-foreground/80 cursor-pointer">Expand all</button>
        <button onClick={() => { setOpenV(new Set()); setOpenF(new Set()); }}
          className="h-7 px-3 rounded-full border border-border-strong bg-muted hover:bg-accent text-[11px] tabular-nums uppercase tracking-wider text-foreground/80 cursor-pointer">Collapse all</button>
      </div>

      <div className="p-3 space-y-1.5">
        {groups.map((g) => {
          const open = openV.has(g.key);
          const grades = { A: 0, B: 0, C: 0 } as Record<string, number>;
          g.rows.forEach((f) => { if (f.grade) grades[f.grade]++; });
          return (
            <div key={g.key}>
              {/* Vertical node */}
              <button onClick={() => toggleV(g.key)}
                className={`w-full flex items-center gap-2.5 h-10 px-3 rounded-md cursor-pointer transition-colors ${open ? "bg-primary-tint" : "hover:bg-muted"}`}>
                <Chevron open={open} />
                <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                <span className={`text-[14px] font-medium truncate ${open ? "text-primary" : "text-foreground"}`}>{g.name}</span>
                <span className="text-[12px] tabular-nums text-muted-foreground">{g.rows.length}</span>
                <div className="ml-auto flex items-center gap-1.5">
                  <GradeChip tone="green" label="A" n={grades.A} />
                  <GradeChip tone="amber" label="B" n={grades.B} />
                  <GradeChip tone="neutral" label="C" n={grades.C} />
                </div>
              </button>

              {/* Factories */}
              {open && (
                <div className="ml-[18px] pl-4 border-l border-border-strong mt-1 space-y-1">
                  {g.rows
                    .slice()
                    .sort((a, b) => (b.score ?? -1) - (a.score ?? -1))
                    .map((f) => (
                      <FactoryNode
                        key={f.id}
                        f={f}
                        contacts={contactsOf(f.id)}
                        open={openF.has(f.id)}
                        onToggle={() => toggleF(f.id)}
                        onOpen={() => onOpenFactory(f.id)}
                      />
                    ))}
                </div>
              )}
            </div>
          );
        })}
        {groups.length === 0 && (
          <p className="px-2 py-8 text-center text-sm text-muted-foreground">No factories match the current filter.</p>
        )}
      </div>
    </div>
  );
}

function FactoryNode({
  f, contacts, open, onToggle, onOpen,
}: {
  f: Factory; contacts: Contact[]; open: boolean; onToggle: () => void; onOpen: () => void;
}) {
  const stale = f.last_activity_at ? Date.now() - new Date(f.last_activity_at).getTime() > STALE_MS : false;
  const has = contacts.length > 0;
  return (
    <div>
      <div className="relative flex items-center gap-2 h-11 pl-1 pr-2 rounded-md hover:bg-muted/70 transition-colors before:absolute before:content-[''] before:left-[-16px] before:top-1/2 before:w-3 before:h-px before:bg-border-strong">
        <button onClick={onToggle} disabled={!has}
          className={`w-5 h-5 grid place-items-center shrink-0 ${has ? "cursor-pointer text-muted-foreground hover:text-foreground" : "opacity-0"}`}
          aria-label={open ? "Collapse" : "Expand"}>
          <Chevron open={open} small />
        </button>
        {stale && <span title="No update in 7+ days" className="w-1.5 h-1.5 rounded-full bg-[color:var(--color-warn)] shrink-0" />}
        <button onClick={onOpen} className="min-w-0 flex-1 text-left cursor-pointer group">
          <span className="text-[13px] font-medium text-foreground group-hover:text-primary transition-colors truncate block">{f.name}</span>
          {f.hq_location && <span className="text-[11px] text-muted-foreground truncate block">{f.hq_location}</span>}
        </button>
        <div className="hidden sm:block"><ScoreChip score={f.score} grade={f.grade} /></div>
        <StagePill stage={f.stage} />
        <span className="text-[11px] tabular-nums text-muted-foreground w-20 text-right shrink-0">{contacts.length} contacts</span>
      </div>

      {open && has && (
        <div className="ml-[10px] pl-4 border-l border-border mt-0.5 mb-1 space-y-0.5">
          {contacts.map((c) => (
            <div key={c.id}
              className={`relative flex items-center gap-2 h-9 px-2 rounded-md before:absolute before:content-[''] before:left-[-16px] before:top-1/2 before:w-3 before:h-px before:bg-border ${
                c.is_primary_target ? "bg-primary-tint/60" : "hover:bg-muted/50"
              }`}>
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${c.is_primary_target ? "bg-primary" : "bg-muted-foreground/40"}`} />
              <button onClick={onOpen} className="min-w-0 flex-1 text-left cursor-pointer group">
                <span className="flex items-center gap-1.5">
                  <span className="text-[12.5px] text-foreground group-hover:text-primary transition-colors truncate">{c.full_name}</span>
                  {c.is_primary_target && <span className="text-[9px] tabular-nums uppercase tracking-wider text-primary shrink-0">target</span>}
                </span>
                {c.role_title && <span className="text-[10.5px] text-muted-foreground truncate block">{c.role_title}</span>}
              </button>
              <StagePill stage={c.stage} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function flip(s: Set<string>, k: string) {
  const n = new Set(s);
  if (n.has(k)) n.delete(k); else n.add(k);
  return n;
}

function Chevron({ open, small = false }: { open: boolean; small?: boolean }) {
  const s = small ? 12 : 14;
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      className={`shrink-0 transition-transform duration-150 ${open ? "rotate-90" : ""}`}>
      <path d="M9 6l6 6-6 6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function GradeChip({ tone, label, n }: { tone: string; label: string; n: number }) {
  return (
    <span data-tone={tone}
      className={`tone inline-flex items-center gap-1 h-5 px-2 rounded-full tabular-nums text-[10px] font-medium ${n === 0 ? "opacity-40" : ""}`}>
      {label} {n}
    </span>
  );
}
