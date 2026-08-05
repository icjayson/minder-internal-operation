-- ============================================================================
-- Fundraising Tracker — two isolated tracks, mirroring the Networks tracker.
--   • investors:    Angel / VC / Accelerator / Family Office / Other
--   • competitions: Grant / Competition / Award / Credit Programme /
--                   Government Programme / Corporate Programme /
--                   Accelerator / Incubator / Ecosystem Network
-- Both tables are self-contained — no FKs into factories / networks / contacts,
-- so fundraising data stays fully isolated from the partner data structures.
-- Additive + idempotent — safe to re-run. Paste into Supabase → SQL Editor.
-- ============================================================================

create extension if not exists "pgcrypto";

-- Shared fundraising pipeline stages (distinct from the sales pipeline).
--   Researching → Contacted → Pitched → Diligence → Committed → Closed
--   Passed = terminal (off the happy path).
-- ── Track 1 · Investors ─────────────────────────────────────────────────────
create table if not exists public.investors (
  id             uuid primary key default gen_random_uuid(),

  name           text not null,
  type           text check (type in ('angel','vc','accelerator','family_office','other')),

  stage          text not null default 'Researching'
                 check (stage in ('Researching','Contacted','Pitched','Diligence','Committed','Closed','Passed')),

  contact_person text,
  amount_target_or_offered numeric(14,2),      -- target raise from this investor

  next_touch         date,
  last_activity_at   timestamptz not null default now(),

  priority       int check (priority between 1 and 5),
  notes          text,
  source         text default 'manual',

  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists investors_type_idx          on public.investors (type);
create index if not exists investors_stage_idx         on public.investors (stage);
create index if not exists investors_last_activity_idx on public.investors (last_activity_at);

-- ── Track 2 · Competitions & Programmes ─────────────────────────────────────
create table if not exists public.competitions (
  id             uuid primary key default gen_random_uuid(),

  name           text not null,
  type           text check (type in (
                   'grant','competition','award','credit_programme',
                   'government_programme','corporate_programme',
                   'accelerator_incubator','ecosystem_network')),

  stage          text not null default 'Researching'
                 check (stage in ('Researching','Contacted','Pitched','Diligence','Committed','Closed','Passed')),

  contact_person text,
  amount_target_or_offered numeric(14,2),      -- prize / credit / grant amount offered

  next_touch         date,
  last_activity_at   timestamptz not null default now(),

  priority       int check (priority between 1 and 5),
  notes          text,
  source         text default 'manual',

  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists competitions_type_idx          on public.competitions (type);
create index if not exists competitions_stage_idx         on public.competitions (stage);
create index if not exists competitions_last_activity_idx on public.competitions (last_activity_at);

-- ── updated_at triggers (reuse the shared set_updated_at function) ───────────
drop trigger if exists investors_set_updated_at on public.investors;
create trigger investors_set_updated_at before update on public.investors
  for each row execute function public.set_updated_at();

drop trigger if exists competitions_set_updated_at on public.competitions;
create trigger competitions_set_updated_at before update on public.competitions
  for each row execute function public.set_updated_at();

-- ── RLS (allow-all, single-user mode) + realtime ────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['investors','competitions'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "allow all" on public.%I', t);
    execute format('create policy "allow all" on public.%I for all using (true) with check (true)', t);
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
