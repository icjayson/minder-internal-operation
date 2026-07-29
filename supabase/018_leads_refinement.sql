-- 018_leads_refinement.sql
-- Sidebar / table refinements:
--   • Geo becomes free-text (UK / Europe / VN) instead of the old tier enum.
--   • Frontline workers stored as a banded range string (e.g. "50-200").
--   • New company description column (shown in the factories table + profile).
--   • Factory stage always rolls up from its contacts, so drop manual pins.

-- Geo: drop the old CHECK so UK / Europe / VN (or anything else) is accepted.
alter table public.factories drop constraint if exists factories_geo_tier_check;

-- Frontline workers: int → text so we can store ranges like "50-200".
alter table public.factories
  alter column frontline_workers type text using frontline_workers::text;

-- Company description.
alter table public.factories add column if not exists description text;

-- Merge the two legacy website fields without discarding an existing website.
update public.factories
set website_url = company_url
where nullif(btrim(website_url), '') is null
  and nullif(btrim(company_url), '') is not null;

-- Normalize existing numeric/range values so every saved value is selectable.
update public.factories
set frontline_workers = case
  when frontline_workers ~ '50[[:space:]]*[-–—][[:space:]]*200' then '50 - 200'
  when frontline_workers ~ '200[[:space:]]*[-–—][[:space:]]*500' then '200 - 500'
  when frontline_workers ~ '500[[:space:]]*[-–—][[:space:]]*1000' then '500 - 1000'
  when replace(substring(frontline_workers from '[0-9][0-9,]*'), ',', '')::int <= 200 then '50 - 200'
  when replace(substring(frontline_workers from '[0-9][0-9,]*'), ',', '')::int <= 500 then '200 - 500'
  else '500 - 1000'
end
where frontline_workers is not null
  and frontline_workers not in ('50 - 200', '200 - 500', '500 - 1000')
  and substring(frontline_workers from '[0-9][0-9,]*') is not null;

-- Convert old friction tiers using the country/HQ data when possible.
update public.factories
set geo_tier = case
  when lower(concat_ws(' ', country, hq_location)) ~
    '(vietnam|viet nam|ha noi|hanoi|ho chi minh|saigon|hue|da nang)' then 'VN'
  when lower(concat_ws(' ', country, hq_location)) ~
    '(united kingdom|england|scotland|wales|northern ireland|(^|[ ,])uk([ ,]|$))' then 'UK'
  when lower(concat_ws(' ', country, hq_location)) ~
    '(france|germany|italy|spain|portugal|netherlands|belgium|luxembourg|switzerland|austria|poland|czech|slovakia|hungary|romania|bulgaria|greece|denmark|sweden|norway|finland|iceland|ireland|estonia|latvia|lithuania|slovenia|croatia|serbia|bosnia|albania|montenegro|macedonia|moldova|ukraine|europe)' then 'Europe'
  else null
end
where geo_tier is not null
  and geo_tier not in ('UK', 'Europe', 'VN');

-- Contact edits roll the factory up to the furthest-along contact. Manual
-- factory edits are pushed down to all contacts, while roll-ups do not flatten
-- the other contacts' individual stages.
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

  update public.factories
    set stage = coalesce(furthest, 'New'),
        stage_locked = false,
        last_activity_at = now()
    where id = target_factory_id;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end; $$;

drop trigger if exists factories_sync_stage_to_contacts on public.factories;

-- Reconcile any factories that were previously pinned, without overwriting
-- the lower-stage contacts that participate in the roll-up.
update public.factories f
set stage = coalesce((
      select c.stage
      from public.contacts c
      where c.factory_id = f.id
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
      limit 1
    ), f.stage),
    stage_locked = false;

create or replace function public.sync_factory_stage_to_contacts()
returns trigger language plpgsql as $$
begin
  -- A factory UPDATE issued from rollup_factory_stage runs at trigger depth 2.
  if pg_trigger_depth() > 1 then
    return new;
  end if;

  update public.contacts
    set stage = new.stage
    where factory_id = new.id
      and stage is distinct from new.stage;
  return new;
end; $$;

create trigger factories_sync_stage_to_contacts
  after update of stage on public.factories
  for each row
  when (old.stage is distinct from new.stage)
  execute function public.sync_factory_stage_to_contacts();
