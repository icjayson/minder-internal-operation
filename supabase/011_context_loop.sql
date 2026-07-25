-- ============================================================================
-- Context-loop additions:
--  • factories.scored_at  → lets the UI flag "context changed since last score"
--  • seed a Minder product/direction context doc for the hybrid recommender
-- Idempotent — safe to re-run.
-- ============================================================================

alter table public.factories add column if not exists scored_at timestamptz;

insert into public.context_docs (scope, title, body, kind)
select 'minder', 'Minder product & direction',
  'WHAT WE HAVE (today''s wedge — PRODUCE + MOVE): voice + vision at the point of work; work-order and station execution; item/material/pallet/WIP movement; inventory and shortage visibility; line-side replenishment; exceptions and escalation; shift handover. Closed loop: monitor against target → flag the gap → propose the fix → act only on human approval. Non-surveillance: reads items/machines/zones/safety, never worker performance. '
  || 'DIRECTION: define top-down. Pick ONE core problem per factory/contact from their real context and build a quick, concrete demo around that single problem — not a broad rollout. Prove value by how we integrate and serve; aim for value in 30-60 days without replacing ERP/MES/WMS/CMMS.',
  'both'
where not exists (select 1 from public.context_docs where scope = 'minder');
