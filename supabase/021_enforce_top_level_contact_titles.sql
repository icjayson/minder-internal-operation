-- ============================================================================
-- Top-level contact titles
-- CEO, chief executive officer, founder, co-founder and owner always belong to "high".
-- Backfills existing contacts and enforces the rule for future writes.
-- ============================================================================

create or replace function public.enforce_top_level_contact_role()
returns trigger
language plpgsql
as $$
begin
  if coalesce(new.role_title, '') ~*
    '(^|[^a-z0-9])(ceo|chief[[:space:]]+executive[[:space:]]+officer|co[-[:space:]]?founder|founder|owner)([^a-z0-9]|$)'
  then
    new.role_level := 'high';
  end if;
  return new;
end;
$$;

update public.contacts
set role_level = 'high'
where coalesce(role_title, '') ~*
  '(^|[^a-z0-9])(ceo|chief[[:space:]]+executive[[:space:]]+officer|co[-[:space:]]?founder|founder|owner)([^a-z0-9]|$)'
  and role_level is distinct from 'high';

drop trigger if exists contacts_enforce_top_level_role on public.contacts;
create trigger contacts_enforce_top_level_role
  before insert or update of role_title, role_level on public.contacts
  for each row execute function public.enforce_top_level_contact_role();
