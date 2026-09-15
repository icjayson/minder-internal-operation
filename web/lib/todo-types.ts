// ── To-do tracker model ─────────────────────────────────────────────────────
// A standalone personal tracker, unrelated to the per-entity kanbans in
// factory_work_items / fundraising_work_items / fde_deployment_tasks.
//
// Deliberately small: a task is a title, a description, a due date, a priority
// and an optional link. Four views (All, Today, Upcoming, Overdue) plus
// projects, each shown as a list or as a TO-DO / DONE board.

export type TodoStatus = "open" | "done" | "cancelled";

/** P1 (urgent) … P4 (none). Matches the DB check constraint. */
export type TodoPriority = 1 | 2 | 3 | 4;

export const PRIORITIES: {
  value: TodoPriority;
  label: string;
  short: string;
  /** Token-based classes — never a hex literal. */
  dot: string;
  text: string;
  check: string;
}[] = [
  { value: 1, label: "P1 — urgent", short: "P1", dot: "bg-error", text: "text-error", check: "border-error data-[state=checked]:bg-error data-[state=checked]:border-error" },
  { value: 2, label: "P2 — high", short: "P2", dot: "bg-warning", text: "text-warning-dark dark:text-warning", check: "border-warning data-[state=checked]:bg-warning data-[state=checked]:border-warning" },
  { value: 3, label: "P3 — normal", short: "P3", dot: "bg-primary", text: "text-primary", check: "border-primary data-[state=checked]:bg-primary data-[state=checked]:border-primary" },
  { value: 4, label: "P4 — none", short: "P4", dot: "bg-muted-foreground/40", text: "text-muted-foreground", check: "" },
];

export function priorityMeta(priority: number) {
  return PRIORITIES.find((p) => p.value === priority) ?? PRIORITIES[3];
}

/** Project colours are token names, resolved through this map. */
export const TODO_COLORS: { key: string; label: string; dot: string; text: string }[] = [
  { key: "primary", label: "Blue", dot: "bg-primary", text: "text-primary" },
  { key: "success", label: "Green", dot: "bg-success", text: "text-success-dark dark:text-success" },
  { key: "warning", label: "Amber", dot: "bg-warning", text: "text-warning-dark dark:text-warning" },
  { key: "error", label: "Red", dot: "bg-error", text: "text-error-dark dark:text-error" },
  { key: "muted", label: "Grey", dot: "bg-muted-foreground/50", text: "text-muted-foreground" },
];

export function colorMeta(key: string | null | undefined) {
  return TODO_COLORS.find((c) => c.key === key) ?? TODO_COLORS[0];
}

// ── Views ───────────────────────────────────────────────────────────────────
// Four lenses over the same open tasks. Everything else is a project.
export const SMART_VIEWS = [
  { key: "all", label: "All", hint: "Every open task" },
  { key: "today", label: "Today", hint: "Due today, plus anything overdue" },
  { key: "upcoming", label: "Upcoming", hint: "The next two weeks, by day" },
  { key: "overdue", label: "Overdue", hint: "Past its due date" },
] as const;

export type SmartView = (typeof SMART_VIEWS)[number]["key"];

export function isSmartView(value: string | null | undefined): value is SmartView {
  return SMART_VIEWS.some((v) => v.key === value);
}

/** List or board. The board is two columns: TO-DO and DONE. */
export type TodoLayout = "list" | "board";

export function isLayout(value: string | null | undefined): value is TodoLayout {
  return value === "list" || value === "board";
}

// ── Rows ────────────────────────────────────────────────────────────────────

export interface TodoProject {
  id: string;
  name: string;
  color: string;
  sort_order: number;
  archived_at: string | null;
  owner_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Todo {
  id: string;
  project_id: string | null;
  title: string;
  /** The description field. Stored as `notes` — the column predates the rename. */
  notes: string | null;
  status: TodoStatus;
  priority: TodoPriority;
  /** `YYYY-MM-DD`. Authoritative for every date comparison. */
  due_on: string | null;
  /** Optional reference URL; when set the card grows a button that opens it. */
  link: string | null;
  completed_at: string | null;
  sort_order: number;
  owner_id: string | null;
  assignee_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface TodoAttachment {
  id: string;
  todo_id: string;
  file_name: string;
  mime_type: string | null;
  byte_size: number | null;
  storage_path: string;
  created_at: string;
}

// ── Date helpers ────────────────────────────────────────────────────────────
// Every date in the platform is a plain `YYYY-MM-DD` string. These parse and
// format component-wise rather than through `new Date(iso)`, which reads a
// bare date as UTC midnight and lands on the previous day west of Greenwich —
// the same trap DateField documents.

export function toIsoDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function fromIsoDate(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const date = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Calendar days between two ISO dates, ignoring time and DST entirely. */
export function daysBetween(fromIso: string, toIsoStr: string): number | null {
  const a = fromIsoDate(fromIso);
  const b = fromIsoDate(toIsoStr);
  if (!a || !b) return null;
  const au = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const bu = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((bu - au) / 86_400_000);
}

export function addDays(iso: string, days: number): string {
  const date = fromIsoDate(iso);
  if (!date) return iso;
  date.setDate(date.getDate() + days);
  return toIsoDate(date);
}

/**
 * A link is only rendered as a button when it is a real http(s) URL — anything
 * else would produce a button that navigates nowhere, or a `javascript:` href.
 */
export function safeLink(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  // A scheme that is already present must be http(s). Testing this before
  // prepending matters: `https://` + `mailto:a@b.com` parses as a perfectly
  // valid https URL, which would smuggle the rejected scheme straight through.
  const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(trimmed);
  if (hasScheme && !/^https?:\/\//i.test(trimmed)) return null;

  try {
    const url = new URL(hasScheme ? trimmed : `https://${trimmed}`);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    // A scheme-less string has to at least look like a host, or "nonsense"
    // becomes https://nonsense and the card grows a button going nowhere.
    // An explicit scheme is taken at its word, so internal hosts still work.
    if (!hasScheme && !url.hostname.includes(".") && url.hostname !== "localhost") {
      return null;
    }
    return url.href;
  } catch {
    return null;
  }
}

/** The bare host, for the link button's label. */
export function linkLabel(value: string | null | undefined): string | null {
  const href = safeLink(value);
  if (!href) return null;
  try {
    return new URL(href).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}
