-- Merge the actionable Alerts inbox into the persistent Discord alert log.
-- Log rows keep their delivery history after a task is completed, while
-- notification-backed rows continue to mirror notifications.read_at for the
-- existing unread badge and scanner de-duplication logic.

alter table public.discord_alert_log
  add column if not exists notification_id uuid references public.notifications(id) on delete set null,
  add column if not exists summary text,
  add column if not exists due_on date,
  add column if not exists task_done_at timestamptz;

create index if not exists discord_alert_log_notification_idx
  on public.discord_alert_log (notification_id);

-- Completing a delivered alert is atomic: mark the canonical notification
-- read first, then mirror the same timestamp to every delivery log for it.
-- Activity and legacy log rows have no notification_id, so they are completed
-- independently without changing any notification.
create or replace function public.complete_alert_log_task(p_log_id uuid)
returns timestamptz
language plpgsql
security invoker
set search_path = public
as $$
declare
  linked_notification_id uuid;
  completed_at timestamptz;
begin
  select notification_id
    into linked_notification_id
    from public.discord_alert_log
   where id = p_log_id;

  if not found then
    raise exception 'Alert log row not found' using errcode = 'P0002';
  end if;

  if linked_notification_id is not null then
    update public.notifications
       set read_at = coalesce(read_at, clock_timestamp())
     where id = linked_notification_id
     returning read_at into completed_at;

    -- The notification may have been removed between the SELECT and UPDATE.
    if completed_at is null then
      completed_at := clock_timestamp();
      update public.discord_alert_log
         set task_done_at = coalesce(task_done_at, completed_at)
       where id = p_log_id;
    else
      update public.discord_alert_log
         set task_done_at = coalesce(task_done_at, completed_at)
       where notification_id = linked_notification_id;
    end if;
  else
    update public.discord_alert_log
       set task_done_at = coalesce(task_done_at, clock_timestamp())
     where id = p_log_id
     returning task_done_at into completed_at;
  end if;

  return completed_at;
end;
$$;

-- Notification-only rows are also part of the merged timeline. Completing one
-- before a Discord log exists still uses the canonical read_at timestamp.
create or replace function public.complete_notification_alert_task(p_notification_id uuid)
returns timestamptz
language plpgsql
security invoker
set search_path = public
as $$
declare
  completed_at timestamptz;
begin
  update public.notifications
     set read_at = coalesce(read_at, clock_timestamp())
   where id = p_notification_id
   returning read_at into completed_at;

  if not found then
    raise exception 'Notification not found' using errcode = 'P0002';
  end if;

  return completed_at;
end;
$$;

grant execute on function public.complete_alert_log_task(uuid) to anon, authenticated;
grant execute on function public.complete_notification_alert_task(uuid) to anon, authenticated;

-- Scanner auto-resolution and legacy callers that update notifications.read_at
-- must update the persistent timeline too.
create or replace function public.sync_alert_log_task_done()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.read_at is not null and old.read_at is distinct from new.read_at then
    update public.discord_alert_log
       set task_done_at = coalesce(task_done_at, new.read_at)
     where notification_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists notifications_sync_alert_log_done on public.notifications;
create trigger notifications_sync_alert_log_done
after update of read_at on public.notifications
for each row execute function public.sync_alert_log_task_done();
