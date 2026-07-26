-- ============================================================================
-- Shared AI context layer
--   • Two categories: product + design_partner
--   • Eight named, directly editable context blocks
--   • Uploaded files with the same extraction pipeline as entity context
-- Additive + idempotent. Paste into Supabase → SQL Editor → Run.
-- Requires public.set_updated_at() from 010_design_partner.sql.
-- ============================================================================

create extension if not exists "pgcrypto";

create table if not exists public.shared_contexts (
  id            uuid primary key default gen_random_uuid(),
  context_key   text not null unique check (context_key in (
                  'minder_description',
                  'idp_profile',
                  'score_rubric',
                  'network_score_rubric',
                  'writing_guardrails',
                  'vertical_tensions',
                  'product_direction',
                  'minder_differentiators'
                )),
  category      text not null check (category in ('product','design_partner')),
  title         text not null,
  body          text not null default '',
  active        boolean not null default true,
  sort_order    int not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.shared_context_files (
  id                uuid primary key default gen_random_uuid(),
  category          text not null check (category in ('product','design_partner')),
  title             text,
  body              text,
  storage_path      text not null,
  file_name         text,
  mime_type         text,
  byte_size         int,
  extraction_status text not null default 'pending'
                    check (extraction_status in ('none','pending','done','failed','unsupported')),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists shared_context_files_category_idx
  on public.shared_context_files (category, created_at desc);

drop trigger if exists shared_contexts_set_updated_at on public.shared_contexts;
create trigger shared_contexts_set_updated_at before update on public.shared_contexts
  for each row execute function public.set_updated_at();

drop trigger if exists shared_context_files_set_updated_at on public.shared_context_files;
create trigger shared_context_files_set_updated_at before update on public.shared_context_files
  for each row execute function public.set_updated_at();

alter table public.shared_contexts enable row level security;
drop policy if exists "allow all" on public.shared_contexts;
create policy "allow all" on public.shared_contexts for all using (true) with check (true);

alter table public.shared_context_files enable row level security;
drop policy if exists "allow all" on public.shared_context_files;
create policy "allow all" on public.shared_context_files for all using (true) with check (true);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'shared_contexts'
  ) then
    execute 'alter publication supabase_realtime add table public.shared_contexts';
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'shared_context_files'
  ) then
    execute 'alter publication supabase_realtime add table public.shared_context_files';
  end if;
end $$;

insert into storage.buckets (id, name, public)
values ('context-files', 'context-files', false)
on conflict (id) do nothing;

drop policy if exists "context-files all" on storage.objects;
create policy "context-files all" on storage.objects
  for all
  using (bucket_id = 'context-files')
  with check (bucket_id = 'context-files');
