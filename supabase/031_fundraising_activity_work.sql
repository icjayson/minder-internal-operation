-- ============================================================================
-- Fundraising: activity timeline, work inventory, and Discord alert wiring.
--   • activities gain investor_id / competition_id so fundraising leads share
--     the same activity table, +2-minute Discord outbox, and per-entity thread.
--   • fundraising_work_items: kanban board per investor / competition.
--   • notifications gain investor_id / competition_id for the daily scan.
--   • discord_entity_threads: allow 'investor' / 'competition' owner threads so
--     each lead owns exactly one Discord thread ("blog"), like factories/networks.
--   • stage changes on investors / competitions log an activity (→ Discord),
--     mirroring the network / factory stage-change behaviour.
-- Additive + idempotent. Requires 010, 013, 027, 029, 030.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ── activities ← optional fundraising parent ────────────────────────────────
alter table public.activities
  add column if not exists investor_id    uuid references public.investors(id)    on delete cascade,
  add column if not exists competition_id uuid references public.competitions(id) on delete cascade;
create index if not exists activities_investor_idx    on public.activities (investor_id, created_at desc);
create index if not exists activities_competition_idx on public.activities (competition_id, created_at desc);

-- ── notifications ← optional fundraising target ─────────────────────────────
alter table public.notifications
  add column if not exists investor_id    uuid references public.investors(id)    on delete cascade,
  add column if not exists competition_id uuid references public.competitions(id) on delete cascade;

-- ── Fundraising work inventory (kanban per lead) ────────────────────────────
create table if not exists public.fundraising_work_items (
  id             uuid primary key default gen_random_uuid(),
  investor_id    uuid references public.investors(id)    on delete cascade,
  competition_id uuid references public.competitions(id) on delete cascade,

  title          text not null,
  body           text,
  status         text not null default 'not_started'
                 check (status in ('not_started','doing','done')),
  trigger_on     date,

  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  -- Exactly one fundraising parent (mirrors contacts_one_parent).
  constraint fundraising_work_items_one_parent check (
    (investor_id is not null and competition_id is null) or
    (investor_id is null and competition_id is not null)
  )
);
create index if not exists fundraising_work_items_investor_idx    on public.fundraising_work_items (investor_id);
create index if not exists fundraising_work_items_competition_idx on public.fundraising_work_items (competition_id);
create index if not exists fundraising_work_items_trigger_idx     on public.fundraising_work_items (trigger_on);

drop trigger if exists fundraising_work_items_set_updated_at on public.fundraising_work_items;
create trigger fundraising_work_items_set_updated_at before update on public.fundraising_work_items
  for each row execute function public.set_updated_at();

alter table public.fundraising_work_items enable row level security;
drop policy if exists "allow all" on public.fundraising_work_items;
create policy "allow all" on public.fundraising_work_items for all using (true) with check (true);
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'fundraising_work_items'
  ) then
    execute 'alter publication supabase_realtime add table public.fundraising_work_items';
  end if;
end $$;

-- ── Stage-change → activity log (→ +2min Discord alert) + stale timer ────────
create or replace function public.touch_fundraising_stage()
returns trigger language plpgsql as $$
begin
  if new.stage is distinct from old.stage then
    new.last_activity_at := now();
  end if;
  return new;
end; $$;

create or replace function public.log_investor_stage_change()
returns trigger language plpgsql as $$
begin
  insert into public.activities (investor_id, type, body)
  values (new.id, 'stage_change', old.stage || ' → ' || new.stage);
  return new;
end; $$;

create or replace function public.log_competition_stage_change()
returns trigger language plpgsql as $$
begin
  insert into public.activities (competition_id, type, body)
  values (new.id, 'stage_change', old.stage || ' → ' || new.stage);
  return new;
end; $$;

drop trigger if exists investors_touch_stage on public.investors;
create trigger investors_touch_stage
  before update of stage on public.investors
  for each row when (old.stage is distinct from new.stage)
  execute function public.touch_fundraising_stage();

drop trigger if exists investors_log_stage_change on public.investors;
create trigger investors_log_stage_change
  after update of stage on public.investors
  for each row when (old.stage is distinct from new.stage)
  execute function public.log_investor_stage_change();

drop trigger if exists competitions_touch_stage on public.competitions;
create trigger competitions_touch_stage
  before update of stage on public.competitions
  for each row when (old.stage is distinct from new.stage)
  execute function public.touch_fundraising_stage();

drop trigger if exists competitions_log_stage_change on public.competitions;
create trigger competitions_log_stage_change
  after update of stage on public.competitions
  for each row when (old.stage is distinct from new.stage)
  execute function public.log_competition_stage_change();

-- ── Discord entity threads: allow investor / competition owners ─────────────
alter table public.discord_entity_threads drop constraint if exists discord_entity_threads_owner_type_check;
alter table public.discord_entity_threads add constraint discord_entity_threads_owner_type_check
  check (owner_type in ('factory','network','investor','competition'));

create or replace function public.claim_discord_entity_thread(
  p_owner_type text,
  p_owner_id uuid,
  p_webhook_key text
)
returns table (claimed boolean, thread_id text)
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_rows integer;
  current_thread_id text;
  current_locked_at timestamptz;
begin
  if p_owner_type not in ('factory', 'network', 'investor', 'competition') then
    raise exception 'Unsupported Discord owner type: %', p_owner_type;
  end if;

  insert into public.discord_entity_threads (
    owner_type, owner_id, webhook_key, status, locked_at
  ) values (
    p_owner_type, p_owner_id, p_webhook_key, 'creating', now()
  ) on conflict do nothing;

  get diagnostics inserted_rows = row_count;
  if inserted_rows = 1 then
    return query select true, null::text;
    return;
  end if;

  select mapping.discord_thread_id, mapping.locked_at
    into current_thread_id, current_locked_at
  from public.discord_entity_threads mapping
  where mapping.owner_type = p_owner_type
    and mapping.owner_id = p_owner_id;

  if current_thread_id is not null then
    return query select false, current_thread_id;
    return;
  end if;

  if current_locked_at <= now() - interval '2 minutes' then
    update public.discord_entity_threads mapping
    set locked_at = now(), updated_at = now()
    where mapping.owner_type = p_owner_type
      and mapping.owner_id = p_owner_id
      and mapping.discord_thread_id is null
      and mapping.locked_at = current_locked_at;

    get diagnostics inserted_rows = row_count;
    if inserted_rows = 1 then
      return query select true, null::text;
      return;
    end if;
  end if;

  return query select false, null::text;
end;
$$;

create or replace function public.register_discord_entity_thread(
  p_owner_type text,
  p_owner_id uuid,
  p_thread_id text,
  p_thread_name text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_owner_type not in ('factory', 'network', 'investor', 'competition') then
    raise exception 'Unsupported Discord owner type: %', p_owner_type;
  end if;
  if nullif(trim(p_thread_id), '') is null then
    raise exception 'Discord thread ID is required';
  end if;

  insert into public.discord_entity_threads (
    owner_type, owner_id, webhook_key, discord_thread_id,
    thread_name, status, locked_at, updated_at
  ) values (
    p_owner_type, p_owner_id, 'manually-registered', trim(p_thread_id),
    nullif(trim(p_thread_name), ''), 'ready', now(), now()
  )
  on conflict (owner_type, owner_id) do update
  set discord_thread_id = excluded.discord_thread_id,
      thread_name = excluded.thread_name,
      status = 'ready',
      updated_at = now();
end;
$$;

grant execute on function public.claim_discord_entity_thread(text, uuid, text) to anon, authenticated;
revoke all on function public.register_discord_entity_thread(text, uuid, text, text) from public, anon, authenticated;
