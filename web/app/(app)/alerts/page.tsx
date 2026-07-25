"use client";

import { useStore } from "@/lib/factories-store";
import { PageHeader } from "@/app/components/page-header";

const KIND_LABEL: Record<string, string> = {
  stale_factory: "Stale factory",
  stale_contact: "Stale contact",
  followup_due: "Follow-up due",
  sequence_step_due: "Sequence step due",
};

export default function AlertsPage() {
  const { notifications, markNotificationRead, openFactory } = useStore();
  const rows = (notifications ?? []).filter((n) => !n.read_at);

  return (
    <>
      <PageHeader eyebrow="Alerts" title="Reminders & alerts"
        subtitle="Anything with no update in 7+ days or a due follow-up. Also pushed to email / Discord by the daily scan."
        right={<><span>{rows.length}</span><span className="opacity-50">unread</span></>} />
      <div className="px-8 py-5 max-w-3xl">
        {rows.length === 0 ? (
          <div className="rounded-lg border border-dashed border-line bg-surface/50 px-8 py-16 text-center text-sm text-ink-soft">
            Nothing needs attention. 🎉
          </div>
        ) : (
          <div className="space-y-2">
            {rows.map((n) => (
              <div key={n.id} className="flex items-center gap-3 rounded-lg border border-line bg-surface px-4 py-3">
                <span className={`w-1.5 h-1.5 rounded-full ${n.kind.startsWith("stale") ? "bg-[color:var(--color-warn)]" : "bg-accent"}`} />
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] text-ink">
                    <span className="text-[10px] mono uppercase tracking-wider text-muted mr-2">{KIND_LABEL[n.kind] ?? n.kind}</span>
                    {n.title}{n.detail ? ` — ${n.detail}` : ""}
                  </div>
                  {n.due_on && <div className="text-[11px] text-muted mono">due {n.due_on}</div>}
                </div>
                {n.factory_id && (
                  <button onClick={() => openFactory(n.factory_id as string)}
                    className="h-7 px-3 rounded-full border border-line-strong bg-surface-2 hover:bg-surface-3 text-[11px] mono uppercase tracking-wider text-ink-soft cursor-pointer">Open</button>
                )}
                <button onClick={() => markNotificationRead(n.id)}
                  className="h-7 px-3 rounded-full bg-accent hover:bg-[#3a51ff] text-white text-[11px] font-medium cursor-pointer">Done</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
