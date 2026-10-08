-- ============================================================================
-- To-do PENDING status
--   A task that is still live but waiting on someone or something. It is not
--   finished, so it keeps completed_at null and still shows in the date views;
--   the board gives it its own column between TO-DO and DONE.
-- Additive + idempotent — safe to re-run. Requires 039_todos.sql.
-- ============================================================================

alter table public.todos drop constraint if exists todos_status_check;
alter table public.todos add constraint todos_status_check
  check (status in ('open', 'pending', 'done', 'cancelled'));

-- completed_at follows status: only done / cancelled carry one.
create or replace function public.todos_sync_completed_at() returns trigger
language plpgsql as $$
begin
  if new.status in ('open', 'pending') then
    new.completed_at := null;
  elsif new.completed_at is null then
    new.completed_at := now();
  end if;
  return new;
end $$;

-- The partial indexes keyed on "open" now cover every unfinished task.
drop index if exists public.todos_open_due_idx;
create index todos_open_due_idx
  on public.todos (due_on, priority, sort_order)
  where status in ('open', 'pending') and parent_id is null;

drop index if exists public.todos_project_idx;
create index todos_project_idx
  on public.todos (project_id, section_id, sort_order)
  where status in ('open', 'pending');

drop index if exists public.todos_logbook_idx;
create index todos_logbook_idx
  on public.todos (completed_at desc)
  where status in ('done', 'cancelled');
