# To-Do Tracker — Implementation Plan (Minder Ops Platform)

> A personal, keyboard-first task tracker at `/todos`, built on `web/design-system/`
> (the vendored shadcn `new-york-v4` snapshot re-tokenised to the Minder brand),
> with Supabase Postgres for data and Supabase Storage (S3-compatible) for attachments.
>
> **Scope decisions taken before planning:**
> 1. **Storage** — Supabase Storage, reusing the `context-files` pattern already in
>    `web/app/components/context-panel.tsx`. It is S3-compatible underneath, so the
>    `storage_path` column is portable to real AWS S3 later without a data migration.
> 2. **Relationship to existing work tables** — none. `factory_work_items`,
>    `fundraising_work_items` and `fde_deployment_tasks` are left completely untouched.
>    This is a standalone personal tracker.
> 3. **Users** — single-user. `owner_id` / `assignee_id` columns ship nullable and
>    unused so a later Supabase Auth pass needs no migration. RLS stays allow-all,
>    consistent with the rest of the platform.

---

## 1. Market research — what the category actually ships

Nine products were reviewed against 2026 comparisons and their own feature docs:
Todoist, TickTick, Things 3, Linear, Height, Asana, Any.do, Microsoft To Do, Notion Tasks.

### 1.1 What every serious tracker has (table stakes)

| Feature | Todoist | TickTick | Things 3 | Linear | Verdict |
|---|---|---|---|---|---|
| Natural-language quick add | ✅ best-in-class | ✅ | ✅ | ✅ | **v1** |
| Projects → Sections → Tasks → Subtasks | ✅ (5 deep) | ✅ | ✅ (Areas/Projects/Headings) | ✅ | **v1**, 2 levels |
| Due date **and** separate start/defer date | partial | ✅ | ✅ (the "When" axis) | ✅ | **v1** |
| Priorities | ✅ P1–P4 | ✅ 4 levels | ✅ 3 + "someday" | ✅ 5 | **v1**, P1–P4 |
| Labels/tags across projects | ✅ | ✅ | ✅ | ✅ | **v1** |
| Recurring tasks | ✅ strongest | ✅ | ✅ | ⚠️ weak | **v1** |
| Smart views (Today / Upcoming / Inbox) | ✅ | ✅ | ✅ | ✅ | **v1** |
| Saved custom filters | ✅ | ✅ | ⚠️ limited | ✅ views | **v1.5** |
| Completed archive / Logbook | ✅ | ✅ | ✅ | ✅ | **v1** |
| Full-text search | ✅ | ✅ | ✅ | ✅ | **v1** |
| Keyboard shortcuts + ⌘K palette | ✅ | ⚠️ | ✅ | ✅ best-in-class | **v1** |
| Drag-to-reorder | ✅ | ✅ | ✅ | ✅ | **v1** |
| Notes / description per task | ✅ | ✅ | ✅ | ✅ | **v1** |
| File attachments | ✅ (paid) | ✅ | ⚠️ | ✅ | **v1** — this is the S3 requirement |
| Comments per task | ✅ | ✅ | ❌ | ✅ | **v1.5** |
| Board / kanban layout | ✅ | ✅ | ❌ | ✅ | **v1.5** |
| Calendar layout | ⚠️ paid | ✅ | ✅ Upcoming | ❌ | **v1.5** |
| Reminders / notifications | ✅ | ✅ | ✅ | ✅ | **v1.5** — reuse the Discord + email cron |
| Completion analytics / streaks ("Karma") | ✅ | ✅ | ❌ | ✅ | **v2** |
| Habit tracker + Pomodoro | ❌ | ✅ | ❌ | ❌ | **out of scope** |
| Team assignment, dependencies, timelines | ✅ | ⚠️ | ❌ | ✅ | **out of scope** (single-user) |

### 1.2 The three ideas worth stealing outright

1. **Todoist's quick add.** One text field is the entire creation UI. `Email the deck
   tomorrow 3pm p1 #Fundraising @deep-work` parses into a fully-formed task. This is the
   single highest-leverage feature in the category and it is what makes a tracker get used
   rather than abandoned.
2. **Things 3's two axes.** *When* (Today / Upcoming / Anytime / Someday) is kept strictly
   separate from *Where* (Project / Area). A task with no date is not late — it is
   "Anytime". This removes the guilt-pile failure mode that kills most to-do apps, and it
   costs exactly two nullable columns (`start_on`, `someday`).
3. **Linear's keyboard model.** `⌘K` for everything, `g`-prefixed navigation, single keys
   to mutate the focused row. The ops platform already vendors `cmdk` and uses it for the
   design-system browser's palette, so the machinery is paid for.

### 1.3 What is deliberately *not* built

Pomodoro timers, habit streaks, team assignment, dependency graphs, Gantt/timeline views,
email-to-task, and third-party sync. Each is a product in its own right; none of them
serve a single-user internal ops tracker, and TickTick's own reviews note the bundle is
what makes it feel heavy.

**Sources:**
[Zapier — best to-do list apps](https://zapier.com/blog/best-todo-list-apps/) ·
[Todoist features](https://www.todoist.com/features) ·
[Todoist glossary](https://www.todoist.com/help/articles/todoist-glossary-cA60laWMH) ·
[Things — Today, Upcoming, Anytime & Someday](https://culturedcode.com/things/support/articles/4001304/) ·
[Things — scheduling to-dos](https://culturedcode.com/things/support/articles/2803579/) ·
[TickTick vs Things 3](https://clickup.com/blog/ticktick-vs-things3/) ·
[Linear review 2026](https://www.tooljunction.io/ai-tools/linear-app) ·
[Top 10 task management apps 2026](https://guptadeepak.com/tools/top-10-task-management-apps-2026/) ·
[Best to-do list apps 2026](https://thesoftwarescout.com/best-to-do-list-apps-2026/)

---

## 2. Current state — what the plan builds on

Everything below is already in the repo and is reused rather than rebuilt.

| Asset | Where | How the tracker uses it |
|---|---|---|
| shadcn `new-york-v4` snapshot, 61 components | `web/design-system/components/` | All chrome. `item`, `checkbox`, `command`, `sheet`, `badge`, `attachment`, `kbd`, `empty`, `progress`, `sonner` |
| Minder brand token layer | `web/app/globals.css` + `tokens.generated.css` | `bg-card`, `border-border`, `text-foreground`, `primary-tint`, `warning`, `error` |
| Retired-token guard | `web/scripts/check-retired-tokens.mjs` | Runs in `npm test`. Bans hex literals, `text-ink`, `NativeSelect`, `mono`, … |
| `PageHeader` / `StatCard` | `web/app/components/` | Route header + the four count tiles |
| `DateField` | `web/app/components/date-field.tsx` | Due/start pickers. Already handles the `YYYY-MM-DD`-vs-UTC-midnight trap |
| `SelectField` | `web/app/components/select-field.tsx` | Project & priority selects. Already maps `""` → `__empty` for Radix |
| Supabase singleton | `web/lib/supabase.ts` | `supabase()` — one client, safe in single-user mode |
| Realtime + optimistic-write pattern | `web/app/components/work-inventory.tsx` | Copied wholesale for the todo store: `postgres_changes` channel, optimistic patch, reload on error |
| Storage upload/signed-URL pattern | `web/app/components/context-panel.tsx:117-315` | Copied for attachments: upload → insert row → rollback storage on DB failure; signed URL for download and image preview |
| Migration conventions | `web/../supabase/*.sql` | Numbered, additive, idempotent, `set_updated_at()` trigger, allow-all RLS, realtime publication `do $$ … $$` block |
| Pure-logic test convention | `web/tests/*.test.ts` | `node --experimental-strip-types --test`. All 11 existing tests cover `lib/` only |
| Sidebar nav | `web/app/components/sidebar.tsx:33` | New top-level entry in `NAV` |

Two gaps worth naming up front:

- **There are no UI tests.** Verification for components is visual, via the in-app browser
  against `next dev`. The plan puts all non-trivial logic in pure `lib/` modules precisely
  so it *can* be tested.
- **`fde_task_attachments` exists in SQL but has zero call sites.** Attachments were
  schema'd and never built. This plan is the first working upload path outside
  `context-files`, so the pattern it establishes should be the one `fde_task_attachments`
  later adopts.

---

## 3. Data model

New migration: **`supabase/039_todos.sql`** (next free number — 038 is the highest today).
Additive and idempotent, matching every existing migration in the folder.

### 3.1 Tables

```sql
create extension if not exists "pgcrypto";

-- ── Projects (Todoist "Projects" / Things "Areas+Projects") ──────────────────
create table if not exists public.todo_projects (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  -- A token NAME ("primary", "warning", "success"…), never a hex literal —
  -- the retired-token guard bans hex in class strings and a colour that does
  -- not flip with the sky is a bug waiting for the next brand change.
  color       text not null default 'primary',
  sort_order  double precision not null default 0,
  archived_at timestamptz,
  owner_id    uuid,                       -- reserved for Supabase Auth
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ── Sections (columns within a project; Things "Headings") ───────────────────
create table if not exists public.todo_sections (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.todo_projects(id) on delete cascade,
  name        text not null,
  sort_order  double precision not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ── Tasks ────────────────────────────────────────────────────────────────────
create table if not exists public.todos (
  id            uuid primary key default gen_random_uuid(),
  -- NULL project = Inbox. That is the whole Inbox implementation.
  project_id    uuid references public.todo_projects(id) on delete cascade,
  section_id    uuid references public.todo_sections(id) on delete set null,
  parent_id     uuid references public.todos(id) on delete cascade,
  title         text not null check (length(btrim(title)) > 0),
  notes         text,
  status        text not null default 'open'
                check (status in ('open', 'done', 'cancelled')),
  priority      smallint not null default 4 check (priority between 1 and 4),
  -- Things' two axes, kept separate on purpose:
  --   due_on   = the deadline           (drives overdue / Today / Upcoming)
  --   due_at   = deadline with a time   (null when the task is all-day)
  --   start_on = "not before"           (hides it from Today until then)
  --   someday  = parked, out of Anytime
  due_on        date,
  due_at        timestamptz,
  start_on      date,
  someday       boolean not null default false,
  -- RFC-5545 RRULE subset, e.g. 'FREQ=WEEKLY;BYDAY=MO,WE'. A leading '!'
  -- means "recur from the completion date" rather than from the due date —
  -- Todoist's `every!` semantics.
  recurrence    text,
  completed_at  timestamptz,
  -- Fractional index for drag-to-reorder: insert at the midpoint of its
  -- neighbours, so a move is one UPDATE instead of renumbering the list.
  sort_order    double precision not null default 0,
  owner_id      uuid,                     -- reserved for Supabase Auth
  assignee_id   uuid,                     -- reserved for Supabase Auth
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ── Labels (cross-project tags) ──────────────────────────────────────────────
create table if not exists public.todo_labels (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  color      text not null default 'muted',
  created_at timestamptz not null default now()
);
create unique index if not exists todo_labels_name_key
  on public.todo_labels (lower(name));

create table if not exists public.todo_label_links (
  todo_id  uuid not null references public.todos(id)       on delete cascade,
  label_id uuid not null references public.todo_labels(id) on delete cascade,
  primary key (todo_id, label_id)
);

-- ── Attachments (Supabase Storage) ───────────────────────────────────────────
create table if not exists public.todo_attachments (
  id           uuid primary key default gen_random_uuid(),
  todo_id      uuid not null references public.todos(id) on delete cascade,
  file_name    text not null,
  mime_type    text,
  byte_size    bigint,
  storage_path text not null,             -- portable to real S3 unchanged
  created_at   timestamptz not null default now()
);

-- ── Comments (v1.5) ──────────────────────────────────────────────────────────
create table if not exists public.todo_comments (
  id         uuid primary key default gen_random_uuid(),
  todo_id    uuid not null references public.todos(id) on delete cascade,
  body       text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── Saved filters (v1.5) ─────────────────────────────────────────────────────
create table if not exists public.todo_saved_views (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  query      jsonb not null default '{}'::jsonb,
  sort_order double precision not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### 3.2 The two integrity rules worth enforcing in the database

**Subtask depth.** Todoist allows five levels; five levels of nesting in a personal tracker
is a UI problem, not a feature. v1 allows exactly one level (task → subtask), enforced in
SQL so the app cannot drift:

```sql
create or replace function public.todos_enforce_depth() returns trigger
language plpgsql as $$
begin
  if new.parent_id is not null then
    if new.parent_id = new.id then
      raise exception 'a todo cannot be its own parent';
    end if;
    if exists (select 1 from public.todos
               where id = new.parent_id and parent_id is not null) then
      raise exception 'subtasks may not be nested more than one level deep';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists todos_enforce_depth on public.todos;
create trigger todos_enforce_depth
  before insert or update of parent_id on public.todos
  for each row execute function public.todos_enforce_depth();
```

**`completed_at` follows `status`.** Otherwise the Logbook silently loses rows that were
completed through a path that forgot to stamp the timestamp:

```sql
create or replace function public.todos_sync_completed_at() returns trigger
language plpgsql as $$
begin
  if new.status = 'open' then
    new.completed_at := null;
  elsif new.completed_at is null then
    new.completed_at := now();
  end if;
  return new;
end $$;

drop trigger if exists todos_sync_completed_at on public.todos;
create trigger todos_sync_completed_at
  before insert or update of status on public.todos
  for each row execute function public.todos_sync_completed_at();
```

### 3.3 Indexes

```sql
-- The Today / Upcoming / overdue queries — the hottest path in the app.
create index if not exists todos_open_due_idx
  on public.todos (due_on, priority, sort_order)
  where status = 'open' and parent_id is null;

create index if not exists todos_project_idx
  on public.todos (project_id, section_id, sort_order)
  where status = 'open';

create index if not exists todos_parent_idx      on public.todos (parent_id);
create index if not exists todos_logbook_idx     on public.todos (completed_at desc)
  where status <> 'open';
create index if not exists todo_label_links_label_idx
  on public.todo_label_links (label_id);
create index if not exists todo_attachments_todo_idx
  on public.todo_attachments (todo_id);

-- Full-text search across title + notes.
create index if not exists todos_search_idx on public.todos
  using gin (to_tsvector('english', coalesce(title,'') || ' ' || coalesce(notes,'')));
```

### 3.4 Triggers, RLS, realtime

For each of the seven tables, mirroring `019_factory_work_inventory.sql` exactly:

- `before update … execute function public.set_updated_at()` (where the table has `updated_at`)
- `alter table … enable row level security` + a single `"allow all"` policy — the platform's
  documented single-user posture, same as every other table
- add to the `supabase_realtime` publication inside the guarded `do $$ … $$` block, so
  re-running the migration is a no-op

### 3.5 Storage bucket

Same migration, so setup stays one paste into the SQL editor:

```sql
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('todo-files', 'todo-files', false, 26214400, null)   -- 25 MB cap
on conflict (id) do nothing;

drop policy if exists "todo files allow all" on storage.objects;
create policy "todo files allow all" on storage.objects
  for all using (bucket_id = 'todo-files') with check (bucket_id = 'todo-files');
```

Private bucket, 25 MB per object, downloads through short-lived signed URLs — identical to
`context-files`. Object key layout: `todos/{todo_id}/{uuid}-{sanitised-filename}`. Keying
by `todo_id` means a future "delete all attachments for this task" is one prefix removal.

> **Portability note.** Nothing above stores a Supabase-specific URL — only a
> bucket-relative `storage_path`. Moving to real AWS S3 later means swapping the three
> call sites in `lib/todo-files.ts` for presigned-URL API routes; no schema change, no data
> migration.

---

## 4. Application architecture

```
web/
  lib/
    todo-types.ts       Todo, TodoProject, TodoLabel, … + PRIORITIES, SMART_VIEWS consts
    todo-parse.ts       ★ quick-add natural-language parser (pure, unit-tested)
    todo-recurrence.ts  ★ RRULE subset: next occurrence after completion (pure, tested)
    todo-query.ts       ★ smart-view predicates + grouping + sorting (pure, tested)
    todo-order.ts       ★ fractional index midpoint + renormalise (pure, tested)
    todo-files.ts       Supabase Storage upload / signed URL / remove
    todos-store.tsx     TodosProvider + useTodos() — realtime + optimistic writes
  app/(app)/todos/
    layout.tsx          Wraps the route in TodosProvider (NOT the global AppShell —
                        no other route should pay for loading todos)
    page.tsx            Smart views: /todos?view=today|upcoming|anytime|someday|logbook
    [projectId]/page.tsx  A single project
  app/components/todos/
    todo-list.tsx       Grouped list, keyboard focus ring, drag-to-reorder
    todo-row.tsx        One task: checkbox, title, meta pills, inline edit
    todo-quick-add.tsx  The parsing input + live "chip" preview of what it parsed
    todo-detail-sheet.tsx  Sheet: notes, subtasks, labels, dates, attachments
    todo-attachments.tsx   Upload / preview / download / delete
    todo-sidebar.tsx    Smart views + project list + label list
    todo-command.tsx    ⌘K palette (cmdk) + `?` shortcut cheatsheet
    todo-board.tsx      v1.5 kanban by section or priority
    todo-calendar.tsx   v1.5 month grid from due_on
  tests/
    todo-parse.test.ts  todo-recurrence.test.ts  todo-query.test.ts  todo-order.test.ts
supabase/
  039_todos.sql
```

**Why a route-scoped provider.** `lib/factories-store.tsx` is mounted in `AppShell` and
loads on every page, which is right for factories because the sidebar counts need them.
Todos are needed on one route. A `TodosProvider` in `app/(app)/todos/layout.tsx` keeps the
rest of the platform's first paint unchanged. If a sidebar "N due today" badge is wanted
later, it is one cheap `count` query in the shell, not a second full store.

### 4.1 The quick-add parser — the one real build-vs-buy call

`chrono-node` is the category-standard date parser, but it is ~3 MB installed and would
land in the client bundle for a single input field. The syntax this tracker needs is
small and closed:

| Token | Example | Meaning |
|---|---|---|
| `p1`–`p4` | `p1` | Priority |
| `#name` | `#Fundraising` | Project (creates it if new, on confirm) |
| `@name` | `@deep-work` | Label |
| `//` | `// call the bank first` | Everything after goes to `notes` |
| date phrase | `tomorrow`, `next mon`, `in 3 days`, `jan 5`, `5/1`, `3pm`, `tomorrow 3pm` | `due_on` / `due_at` |
| `every …` | `every weekday`, `every! 2 weeks` | `recurrence` |
| `start …` | `start monday` | `start_on` |
| `someday` | `someday` | `someday = true` |

**Recommendation: write it.** ~200 lines in `lib/todo-parse.ts`, a pure
`parseQuickAdd(input: string, today: Date): ParsedTodo` with no dependencies, unit-tested
with `node:test` the way all eleven existing tests are. It fits the repo's convention
(every test today covers pure `lib/` logic), adds nothing to the bundle, and the parse is
fully deterministic — which matters because the UI renders a live chip preview of what it
understood. If real usage shows the date coverage is too thin, swapping in
`chrono-node`'s English-only entry point behind the same function signature is a
contained change. ([chrono-node](https://www.npmjs.com/package/chrono-node) is the fallback,
not the starting point.)

Parser rules worth fixing now, because they are where these things go wrong:

- Tokens are stripped from the title **only** when they parse. `Ship p1 report` gives the
  title `Ship report` and priority 1; `Buy p5 batteries` keeps `p5` in the title.
- Dates parse component-wise, never via `new Date(string)` — the same UTC-midnight trap
  `DateField` already documents.
- `today` is injected, never read from the clock inside the function, so tests are stable.
- An unrecognised `#project` is *proposed*, not silently created: the chip preview shows
  "create project Fundraising" and creation happens on submit.

### 4.2 Recurrence

`lib/todo-recurrence.ts` exports `nextOccurrence(rrule, from, completedOn)`. Two semantics,
matching Todoist:

- `FREQ=WEEKLY;BYDAY=MO` — next Monday **after the current due date**. A task due last
  Monday that you complete on Friday becomes due *this* Monday. Deadlines stay on schedule.
- `!FREQ=DAILY;INTERVAL=3` — three days **after the completion date**. For habits, where
  the point is the interval since you last did it.

Supported subset: `FREQ=DAILY|WEEKLY|MONTHLY|YEARLY`, `INTERVAL`, `BYDAY`, `BYMONTHDAY`.
Completing a recurring task does not create a new row — it advances `due_on` and clears
`completed_at`, so the task keeps its identity, notes, subtasks and attachments. A
`todo_completions` log table is deliberately deferred to v2 with streak analytics.

### 4.3 Realtime and optimistic writes

Lifted directly from `work-inventory.tsx:120-160`: subscribe one `postgres_changes`
channel per table, patch local state on `INSERT`/`UPDATE`/`DELETE`, and on any write error
set the error and reload from the server rather than leaving the optimistic state standing.

Completion gets the Sonner **undo** treatment: optimistic strike-through, a toast with an
Undo action, and the write committed immediately (undo is a second write, not a deferred
one — a deferred write loses the change if the tab closes).

---

## 5. UI — design system mapping

Every element maps to a vendored component. Nothing bespoke is introduced except the
`TodoRow`, which is a composition, not new chrome.

| Element | Component | Notes |
|---|---|---|
| Route header, eyebrow, counts | `PageHeader` + `StatCard` | Tiles: Today · Overdue (`tone="danger"`) · Upcoming · Completed this week |
| View switcher (List/Board/Calendar) | `toggle-group` | Matches the table/tree toggle on `/customers` |
| Smart-view + project rail | `sidebar` (`SidebarMenu`, `SidebarMenuBadge`) | Second-level rail inside the route, counts in the badge |
| Task row | `item` (`Item`, `ItemMedia`, `ItemContent`, `ItemActions`) | The design system's own row primitive |
| Completion control | `checkbox` | Priority tint via `className`: P1 `border-error`, P2 `border-warning`, P3 `border-primary`, P4 default |
| Priority / labels / due pills | `badge` | Tones from the semantic ramp, same recipe as `StatCard`'s `TONE` map |
| Overdue / due-today pill | `badge` + the `describeTrigger` logic from `work-inventory.tsx:37` | That function already gets "overdue / today / tomorrow / later" right — lift it into `lib/todo-query.ts` and share |
| Date pickers | `DateField` | Already handles the `YYYY-MM-DD` timezone trap |
| Project / priority selects | `SelectField` | `NativeSelect` is banned by the token guard |
| Quick-add autocomplete (`#`, `@`) | `command` (cmdk) | Inline popover over the input |
| ⌘K palette | `command` + `dialog` | Same pattern as the design-system browser's palette |
| Task detail | `sheet` | Right-side drawer with a real focus trap, scroll lock and Esc — the thing the six hand-rolled drawers lacked |
| Subtask progress | `progress` | "3 of 5" on the parent row |
| Notes editor | `textarea` | Plain text v1; markdown rendering is v2 |
| Attachments | `attachment` | Already vendored and currently unused anywhere |
| Empty states | `empty` (`EmptyHeader`, `EmptyTitle`, `EmptyDescription`) | Per smart view — "Nothing due today" reads very differently from "No tasks yet" |
| Undo toast | `sonner` | Complete, delete, bulk-edit |
| Shortcut cheatsheet (`?`) | `dialog` + `kbd` | |
| Destructive confirm | `alert-dialog` | Delete project (cascades to its tasks) |
| Bulk-select bar | `button-group` | |
| Logbook charts (v2) | `design-system/charts/chart-bar-default` | `recharts` is pinned to `3.8.0` — do not bump |

### 5.1 Token discipline

`npm test` runs `check-retired-tokens.mjs` over `app/components` and `app/(app)`, so the
new files are covered from the first commit. Concretely that means: `bg-card` not
`bg-surface`, `text-foreground` not `text-ink`, `border-border` not `border-line`,
`text-muted-foreground` not `text-muted`, `tabular-nums` not `mono`, `rounded-lg` not
`rounded-card`, `SelectField` not `NativeSelect`, and **no `[#rrggbb]` literal anywhere** —
which is why `todo_projects.color` stores a token name rather than a hex value.

### 5.2 Keyboard model

| Key | Action |
|---|---|
| `q` | Quick add (global within the route) |
| `⌘K` | Command palette |
| `/` | Focus search |
| `g` `t` / `g` `u` / `g` `i` / `g` `l` | Today / Upcoming / Inbox / Logbook |
| `j` / `k` or `↑` / `↓` | Move focus |
| `Enter` | Open detail sheet · `Esc` closes |
| `Space` | Toggle complete |
| `1`–`4` | Set priority on the focused task |
| `t` / `Shift`+`T` / `w` | Due today / tomorrow / next week |
| `x` | Toggle selection (bulk mode) |
| `⌘Z` | Undo the last completion or delete |
| `?` | Shortcut cheatsheet |

Implemented as one `useEffect` keydown listener in `todo-list.tsx`, guarded on
`event.target` not being an input/textarea/contenteditable, so typing in quick-add never
triggers navigation.

---

## 6. Attachments — the storage path in detail

`lib/todo-files.ts` wraps three operations, copied from `context-panel.tsx:117-315`:

**Upload** (`uploadTodoFile(todoId, file)`)
1. Client-side guards: ≤ 25 MB, filename sanitised to `[A-Za-z0-9._-]`, extension allowlist.
2. `path = todos/${todoId}/${crypto.randomUUID()}-${safeName}`
3. `sb.storage.from('todo-files').upload(path, file, { upsert: false })`
4. Insert the `todo_attachments` row.
5. **If step 4 fails, `remove([path])`.** This ordering is the one in `ai-context/page.tsx:143`
   and it is the right one: an orphaned storage object is invisible and unbilled-for-free,
   whereas a row pointing at a missing object is a broken UI element forever.

**Download** — `createSignedUrl(path, 60, { download: fileName })`. Images additionally get
a 3600 s signed URL for inline preview, matching `context-panel.tsx:309`.

**Delete** — remove from storage first, then delete the row; report whichever error comes
back. The `on delete cascade` from `todos` handles rows but *not* storage objects, so
deleting a task must sweep its attachment paths first — a `deleteTodoWithFiles()` helper,
not a raw delete. This is a genuine footgun and is called out here because the schema
alone will not protect against it.

**Env.** No new variables. `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
already cover it. (A real-S3 switch would add `S3_BUCKET`, `S3_REGION`,
`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` and two API routes — not needed now.)

---

## 7. Phased delivery

Each phase leaves the app building, typechecking and rendering. Estimates are working days
for one engineer.

### Phase 0 — Baseline *(0.25 d)*
Branch `feat/todo-tracker`. Record `npm run build && npm run typecheck && npm test` green
so later regressions are attributable.

### Phase 1 — Schema *(0.5 d)*
Write `supabase/039_todos.sql` (§3 in full: tables, the two triggers, indexes, RLS,
realtime, storage bucket). Paste into the Supabase SQL editor. Verify by inserting and
deleting a row by hand, and by confirming the depth trigger rejects a grandchild.
**Deliverable:** the migration; `README.md` migration list updated.

### Phase 2 — Pure domain layer + tests *(1.5 d)*
`lib/todo-types.ts`, `todo-parse.ts`, `todo-recurrence.ts`, `todo-query.ts`,
`todo-order.ts`, and four `tests/*.test.ts` files. No UI yet.
**Gate:** `npm test` green, with parser cases for every row of the §4.1 token table,
recurrence cases for both semantics across a DST boundary, and ordering cases including
the midpoint-exhaustion renormalise path.
**Why first:** this is the only part that can be tested, and it is where the bugs are.

### Phase 3 — Store *(0.75 d)*
`lib/todos-store.tsx` + `app/(app)/todos/layout.tsx`. Realtime channels for `todos`,
`todo_projects`, `todo_labels`, `todo_label_links`. Optimistic create/update/delete with
reload-on-error.

### Phase 4 — Route shell and list *(1.5 d)*
`page.tsx`, `todo-sidebar.tsx`, `todo-list.tsx`, `todo-row.tsx`. Smart views, grouped
list, inline title edit, complete-with-undo. Sidebar nav entry in `sidebar.tsx` `NAV`.
**Milestone: usable.** Tasks can be created (plain text), completed, reordered and viewed.

### Phase 5 — Quick add *(1 d)*
`todo-quick-add.tsx` on top of the Phase 2 parser, with the live chip preview and the
`#`/`@` cmdk autocomplete. **This is the feature that decides whether the tracker gets used.**

### Phase 6 — Detail sheet *(1.25 d)*
`todo-detail-sheet.tsx`: notes, subtasks (one level), labels, due/start dates, priority,
project/section, recurrence picker, delete.

### Phase 7 — Attachments *(0.75 d)*
`lib/todo-files.ts` + `todo-attachments.tsx`, including `deleteTodoWithFiles()`.
**Gate:** upload → reload → download → delete round-trips, and no orphan row survives a
forced DB failure.

### Phase 8 — Keyboard + palette *(1 d)*
`todo-command.tsx`, the global key handler, the `?` cheatsheet.

### Phase 9 — Search, filters, Logbook *(0.75 d)*
Full-text search against the GIN index, label filtering, the Logbook view.

**v1 total ≈ 9 working days.**

### v1.5 *(≈ 4 d)* — board layout, calendar layout, comments, saved filters, and reminders
routed through the existing `/api/scan-alerts` + Discord/email digest (adds a nullable
`todo_id` to `notifications`).

### v2 — completion analytics with the vendored chart blocks, markdown notes, and the
Chrome extension's side panel as a capture surface.

---

## 8. Verification

Per phase:

```bash
cd web
npm run typecheck        # tsc --noEmit
npm test                 # retired-token guard + node:test suites
npm run build
```

Then, since there are no UI tests, browser verification against `next dev` on each of:
`/todos?view=today`, `?view=upcoming`, `?view=anytime`, `?view=someday`, `?view=logbook`,
and a project route — checking in **both skies** (the `data-theme` toggle) and at mobile
width, plus a console/network error sweep. The design-system adoption pass set the
precedent of screenshotting routes into `web/scripts/baseline/`; the new route should join
that set.

Manual acceptance checklist for v1:

- [ ] `Email the deck tomorrow 3pm p1 #Fundraising @deep-work // ask about the term sheet`
      creates one task with the right title, date+time, priority, project, label and notes
- [ ] A task with `start_on` in the future does not appear in Today
- [ ] A `someday` task appears only in Someday
- [ ] Completing `every! 3 days` re-dues from the completion date; `every monday` does not
- [ ] Completing a task shows an undo toast that actually restores it
- [ ] Drag-to-reorder survives a reload
- [ ] The depth trigger rejects a sub-subtask
- [ ] Deleting a task removes its storage objects, not just its rows
- [ ] `npm test` fails if a hex literal or a retired token name is introduced
- [ ] Every route in the app still renders unchanged (the new provider is route-scoped)

---

## 9. Risks

| Risk | Mitigation |
|---|---|
| **Hand-written date parsing misses real phrasings** | The parser is one pure function with one call site; `chrono-node` drops in behind the same signature. The chip preview means a miss is visible before submit, never silent. |
| **Fractional-index precision exhaustion** after many reorders in one gap | `todo-order.ts` renormalises a list to integer spacing when a computed gap falls below `1e-6`. Tested. |
| **Orphaned storage objects** | Upload rolls back on DB failure; deletes sweep storage before rows via `deleteTodoWithFiles()`. A `scripts/sweep-todo-files.mjs` reconciliation job is cheap insurance if it ever drifts. |
| **Allow-all RLS on a table that will later hold private notes** | Documented in `README.md` under Known gaps, consistent with the rest of the platform. `owner_id` ships now so the eventual policy is `using (owner_id = auth.uid())` and nothing else. |
| **Scope creep into a project manager** | §1.3 is the line. Habits, Pomodoro, dependencies and team assignment are out. |
| **Realtime channel count** | Four channels on one route, torn down on unmount — the same shape `work-inventory.tsx` already runs per open factory drawer. |
| **`recharts` bump breaks six chart blocks** | Pinned at `3.8.0`; v2 analytics must not bump it. |
