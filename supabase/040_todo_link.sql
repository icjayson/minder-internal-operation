-- ============================================================================
-- To-do reference link
--   One optional URL per task. When set, the card shows a button that opens it.
-- Additive + idempotent. Requires 039_todos.sql.
-- ============================================================================

alter table public.todos
  add column if not exists link text;
