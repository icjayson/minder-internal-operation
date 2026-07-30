-- ============================================================================
-- Work-item trigger alerts
-- Lets a notification point at a specific kanban work item, so the alert
-- scanner can fire (and auto-resolve) "work item past its trigger date"
-- reminders. Additive + idempotent. Requires notifications + factory_work_items.
-- ============================================================================

alter table public.notifications
  add column if not exists work_item_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'notifications_work_item_id_fkey'
      and conrelid = 'public.notifications'::regclass
  ) then
    alter table public.notifications
      add constraint notifications_work_item_id_fkey
      foreign key (work_item_id)
      references public.factory_work_items(id)
      on delete cascade;
  end if;
end $$;

create index if not exists notifications_work_item_idx
  on public.notifications (work_item_id);
