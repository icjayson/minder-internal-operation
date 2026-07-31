-- Remove historical contact-level activity batches created by the retired
-- factory -> contacts stage fan-out trigger. A legitimate single-contact
-- stage change remains untouched.

-- All existing target flags predate the manual confirmation control, so clear
-- the legacy role-derived values. New confirmations are made only via the star.
update public.contacts
set is_primary_target = false
where is_primary_target is distinct from false;

with bulk_stage_changes as (
  select factory_id, created_at, body
  from public.activities
  where type = 'stage_change'
    and contact_id is not null
  group by factory_id, created_at, body
  having count(*) > 1
)
delete from public.activities activity
using bulk_stage_changes batch
where activity.type = 'stage_change'
  and activity.contact_id is not null
  and activity.factory_id = batch.factory_id
  and activity.created_at = batch.created_at
  and activity.body is not distinct from batch.body;

-- Rapid factory-stage corrections are one logical action. Keep a single net
-- transition for consecutive edits, or remove it when the factory returns to
-- its starting stage. Any intervening activity or a five-minute pause starts a
-- new audit event.
create or replace function public.log_factory_stage_change()
returns trigger language plpgsql as $$
declare
  latest_activity public.activities%rowtype;
  starting_stage text;
begin
  -- A contact-stage roll-up runs inside a contact trigger. The contact already
  -- owns that activity, so it must not create a factory-level activity too.
  if pg_trigger_depth() <> 1 then
    return new;
  end if;

  select activity.* into latest_activity
  from public.activities activity
  where activity.factory_id = new.id
  order by activity.created_at desc, activity.id desc
  limit 1;

  if found
    and latest_activity.type = 'stage_change'
    and latest_activity.contact_id is null
    and latest_activity.created_at >= now() - interval '5 minutes'
    and split_part(coalesce(latest_activity.body, ''), ' → ', 2) = old.stage
  then
    starting_stage := split_part(latest_activity.body, ' → ', 1);

    if starting_stage = new.stage then
      delete from public.activities where id = latest_activity.id;
    else
      update public.activities
      set body = starting_stage || ' → ' || new.stage
      where id = latest_activity.id;
    end if;

    return new;
  end if;

  insert into public.activities (factory_id, contact_id, type, body)
  values (new.id, null, 'stage_change', old.stage || ' → ' || new.stage);
  return new;
end; $$;
