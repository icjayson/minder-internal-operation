-- ============================================================================
-- Factory AI-score persistence hardening
-- Some databases applied the later context/network migrations without running
-- 011_context_loop.sql, leaving factories.scored_at missing.
-- Additive + idempotent; safe to re-run.
-- ============================================================================

alter table public.factories
  add column if not exists scored_at timestamptz;

