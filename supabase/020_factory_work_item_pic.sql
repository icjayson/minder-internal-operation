-- ============================================================================
-- Factory work item PIC
-- Assigns an optional factory contact to each work inventory card.
-- Additive + idempotent. Requires factory_work_items and contacts.
-- ============================================================================

alter table public.factory_work_items
  add column if not exists pic_contact_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'factory_work_items_pic_contact_id_fkey'
      and conrelid = 'public.factory_work_items'::regclass
  ) then
    alter table public.factory_work_items
      add constraint factory_work_items_pic_contact_id_fkey
      foreign key (pic_contact_id)
      references public.contacts(id)
      on delete set null;
  end if;
end $$;

create index if not exists factory_work_items_pic_contact_idx
  on public.factory_work_items (pic_contact_id);
