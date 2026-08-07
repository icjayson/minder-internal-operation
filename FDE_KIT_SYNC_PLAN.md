# FDE-Kit Sync — Implementation Plan (minder-internal-operation)

> Companion doc lives in the `fde-kit-web` repo (`SUPABASE_SYNC_PLAN.md`). This file
> covers **only** the changes owned by the minder platform.

## Goal

Let `fde-kit-web` share this app's Supabase instance so that:

1. When a factory is marked as **customer** here, fde-kit auto-creates a deployment
   (project) with the full checklist for that customer.
2. Files / links / notes attached to a checklist item in fde-kit flow into this
   app's **Context** section for that customer/factory (and therefore into the AI layer).

This repo **owns the schema**. fde-kit writes to it directly via the shared anon client
(same allow-all RLS trust model already in use). No new write endpoints are required;
the existing `/api/context/extract` route is reused for file text extraction.

## Key facts (current state)

- There is **no `customers` table**. A customer is a `public.factories` row with
  `is_customer = true` (see `supabase/033_customers.sql`).
- The "context" section is `public.context_items` (polymorphic via
  `entity_type` + `entity_id`; for a customer/factory `entity_type = 'factory'`,
  `entity_id = factories.id`). See `supabase/014_context_items.sql`.
- `context_items.kind` is currently only `'file'` or `'text'` — **no `'link'` kind**.
- Files live in the private `context-files` storage bucket; extracted text is written
  back into `context_items.body`, which `web/lib/context-server.ts:loadContextText`
  concatenates into the AI prompt.
- Supabase client: `web/lib/supabase.ts` (anon key, singleton, allow-all RLS).

---

## Work items

### 1. Migration `supabase/034_fde_kit_sync.sql` — tables for fde-kit projects

New tables mirroring fde-kit's `Deployment` / `Task` / `Attachment` model, but with a
**real FK to the customer factory** (fde-kit's `customer` was previously free text).

```sql
-- Projects created by fde-kit, keyed to a customer factory
create table if not exists public.fde_deployments (
  id            uuid primary key default gen_random_uuid(),
  factory_id    uuid references public.factories(id) on delete cascade,
  customer_name text not null,          -- denormalized label from fde-kit
  fde           text,                   -- engineer name
  status        text not null default 'pre'
                check (status in ('pre','during','after')),
  started_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists fde_deployments_factory_idx
  on public.fde_deployments (factory_id);

-- Flattened checklist items (from template clone)
create table if not exists public.fde_deployment_tasks (
  id            uuid primary key default gen_random_uuid(),
  deployment_id uuid not null references public.fde_deployments(id) on delete cascade,
  group_key     text,
  task_key      text not null,          -- stable key from the fde-kit template
  phase         text,                   -- pre/during/after
  title         text not null,
  note          text default '',
  status        text default 'todo',
  updated_at    timestamptz not null default now(),
  unique (deployment_id, task_key)
);

-- Links attached to a task (new first-class concept)
create table if not exists public.fde_task_links (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid not null references public.fde_deployment_tasks(id) on delete cascade,
  label      text,
  url        text not null,
  created_at timestamptz not null default now()
);

-- File attachments (bytes to a storage bucket, NOT base64)
create table if not exists public.fde_task_attachments (
  id           uuid primary key default gen_random_uuid(),
  task_id      uuid not null references public.fde_deployment_tasks(id) on delete cascade,
  file_name    text not null,
  mime_type    text,
  byte_size    int,
  storage_path text not null,           -- object key in the fde-attachments bucket
  created_at   timestamptz not null default now()
);

-- Enable RLS + allow-all policies + realtime, copying the idioms in 014_context_items.sql
alter table public.fde_deployments        enable row level security;
alter table public.fde_deployment_tasks   enable row level security;
alter table public.fde_task_links         enable row level security;
alter table public.fde_task_attachments   enable row level security;
-- create policy "allow all" on <each table> for all using (true) with check (true);
-- alter publication supabase_realtime add table <each table>;

-- Storage bucket for fde-kit uploads
insert into storage.buckets (id, name, public)
values ('fde-attachments','fde-attachments', false)
on conflict (id) do nothing;
-- add allow-all storage policy for the bucket, matching context-files
```

> Copy the exact `create policy` / `alter publication supabase_realtime add table`
> statements from `supabase/014_context_items.sql` so behavior stays consistent.

### 2. Migration `supabase/035_context_items_source.sql` — idempotent sync + `link` kind

Lets fde-kit write into the existing Context panel **without duplicating** on re-sync,
and makes links first-class instead of buried in text cards.

```sql
alter table public.context_items
  add column if not exists source      text,   -- e.g. 'fde-kit'
  add column if not exists external_id text,   -- fde task/link/attachment id
  add column if not exists url          text;  -- for kind='link'

-- allow the 'link' kind
alter table public.context_items drop constraint if exists context_items_kind_check;
alter table public.context_items
  add constraint context_items_kind_check
  check (kind in ('file','text','link'));

-- idempotent upsert target for synced rows
create unique index if not exists context_items_source_external_idx
  on public.context_items (source, external_id)
  where source is not null;
```

### 3. TypeScript types — `web/lib/types.ts`

- Add interfaces: `FdeDeployment`, `FdeDeploymentTask`, `FdeTaskLink`, `FdeTaskAttachment`.
- Extend `ContextItem`:
  - `kind: 'file' | 'text' | 'link'`
  - `source?: string | null`
  - `external_id?: string | null`
  - `url?: string | null`

### 4. Render a `link` card — `web/app/components/context-panel.tsx`

- Add a `LinkCard` (icon + clickable `url` + optional title) alongside `TextCard`/`FileCard`.
- Ensure the item list branches on `kind === 'link'`.
- Confirm `web/lib/context-server.ts:loadContextText` includes link content in the AI
  prompt. It already concatenates `body`, so fde-kit should also populate `body` for
  link/note rows (e.g. `"<label>: <url>"`).

### 5. (Optional) Deployment progress panel — `web/app/components/factory-drawer.tsx`

Read-only. When `isCustomerContext`, read `fde_deployments` + `fde_deployment_tasks`
for the `factory_id` and show checklist progress (e.g. "12 / 40 tasks done", phase
breakdown). Not required for sync; purely visibility into what fde-kit is doing.

---

## Ownership / conflict rules

- fde-kit is the **sole writer** for `context_items` rows where `source = 'fde-kit'`.
  The minder UI should treat those as read-only (or at least never re-key them) to avoid
  fighting the sync.
- Deletes in fde-kit must remove the mirrored row:
  `delete from context_items where source='fde-kit' and external_id = <id>`.

## Sequencing

1. Run migration `034` in the Supabase SQL editor.
2. Run migration `035`.
3. Add types (#3) + `link` card (#4).
4. Hand off to fde-kit (its plan depends on `034`/`035` existing).
5. (Optional) deployment progress panel (#5) after fde-kit starts writing rows.

## Open questions

1. One deployment per customer, or many? (Plan assumes one per `factory_id`; drop the
   uniqueness + add a manual "new project" action if many.)
2. Should synced context ever be editable from minder, or is fde-kit the only owner?
   (Recommend fde-kit-only.)
3. File storage: keep separate `fde-attachments` + `context-files` copies (clean
   separation) or share one bucket (less duplication)? See fde-kit plan §B4.
