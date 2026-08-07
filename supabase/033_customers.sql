-- ============================================================================
-- Customers tracker — a filtered lens over public.factories.
--   A factory can be promoted to a Customer via the "Mark as Customer" action.
--   • It appears in the Customer tracker from the moment it is marked.
--   • It stays in the Partner (factory) tracker until its stage is Closed Won,
--     at which point it drops out of Partners and lives only under Customers.
-- The Customer tracker reuses every factory feature (contacts, activities,
-- work inventory, AI scoring, context) — so no new tables are needed, only a
-- flag on the shared factories row.
-- Additive + idempotent — safe to re-run. Paste into Supabase → SQL Editor.
-- ============================================================================

alter table public.factories
  add column if not exists is_customer boolean not null default false,
  add column if not exists customer_marked_at timestamptz;

create index if not exists factories_is_customer_idx
  on public.factories (is_customer)
  where is_customer = true;
