-- ============================================================================
-- To-do tracker
--   A standalone, single-user task tracker at /todos. Deliberately unrelated to
--   factory_work_items / fundraising_work_items / fde_deployment_tasks: those
--   are per-entity kanbans, this is a personal list.
--
--   Two axes, kept separate (the Things 3 model):
--     WHEN   due_on / due_at (deadline) vs start_on (not before) vs someday
--     WHERE  project -> section -> task -> subtask
--
--   owner_id / assignee_id ship nullable and unused so a later Supabase Auth
--   pass needs no migration. RLS is allow-all, matching every other table in
--   this schema — see the warning in README.md.
--
-- Additive + idempotent — safe to re-run. Paste into Supabase -> SQL Editor.
-- Requires public.set_updated_at().
-- ============================================================================

create extension if not exists "pgcrypto";

-- ── Projects ────────────────────────────────────────────────────────────────
create table if not exists public.todo_projects (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (length(btrim(name)) > 0),
  -- A token NAME ("primary", "warning", "success"...), never a hex literal: a
  -- hex value bypasses the token layer, will not follow a brand change and
  -- will not flip with the sky. web/scripts/check-retired-tokens.mjs enforces
  -- the same rule on the client.
  color       text not null default 'primary',
  sort_order  double precision not null default 0,
  archived_at timestamptz,
  owner_id    uuid,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ── Sections (groups within a project) ──────────────────────────────────────
create table if not exists public.todo_sections (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.todo_projects(id) on delete cascade,
  name        text not null check (length(btrim(name)) > 0),
  sort_order  double precision not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ── Tasks ───────────────────────────────────────────────────────────────────
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
  due_on        date,
  -- Set only when the task carries a time of day; due_on stays authoritative
  -- for every date comparison so the smart views never straddle a timezone.
  due_at        timestamptz,
  start_on      date,
  someday       boolean not null default false,
  -- RFC-5545 RRULE subset, e.g. 'FREQ=WEEKLY;BYDAY=MO,WE'. A leading '!' means
  -- "recur from the completion date" rather than from the due date — Todoist's
  -- `every!` semantics.
  recurrence    text,
  completed_at  timestamptz,
  -- Fractional index for drag-to-reorder: a move inserts at the midpoint of
  -- its neighbours, so it is one UPDATE rather than renumbering the list.
  sort_order    double precision not null default 0,
  owner_id      uuid,
  assignee_id   uuid,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ── Labels (cross-project tags) ─────────────────────────────────────────────
create table if not exists public.todo_labels (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (length(btrim(name)) > 0),
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

-- ── Attachments (Supabase Storage, bucket `todo-files`) ─────────────────────
-- storage_path is bucket-relative, so the same column addresses a real S3
-- bucket unchanged if the storage backend is ever swapped.
create table if not exists public.todo_attachments (
  id           uuid primary key default gen_random_uuid(),
  todo_id      uuid not null references public.todos(id) on delete cascade,
  file_name    text not null,
  mime_type    text,
  byte_size    bigint,
  storage_path text not null,
  created_at   timestamptz not null default now()
);

-- ── Comments ────────────────────────────────────────────────────────────────
create table if not exists public.todo_comments (
  id         uuid primary key default gen_random_uuid(),
  todo_id    uuid not null references public.todos(id) on delete cascade,
  body       text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── Saved filters ───────────────────────────────────────────────────────────
create table if not exists public.todo_saved_views (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (length(btrim(name)) > 0),
  query      jsonb not null default '{}'::jsonb,
  sort_order double precision not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- Integrity the application must not be trusted to maintain
-- ============================================================================

-- One level of subtasks. Five levels (Todoist's limit) is a nesting UI problem
-- rather than a feature, and the constraint also closes the self-parent and
-- grandchild cycles the foreign key alone allows.
create or replace function public.todos_enforce_depth() returns trigger
language plpgsql as $$
begin
  if new.parent_id is not null then
    if new.parent_id = new.id then
      raise exception 'a todo cannot be its own parent';
    end if;
    if exists (
      select 1 from public.todos
      where id = new.parent_id and parent_id is not null
    ) then
      raise exception 'subtasks may not be nested more than one level deep';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists todos_enforce_depth on public.todos;
create trigger todos_enforce_depth
  before insert or update of parent_id on public.todos
  for each row execute function public.todos_enforce_depth();

-- completed_at follows status. Without this the Logbook silently loses rows
-- completed through any path that forgot to stamp the timestamp.
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

-- ============================================================================
-- Indexes
-- ============================================================================

-- Today / Upcoming / overdue — the hottest path in the route.
create index if not exists todos_open_due_idx
  on public.todos (due_on, priority, sort_order)
  where status = 'open' and parent_id is null;

create index if not exists todos_project_idx
  on public.todos (project_id, section_id, sort_order)
  where status = 'open';

create index if not exists todos_parent_idx
  on public.todos (parent_id);

create index if not exists todos_logbook_idx
  on public.todos (completed_at desc)
  where status <> 'open';

create index if not exists todo_sections_project_idx
  on public.todo_sections (project_id, sort_order);

create index if not exists todo_label_links_label_idx
  on public.todo_label_links (label_id);

create index if not exists todo_attachments_todo_idx
  on public.todo_attachments (todo_id);

create index if not exists todo_comments_todo_idx
  on public.todo_comments (todo_id, created_at);

create index if not exists todos_search_idx on public.todos
  using gin (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(notes, '')));

-- ============================================================================
-- updated_at triggers
-- ============================================================================

do $$
declare
  t text;
begin
  foreach t in array array[
    'todo_projects', 'todo_sections', 'todos', 'todo_comments', 'todo_saved_views'
  ] loop
    execute format('drop trigger if exists %I_set_updated_at on public.%I', t, t);
    execute format(
      'create trigger %I_set_updated_at before update on public.%I '
      'for each row execute function public.set_updated_at()', t, t);
  end loop;
exception
  when undefined_function then
    null;
end $$;

-- ============================================================================
-- RLS — allow-all, matching the rest of this single-user schema
-- ============================================================================

do $$
declare
  t text;
begin
  foreach t in array array[
    'todo_projects', 'todo_sections', 'todos', 'todo_labels', 'todo_label_links',
    'todo_attachments', 'todo_comments', 'todo_saved_views'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "allow all" on public.%I', t);
    execute format(
      'create policy "allow all" on public.%I for all using (true) with check (true)', t);
  end loop;
end $$;

-- ============================================================================
-- Realtime
-- ============================================================================

do $$
declare
  t text;
begin
  foreach t in array array[
    'todo_projects', 'todo_sections', 'todos', 'todo_labels', 'todo_label_links',
    'todo_attachments', 'todo_comments'
  ] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- ============================================================================
-- Storage bucket for attachments
--   Private, 25 MB per object; downloads go through short-lived signed URLs,
--   exactly like the existing `context-files` bucket.
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit)
values ('todo-files', 'todo-files', false, 26214400)
on conflict (id) do nothing;

drop policy if exists "todo files allow all" on storage.objects;
create policy "todo files allow all" on storage.objects
  for all using (bucket_id = 'todo-files') with check (bucket_id = 'todo-files');
