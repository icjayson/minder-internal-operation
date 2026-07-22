"use client";

import type { Lead, Stage } from "@/lib/types";
import { STAGES } from "@/lib/types";
import { StagePill } from "./stage-pill";
import { CategoryPill } from "./category-pill";
import { PriorityStars } from "./priority-stars";
import { IcpFit } from "./icp-fit";

type Props = {
  leads: Lead[];
  onSelect: (l: Lead) => void;
  onDelete: (id: string) => void;
  onPriorityChange: (id: string, p: number) => void;
  onStageChange: (id: string, s: Stage) => void;
};

export function LeadTable({
  leads,
  onSelect,
  onDelete,
  onPriorityChange,
  onStageChange,
}: Props) {
  return (
    <div className="rounded-lg border border-line bg-surface overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-line text-muted bg-surface-2/40">
              <Th>Name / Title</Th>
              <Th>Company</Th>
              <Th>Industry</Th>
              <Th>Size</Th>
              <Th>Location</Th>
              <Th>ICP Fit</Th>
              <Th>Priority</Th>
              <Th>Stage</Th>
              <Th>Last Contact</Th>
              <Th>Next F/U</Th>
              <Th className="w-10" aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr
                key={lead.id}
                onClick={() => onSelect(lead)}
                className="group border-t border-line-soft hover:bg-surface-2/60 cursor-pointer transition-colors duration-150"
              >
                <Td>
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar name={lead.full_name} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-medium truncate text-ink">
                          {lead.full_name}
                        </span>
                        {lead.category && <CategoryPill category={lead.category} />}
                      </div>
                      <div className="text-[11px] text-muted truncate">
                        {lead.title ?? "—"}
                      </div>
                    </div>
                  </div>
                </Td>
                <Td>
                  <div className="truncate max-w-[180px]">
                    <div className="font-medium truncate text-ink">
                      {lead.company_name}
                    </div>
                    {lead.company_domain && (
                      <div className="text-[11px] text-muted truncate mono">
                        {lead.company_domain}
                      </div>
                    )}
                  </div>
                </Td>
                <Td muted>{lead.industry ?? "—"}</Td>
                <Td muted className="mono">
                  {lead.company_size ?? "—"}
                </Td>
                <Td muted className="max-w-[120px] truncate">
                  {lead.hq_location ?? "—"}
                </Td>
                <Td>
                  <IcpFit value={lead.icp_fit} />
                </Td>
                <Td>
                  <PriorityStars
                    value={lead.priority}
                    onChange={(p) => onPriorityChange(lead.id, p)}
                  />
                </Td>
                <Td>
                  <StageSelect
                    stage={lead.stage}
                    onChange={(s) => onStageChange(lead.id, s)}
                  />
                </Td>
                <Td muted className="mono text-[11px] whitespace-nowrap">
                  {formatDate(lead.last_contacted)}
                </Td>
                <Td className="mono text-[11px] whitespace-nowrap">
                  <FollowUpBadge date={lead.next_follow_up} />
                </Td>
                <Td>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (
                        confirm(
                          `Delete ${lead.full_name}? This cannot be undone.`,
                        )
                      )
                        onDelete(lead.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-md grid place-items-center text-muted hover:text-[color:var(--color-danger)] hover:bg-surface-3 cursor-pointer transition-all duration-150"
                    title="Delete lead"
                    aria-label={`Delete ${lead.full_name}`}
                  >
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                    >
                      <path
                        d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({ children, className = "", ...rest }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={`text-left mono font-medium uppercase tracking-[0.12em] text-[10px] px-4 py-2.5 ${className}`}
      {...rest}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  muted = false,
  className = "",
}: {
  children: React.ReactNode;
  muted?: boolean;
  className?: string;
}) {
  return (
    <td
      className={`px-4 py-3 align-middle ${muted ? "text-ink-soft" : ""} ${className}`}
    >
      {children}
    </td>
  );
}

function StageSelect({
  stage,
  onChange,
}: {
  stage: Stage;
  onChange: (s: Stage) => void;
}) {
  return (
    <div
      className="relative inline-block"
      onClick={(e) => e.stopPropagation()}
    >
      <StagePill stage={stage} />
      <select
        value={stage}
        onChange={(e) => onChange(e.target.value as Stage)}
        className="absolute inset-0 opacity-0 cursor-pointer"
        aria-label="Change stage"
      >
        {STAGES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
    </div>
  );
}

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div className="w-8 h-8 shrink-0 rounded-md bg-surface-3 border border-line-strong text-ink-soft grid place-items-center mono text-[10.5px] font-medium uppercase">
      {initials || "·"}
    </div>
  );
}

function FollowUpBadge({ date }: { date: string | null }) {
  if (!date) return <span className="text-muted">—</span>;
  const d = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const overdue = d < today;
  const soon = !overdue && d.getTime() - today.getTime() < 3 * 86400000;
  const cls = overdue
    ? "bg-[#2a1515] text-[color:var(--color-danger)] border-[color:var(--color-danger)]/30"
    : soon
      ? "bg-[#2a2110] text-[color:var(--color-warn)] border-[color:var(--color-warn)]/30"
      : "bg-surface-2 text-ink-soft border-line-strong";
  return (
    <span className={`inline-flex items-center h-5 px-2 rounded-sm border mono text-[10.5px] ${cls}`}>
      {formatDate(date)}
    </span>
  );
}

function formatDate(d: string | null): string {
  if (!d) return "—";
  const date = new Date(d);
  if (isNaN(date.getTime())) return "—";
  const now = new Date();
  const sameYear = date.getFullYear() === now.getFullYear();
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    ...(sameYear ? {} : { year: "2-digit" }),
  });
}
