-- ============================================================================
-- Phase 2 — Per-entity context / artifacts
--   • context_items: files + manual text cards attached to ANY entity
--     (factory | network | contact), polymorphic on (entity_type, entity_id).
--     `body` holds the text-card content OR the extracted text of a file, so
--     the AI (Phase 3) reads a single text field regardless of source.
--   • Storage bucket `context-files` (private) holds the raw uploads.
-- Additive + idempotent. Paste into Supabase → SQL Editor → Run.
-- Requires 013_networks.sql (for the 'network' entity type) and set_updated_at().
-- ============================================================================

create extension if not exists "pgcrypto";

create table if not exists public.context_items (
  id            uuid primary key default gen_random_uuid(),
  entity_type   text not null check (entity_type in ('factory','network','contact')),
  entity_id     uuid not null,
  kind          text not null check (kind in ('file','text')),

  title         text,
  body          text,                       -- text-card content OR extracted file text

  storage_path  text,                       -- object key in the context-files bucket (kind='file')
  file_name     text,
  mime_type     text,
  byte_size     int,
  extraction_status text not null default 'none'
                check (extraction_status in ('none','pending','done','failed','unsupported')),

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists context_items_entity_idx on public.context_items (entity_type, entity_id, created_at desc);

-- updated_at trigger
drop trigger if exists context_items_set_updated_at on public.context_items;
create trigger context_items_set_updated_at before update on public.context_items
  for each row execute function public.set_updated_at();

-- RLS (allow-all) + realtime
alter table public.context_items enable row level security;
drop policy if exists "allow all" on public.context_items;
create policy "allow all" on public.context_items for all using (true) with check (true);
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'context_items'
  ) then
    execute 'alter publication supabase_realtime add table public.context_items';
  end if;
end $$;

-- ── Storage bucket (private) + allow-all policies (single-user) ──────────────
insert into storage.buckets (id, name, public)
values ('context-files', 'context-files', false)
on conflict (id) do nothing;

drop policy if exists "context-files all" on storage.objects;
create policy "context-files all" on storage.objects
  for all
  using (bucket_id = 'context-files')
  with check (bucket_id = 'context-files');
