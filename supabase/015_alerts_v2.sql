-- ============================================================================
-- Phase 4 — Alerts v2
--   • notifications.network_id: alerts can now target a network too.
--   • notifications.summary: each alert carries an AI recap of the relationship.
-- Additive + idempotent. Requires 013_networks.sql. Paste into Supabase SQL Editor.
-- ============================================================================

alter table public.notifications add column if not exists network_id uuid references public.networks(id) on delete cascade;
alter table public.notifications add column if not exists summary text;
create index if not exists notifications_network_idx on public.notifications (network_id);
