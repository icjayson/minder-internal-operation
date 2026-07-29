-- ============================================================================
-- Factory work inventory
-- Kanban cards attached to a factory: not started -> doing -> done.
-- Additive + idempotent. Requires factories and public.set_updated_at().
-- ============================================================================

create extension if not exists "pgcrypto";

create table if not exists public.factory_work_items (
  id          uuid primary key default gen_random_uuid(),
  factory_id  uuid not null references public.factories(id) on delete cascade,
  pic_contact_id uuid references public.contacts(id) on delete set null,
  title       text not null,
  body        text,
  status      text not null default 'not_started'
              check (status in ('not_started', 'doing', 'done')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists factory_work_items_factory_status_idx
  on public.factory_work_items (factory_id, status, updated_at desc);

create index if not exists factory_work_items_pic_contact_idx
  on public.factory_work_items (pic_contact_id);

drop trigger if exists factory_work_items_set_updated_at on public.factory_work_items;
create trigger factory_work_items_set_updated_at
  before update on public.factory_work_items
  for each row execute function public.set_updated_at();

alter table public.factory_work_items enable row level security;
drop policy if exists "allow all" on public.factory_work_items;
create policy "allow all" on public.factory_work_items
  for all using (true) with check (true);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'factory_work_items'
  ) then
    execute 'alter publication supabase_realtime add table public.factory_work_items';
  end if;
end $$;
