-- Keep factory and contact stage changes scoped to the entity the user edits:
--   * a direct factory-stage change logs one factory-level activity;
--   * a contact-stage change logs one contact-level activity and may still
--     roll the displayed factory stage up without creating a second activity.

-- Migration 018 propagated every direct factory-stage edit to all contacts.
-- That flattened their individual progress and caused one activity per contact.
drop trigger if exists factories_sync_stage_to_contacts on public.factories;
drop function if exists public.sync_factory_stage_to_contacts();

create or replace function public.touch_factory_stage()
returns trigger language plpgsql as $$
begin
  if new.stage is distinct from old.stage then
    new.last_activity_at := now();
  end if;
  return new;
end; $$;

drop trigger if exists factories_touch_stage on public.factories;
create trigger factories_touch_stage
  before update of stage on public.factories
  for each row
  when (old.stage is distinct from new.stage)
  execute function public.touch_factory_stage();

create or replace function public.log_factory_stage_change()
returns trigger language plpgsql as $$
begin
  -- Contact-stage roll-up updates execute from inside a contact trigger
  -- (trigger depth > 1). The contact already owns that activity, so only log
  -- factory changes initiated directly at the top level.
  if pg_trigger_depth() = 1 then
    insert into public.activities (factory_id, contact_id, type, body)
    values (new.id, null, 'stage_change', old.stage || ' → ' || new.stage);
  end if;
  return new;
end; $$;

drop trigger if exists factories_log_stage_change on public.factories;
create trigger factories_log_stage_change
  after update of stage on public.factories
  for each row
  when (old.stage is distinct from new.stage)
  execute function public.log_factory_stage_change();
