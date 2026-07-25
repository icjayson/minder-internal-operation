-- ============================================================================
-- Design-Partner Tracker schema
-- Migrates the app domain from generic leads → verticals ▸ factories ▸ contacts.
-- Paste into Supabase → SQL Editor → Run. Single-user mode (allow-all RLS).
-- ============================================================================

create extension if not exists "pgcrypto";

-- ── Verticals (5 IDP domains) ───────────────────────────────────────────────
create table if not exists public.verticals (
  id          uuid primary key default gen_random_uuid(),
  key         text unique not null,
  name        text not null,
  wedge_note  text,
  sort        int default 0,
  created_at  timestamptz not null default now()
);

-- ── Sequences (one per vertical) + steps ────────────────────────────────────
create table if not exists public.sequences (
  id          uuid primary key default gen_random_uuid(),
  vertical_id uuid references public.verticals(id) on delete cascade,
  name        text not null,
  channel     text default 'email',
  created_at  timestamptz not null default now()
);

create table if not exists public.sequence_steps (
  id           uuid primary key default gen_random_uuid(),
  sequence_id  uuid not null references public.sequences(id) on delete cascade,
  step_index   int not null,
  day_offset   int not null,
  subject      text,
  body         text,
  intent       text,
  unique (sequence_id, step_index)
);

-- ── Factories (accounts) ────────────────────────────────────────────────────
create table if not exists public.factories (
  id             uuid primary key default gen_random_uuid(),
  vertical_id    uuid references public.verticals(id),

  name           text not null,
  website_url    text,
  company_url    text,
  hq_location    text,
  country        text,
  geo_tier       text check (geo_tier in ('beachhead','warm_eu','warm_intro_eu','last_carefully')),

  frontline_workers int,
  systems           text[],
  machinery_note    text,
  multi_shift       boolean,
  channel           text,
  parent_company    text,

  score           numeric(5,2),
  grade           text check (grade in ('A','B','C')),
  score_breakdown jsonb,
  ai_reasoning    text,
  ai_recommendation text,
  blocker         text,

  stage           text not null default 'New'
                  check (stage in ('New','Contacted','Replied','Meeting Booked','Demo','Closed Won','Closed Lost','Nurture')),
  stage_locked    boolean default false,
  ladder_level    int default 0 check (ladder_level between 0 and 7),
  evidence_level  int default 0 check (evidence_level between 0 and 5),

  next_action        text,
  next_action_due    date,
  last_activity_at   timestamptz default now(),

  priority        int check (priority between 1 and 5),
  notes           text,
  source          text default 'manual',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists factories_vertical_idx      on public.factories (vertical_id);
create index if not exists factories_grade_idx         on public.factories (grade);
create index if not exists factories_stage_idx         on public.factories (stage);
create index if not exists factories_last_activity_idx on public.factories (last_activity_at);
create index if not exists factories_next_due_idx      on public.factories (next_action_due);

-- ── Contacts (branch from a factory) ────────────────────────────────────────
create table if not exists public.contacts (
  id            uuid primary key default gen_random_uuid(),
  factory_id    uuid not null references public.factories(id) on delete cascade,

  full_name     text not null,
  role_title    text,
  role_level    text check (role_level in ('high','mid','expert')),
  role_category text,
  is_primary_target boolean default false,

  linkedin_url  text,
  email         text,
  phone         text,

  stage         text not null default 'New'
                check (stage in ('New','Contacted','Replied','Meeting Booked','Demo','Closed Won','Closed Lost','Nurture')),
  ladder_level  int default 0 check (ladder_level between 0 and 7),
  sequence_id   uuid references public.sequences(id),
  sequence_step int default 0,
  sequence_state text default 'not_started'
                 check (sequence_state in ('not_started','active','replied','paused','done','opted_out')),

  last_contacted   timestamptz,
  next_follow_up   date,
  touch_count      int default 0,
  last_activity_at timestamptz default now(),

  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists contacts_factory_idx   on public.contacts (factory_id);
create index if not exists contacts_next_fu_idx    on public.contacts (next_follow_up);
create index if not exists contacts_seqstate_idx   on public.contacts (sequence_state);

-- ── Activities (timeline + evidence) ────────────────────────────────────────
create table if not exists public.activities (
  id            uuid primary key default gen_random_uuid(),
  factory_id    uuid references public.factories(id) on delete cascade,
  contact_id    uuid references public.contacts(id) on delete set null,
  type          text not null,               -- note|interview|stage_change|email_sent|reply
  body          text,
  evidence_level int check (evidence_level between 0 and 5),
  taxonomy_tags text[],
  created_at    timestamptz not null default now()
);
create index if not exists activities_factory_idx on public.activities (factory_id, created_at desc);

-- ── Messages (AI-written outreach) ──────────────────────────────────────────
create table if not exists public.messages (
  id            uuid primary key default gen_random_uuid(),
  contact_id    uuid not null references public.contacts(id) on delete cascade,
  sequence_step_id uuid references public.sequence_steps(id),
  channel       text default 'email',
  subject       text,
  body          text,
  status        text default 'draft' check (status in ('draft','queued','sent','replied','bounced')),
  scheduled_for date,
  sent_at       timestamptz,
  created_at    timestamptz not null default now()
);
create index if not exists messages_contact_idx on public.messages (contact_id, created_at desc);

-- ── Context docs (ground the AI scorer + writer) ────────────────────────────
create table if not exists public.context_docs (
  id          uuid primary key default gen_random_uuid(),
  scope       text not null default 'global',   -- 'global' | vertical key
  title       text not null,
  body        text not null,
  kind        text default 'scoring' check (kind in ('scoring','writing','both')),
  active      boolean default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ── Notifications (derived alerts) ──────────────────────────────────────────
create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null,   -- stale_factory | stale_contact | followup_due | sequence_step_due
  factory_id  uuid references public.factories(id) on delete cascade,
  contact_id  uuid references public.contacts(id) on delete cascade,
  title       text not null,
  detail      text,
  due_on      date,
  read_at     timestamptz,
  pushed_at   timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists notifications_unread_idx on public.notifications (read_at);

-- ── Import audit ────────────────────────────────────────────────────────────
create table if not exists public.import_jobs (
  id                uuid primary key default gen_random_uuid(),
  file_name         text,
  status            text not null default 'running'
                    check (status in ('running','completed','completed_with_errors','failed')),
  total_rows        int not null default 0,
  factories_created int not null default 0,
  factories_updated int not null default 0,
  contacts_created  int not null default 0,
  contacts_updated  int not null default 0,
  skipped_rows      int not null default 0,
  errors            jsonb not null default '[]'::jsonb,
  created_at        timestamptz not null default now(),
  completed_at      timestamptz
);

-- ── updated_at triggers ─────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end; $$;

drop trigger if exists factories_set_updated_at on public.factories;
create trigger factories_set_updated_at before update on public.factories
  for each row execute function public.set_updated_at();
drop trigger if exists contacts_set_updated_at on public.contacts;
create trigger contacts_set_updated_at before update on public.contacts
  for each row execute function public.set_updated_at();

-- A contact stage change is an activity and restarts its stale timer.
create or replace function public.touch_contact_stage() returns trigger language plpgsql as $$
begin
  if new.stage is distinct from old.stage then
    new.last_activity_at := now();
  end if;
  return new;
end; $$;
drop trigger if exists contacts_touch_stage on public.contacts;
create trigger contacts_touch_stage
  before update of stage on public.contacts
  for each row execute function public.touch_contact_stage();

create or replace function public.log_contact_stage_change() returns trigger language plpgsql as $$
begin
  if new.stage is distinct from old.stage then
    insert into public.activities (factory_id, contact_id, type, body)
    values (new.factory_id, new.id, 'stage_change', old.stage || ' → ' || new.stage);
  end if;
  return new;
end; $$;
drop trigger if exists contacts_log_stage_change on public.contacts;
create trigger contacts_log_stage_change
  after update of stage on public.contacts
  for each row
  when (old.stage is distinct from new.stage)
  execute function public.log_contact_stage_change();

-- ── Factory stage roll-up (furthest-along contact) ──────────────────────────
create or replace function public.rollup_factory_stage() returns trigger language plpgsql as $$
declare
  furthest text;
  target_factory_id uuid;
begin
  target_factory_id := case when tg_op = 'DELETE' then old.factory_id else new.factory_id end;

  select stage from public.contacts c
    where c.factory_id = target_factory_id
    order by case c.stage
      when 'Closed Won' then 7
      when 'Demo' then 6
      when 'Meeting Booked' then 5
      when 'Replied' then 4
      when 'Contacted' then 3
      when 'New' then 2
      when 'Nurture' then 1
      when 'Closed Lost' then 0
      else -1
    end desc, c.updated_at desc
    limit 1 into furthest;

  update public.factories f
    set stage = case when f.stage_locked then f.stage else coalesce(furthest, 'New') end,
        last_activity_at = now()
    where f.id = target_factory_id;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end; $$;
drop trigger if exists contacts_rollup_stage on public.contacts;
drop trigger if exists contacts_rollup_stage_insert on public.contacts;
drop trigger if exists contacts_rollup_stage_update on public.contacts;
drop trigger if exists contacts_rollup_stage_delete on public.contacts;
create trigger contacts_rollup_stage_insert
  after insert on public.contacts
  for each row execute function public.rollup_factory_stage();
create trigger contacts_rollup_stage_update
  after update of stage on public.contacts
  for each row
  when (old.stage is distinct from new.stage)
  execute function public.rollup_factory_stage();
create trigger contacts_rollup_stage_delete
  after delete on public.contacts
  for each row execute function public.rollup_factory_stage();

-- Atomically mark a draft sent, log the touch and advance its cadence.
create or replace function public.mark_message_sent(p_message_id uuid)
returns jsonb language plpgsql as $$
declare
  m public.messages%rowtype;
  c public.contacts%rowtype;
  current_step public.sequence_steps%rowtype;
  next_step public.sequence_steps%rowtype;
  sent_time timestamptz := now();
  follow_up date;
begin
  select * into m from public.messages where id = p_message_id for update;
  if not found then raise exception 'Message not found'; end if;
  if m.status = 'sent' then
    return jsonb_build_object('ok', true, 'already_sent', true, 'sent_at', m.sent_at);
  end if;

  select * into c from public.contacts where id = m.contact_id for update;
  if not found then raise exception 'Contact not found'; end if;
  if c.sequence_state = 'opted_out' then raise exception 'Contact has opted out'; end if;

  if m.sequence_step_id is not null then
    select * into current_step from public.sequence_steps where id = m.sequence_step_id;
    select * into next_step
      from public.sequence_steps
      where sequence_id = current_step.sequence_id
        and step_index > current_step.step_index
      order by step_index
      limit 1;
    if next_step.id is not null then
      follow_up := current_date + greatest(1, next_step.day_offset - current_step.day_offset);
    end if;
  else
    follow_up := current_date + 3;
  end if;

  update public.messages
    set status = 'sent', sent_at = sent_time
    where id = m.id;

  update public.contacts
    set stage = case when c.stage = 'New' then 'Contacted' else c.stage end,
        last_contacted = sent_time,
        last_activity_at = sent_time,
        touch_count = coalesce(c.touch_count, 0) + 1,
        next_follow_up = follow_up,
        sequence_id = coalesce(current_step.sequence_id, c.sequence_id),
        sequence_step = coalesce(current_step.step_index, c.sequence_step),
        sequence_state = case
          when current_step.id is null then c.sequence_state
          when next_step.id is null then 'done'
          else 'active'
        end
    where id = c.id;

  insert into public.activities (factory_id, contact_id, type, body)
    values (c.factory_id, c.id, 'email_sent',
      coalesce(m.subject, 'Sequence step ' || coalesce(current_step.step_index::text, 'manual')));
  update public.factories set last_activity_at = sent_time where id = c.factory_id;

  return jsonb_build_object(
    'ok', true,
    'sent_at', sent_time,
    'next_follow_up', follow_up,
    'next_step', next_step.step_index
  );
end; $$;

-- ── RLS: enabled + allow-all (single-user) ──────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['verticals','sequences','sequence_steps','factories','contacts','activities','messages','context_docs','notifications','import_jobs']
  loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists "allow all" on public.%I;', t);
    execute format('create policy "allow all" on public.%I for all using (true) with check (true);', t);
    -- add to realtime only if not already a member (idempotent re-runs)
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I;', t);
    end if;
  end loop;
end $$;

-- ── Seed: 5 verticals + one sequence each + 5 steps each ────────────────────
insert into public.verticals (key, name, wedge_note, sort) values
  ('automotive',   'Automotive parts (tier-2 & service)', 'UK transfer wedge; reshoring + EV/ZEV pressure. Data-rich, premium ACV.', 1),
  ('discrete_mfg', 'Light & discrete mfg / subcontract machining', 'Metal fabrication, machine shops, plastics. Dense SME base, bundle-tracking pain.', 2),
  ('food_bev',     'Food & beverage processing', 'UK''s largest manufacturing sector; SME-heavy; batch, traceability, shift-handover.', 3),
  ('textile',      'Textile, garment & footwear', 'Hands-busy, bundle-tracking, quality-driven — the proving-ground engine profile.', 4),
  ('logistics',    'Logistics & 3PL / warehousing', 'Purest item-flow fit — a yard or warehouse is items moving across stations.', 5)
on conflict (key) do nothing;

-- One default sequence per vertical
insert into public.sequences (vertical_id, name, channel)
select v.id, v.name || ' — cold sequence', 'email'
from public.verticals v
where not exists (select 1 from public.sequences s where s.vertical_id = v.id);

-- 5 cadence steps per sequence (D1/D4/D9/D15/D21) following PDF 1 §2.5.2
insert into public.sequence_steps (sequence_id, step_index, day_offset, intent, subject, body)
select s.id, x.step_index, x.day_offset, x.intent, x.subject, x.body
from public.sequences s
cross join (values
  (1, 1,  'hypothesis+ask', 'A quick question about {{factory}}''s floor',
   'Specific relevance → one narrow operational tension → honest credibility from live Vietnamese-floor experience → explicit non-sales research ask → useful give-back → low-friction next step + clear opt-out.'),
  (2, 4,  'observation',    'One thing we saw on a similar floor',
   'Share one useful observation or a small diagram relevant to {{tension}}. No ask beyond a reaction.'),
  (3, 9,  'async_question', 'One question you can answer in 20 seconds',
   'A single question they can answer asynchronously about {{tension}}.'),
  (4, 15, 'roundtable',     'Insight brief / small roundtable',
   'Invite to a roundtable or offer an anonymised insight brief. Give-back framed.'),
  (5, 21, 'close_loop',     'Closing the loop',
   'Close the loop respectfully, ask for the correct contact if not them, then stop.')
) as x(step_index, day_offset, intent, subject, body)
where not exists (select 1 from public.sequence_steps ss where ss.sequence_id = s.id);

-- Seed a starter global scoring context (edit in /settings)
insert into public.context_docs (scope, title, body, kind)
select 'global', 'Ideal Design-Partner Profile + product wedge',
  'NECESSARY: SME/lower-mid-market industrial; ~50-500 frontline workers/site; multi-shift or handoff-heavy; multi-brand machinery + fragmented systems; mix of ERP/MES/WMS/CMMS + spreadsheets/paper/radio/chat/tribal knowledge; no large internal app-building team. SUFFICIENT: repeated pain around production/material-flow/inventory/exceptions/handover; access to managers, supervisors and frontline; realistic 3-6 month evaluation window. PRODUCT WEDGE (PRODUCE+MOVE): work-order/station execution, item/material/pallet/WIP movement, inventory & shortage visibility, line-side replenishment, exceptions & escalation, shift handover, voice+vision capture at the point of work.',
  'both'
where not exists (select 1 from public.context_docs where scope = 'global');
