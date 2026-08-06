-- FDE KIT sync bundle
-- Run this entire file once in Supabase SQL Editor.
-- Order: customer marker -> FDE tables/storage -> Context sync metadata.
-- Safe to re-run: statements are additive/idempotent.

begin;

-- Customer marker used by fde-kit provisioning.
-- Additive and idempotent: existing factories remain non-customers.

alter table public.factories
  add column if not exists is_customer boolean not null default false;

create index if not exists factories_is_customer_idx
  on public.factories (is_customer)
  where is_customer = true;

-- FDE KIT sync schema.
-- Additive and idempotent: this migration is safe to run more than once.

create extension if not exists "pgcrypto";

create table if not exists public.fde_deployments (
  id            uuid primary key default gen_random_uuid(),
  factory_id    uuid references public.factories(id) on delete cascade,
  name          text not null,
  customer_name text not null,
  fde           text not null default '',
  status        text not null default 'pre'
                check (status in ('pre', 'during', 'after')),
  started_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Keep this migration compatible with the earlier draft schema that omitted
-- the display name. Existing rows are backfilled from customer_name.
alter table public.fde_deployments add column if not exists name text;
update public.fde_deployments set name = customer_name where name is null;
alter table public.fde_deployments alter column name set default '';
alter table public.fde_deployments alter column name set not null;

create index if not exists fde_deployments_factory_idx
  on public.fde_deployments (factory_id);

create unique index if not exists fde_deployments_one_customer_idx
  on public.fde_deployments (factory_id)
  where factory_id is not null;

create table if not exists public.fde_deployment_tasks (
  id            uuid primary key default gen_random_uuid(),
  deployment_id uuid not null references public.fde_deployments(id) on delete cascade,
  group_key     text not null,
  task_key      text not null,
  phase         text not null check (phase in ('pre', 'during', 'after')),
  title         text not null,
  note          text not null default '',
  status        text not null default 'todo' check (status in ('todo', 'done')),
  subtasks      jsonb not null default '[]'::jsonb,
  updated_at    timestamptz not null default now(),
  unique (deployment_id, task_key)
);

-- The FDE checklist keeps nested subtask state in the same remote task row.
alter table public.fde_deployment_tasks
  add column if not exists subtasks jsonb not null default '[]'::jsonb;

create index if not exists fde_deployment_tasks_deployment_idx
  on public.fde_deployment_tasks (deployment_id, phase, group_key);

create table if not exists public.fde_task_links (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid not null references public.fde_deployment_tasks(id) on delete cascade,
  label      text,
  url        text not null,
  created_at timestamptz not null default now()
);

create index if not exists fde_task_links_task_idx
  on public.fde_task_links (task_id);

create table if not exists public.fde_task_attachments (
  id           uuid primary key default gen_random_uuid(),
  task_id      uuid not null references public.fde_deployment_tasks(id) on delete cascade,
  file_name    text not null,
  mime_type    text,
  byte_size    int,
  storage_path text not null,
  created_at   timestamptz not null default now()
);

create index if not exists fde_task_attachments_task_idx
  on public.fde_task_attachments (task_id);

do $$
begin
  execute 'drop trigger if exists fde_deployments_set_updated_at on public.fde_deployments';
  execute 'create trigger fde_deployments_set_updated_at before update on public.fde_deployments for each row execute function public.set_updated_at()';
  execute 'drop trigger if exists fde_deployment_tasks_set_updated_at on public.fde_deployment_tasks';
  execute 'create trigger fde_deployment_tasks_set_updated_at before update on public.fde_deployment_tasks for each row execute function public.set_updated_at()';
exception
  when undefined_function then
    null;
end $$;

alter table public.fde_deployments enable row level security;
alter table public.fde_deployment_tasks enable row level security;
alter table public.fde_task_links enable row level security;
alter table public.fde_task_attachments enable row level security;

drop policy if exists "fde deployments allow all" on public.fde_deployments;
create policy "fde deployments allow all" on public.fde_deployments
  for all using (true) with check (true);

drop policy if exists "fde deployment tasks allow all" on public.fde_deployment_tasks;
create policy "fde deployment tasks allow all" on public.fde_deployment_tasks
  for all using (true) with check (true);

drop policy if exists "fde task links allow all" on public.fde_task_links;
create policy "fde task links allow all" on public.fde_task_links
  for all using (true) with check (true);

drop policy if exists "fde task attachments allow all" on public.fde_task_attachments;
create policy "fde task attachments allow all" on public.fde_task_attachments
  for all using (true) with check (true);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'fde_deployments'
  ) then execute 'alter publication supabase_realtime add table public.fde_deployments'; end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'fde_deployment_tasks'
  ) then execute 'alter publication supabase_realtime add table public.fde_deployment_tasks'; end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'fde_task_links'
  ) then execute 'alter publication supabase_realtime add table public.fde_task_links'; end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'fde_task_attachments'
  ) then execute 'alter publication supabase_realtime add table public.fde_task_attachments'; end if;
end $$;

insert into storage.buckets (id, name, public)
values ('fde-attachments', 'fde-attachments', false)
on conflict (id) do nothing;

drop policy if exists "fde attachments all" on storage.objects;
create policy "fde attachments all" on storage.objects
  for all
  using (bucket_id = 'fde-attachments')
  with check (bucket_id = 'fde-attachments');

-- Source metadata and first-class links for FDE KIT context sync.
-- Additive and idempotent.

alter table public.context_items
  add column if not exists source text,
  add column if not exists external_id text,
  add column if not exists url text;

alter table public.context_items drop constraint if exists context_items_kind_check;
alter table public.context_items
  add constraint context_items_kind_check
  check (kind in ('file', 'text', 'link'));

drop index if exists public.context_items_source_external_idx;
create unique index context_items_source_external_idx
  on public.context_items (source, external_id);

-- Verification results (run after the transaction commits).
commit;

select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('fde_deployments', 'fde_deployment_tasks', 'fde_task_links', 'fde_task_attachments')
order by table_name;

select column_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'context_items'
  and column_name in ('source', 'external_id', 'url')
order by column_name;

select id, name, is_customer
from public.factories
order by created_at desc
limit 10;

