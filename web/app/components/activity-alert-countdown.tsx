"use client";

import { useEffect, useState } from "react";
import {
  activityAlertRemainingMs,
  formatActivityAlertCountdown,
} from "@/lib/activity-alerts";

export function ActivityRowActions({
  createdAt,
  onDelete,
}: {
  createdAt: string;
  onDelete: () => void;
}) {
  const remove = () => {
    const pending = activityAlertRemainingMs(createdAt) > 0;
    const message = pending
      ? "Delete this activity and cancel its pending Discord alert? Stage changes are not reverted."
      : "Delete this activity? Any Discord alert already sent cannot be recalled, and stage changes are not reverted.";
    if (window.confirm(message)) onDelete();
  };

  return (
    <div className="ml-auto inline-flex shrink-0 items-center gap-2">
      <ActivityAlertCountdown createdAt={createdAt} onWithdraw={remove} />
      <button
        type="button"
        title="Delete activity"
        aria-label="Delete activity"
        onClick={remove}
        className="grid h-6 w-6 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-[color:var(--color-danger)]/10 hover:text-[color:var(--color-danger)]"
      >
        <TrashIcon />
      </button>
    </div>
  );
}

export function ActivityAlertCountdown({
  createdAt,
  onWithdraw,
}: {
  createdAt: string;
  onWithdraw: () => void;
}) {
  const [now, setNow] = useState(() => Date.now());
  const remaining = activityAlertRemainingMs(createdAt, now);

  useEffect(() => {
    if (activityAlertRemainingMs(createdAt) <= 0) return;
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [createdAt]);

  if (remaining <= 0) return null;

  return (
    <div className="inline-flex shrink-0 items-center gap-2 text-[10px]" aria-label={`Discord alert in ${formatActivityAlertCountdown(remaining)}`}>
      <span className="inline-flex items-center gap-1.5 font-medium text-[color:var(--color-warn)]" aria-live="off">
        <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--color-warn)]" aria-hidden />
        Discord in <span className="min-w-[2.4rem] tabular-nums">{formatActivityAlertCountdown(remaining)}</span>
      </span>
      <span className="h-3 w-px bg-border" aria-hidden />
      <button
        type="button"
        title="Delete this activity and cancel its pending Discord alert"
        onClick={onWithdraw}
        className="font-semibold text-[color:var(--color-danger)] hover:underline"
      >
        Withdraw
      </button>
    </div>
  );
}

function TrashIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
      <path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7m4 4v5m4-5v5" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
