-- Customer marker used by fde-kit provisioning.
-- Additive and idempotent: existing factories remain non-customers.

alter table public.factories
  add column if not exists is_customer boolean not null default false;

create index if not exists factories_is_customer_idx
  on public.factories (is_customer)
  where is_customer = true;
