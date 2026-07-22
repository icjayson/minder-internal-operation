-- Rename 'Partner' → 'Strategic Partner' and add 'Design Partner'.
-- Run once in Supabase → SQL editor → New query → Run.

-- Defensive backfill in case any Partner rows exist
update public.leads set category = 'Strategic Partner' where category = 'Partner';

-- Swap the CHECK constraint
alter table public.leads drop constraint if exists leads_category_check;
alter table public.leads
  add constraint leads_category_check
  check (category in (
    'ICP','Advisor','VC','Angel','Accelerator',
    'Design Partner','Strategic Partner','Press','Gov'
  ));
