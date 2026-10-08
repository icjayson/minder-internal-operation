// ── Views, grouping and the board split ─────────────────────────────────────

import {
  addDays,
  daysBetween,
  fromIsoDate,
  isActive,
  isFinished,
  toIsoDate,
  type SmartView,
  type Todo,
} from "./todo-types.ts";

export type DueTone = "overdue" | "today" | "soon" | "later" | "done";

/**
 * How a task's deadline reads relative to today. A completed task is never
 * flagged overdue — it just shows its date.
 */
export function describeDue(
  todo: Pick<Todo, "due_on" | "status">,
  today: string,
): { label: string; tone: DueTone } | null {
  if (!todo.due_on) return null;
  const date = fromIsoDate(todo.due_on);
  if (!date) return null;

  const dateLabel = date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  if (isFinished(todo.status)) return { label: dateLabel, tone: "done" };

  const days = daysBetween(today, todo.due_on);
  if (days == null) return { label: dateLabel, tone: "later" };
  if (days < 0) return { label: `${dateLabel} · ${Math.abs(days)}d overdue`, tone: "overdue" };
  if (days === 0) return { label: "Today", tone: "today" };
  if (days === 1) return { label: "Tomorrow", tone: "soon" };
  if (days <= 6) {
    return { label: date.toLocaleDateString(undefined, { weekday: "short" }), tone: "soon" };
  }
  return { label: dateLabel, tone: "later" };
}

export const DUE_TONES: Record<DueTone, string> = {
  overdue: "border-error/35 bg-error-light text-error-dark dark:bg-error/15 dark:text-error",
  today: "border-primary/40 bg-primary-tint text-primary",
  soon: "border-warning/40 text-warning-dark dark:text-warning",
  later: "border-border text-foreground/80",
  done: "border-border text-muted-foreground",
};

/**
 * Does this unfinished task belong in the given view? Pending work counts:
 * waiting on someone does not stop a deadline from arriving.
 *
 * `all` is the catch-all, and it is what keeps an undated task reachable: the
 * other three are date-driven, so without it a task with no due date and no
 * project would appear nowhere at all.
 */
export function matchesSmartView(todo: Todo, view: SmartView, today: string): boolean {
  if (!isActive(todo.status)) return false;

  switch (view) {
    case "all":
      return true;
    case "overdue":
      return todo.due_on != null && todo.due_on < today;
    case "today":
      // Overdue shows here too: Today is the list you actually work from, and
      // the Overdue tab is a focused filter rather than a separate inbox.
      return todo.due_on != null && todo.due_on <= today;
    case "upcoming": {
      const days = todo.due_on ? daysBetween(today, todo.due_on) : null;
      return days != null && days >= 0 && days <= 13;
    }
    default:
      return false;
  }
}

/** Overdue and dated work first, then priority, then the manual drag order. */
export function compareTodos(a: Todo, b: Todo): number {
  if (a.due_on !== b.due_on) {
    if (!a.due_on) return 1;
    if (!b.due_on) return -1;
    return a.due_on < b.due_on ? -1 : 1;
  }
  if (a.priority !== b.priority) return a.priority - b.priority;
  if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
  return a.created_at < b.created_at ? -1 : 1;
}

/** Newest-first, for the DONE column. */
export function compareCompleted(a: Todo, b: Todo): number {
  const at = a.completed_at ?? a.updated_at;
  const bt = b.completed_at ?? b.updated_at;
  return at < bt ? 1 : at > bt ? -1 : 0;
}

export type TodoGroup = { key: string; label: string; todos: Todo[] };

/**
 * Group the list view.
 *
 *  - Today    → "Overdue" then "Today"
 *  - Upcoming → one group per day, in date order
 *  - All / Overdue / project → a single unlabelled group
 */
export function groupForView(
  todos: Todo[],
  view: SmartView | null,
  today: string,
): TodoGroup[] {
  if (view === "today") {
    const groups: TodoGroup[] = [];
    const overdue = todos.filter((t) => t.due_on != null && t.due_on < today).sort(compareTodos);
    const due = todos.filter((t) => t.due_on === today).sort(compareTodos);
    if (overdue.length) groups.push({ key: "overdue", label: "Overdue", todos: overdue });
    if (due.length) groups.push({ key: "today", label: "Today", todos: due });
    return groups;
  }

  if (view === "upcoming") {
    const byDay = new Map<string, Todo[]>();
    for (const todo of todos) {
      if (!todo.due_on) continue;
      const bucket = byDay.get(todo.due_on);
      if (bucket) bucket.push(todo);
      else byDay.set(todo.due_on, [todo]);
    }
    return [...byDay.entries()]
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([iso, items]) => ({
        key: iso,
        label: labelForDay(iso, today),
        todos: items.sort(compareTodos),
      }));
  }

  return todos.length ? [{ key: "all", label: "", todos: [...todos].sort(compareTodos) }] : [];
}

function labelForDay(iso: string, today: string): string {
  const days = daysBetween(today, iso);
  const date = fromIsoDate(iso);
  if (!date) return iso;
  const full = date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  if (days === 0) return `Today · ${full}`;
  if (days === 1) return `Tomorrow · ${full}`;
  if (days === -1) return `Yesterday · ${full}`;
  return full;
}

// ── Completed work ──────────────────────────────────────────────────────────
//
// Nothing is hidden: every completed task is shown, bucketed by how far back
// it was finished. The granularity coarsens with distance, which is how people
// actually remember finished work — this week in detail, older months as a
// lump, older years as a single line.

/** The day a task was finished, `YYYY-MM-DD`. */
export function completedOn(todo: Todo): string {
  return (todo.completed_at ?? todo.updated_at).slice(0, 10);
}

/**
 * The Monday that starts the week containing `iso`.
 *
 * Monday-based, matching the UK/EU convention the rest of the platform uses
 * (its dates are day-first for the same reason).
 */
export function startOfWeek(iso: string): string {
  const date = fromIsoDate(iso);
  if (!date) return iso;
  // getDay() is Sunday-based; shift so Monday is 0.
  return addDays(iso, -((date.getDay() + 6) % 7));
}

function formatWeek(weekStart: string): string {
  const from = fromIsoDate(weekStart);
  const to = fromIsoDate(addDays(weekStart, 6));
  if (!from || !to) return weekStart;
  const month = (d: Date) => d.toLocaleDateString(undefined, { month: "short" });
  // "Sep 7 – 13" inside one month, "Aug 31 – Sep 6" across two.
  const tail =
    from.getMonth() === to.getMonth()
      ? `${to.getDate()}`
      : `${month(to)} ${to.getDate()}`;
  return `${month(from)} ${from.getDate()} – ${tail}`;
}

/**
 * Which bucket a completion day falls into, relative to today.
 *
 * The month test uses the day's own month, so a week straddling a month
 * boundary can land its two halves in different buckets. The week label spells
 * out its real range, so that reads correctly rather than looking like a bug.
 */
export function doneBucket(
  day: string,
  today: string,
): { key: string; label: string; sort: string } {
  const weekStart = startOfWeek(day);

  if (weekStart === startOfWeek(today)) {
    return {
      key: "week:current",
      label: `Done this week · ${formatWeek(weekStart)}`,
      sort: "3",
    };
  }

  if (day.slice(0, 7) === today.slice(0, 7)) {
    return {
      key: `week:${weekStart}`,
      label: `Done ${formatWeek(weekStart)}`,
      sort: `2:${weekStart}`,
    };
  }

  if (day.slice(0, 4) === today.slice(0, 4)) {
    const date = fromIsoDate(`${day.slice(0, 7)}-01`);
    const name = date ? date.toLocaleDateString(undefined, { month: "long" }) : day.slice(0, 7);
    return { key: `month:${day.slice(0, 7)}`, label: `Done in ${name}`, sort: `1:${day.slice(0, 7)}` };
  }

  const year = day.slice(0, 4);
  return { key: `year:${year}`, label: `Done in ${year}`, sort: `0:${year}` };
}

/**
 * Completed tasks grouped into those buckets, newest first, each bucket sorted
 * newest-first inside itself.
 */
export function doneBuckets(done: Todo[], today: string): TodoGroup[] {
  const byKey = new Map<string, { label: string; sort: string; todos: Todo[] }>();

  for (const todo of done) {
    const bucket = doneBucket(completedOn(todo), today);
    const existing = byKey.get(bucket.key);
    if (existing) existing.todos.push(todo);
    else byKey.set(bucket.key, { label: bucket.label, sort: bucket.sort, todos: [todo] });
  }

  return [...byKey.entries()]
    .sort((a, b) => (a[1].sort < b[1].sort ? 1 : a[1].sort > b[1].sort ? -1 : 0))
    .map(([key, bucket]) => ({
      key,
      label: bucket.label,
      todos: bucket.todos.sort(compareCompleted),
    }));
}

/** Case-insensitive substring match over title and description. */
export function matchesSearch(todo: Todo, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    todo.title.toLowerCase().includes(q) || (todo.notes ?? "").toLowerCase().includes(q)
  );
}
