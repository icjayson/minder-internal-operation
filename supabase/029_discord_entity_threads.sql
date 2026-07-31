-- ============================================================================
-- One durable Discord forum thread per Factory / Network routing owner.
-- The creating state acts as a distributed lock so concurrent workers cannot
-- create duplicate threads for the same entity.
-- ============================================================================

create table if not exists public.discord_entity_threads (
  owner_type        text not null check (owner_type in ('factory', 'network')),
  owner_id          uuid not null,
  webhook_key       text not null,
  discord_thread_id text,
  thread_name       text,
  status            text not null default 'creating'
                    check (status in ('creating', 'ready')),
  locked_at         timestamptz not null default now(),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  primary key (owner_type, owner_id)
);

alter table public.discord_entity_threads enable row level security;

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
  if p_owner_type not in ('factory', 'network') then
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

  -- Reclaim abandoned creates after two minutes.
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

create or replace function public.complete_discord_entity_thread(
  p_owner_type text,
  p_owner_id uuid,
  p_webhook_key text,
  p_thread_id text,
  p_thread_name text
)
returns void
language sql
security definer
set search_path = public
as $$
  update public.discord_entity_threads mapping
  set discord_thread_id = p_thread_id,
      thread_name = p_thread_name,
      status = 'ready',
      updated_at = now()
  where mapping.owner_type = p_owner_type
    and mapping.owner_id = p_owner_id;
$$;

create or replace function public.release_discord_entity_thread(
  p_owner_type text,
  p_owner_id uuid,
  p_webhook_key text
)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.discord_entity_threads mapping
  where mapping.owner_type = p_owner_type
    and mapping.owner_id = p_owner_id
    and mapping.status = 'creating'
    and mapping.discord_thread_id is null;
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
  if p_owner_type not in ('factory', 'network') then
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

revoke all on table public.discord_entity_threads from anon, authenticated;
revoke all on function public.claim_discord_entity_thread(text, uuid, text) from public;
revoke all on function public.complete_discord_entity_thread(text, uuid, text, text, text) from public;
revoke all on function public.release_discord_entity_thread(text, uuid, text) from public;
revoke all on function public.register_discord_entity_thread(text, uuid, text, text) from public, anon, authenticated;
grant execute on function public.claim_discord_entity_thread(text, uuid, text) to anon, authenticated;
grant execute on function public.complete_discord_entity_thread(text, uuid, text, text, text) to anon, authenticated;
grant execute on function public.release_discord_entity_thread(text, uuid, text) to anon, authenticated;
