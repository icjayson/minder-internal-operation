-- ============================================================================
-- Competitions & Programmes get their own pipeline + a Win/Lose result.
--   • stage model: Researching → Submitted → Pitched → Closed
--     (Investors keep their existing Researching…Closed / Passed model.)
--   • result: Win / Lose off-ramp outcome (nullable).
-- Additive + idempotent. Requires 030.
-- ============================================================================

-- Win/Lose outcome off-ramp for competitions.
alter table public.competitions
  add column if not exists result text check (result in ('Win','Lose'));

-- Remap any stages that fall outside the new 4-stage model before tightening
-- the check constraint (Passed → Closed + Lose; the mid stages fold inward).
update public.competitions set result = 'Lose'
  where stage = 'Passed' and result is null;
update public.competitions set stage = case
    when stage = 'Contacted'               then 'Submitted'
    when stage in ('Diligence','Committed') then 'Pitched'
    when stage = 'Passed'                  then 'Closed'
    else stage
  end
  where stage not in ('Researching','Submitted','Pitched','Closed');

alter table public.competitions drop constraint if exists competitions_stage_check;
alter table public.competitions add constraint competitions_stage_check
  check (stage in ('Researching','Submitted','Pitched','Closed'));
