-- Adds a `category` column classifying leads by relationship type.
-- Run once in Supabase → SQL editor → New query → Run.

alter table public.leads
  add column if not exists category text
  check (category in (
    'ICP','Advisor','VC','Angel','Accelerator','Partner','Press','Gov'
  ));

create index if not exists leads_category_idx on public.leads (category);
