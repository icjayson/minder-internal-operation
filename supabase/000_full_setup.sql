-- ============================================================================
-- minder-leads — FULL database setup (single file)
-- Paste this whole file into Supabase → SQL Editor → New query → Run.
--
-- This consolidates schema.sql + 002_add_category.sql + 003_partner_categories.sql
-- into one idempotent script. Safe to run once on a fresh project (and safe to
-- re-run — everything is guarded with IF EXISTS / IF NOT EXISTS).
--
-- Single-user mode: RLS enabled but allow-all policies (no auth).
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- Table: public.leads
-- ----------------------------------------------------------------------------
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),

  -- Person
  full_name       text not null,
  title           text,
  seniority       text,                      -- C-level / VP / Director / Manager / IC
  linkedin_url    text unique,
  email           text,
  phone           text,

  -- Company
  company_name    text not null,
  company_domain  text,
  company_size    text,                      -- 1-10 / 11-50 / 51-200 / 201-1k / 1k+
  industry        text,
  hq_location     text,
  website_url     text,

  -- Qualification
  icp_fit         numeric(2,1),              -- 1.0-5.0 AI score
  priority        integer,                   -- 1-5 stars (my gut call)
  archetype       text,                      -- Factory owner / Operations lead / etc.
  reasoning       text,                      -- AI explanation
  pain_signals    text[],                    -- Detected pain points

  -- Relationship type
  category        text check (category in (
                    'ICP','Advisor','VC','Angel','Accelerator',
                    'Design Partner','Strategic Partner','Press','Gov')),

  -- Pipeline
  stage           text not null default 'New'
                  check (stage in (
                    'New','Researching','Contacted','Replied',
                    'Meeting Booked','Demo','Proposal',
                    'Closed Won','Closed Lost','Nurture')),

  -- Touch tracking
  last_contacted  timestamptz,
  next_follow_up  date,
  touch_count     integer not null default 0,

  -- Content
  notes           text,
  outreach_draft  text,
  source          text not null default 'manual',

  -- Meta
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- If the table already existed (e.g. from schema.sql before category was added),
-- make sure the category column + constraint are present with the final values.
alter table public.leads
  add column if not exists category text;

alter table public.leads drop constraint if exists leads_category_check;
alter table public.leads
  add constraint leads_category_check
  check (category in (
    'ICP','Advisor','VC','Angel','Accelerator',
    'Design Partner','Strategic Partner','Press','Gov'));

-- ----------------------------------------------------------------------------
-- keep updated_at fresh
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists leads_set_updated_at on public.leads;
create trigger leads_set_updated_at
  before update on public.leads
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- indexes
-- ----------------------------------------------------------------------------
create index if not exists leads_stage_idx          on public.leads (stage);
create index if not exists leads_next_follow_up_idx on public.leads (next_follow_up);
create index if not exists leads_icp_fit_idx         on public.leads (icp_fit desc);
create index if not exists leads_created_at_idx      on public.leads (created_at desc);
create index if not exists leads_category_idx        on public.leads (category);

-- ----------------------------------------------------------------------------
-- RLS: enabled but allow-all (single-user via anon/publishable key)
-- ----------------------------------------------------------------------------
alter table public.leads enable row level security;

drop policy if exists "leads allow all select" on public.leads;
drop policy if exists "leads allow all insert" on public.leads;
drop policy if exists "leads allow all update" on public.leads;
drop policy if exists "leads allow all delete" on public.leads;

create policy "leads allow all select" on public.leads for select using (true);
create policy "leads allow all insert" on public.leads for insert with check (true);
create policy "leads allow all update" on public.leads for update using (true) with check (true);
create policy "leads allow all delete" on public.leads for delete using (true);

-- ----------------------------------------------------------------------------
-- enable realtime on the table (guarded so re-runs don't error)
-- ----------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'leads'
  ) then
    alter publication supabase_realtime add table public.leads;
  end if;
end $$;
