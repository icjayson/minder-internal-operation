-- Factory pipeline activity records attained forward progress only.
-- Moving backward creates no inverse event and removes any previously logged
-- factory milestones above the newly selected stage.

create or replace function public.factory_pipeline_stage_rank(value text)
returns integer
language sql
immutable
strict
as $$
  select case value
    when 'New' then 0
    when 'Contacted' then 1
    when 'Replied' then 2
    when 'Meeting Booked' then 3
    when 'Demo' then 4
    when 'Closed Won' then 5
    when 'Closed Lost' then 6
    when 'Nurture' then 6
    else -1
  end;
$$;

-- Reconcile logs created under the old audit-every-click behavior. Remove all
-- backward events and forward milestones beyond each factory's current stage.
delete from public.activities activity
using public.factories factory
where activity.factory_id = factory.id
  and activity.contact_id is null
  and activity.type = 'stage_change'
  and (
    public.factory_pipeline_stage_rank(split_part(coalesce(activity.body, ''), ' → ', 2))
      <= public.factory_pipeline_stage_rank(split_part(coalesce(activity.body, ''), ' → ', 1))
    or public.factory_pipeline_stage_rank(split_part(coalesce(activity.body, ''), ' → ', 2))
      > public.factory_pipeline_stage_rank(factory.stage)
  );

create or replace function public.log_factory_stage_change()
returns trigger language plpgsql as $$
declare
  old_rank integer;
  new_rank integer;
begin
  -- Contact-stage roll-ups are represented by their contact activity only.
  if pg_trigger_depth() <> 1 then
    return new;
  end if;

  old_rank := public.factory_pipeline_stage_rank(old.stage);
  new_rank := public.factory_pipeline_stage_rank(new.stage);

  if new_rank <= old_rank then
    delete from public.activities activity
    where activity.factory_id = new.id
      and activity.contact_id is null
      and activity.type = 'stage_change'
      and public.factory_pipeline_stage_rank(
        split_part(coalesce(activity.body, ''), ' → ', 2)
      ) > new_rank;
    return new;
  end if;

  insert into public.activities (factory_id, contact_id, type, body)
  values (new.id, null, 'stage_change', old.stage || ' → ' || new.stage);
  return new;
end; $$;
