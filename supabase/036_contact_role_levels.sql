-- 036_contact_role_levels.sql
-- Widen the contact role-level tiers to the 4-rank model:
--   high (Direction) · mid (Manager) · low (Lead) · specialist (everyone else).
-- The old CHECK only allowed ('high','mid','expert'), which rejected inserts of the new
-- 'low' and 'specialist' tiers — so saving a Lead / Specialist contact failed silently.
-- Idempotent: safe to run more than once.

alter table public.contacts drop constraint if exists contacts_role_level_check;

-- Retire the old 'expert' tier onto 'specialist' so existing rows stay valid.
update public.contacts set role_level = 'specialist' where role_level = 'expert';

alter table public.contacts
  add constraint contacts_role_level_check
  check (role_level in ('high', 'mid', 'low', 'specialist'));
