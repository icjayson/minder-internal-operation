import assert from "node:assert/strict";
import test from "node:test";
import {
  compareTodos,
  describeDue,
  doneBucket,
  doneBuckets,
  groupForView,
  matchesSearch,
  startOfWeek,
  matchesSmartView,
} from "../lib/todo-query.ts";
import {
  isActive,
  isFinished,
  linkLabel,
  safeLink,
  statusPatch,
  type Todo,
} from "../lib/todo-types.ts";

const TODAY = "2026-09-17";

function todo(patch: Partial<Todo> = {}): Todo {
  return {
    id: patch.id ?? "t1",
    project_id: null,
    title: "A task",
    notes: null,
    status: "open",
    priority: 4,
    due_on: null,
    link: null,
    completed_at: null,
    sort_order: 0,
    owner_id: null,
    assignee_id: null,
    created_at: "2026-09-01T00:00:00.000Z",
    updated_at: "2026-09-01T00:00:00.000Z",
    ...patch,
  };
}

test("Today holds what is due today and everything overdue", () => {
  assert.equal(matchesSmartView(todo({ due_on: TODAY }), "today", TODAY), true);
  assert.equal(matchesSmartView(todo({ due_on: "2026-09-10" }), "today", TODAY), true);
  assert.equal(matchesSmartView(todo({ due_on: "2026-09-18" }), "today", TODAY), false);
  assert.equal(matchesSmartView(todo({ due_on: null }), "today", TODAY), false);
});

test("Overdue is strictly past its date, and is a subset of Today", () => {
  const late = todo({ due_on: "2026-09-10" });
  assert.equal(matchesSmartView(late, "overdue", TODAY), true);
  assert.equal(matchesSmartView(late, "today", TODAY), true);
  // Due today is not yet overdue.
  assert.equal(matchesSmartView(todo({ due_on: TODAY }), "overdue", TODAY), false);
  assert.equal(matchesSmartView(todo({ due_on: null }), "overdue", TODAY), false);
});

test("All is the catch-all that keeps an undated task reachable", () => {
  // The other three views are date-driven, so without All a task with no due
  // date and no project would appear nowhere at all.
  assert.equal(matchesSmartView(todo({ due_on: null }), "all", TODAY), true);
  assert.equal(matchesSmartView(todo({ due_on: "2026-12-01" }), "all", TODAY), true);
  assert.equal(matchesSmartView(todo({ due_on: "2026-09-01" }), "all", TODAY), true);
  // But a completed task is still not open work.
  assert.equal(matchesSmartView(todo({ status: "done" }), "all", TODAY), false);
});

test("Upcoming covers the next two weeks only", () => {
  assert.equal(matchesSmartView(todo({ due_on: TODAY }), "upcoming", TODAY), true);
  assert.equal(matchesSmartView(todo({ due_on: "2026-09-30" }), "upcoming", TODAY), true);
  assert.equal(matchesSmartView(todo({ due_on: "2026-10-05" }), "upcoming", TODAY), false);
  // Overdue belongs to Today, not Upcoming.
  assert.equal(matchesSmartView(todo({ due_on: "2026-09-01" }), "upcoming", TODAY), false);
});

test("a completed task is in no open view", () => {
  const done = todo({ status: "done", due_on: TODAY, completed_at: `${TODAY}T10:00:00.000Z` });
  for (const view of ["all", "today", "upcoming", "overdue"] as const) {
    assert.equal(matchesSmartView(done, view, TODAY), false, view);
  }
});

test("a pending task is still unfinished, so every view still sees it", () => {
  // Waiting on someone does not stop a deadline from arriving.
  assert.equal(matchesSmartView(todo({ status: "pending", due_on: null }), "all", TODAY), true);
  assert.equal(matchesSmartView(todo({ status: "pending", due_on: TODAY }), "today", TODAY), true);
  assert.equal(
    matchesSmartView(todo({ status: "pending", due_on: "2026-09-10" }), "overdue", TODAY),
    true,
  );
  assert.equal(
    matchesSmartView(todo({ status: "pending", due_on: "2026-09-20" }), "upcoming", TODAY),
    true,
  );
  assert.equal(matchesSmartView(todo({ status: "cancelled" }), "all", TODAY), false);
});

test("a pending task past its date is still flagged overdue", () => {
  assert.equal(
    describeDue(todo({ status: "pending", due_on: "2026-09-14" }), TODAY)?.tone,
    "overdue",
  );
});

test("statusPatch stamps completed_at only for finished statuses", () => {
  assert.equal(statusPatch("open").completed_at, null);
  assert.equal(statusPatch("pending").completed_at, null);
  assert.ok(statusPatch("done").completed_at);
  assert.ok(statusPatch("cancelled").completed_at);
  assert.equal(isActive("pending"), true);
  assert.equal(isFinished("pending"), false);
});

test("describeDue wording and tone", () => {
  assert.deepEqual(describeDue(todo({ due_on: TODAY }), TODAY), {
    label: "Today",
    tone: "today",
  });
  assert.deepEqual(describeDue(todo({ due_on: "2026-09-18" }), TODAY), {
    label: "Tomorrow",
    tone: "soon",
  });
  const overdue = describeDue(todo({ due_on: "2026-09-14" }), TODAY);
  assert.equal(overdue?.tone, "overdue");
  assert.match(overdue?.label ?? "", /3d overdue/);
  // A completed task shows its date but is never flagged overdue.
  assert.equal(
    describeDue(todo({ due_on: "2026-09-14", status: "done" }), TODAY)?.tone,
    "done",
  );
  assert.equal(describeDue(todo(), TODAY), null);
});

test("compareTodos: dated before undated, then priority, then manual order", () => {
  assert.ok(compareTodos(todo({ id: "a", due_on: "2026-09-18" }), todo({ id: "b" })) < 0);
  assert.ok(
    compareTodos(
      todo({ id: "c", due_on: TODAY, priority: 1 }),
      todo({ id: "d", due_on: TODAY, priority: 4 }),
    ) < 0,
  );
  assert.ok(
    compareTodos(
      todo({ id: "e", due_on: TODAY, sort_order: 1 }),
      todo({ id: "f", due_on: TODAY, sort_order: 2 }),
    ) < 0,
  );
});

test("Today groups overdue above today, dropping empty groups", () => {
  const groups = groupForView(
    [todo({ id: "late", due_on: "2026-09-10" }), todo({ id: "now", due_on: TODAY })],
    "today",
    TODAY,
  );
  assert.deepEqual(groups.map((g) => g.key), ["overdue", "today"]);
  assert.deepEqual(groups[0].todos.map((t) => t.id), ["late"]);

  const onlyToday = groupForView([todo({ due_on: TODAY })], "today", TODAY);
  assert.deepEqual(onlyToday.map((g) => g.key), ["today"]);
});

test("Upcoming groups by day in date order with friendly labels", () => {
  const groups = groupForView(
    [
      todo({ id: "b", due_on: "2026-09-19" }),
      todo({ id: "a", due_on: "2026-09-18" }),
      todo({ id: "c", due_on: "2026-09-18" }),
    ],
    "upcoming",
    TODAY,
  );
  assert.deepEqual(groups.map((g) => g.key), ["2026-09-18", "2026-09-19"]);
  assert.equal(groups[0].todos.length, 2);
  assert.match(groups[0].label, /^Tomorrow · /);
});

test("All, Overdue and project views are one flat group", () => {
  for (const view of ["all", "overdue", null] as const) {
    assert.equal(groupForView([todo()], view, TODAY).length, 1, String(view));
    assert.deepEqual(groupForView([], view, TODAY), [], String(view));
  }
});

// TODAY is Thursday 2026-09-17; its Monday-based week runs Sep 14 – Sep 20.

test("startOfWeek returns the Monday, and is stable on a Monday", () => {
  assert.equal(startOfWeek("2026-09-17"), "2026-09-14"); // Thursday
  assert.equal(startOfWeek("2026-09-14"), "2026-09-14"); // Monday itself
  assert.equal(startOfWeek("2026-09-20"), "2026-09-14"); // Sunday closes the week
  assert.equal(startOfWeek("2026-09-21"), "2026-09-21"); // next Monday
});

test("granularity coarsens with distance: week, then month, then year", () => {
  assert.equal(doneBucket("2026-09-15", TODAY).key, "week:current");
  assert.equal(doneBucket("2026-09-08", TODAY).key, "week:2026-09-07");
  assert.equal(doneBucket("2026-08-20", TODAY).key, "month:2026-08");
  assert.equal(doneBucket("2025-11-02", TODAY).key, "year:2025");
});

test("bucket labels read the way the user asked for them", () => {
  assert.equal(doneBucket(TODAY, TODAY).label, "Done this week · Sep 14 – 20");
  assert.equal(doneBucket("2026-09-08", TODAY).label, "Done Sep 7 – 13");
  assert.equal(doneBucket("2026-08-20", TODAY).label, "Done in August");
  assert.equal(doneBucket("2025-11-02", TODAY).label, "Done in 2025");
});

test("a week spanning two months spells out both", () => {
  // Week of Mon Aug 31 – Sun Sep 6; Sep 2 is in this month, so it buckets weekly.
  assert.equal(doneBucket("2026-09-02", TODAY).label, "Done Aug 31 – Sep 6");
});

test("buckets come back newest-first, newest-first inside each", () => {
  const groups = doneBuckets(
    [
      todo({ id: "lastYear", status: "done", completed_at: "2025-11-02T10:00:00.000Z" }),
      todo({ id: "thisWeekOld", status: "done", completed_at: "2026-09-15T08:00:00.000Z" }),
      todo({ id: "lastMonth", status: "done", completed_at: "2026-08-20T10:00:00.000Z" }),
      todo({ id: "thisWeekNew", status: "done", completed_at: "2026-09-16T18:00:00.000Z" }),
      todo({ id: "lastWeek", status: "done", completed_at: "2026-09-08T10:00:00.000Z" }),
    ],
    TODAY,
  );
  assert.deepEqual(groups.map((g) => g.key), [
    "week:current",
    "week:2026-09-07",
    "month:2026-08",
    "year:2025",
  ]);
  assert.deepEqual(groups[0].todos.map((t) => t.id), ["thisWeekNew", "thisWeekOld"]);
});

test("nothing completed means no buckets at all", () => {
  assert.deepEqual(doneBuckets([], TODAY), []);
});

test("a task completed without a timestamp falls back to updated_at", () => {
  const groups = doneBuckets(
    [todo({ id: "x", status: "cancelled", completed_at: null, updated_at: "2026-08-20T10:00:00.000Z" })],
    TODAY,
  );
  assert.deepEqual(groups.map((g) => g.key), ["month:2026-08"]);
});

test("search covers title and description", () => {
  const t = todo({ title: "Call the bank", notes: "about the overdraft" });
  assert.equal(matchesSearch(t, "bank"), true);
  assert.equal(matchesSearch(t, "OVERDRAFT"), true);
  assert.equal(matchesSearch(t, "invoice"), false);
  assert.equal(matchesSearch(t, "   "), true);
});

test("safeLink only accepts a real web address", () => {
  assert.equal(safeLink("https://example.com/x"), "https://example.com/x");
  // A bare host gets a scheme, so the card's button always has one to open.
  assert.equal(safeLink("example.com/x"), "https://example.com/x");
  // Anything that would produce a button navigating nowhere is refused.
  assert.equal(safeLink("javascript:alert(1)"), null);
  assert.equal(safeLink("mailto:a@b.com"), null);
  assert.equal(safeLink("   "), null);
  assert.equal(safeLink(null), null);
});

test("linkLabel is the bare host", () => {
  assert.equal(linkLabel("https://www.example.com/a/b"), "example.com");
  assert.equal(linkLabel("docs.google.com/x"), "docs.google.com");
  assert.equal(linkLabel("nonsense"), null);
});
