-- ============================================================================
-- Phase 1 — Networks entity + polymorphic contacts
--   • networks: referral sources (association / accelerator / institute …),
--     tracked + scored + own pipeline, parallel to factories.
--   • factories.network_id: optional referral source (nullable).
--   • contacts: now belong to a factory OR a network (exclusive, DB-enforced).
--   • context_summary columns pre-added on all three entities (used from Phase 3).
-- Additive + idempotent — safe to re-run. Paste into Supabase → SQL Editor.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ── Networks (referral sources) ─────────────────────────────────────────────
create table if not exists public.networks (
  id             uuid primary key default gen_random_uuid(),

  name           text not null,
  type           text check (type in ('association','institute','accelerator','cluster','trade_body','connector','other')),
  website_url    text,
  country        text,
  hq_location    text,
  focus_verticals text[],                    -- vertical keys this network serves
  reach_note     text,                       -- rough count / quality of member factories

  -- qualification (AI, from Phase 3)
  score           numeric(5,2),
  grade           text check (grade in ('A','B','C')),
  score_breakdown jsonb,
  ai_reasoning    text,
  ai_recommendation text,
  blocker         text,
  scored_at       timestamptz,

  -- pipeline (manual — a network is a relationship you manage directly)
  stage           text not null default 'New'
                  check (stage in ('New','Contacted','Replied','Meeting Booked','Demo','Closed Won','Closed Lost','Nurture')),
  next_action        text,
  next_action_due    date,
  last_activity_at   timestamptz default now(),

  priority        int check (priority between 1 and 5),
  notes           text,
  source          text default 'manual',

  context_summary    text,
  context_summary_at timestamptz,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists networks_grade_idx         on public.networks (grade);
create index if not exists networks_stage_idx         on public.networks (stage);
create index if not exists networks_last_activity_idx on public.networks (last_activity_at);

-- ── Factory ← optional referral source + context summary ────────────────────
alter table public.factories add column if not exists network_id uuid references public.networks(id) on delete set null;
alter table public.factories add column if not exists context_summary text;
alter table public.factories add column if not exists context_summary_at timestamptz;
alter table public.factories add column if not exists scored_at timestamptz;
create index if not exists factories_network_idx on public.factories (network_id);

-- ── Contacts become polymorphic: factory XOR network ────────────────────────
alter table public.contacts alter column factory_id drop not null;
alter table public.contacts add column if not exists network_id uuid references public.networks(id) on delete cascade;
alter table public.contacts add column if not exists context_summary text;
alter table public.contacts add column if not exists context_summary_at timestamptz;
create index if not exists contacts_network_idx on public.contacts (network_id);

-- Exactly one parent must be set. (drop+add so the migration is re-runnable)
alter table public.contacts drop constraint if exists contacts_one_parent;
alter table public.contacts add constraint contacts_one_parent check (
  (factory_id is not null and network_id is null) or
  (factory_id is null and network_id is not null)
);

-- ── updated_at trigger on networks ──────────────────────────────────────────
drop trigger if exists networks_set_updated_at on public.networks;
create trigger networks_set_updated_at before update on public.networks
  for each row execute function public.set_updated_at();

-- Network-attached contacts should bump the network's stale timer on stage change.
create or replace function public.touch_network_last_activity() returns trigger language plpgsql as $$
begin
  if new.network_id is not null and (new.stage is distinct from old.stage) then
    update public.networks set last_activity_at = now() where id = new.network_id;
  end if;
  return new;
end; $$;
drop trigger if exists contacts_touch_network on public.contacts;
create trigger contacts_touch_network
  after update of stage on public.contacts
  for each row
  when (old.stage is distinct from new.stage)
  execute function public.touch_network_last_activity();

-- NOTE: the existing rollup_factory_stage / log_contact_stage_change triggers are
-- null-safe for network contacts (factory_id null → no factory row is matched).

-- ── RLS (allow-all) + realtime for networks ─────────────────────────────────
alter table public.networks enable row level security;
drop policy if exists "allow all" on public.networks;
create policy "allow all" on public.networks for all using (true) with check (true);
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'networks'
  ) then
    execute 'alter publication supabase_realtime add table public.networks';
  end if;
end $$;

-- Seed a starter network-scoring context (edit in /settings, used from Phase 3).
insert into public.context_docs (scope, title, body, kind)
select 'network', 'Network scoring rubric (100 pts)',
  'Score a referral network (association / accelerator / institute / cluster) 0-100. '
  || 'Member reach & IDP fit (25): how many IDP-fit factories can they actually put in front of us? '
  || 'Intro willingness (20): will they make warm intros, how actively? '
  || 'Credibility / trust transfer (15): does their endorsement lower a factory''s guard? '
  || 'Vertical & geo alignment (15): do members sit in our beachhead verticals/regions? '
  || 'Activation cost (10): effort / time / quid-pro-quo to switch them on (lower is better). '
  || 'Strategic leverage / exclusivity (10): cluster/parent leverage, repeatability, moat. '
  || 'Relationship quality (5): follow-through, openness, reciprocity. '
  || 'Grades: A = 75+ no hard blocker; B = 60-74 with a defined blocker; C = below 60.',
  'scoring'
where not exists (select 1 from public.context_docs where scope = 'network');
