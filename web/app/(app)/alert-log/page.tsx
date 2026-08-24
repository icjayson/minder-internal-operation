"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/app/components/page-header";
import {
  mergeAlertTimeline,
  type AlertLogRecord,
  type AlertTimelineRow,
} from "@/lib/alert-timeline";
import { useStore } from "@/lib/factories-store";
import { supabase } from "@/lib/supabase";
import { Button } from "@/design-system/components/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/design-system/components/empty";

const SOURCE_LABEL: Record<string, string> = {
  scan: "Scan",
  activity: "Activity",
  manual: "Manual",
  test: "Test",
};

const LOG_COLUMNS = [
  "id",
  "notification_id",
  "message_id",
  "thread_id",
  "source",
  "kind",
  "title",
  "detail",
  "summary",
  "due_on",
  "owner_type",
  "owner_id",
  "owner_name",
  "deep_link",
  "task_done_at",
  "created_at",
  "deleted_at",
].join(",");
const LOG_PAGE_SIZE = 1000;

export default function AlertLogPage() {
  const {
    notifications,
    openContact,
    openFactory,
    openNetwork,
    openFundraising,
  } = useStore();
  const [logs, setLogs] = useState<AlertLogRecord[] | null>(null);
  const [deleting, setDeleting] = useState<Record<string, boolean>>({});
  const [completing, setCompleting] = useState<Record<string, boolean>>({});
  const [completed, setCompleted] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [needsMigration, setNeedsMigration] = useState(false);

  const load = useCallback(async () => {
    const sb = supabase();
    const loaded: AlertLogRecord[] = [];
    let loadError: { code?: string; message: string } | null = null;
    for (let from = 0; ; from += LOG_PAGE_SIZE) {
      const { data, error: pageError } = await sb
        .from("discord_alert_log")
        .select(LOG_COLUMNS)
        .order("created_at", { ascending: false })
        .range(from, from + LOG_PAGE_SIZE - 1);
      if (pageError) {
        loadError = pageError;
        break;
      }
      const page = (data ?? []) as unknown as AlertLogRecord[];
      loaded.push(...page);
      if (page.length < LOG_PAGE_SIZE) break;
    }
    if (loadError) {
      const missingMigration =
        loadError.code === "42P01" ||
        loadError.code === "42703" ||
        /discord_alert_log|notification_id|task_done_at/.test(loadError.message);
      setNeedsMigration(missingMigration);
      setError(missingMigration ? null : loadError.message);
      setLogs([]);
      return;
    }
    setNeedsMigration(false);
    setError(null);
    setLogs(loaded);
  }, []);

  useEffect(() => {
    void load();
    const sb = supabase();
    const channel = sb
      .channel("discord-alert-log")
      .on("postgres_changes", { event: "*", schema: "public", table: "discord_alert_log" }, () => { void load(); })
      .subscribe();
    return () => { void sb.removeChannel(channel); };
  }, [load]);

  const rows = useMemo(
    () => logs === null || notifications === null ? null : mergeAlertTimeline(logs, notifications),
    [logs, notifications],
  );
  const openCount = rows?.filter((row) => !(completed[row.key] ?? row.task_done_at)).length ?? 0;

  function open(row: AlertTimelineRow) {
    if (row.contact_id) openContact(row.contact_id);
    else if (row.factory_id) openFactory(row.factory_id);
    else if (row.network_id) openNetwork(row.network_id);
    else if (row.investor_id) openFundraising(row.investor_id);
    else if (row.competition_id) openFundraising(row.competition_id);
    else if (row.deep_link) {
      try {
        const url = new URL(row.deep_link, window.location.origin);
        window.location.assign(`${url.pathname}${url.search}${url.hash}`);
      } catch {
        window.location.assign(row.deep_link);
      }
    }
  }

  async function complete(row: AlertTimelineRow) {
    setCompleting((current) => ({ ...current, [row.key]: true }));
    setError(null);
    try {
      const res = await fetch("/api/alert-log/task-done", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logId: row.log_id, notificationId: row.notification_id }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string; taskDoneAt?: string };
      if (!res.ok || !json.taskDoneAt) {
        setError(json.error ?? "Could not complete the alert task");
        return;
      }
      const doneAt = json.taskDoneAt;
      setCompleted((current) => ({ ...current, [row.key]: doneAt }));
      setLogs((current) => current?.map((log) => {
        const sameLog = log.id === row.log_id;
        const sameNotification = !!row.notification_id && log.notification_id === row.notification_id;
        return sameLog || sameNotification ? { ...log, task_done_at: doneAt } : log;
      }) ?? current);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not complete the alert task");
    } finally {
      setCompleting((current) => ({ ...current, [row.key]: false }));
    }
  }

  async function remove(row: AlertTimelineRow) {
    if (!row.log_id) return;
    setDeleting((current) => ({ ...current, [row.key]: true }));
    setError(null);
    try {
      const res = await fetch("/api/discord/delete-alert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: row.log_id }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Could not delete the Discord message");
        return;
      }
      const deletedAt = new Date().toISOString();
      setLogs((current) =>
        current?.map((log) => (log.id === row.log_id ? { ...log, deleted_at: deletedAt } : log)) ?? current,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete the Discord message");
    } finally {
      setDeleting((current) => ({ ...current, [row.key]: false }));
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Alerts"
        title="Alert log"
        subtitle="One persistent history for every alert. Open its context, review the recap, mark the task done without removing it, or delete only the Discord copy."
        right={<><span>{openCount}</span><span className="opacity-50">open</span><span className="opacity-30">·</span><span>{rows?.length ?? 0}</span><span className="opacity-50">total</span></>}
      />
      <div className="max-w-4xl px-8 py-5">
        {needsMigration && (
          <div className="mb-3 rounded-md border border-[color:var(--color-warn)]/30 tint-warn px-3 py-2 text-[12px] text-foreground/80">
            Discord history is temporarily unavailable. Run migrations <code className="tabular-nums">037_discord_alert_log.sql</code> and <code className="tabular-nums">038_merge_alerts_into_log.sql</code>; in-app alerts remain available below.
          </div>
        )}
        {error && (
          <div className="mb-3 rounded-md border border-[color:var(--color-danger)]/30 tint-danger px-3 py-2 text-[12px] text-[color:var(--color-danger)]">
            {error}
          </div>
        )}
        {rows === null ? (
          <Empty className="border bg-card/50 py-16"><EmptyDescription className="text-sm">Loading…</EmptyDescription></Empty>
        ) : rows.length === 0 ? (
          <Empty className="border bg-card/50 py-16"><EmptyDescription className="text-sm">No alerts logged yet.</EmptyDescription></Empty>
        ) : (
          <div className="space-y-2">
            {rows.map((row) => (
              <AlertLogItem
                key={row.key}
                row={{ ...row, task_done_at: completed[row.key] ?? row.task_done_at }}
                deleting={!!deleting[row.key]}
                completing={!!completing[row.key]}
                onOpen={() => open(row)}
                onComplete={() => complete(row)}
                onDelete={() => remove(row)}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function AlertLogItem({
  row,
  deleting,
  completing,
  onOpen,
  onComplete,
  onDelete,
}: {
  row: AlertTimelineRow;
  deleting: boolean;
  completing: boolean;
  onOpen: () => void;
  onComplete: () => void;
  onDelete: () => void;
}) {
  const [showSummary, setShowSummary] = useState(false);
  const deleted = !!row.deleted_at;
  const done = !!row.task_done_at;
  const deletable = !deleted && !!row.log_id && !!row.message_id;
  const canOpen = !!(
    row.contact_id || row.factory_id || row.network_id ||
    row.investor_id || row.competition_id || row.deep_link
  );
  const when = new Date(row.created_at).toLocaleString();

  return (
    <div className={`rounded-lg border border-border bg-card px-4 py-3 ${deleted ? "opacity-60" : ""}`}>
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-[220px] flex-1">
          <div className="text-[13px] text-foreground">
            {row.source && (
              <span className="mr-2 text-[10px] tabular-nums uppercase tracking-wider text-muted-foreground">{SOURCE_LABEL[row.source] ?? row.source}</span>
            )}
            {row.title ?? row.kind ?? "Alert"}{row.detail ? ` — ${row.detail}` : ""}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
            {row.owner_name && <span>{row.owner_name}</span>}
            {row.due_on && <span className="tabular-nums">due {row.due_on}</span>}
            <span className="tabular-nums">{when}</span>
            {row.summary && (
              <button
                type="button"
                onClick={() => setShowSummary((current) => !current)}
                className="cursor-pointer text-primary hover:underline"
              >
                {showSummary ? "Hide recap" : "AI recap"}
              </button>
            )}
            {row.delivery_state === "pending" && <span className="rounded-full border border-border-strong px-2 py-0.5">Discord pending</span>}
            {row.delivery_state === "unlogged" && <span className="rounded-full border border-border-strong px-2 py-0.5">No Discord log</span>}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          {canOpen && (
            <Button variant="outline" size="sm" type="button" onClick={onOpen} className="h-7 rounded-full px-3 text-[11px] tabular-nums uppercase tracking-wider text-foreground/80">
              Open
            </Button>
          )}
          {done ? (
            <span className="tone rounded-full px-3 py-1 text-[11px] font-medium" data-tone="green">Task done</span>
          ) : (
            <Button size="sm" type="button" onClick={onComplete} disabled={completing} className="h-7 px-3 text-[11px]">
              {completing ? "Completing…" : "Task Done"}
            </Button>
          )}
          {deleted ? (
            <span className="rounded-full border border-border-strong px-3 py-1 text-[11px] tabular-nums uppercase text-muted-foreground">Discord deleted</span>
          ) : row.log_id ? (
            <button
              type="button"
              onClick={onDelete}
              disabled={!deletable || deleting}
              title={deletable ? "Delete this message from Discord" : "No stored Discord message id — can't delete"}
              className="h-7 rounded-full bg-[color:var(--color-danger)] px-3 text-[11px] font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
            >
              {deleting ? "Deleting…" : "Delete from Discord"}
            </button>
          ) : null}
        </div>
      </div>

      {showSummary && row.summary && (
        <p className="mt-3 border-t border-border/60 pt-3 text-[12.5px] leading-relaxed text-foreground/80 whitespace-pre-wrap">{row.summary}</p>
      )}
    </div>
  );
}
