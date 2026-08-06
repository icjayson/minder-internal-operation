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
