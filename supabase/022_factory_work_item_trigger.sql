-- ============================================================================
-- Factory work item next-step trigger
-- Adds a trigger date to each work inventory card: the day the next step
-- needs to happen (acts like a deadline for kanban cards).
-- Additive + idempotent. Requires factory_work_items.
-- ============================================================================

alter table public.factory_work_items
  add column if not exists trigger_on date;

create index if not exists factory_work_items_trigger_on_idx
  on public.factory_work_items (trigger_on);
