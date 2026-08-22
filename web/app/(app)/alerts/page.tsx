"use client";

import { useState } from "react";
import type { Notification } from "@/lib/types";
import { useStore } from "@/lib/factories-store";
import { PageHeader } from "@/app/components/page-header";

const KIND_LABEL: Record<string, string> = {
  stale_factory: "Stale factory",
  stale_contact: "Stale contact",
  stale_network: "Stale network",
  followup_due: "Follow-up due",
  sequence_step_due: "Sequence step due",
  work_trigger_due_soon: "Due in 1 day",
  work_trigger_due: "Due today",
  work_trigger_overdue_1d: "Overdue · day 1", // legacy rows
  work_trigger_overdue_3d: "Overdue · 3+ days",
  manual_factory: "Manual notification",
};

export default function AlertsPage() {
  const { notifications, markNotificationRead, openFactory, openNetwork } = useStore();
  const rows = (notifications ?? []).filter((n) => !n.read_at);

  const open = (n: Notification) => {
    if (n.network_id) openNetwork(n.network_id);
    else if (n.factory_id) openFactory(n.factory_id);
  };

  return (
    <>
      <PageHeader eyebrow="Alerts" title="Reminders & alerts"
        subtitle="Anything in Replied → Demo with no update in 3+ days, a due follow-up, or a work item due in 1 day / overdue by 3+ days. Auto-clears when you act on it; also pushed to Discord."
        right={<><span>{rows.length}</span><span className="opacity-50">unread</span></>} />
      <div className="px-8 py-5 max-w-3xl">
        {rows.length === 0 ? (
          <div className="rounded-lg border border-dashed border-line bg-surface/50 px-8 py-16 text-center text-sm text-ink-soft">
            Nothing needs attention. 🎉
          </div>
        ) : (
          <div className="space-y-2">
            {rows.map((n) => (
              <AlertRow key={n.id} n={n} onOpen={() => open(n)} onDone={() => markNotificationRead(n.id)} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function AlertRow({ n, onOpen, onDone }: { n: Notification; onOpen: () => void; onDone: () => void }) {
  const [showSummary, setShowSummary] = useState(false);
  const stale = n.kind.startsWith("stale");
  const canOpen = !!(n.network_id || n.factory_id);
  const entity = n.network_id ? "network" : n.contact_id ? "contact" : "factory";

  return (
    <div className={`rounded-lg border bg-surface px-4 py-3 ${stale ? "border-l-[3px] border-l-[color:var(--color-warn)] border-line" : "border-line"}`}>
      <div className="flex items-center gap-3">
        <EntityIcon kind={entity} />
        <div className="min-w-0 flex-1">
          <div className="text-[13px] text-ink">
            <span className="text-[10px] mono uppercase tracking-wider text-muted mr-2">{KIND_LABEL[n.kind] ?? n.kind}</span>
            {n.title}{n.detail ? ` — ${n.detail}` : ""}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            {n.due_on && <span className="text-[11px] text-muted mono">due {n.due_on}</span>}
            {n.summary && (
              <button onClick={() => setShowSummary((s) => !s)}
                className="text-[11px] text-accent hover:underline cursor-pointer">
                {showSummary ? "Hide recap" : "AI recap"}
              </button>
            )}
          </div>
        </div>
        {canOpen && (
          <button onClick={onOpen}
            className="h-7 px-3 rounded-full border border-line-strong bg-surface-2 hover:bg-surface-3 text-[11px] mono uppercase tracking-wider text-ink-soft cursor-pointer">Open</button>
        )}
        <button onClick={onDone}
          className="h-7 px-3 rounded-full bg-accent hover:bg-[#3a51ff] text-white text-[11px] font-medium cursor-pointer">Done</button>
      </div>
      {showSummary && n.summary && (
        <p className="mt-2 pl-8 text-[12.5px] text-ink-soft leading-relaxed whitespace-pre-wrap">{n.summary}</p>
      )}
    </div>
  );
}

function EntityIcon({ kind }: { kind: "factory" | "network" | "contact" }) {
  const paths: Record<string, React.ReactNode> = {
    factory: <path d="M3 21V9l6 3V9l6 3V9l6 3v9H3Z" strokeWidth="1.5" strokeLinejoin="round" />,
    network: (
      <>
        <circle cx="6" cy="18" r="2.2" strokeWidth="1.5" />
        <circle cx="18" cy="18" r="2.2" strokeWidth="1.5" />
        <circle cx="12" cy="5" r="2.2" strokeWidth="1.5" />
        <path d="M11 7 7 16m6-9 4 9" strokeWidth="1.3" strokeLinecap="round" />
      </>
    ),
    contact: (
      <>
        <circle cx="12" cy="8" r="3.2" strokeWidth="1.5" />
        <path d="M5 20c0-3.3 3-6 7-6s7 2.7 7 6" strokeWidth="1.5" strokeLinecap="round" />
      </>
    ),
  };
  return (
    <span className="w-7 h-7 rounded-md grid place-items-center bg-surface-2 text-muted shrink-0">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor">{paths[kind]}</svg>
    </span>
  );
}
