-- ============================================================================
-- Design-partner workflow hardening
-- Safe follow-up migration for projects that already ran 010_design_partner.sql.
-- ============================================================================

create table if not exists public.import_jobs (
  id                uuid primary key default gen_random_uuid(),
  file_name         text,
  status            text not null default 'running'
                    check (status in ('running','completed','completed_with_errors','failed')),
  total_rows        int not null default 0,
  factories_created int not null default 0,
  factories_updated int not null default 0,
  contacts_created  int not null default 0,
  contacts_updated  int not null default 0,
  skipped_rows      int not null default 0,
  errors            jsonb not null default '[]'::jsonb,
  created_at        timestamptz not null default now(),
  completed_at      timestamptz
);

alter table public.import_jobs enable row level security;
drop policy if exists "allow all" on public.import_jobs;
create policy "allow all" on public.import_jobs
  for all using (true) with check (true);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'import_jobs'
  ) then
    alter publication supabase_realtime add table public.import_jobs;
  end if;
end $$;

create or replace function public.touch_contact_stage() returns trigger language plpgsql as $$
begin
  if new.stage is distinct from old.stage then
    new.last_activity_at := now();
  end if;
  return new;
end; $$;
drop trigger if exists contacts_touch_stage on public.contacts;
create trigger contacts_touch_stage
  before update of stage on public.contacts
  for each row execute function public.touch_contact_stage();

create or replace function public.log_contact_stage_change() returns trigger language plpgsql as $$
begin
  if new.stage is distinct from old.stage then
    insert into public.activities (factory_id, contact_id, type, body)
    values (new.factory_id, new.id, 'stage_change', old.stage || ' → ' || new.stage);
  end if;
  return new;
end; $$;
drop trigger if exists contacts_log_stage_change on public.contacts;
create trigger contacts_log_stage_change
  after update of stage on public.contacts
  for each row
  when (old.stage is distinct from new.stage)
  execute function public.log_contact_stage_change();

create or replace function public.rollup_factory_stage() returns trigger language plpgsql as $$
declare
  furthest text;
  target_factory_id uuid;
begin
  target_factory_id := case when tg_op = 'DELETE' then old.factory_id else new.factory_id end;

  select stage from public.contacts c
    where c.factory_id = target_factory_id
    order by case c.stage
      when 'Closed Won' then 7
      when 'Demo' then 6
      when 'Meeting Booked' then 5
      when 'Replied' then 4
      when 'Contacted' then 3
      when 'New' then 2
      when 'Nurture' then 1
      when 'Closed Lost' then 0
      else -1
    end desc, c.updated_at desc
    limit 1 into furthest;

  update public.factories f
    set stage = case when f.stage_locked then f.stage else coalesce(furthest, 'New') end,
        last_activity_at = now()
    where f.id = target_factory_id;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end; $$;

drop trigger if exists contacts_rollup_stage on public.contacts;
drop trigger if exists contacts_rollup_stage_insert on public.contacts;
drop trigger if exists contacts_rollup_stage_update on public.contacts;
drop trigger if exists contacts_rollup_stage_delete on public.contacts;
create trigger contacts_rollup_stage_insert
  after insert on public.contacts
  for each row execute function public.rollup_factory_stage();
create trigger contacts_rollup_stage_update
  after update of stage on public.contacts
  for each row
  when (old.stage is distinct from new.stage)
  execute function public.rollup_factory_stage();
create trigger contacts_rollup_stage_delete
  after delete on public.contacts
  for each row execute function public.rollup_factory_stage();

create or replace function public.mark_message_sent(p_message_id uuid)
returns jsonb language plpgsql as $$
declare
  m public.messages%rowtype;
  c public.contacts%rowtype;
  current_step public.sequence_steps%rowtype;
  next_step public.sequence_steps%rowtype;
  sent_time timestamptz := now();
  follow_up date;
begin
  select * into m from public.messages where id = p_message_id for update;
  if not found then raise exception 'Message not found'; end if;
  if m.status = 'sent' then
    return jsonb_build_object('ok', true, 'already_sent', true, 'sent_at', m.sent_at);
  end if;

  select * into c from public.contacts where id = m.contact_id for update;
  if not found then raise exception 'Contact not found'; end if;
  if c.sequence_state = 'opted_out' then raise exception 'Contact has opted out'; end if;

  if m.sequence_step_id is not null then
    select * into current_step from public.sequence_steps where id = m.sequence_step_id;
    select * into next_step
      from public.sequence_steps
      where sequence_id = current_step.sequence_id
        and step_index > current_step.step_index
      order by step_index
      limit 1;
    if next_step.id is not null then
      follow_up := current_date + greatest(1, next_step.day_offset - current_step.day_offset);
    end if;
  else
    follow_up := current_date + 3;
  end if;

  update public.messages
    set status = 'sent', sent_at = sent_time
    where id = m.id;

  update public.contacts
    set stage = case when c.stage = 'New' then 'Contacted' else c.stage end,
        last_contacted = sent_time,
        last_activity_at = sent_time,
        touch_count = coalesce(c.touch_count, 0) + 1,
        next_follow_up = follow_up,
        sequence_id = coalesce(current_step.sequence_id, c.sequence_id),
        sequence_step = coalesce(current_step.step_index, c.sequence_step),
        sequence_state = case
          when current_step.id is null then c.sequence_state
          when next_step.id is null then 'done'
          else 'active'
        end
    where id = c.id;

  insert into public.activities (factory_id, contact_id, type, body)
    values (c.factory_id, c.id, 'email_sent',
      coalesce(m.subject, 'Sequence step ' || coalesce(current_step.step_index::text, 'manual')));
  update public.factories set last_activity_at = sent_time where id = c.factory_id;

  return jsonb_build_object(
    'ok', true,
    'sent_at', sent_time,
    'next_follow_up', follow_up,
    'next_step', next_step.step_index
  );
end; $$;
