-- Discord alert log.
-- Records every alert message pushed to Discord (from any source: the daily
-- scan, the activity outbox, manual factory notifications, or the test route)
-- together with the Discord message id / thread id, so the platform can show a
-- log and delete an individual message via the webhook. Additive + idempotent.

create extension if not exists "pgcrypto";

create table if not exists public.discord_alert_log (
  id          uuid primary key default gen_random_uuid(),
  message_id  text not null,          -- Discord message id (needed to delete)
  thread_id   text,                   -- forum thread id, when in forum mode
  webhook_key text,                   -- which webhook sent it (id portion)
  source      text,                   -- 'scan' | 'activity' | 'manual' | 'test'
  kind        text,                   -- notification kind
  title       text,
  detail      text,
  owner_type  text,                   -- factory | network | investor | competition
  owner_id    text,
  owner_name  text,
  deep_link   text,
  created_at  timestamptz not null default now(),
  deleted_at  timestamptz             -- set when the Discord message is deleted
);

create index if not exists discord_alert_log_created_idx
  on public.discord_alert_log (created_at desc);

alter table public.discord_alert_log enable row level security;

drop policy if exists "discord alert log allow all" on public.discord_alert_log;
create policy "discord alert log allow all" on public.discord_alert_log
  for all using (true) with check (true);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'discord_alert_log'
  ) then execute 'alter publication supabase_realtime add table public.discord_alert_log'; end if;
end $$;
