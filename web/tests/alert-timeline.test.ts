import assert from "node:assert/strict";
import test from "node:test";
import { mergeAlertTimeline, type AlertLogRecord } from "../lib/alert-timeline.ts";
import type { Notification } from "../lib/types.ts";

function notification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    kind: "stale_factory",
    factory_id: "factory-1",
    contact_id: null,
    network_id: null,
    investor_id: null,
    competition_id: null,
    work_item_id: null,
    title: "No update in 3+ days",
    detail: "Factory One",
    summary: "AI recap",
    due_on: null,
    read_at: null,
    pushed_at: null,
    created_at: "2026-08-09T08:00:00.000Z",
    ...overrides,
  };
}

function log(overrides: Partial<AlertLogRecord> = {}): AlertLogRecord {
  return {
    id: "00000000-0000-4000-8000-000000000010",
    notification_id: null,
    message_id: "message-1",
    thread_id: null,
    source: "activity",
    kind: "activity_created",
    title: "Factory activity · Note",
    detail: "Factory One",
    summary: "Activity body",
    due_on: null,
    owner_type: "factory",
    owner_id: "factory-1",
    owner_name: "Factory One",
    deep_link: "https://example.com/factories?factory=factory-1",
    task_done_at: null,
    created_at: "2026-08-09T09:00:00.000Z",
    deleted_at: null,
    ...overrides,
  };
}

test("linked notifications enrich a log row without creating a duplicate", () => {
  const linked = notification({ read_at: "2026-08-09T10:00:00.000Z" });
  const rows = mergeAlertTimeline([
    log({
      notification_id: linked.id,
      source: "scan",
      summary: null,
      task_done_at: null,
    }),
  ], [linked]);

  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.summary, "AI recap");
  assert.equal(rows[0]?.task_done_at, linked.read_at);
  assert.equal(rows[0]?.contact_id, null);
  assert.equal(rows[0]?.factory_id, "factory-1");
});

test("notification-only alerts stay in the timeline before and after Task Done", () => {
  const unread = notification();
  const before = mergeAlertTimeline([], [unread]);
  assert.equal(before.length, 1);
  assert.equal(before[0]?.delivery_state, "pending");
  assert.equal(before[0]?.task_done_at, null);

  const doneAt = "2026-08-09T11:00:00.000Z";
  const after = mergeAlertTimeline([], [{ ...unread, read_at: doneAt }]);
  assert.equal(after.length, 1);
  assert.equal(after[0]?.task_done_at, doneAt);
});

test("log-only activity rows remain actionable in the merged history", () => {
  const rows = mergeAlertTimeline([log()], []);
  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.notification_id, null);
  assert.equal(rows[0]?.summary, "Activity body");
  assert.equal(rows[0]?.factory_id, "factory-1");
});
