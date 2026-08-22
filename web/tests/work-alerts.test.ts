import assert from "node:assert/strict";
import test from "node:test";
import {
  daysPastTrigger,
  isoDateInTimeZone,
  isWorkTriggerNotificationKind,
  workTriggerReminderFor,
} from "../lib/work-alerts.ts";

test("alert date follows the configured operating timezone instead of UTC", () => {
  const justAfterMidnightInVietnam = new Date("2026-07-31T17:30:00.000Z");
  assert.equal(isoDateInTimeZone(justAfterMidnightInVietnam, "Asia/Ho_Chi_Minh"), "2026-08-01");
  assert.equal(isoDateInTimeZone(justAfterMidnightInVietnam, "UTC"), "2026-07-31");
});

test("work trigger stays quiet outside its milestones and after completion", () => {
  // 2+ days before the trigger: no advance warning yet.
  assert.equal(workTriggerReminderFor({ triggerOn: "2026-08-03", today: "2026-08-01", status: "doing" }), null);
  // The first two overdue days are intentionally silent between due-date and 3d.
  assert.equal(workTriggerReminderFor({ triggerOn: "2026-07-31", today: "2026-08-01", status: "doing" }), null);
  assert.equal(workTriggerReminderFor({ triggerOn: "2026-07-30", today: "2026-08-01", status: "doing" }), null);
  // Completed cards and cards without a trigger date never fire.
  assert.equal(workTriggerReminderFor({ triggerOn: "2026-07-20", today: "2026-08-01", status: "done" }), null);
  assert.equal(workTriggerReminderFor({ triggerOn: null, today: "2026-08-01", status: "doing" }), null);
});

test("work trigger emits the heads-up one day before the trigger date", () => {
  assert.deepEqual(
    workTriggerReminderFor({ triggerOn: "2026-08-02", today: "2026-08-01", status: "not_started" }),
    { kind: "work_trigger_due_soon", title: "Work item due in 1 day", overdueDays: -1 },
  );
});

test("work trigger emits the due-date nudge on the trigger date", () => {
  assert.deepEqual(
    workTriggerReminderFor({ triggerOn: "2026-08-01", today: "2026-08-01", status: "doing" }),
    { kind: "work_trigger_due", title: "Work item trigger due today", overdueDays: 0 },
  );
});

test("work trigger emits the 3-day reminder from day three onward", () => {
  assert.deepEqual(
    workTriggerReminderFor({ triggerOn: "2026-07-29", today: "2026-08-01", status: "doing" }),
    { kind: "work_trigger_overdue_3d", title: "Work item overdue by 3+ days", overdueDays: 3 },
  );
  assert.equal(
    workTriggerReminderFor({ triggerOn: "2026-07-20", today: "2026-08-01", status: "doing" })?.kind,
    "work_trigger_overdue_3d",
  );
  assert.equal(daysPastTrigger("2026-07-20", "2026-08-01"), 12);
});

test("all work trigger milestone kinds share the auto-resolve family", () => {
  assert.equal(isWorkTriggerNotificationKind("work_trigger_due_soon"), true);
  assert.equal(isWorkTriggerNotificationKind("work_trigger_overdue_3d"), true);
  assert.equal(isWorkTriggerNotificationKind("followup_due"), false);
});
