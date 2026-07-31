-- ============================================================================
-- Delayed Discord alerts for activities
--   * every new Network / Factory / Contact activity is queued for +2 minutes;
--   * deleting the activity before send_after cascades into the queue and
--     cancels the Discord alert;
--   * workers claim due rows atomically and can safely retry abandoned claims.
-- Additive + idempotent. Requires networks, factories, contacts and activities.
-- ============================================================================

alter table public.activities
  add column if not exists network_id uuid references public.networks(id) on delete cascade;

create index if not exists activities_network_idx
  on public.activities (network_id, created_at desc);

-- Backfill the parent network for existing activities owned by network contacts.
update public.activities activity
set network_id = contact.network_id
from public.contacts contact
where activity.contact_id = contact.id
  and activity.network_id is null
  and activity.factory_id is null
  and contact.network_id is not null;

-- Contact activities carry the same parent as their contact, so the worker can
-- route the alert even if it does not need another parent lookup.
create or replace function public.log_contact_stage_change()
returns trigger
language plpgsql
as $$
begin
  if new.stage is distinct from old.stage then
    insert into public.activities (factory_id, network_id, contact_id, type, body)
    values (new.factory_id, new.network_id, new.id, 'stage_change', old.stage || ' → ' || new.stage);
  end if;
  return new;
end;
$$;

drop trigger if exists contacts_log_stage_change on public.contacts;
create trigger contacts_log_stage_change
  after update of stage on public.contacts
  for each row
  when (old.stage is distinct from new.stage)
  execute function public.log_contact_stage_change();

-- Direct network pipeline changes now have the same activity semantics as
-- factory and contact stage changes.
create or replace function public.touch_network_stage()
returns trigger
language plpgsql
as $$
begin
  if new.stage is distinct from old.stage then
    new.last_activity_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists networks_touch_stage on public.networks;
create trigger networks_touch_stage
  before update of stage on public.networks
  for each row
  when (old.stage is distinct from new.stage)
  execute function public.touch_network_stage();

create or replace function public.log_network_stage_change()
returns trigger
language plpgsql
as $$
begin
  insert into public.activities (network_id, contact_id, type, body)
  values (new.id, null, 'stage_change', old.stage || ' → ' || new.stage);
  return new;
end;
$$;

drop trigger if exists networks_log_stage_change on public.networks;
create trigger networks_log_stage_change
  after update of stage on public.networks
  for each row
  when (old.stage is distinct from new.stage)
  execute function public.log_network_stage_change();

create table if not exists public.activity_alert_outbox (
  id          uuid primary key default gen_random_uuid(),
  activity_id uuid not null unique references public.activities(id) on delete cascade,
  send_after  timestamptz not null,
  status      text not null default 'pending'
              check (status in ('pending', 'processing', 'sent')),
  attempts    integer not null default 0,
  locked_at   timestamptz,
  sent_at     timestamptz,
  last_error  text,
  created_at  timestamptz not null default now()
);

create index if not exists activity_alert_outbox_due_idx
  on public.activity_alert_outbox (status, send_after);

alter table public.activity_alert_outbox enable row level security;
drop policy if exists "allow all" on public.activity_alert_outbox;
create policy "allow all" on public.activity_alert_outbox
  for all using (true) with check (true);

create or replace function public.enqueue_activity_discord_alert()
returns trigger
language plpgsql
as $$
begin
  insert into public.activity_alert_outbox (activity_id, send_after)
  values (new.id, new.created_at + interval '2 minutes')
  on conflict (activity_id) do nothing;
  return new;
end;
$$;

drop trigger if exists activities_enqueue_discord_alert on public.activities;
create trigger activities_enqueue_discord_alert
  after insert on public.activities
  for each row execute function public.enqueue_activity_discord_alert();

-- Claim due jobs atomically. A processing row is reclaimable after ten minutes
-- in case a serverless worker exits between claim and completion.
create or replace function public.claim_due_activity_alerts(batch_size integer default 50)
returns setof public.activity_alert_outbox
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with claimed as (
    select queue.id
    from public.activity_alert_outbox queue
    where (
      queue.status = 'pending'
      and queue.send_after <= now()
    ) or (
      queue.status = 'processing'
      and queue.locked_at <= now() - interval '10 minutes'
    )
    order by queue.send_after, queue.created_at
    for update skip locked
    limit greatest(1, least(coalesce(batch_size, 50), 100))
  )
  update public.activity_alert_outbox queue
  set status = 'processing',
      locked_at = now(),
      attempts = queue.attempts + 1,
      last_error = null
  from claimed
  where queue.id = claimed.id
  returning queue.*;
end;
$$;

grant execute on function public.claim_due_activity_alerts(integer) to anon, authenticated;
