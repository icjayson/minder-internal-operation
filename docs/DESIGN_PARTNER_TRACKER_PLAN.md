# Design‑Partner Tracker — Migration & Implementation Plan

> Migrate the current **Fund / VC / Investor lead tracker** into a **single web tracker for industrial design partners** (factories → contacts → outreach sequences), grounded in the *UK & Europe Design Partner Relationship Plan* (PDF 1) and aligned with *The Five‑Year Grand Strategy* (PDF 2).
>
> Stack stays the same: **Next.js 16 + Tailwind v4 (Celesnity theme) + Supabase (Postgres + realtime) + OpenAI (gpt‑4o‑mini)**. We reuse the existing store / table / drawer / API‑route patterns and rename the domain from `lead` → `factory` + `contact`.

---

## 0. Source → feature mapping

| From the plan (PDF 1 / PDF 2) | Becomes in the tracker |
|---|---|
| 5 IDP domains (Automotive parts, Light & discrete mfg, Food & beverage, Textile/garment/footwear, Logistics/3PL) | `verticals` — top of the tree, each with its own sequence + scoring context |
| Geography tiers (Beachhead / Warm EU / Warm‑intro EU / Last‑carefully) | `factories.geo_tier` |
| Ideal Design‑Partner Profile (necessary + sufficient conditions) | Scoring context + factory attributes |
| Qualification score — 100 pts across 8 dimensions | **AI scoring** (`/api/score-factory`) → `score`, `score_breakdown`, `grade` A/B/C |
| Relationship ladder 0→7 (Researched → Active design partner) | `factories.ladder_level` + `contacts.ladder_level` |
| Evidence ladder 0→5 | `activities.evidence_level` |
| Target representatives (Owner/MD/COO/Ops Dir, Plant Director = first priority) | `contacts.role_level` + `is_primary_target` |
| First‑message architecture (6 parts) + follow‑up cadence D1/4/9/15/21 (+D51) | `sequences` + `sequence_steps` + cadence engine |
| Channel strategy (parent‑bridge → accelerator → connector → trade assoc → trade show → crawl) | `factories.channel` / `contacts.source` |
| Tool/tactic (Sales Nav / Apollo / Clay / Smartlead / Resend, founder inbox) | **External flow** (§7): crawl → CSV → import → AI enrich/score |
| Taxonomy (PLAN/PRODUCE/MOVE/… + Entity/Event/State/…) | `activities.taxonomy_tags` (evidence tagging) |
| Mom Test / NDA‑first / non‑surveillance / disclose intent | **AI writing‑assistant guardrails** (system prompt) |
| “One graph, not eight silos” | One relational schema: Vertical → Factory → Contact → Activity/Message, no per‑feature silos |

---

## 1. Target state & scope

**Goal:** one web app where the founder can, per industrial vertical:

1. **Track a list of factories** in a status table, each AI‑scored against the Ideal Design‑Partner Profile using founder‑supplied context.
2. **Track contacts (owner / BOD / directors) inside each factory**, shown as a tree branching from the factory node.
3. **Run a 4‑message outreach sequence** per vertical, with an AI writing assistant that drafts each message following the plan’s 6‑part architecture.
4. Get **reminders/alerts** (in‑app + email + Discord) when a factory/contact has had no update in >7 days or a scheduled follow‑up is due.
5. Use AI for **scoring + recommendation + message drafting** (the three AI jobs).

**In scope (v1):** factory & contact CRM, AI scoring/recommendation/writing, per‑vertical sequences + cadence reminders, CSV import from external tools, notifications (in‑app + email + Discord).

**Out of scope (v1, define later):** two‑way email sending/inbox sync, LinkedIn automation, live crawling inside the app (we import from external tools instead — §7), evidence‑repo replacement for Notion (we mirror the taxonomy but Notion stays the deep repo initially).

---

## 2. Domain model

```
Vertical (5 IDP domains)
  └── Factory (account / site)         ← AI-scored, graded A/B/C, stage (rolls up from contacts)
        ├── Contact (owner, BOD, director, …)   ← tree branch; own stage pipeline; in a sequence
        │     └── Message (drafted/sent per sequence step)
        └── Activity (note / interview / status change / evidence)  ← timeline, evidence 0–5, taxonomy tags
Sequence (per Vertical)
  └── Sequence Step (Day 1 / 4 / 9 / 15 / 21 / 51)  ← template body + AI variables
ContextDoc (scoring context the founder inputs)  ← grounds the AI scorer per vertical / global
Notification (derived alerts: stale >7d, follow-up due, sequence step due)
```

Two‑level tree is explicit: **Factory is the parent node, Contacts branch from it.** A contact always belongs to exactly one factory; a factory belongs to exactly one vertical.

---

## 3. Database schema (Supabase) + migration

New migration file: `supabase/010_design_partner.sql`. We keep the old `leads` table until the cutover is verified, then archive it.

### 3.0 Pipeline stages (activity status) — per contact, rolled up to factory

The **primary day‑to‑day status**, tracked **per contact** and mirrored on the **factory**:

`New → Contacted → Replied → Meeting Booked → Demo → Closed Won`
Terminal off‑path: `Closed Lost`, `Nurture` (recommended — the cadence engine needs a “stop reminding” state).

Rules:
- Each **contact** owns its own `stage`. Changing it writes a `stage_change` activity and resets `last_activity_at` (so the >7‑day alert timer restarts).
- **Factory `stage` = the furthest‑along stage among its contacts** — auto roll‑up on any contact stage change, unless `stage_locked = true` (manual pin).
- Rendered as the chevron pipeline (top of `/factories` + factory drawer) and a stage pill on each contact — reusing the existing themed `pipeline-chevrons` + `stage-pill`.
- Separate from: the strategic **relationship ladder 0→7** (PDF 1 §1.4), kept as an *optional* depth marker on factories (hidden by default in v1); and `sequence_state`, which is purely the automation engine’s bookkeeping (which step is due).

Roll‑up trigger (in the migration):

```sql
create or replace function public.rollup_factory_stage() returns trigger language plpgsql as $$
declare furthest text;
begin
  select stage from public.contacts c
    where c.factory_id = new.factory_id
    order by array_position(
      array['New','Contacted','Replied','Meeting Booked','Demo','Closed Won'], c.stage) desc nulls last
    limit 1 into furthest;
  update public.factories f set stage = coalesce(furthest, f.stage), updated_at = now()
    where f.id = new.factory_id and f.stage_locked = false;
  return new;
end; $$;
create trigger contacts_rollup_stage
  after insert or update of stage on public.contacts
  for each row execute function public.rollup_factory_stage();
```

### 3.1 Enums / reference

```sql
-- Verticals seeded from PDF 1 §1.2
create table public.verticals (
  id          uuid primary key default gen_random_uuid(),
  key         text unique not null,         -- 'automotive' | 'discrete_mfg' | 'food_bev' | 'textile' | 'logistics'
  name        text not null,
  wedge_note  text,                          -- "why it fits the wedge"
  sort        int default 0,
  created_at  timestamptz not null default now()
);
```

### 3.2 Factories (accounts)

```sql
create table public.factories (
  id             uuid primary key default gen_random_uuid(),
  vertical_id    uuid references public.verticals(id),

  -- identity
  name           text not null,
  website_url    text,
  hq_location    text,
  country        text,
  geo_tier       text check (geo_tier in ('beachhead','warm_eu','warm_intro_eu','last_carefully')),

  -- IDP attributes (feed the scorer)
  frontline_workers   int,                   -- ~50–500 heuristic
  systems             text[],                -- ERP/MES/WMS/CMMS/spreadsheet/paper/radio/chat
  machinery_note      text,
  multi_shift         boolean,
  channel             text,                  -- parent_bridge|accelerator|connector|trade_assoc|trade_show|crawl
  parent_company      text,

  -- qualification (AI)
  score           numeric(5,2),             -- 0–100
  grade           text check (grade in ('A','B','C')),
  score_breakdown jsonb,                     -- {idp_fit, pain_urgency, wedge_fit, access, trial_readiness, representativeness, strategic_leverage, relationship_quality}
  ai_reasoning    text,
  ai_recommendation text,                    -- next-best-action from the recommender
  blocker         text,                      -- hard blocker (drops A→B)

  -- pipeline
  stage           text not null default 'New'
                  check (stage in ('New','Contacted','Replied','Meeting Booked','Demo','Closed Won','Closed Lost','Nurture')),
  stage_locked    boolean default false,     -- true = manual stage, skip auto roll-up from contacts
  ladder_level    int default 0 check (ladder_level between 0 and 7),  -- optional strategic depth (PDF 1 §1.4)
  evidence_level  int default 0 check (evidence_level between 0 and 5),

  -- activity / reminders
  next_action        text,
  next_action_due    date,
  last_activity_at   timestamptz default now(),  -- drives the >7-day alert

  priority        int check (priority between 1 and 5),
  notes           text,
  source          text default 'manual',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index on public.factories (vertical_id);
create index on public.factories (grade);
create index on public.factories (last_activity_at);
create index on public.factories (next_action_due);
```

### 3.3 Contacts (the tree branch)

```sql
create table public.contacts (
  id            uuid primary key default gen_random_uuid(),
  factory_id    uuid not null references public.factories(id) on delete cascade,

  full_name     text not null,
  role_title    text,
  role_level    text,      -- 'high' | 'mid' | 'expert'   (PDF 1 §1.2.2)
  role_category text,      -- 'owner_md_coo' | 'plant_director' | 'ops_manager' | 'ci_opex' | 'materials_mgr' | 'shift_lead' | 'operator' | 'it_ot' | 'hr_dpo' | 'procurement'
  is_primary_target boolean default false,   -- true for owner/MD/COO/Ops Dir + Plant Director

  linkedin_url  text,
  email         text,
  phone         text,

  stage         text not null default 'New'  -- PRIMARY activity status (per contact)
                check (stage in ('New','Contacted','Replied','Meeting Booked','Demo','Closed Won','Closed Lost','Nurture')),
  ladder_level  int default 0 check (ladder_level between 0 and 7),  -- optional strategic depth
  sequence_id   uuid references public.sequences(id),
  sequence_step int default 0,               -- automation bookkeeping only
  sequence_state text default 'not_started', -- not_started|active|replied|paused|done|opted_out

  last_contacted   timestamptz,
  next_follow_up   date,
  touch_count      int default 0,
  last_activity_at timestamptz default now(),

  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index on public.contacts (factory_id);
create index on public.contacts (next_follow_up);
create index on public.contacts (sequence_state);
```

### 3.4 Sequences & steps (per vertical, 4+ messages)

```sql
create table public.sequences (
  id          uuid primary key default gen_random_uuid(),
  vertical_id uuid references public.verticals(id),
  name        text not null,
  channel     text default 'email',          -- email | linkedin
  created_at  timestamptz not null default now()
);

create table public.sequence_steps (
  id           uuid primary key default gen_random_uuid(),
  sequence_id  uuid not null references public.sequences(id) on delete cascade,
  step_index   int not null,                 -- 1..N
  day_offset   int not null,                 -- 1,4,9,15,21,51 (from PDF 1 cadence)
  subject      text,
  body         text,                         -- template with {{first_name}}, {{factory}}, {{tension}} …
  intent       text,                         -- 'hypothesis+ask' | 'observation' | 'async_question' | 'roundtable' | 'close_loop'
  unique (sequence_id, step_index)
);
```

### 3.5 Activities (timeline + evidence) & Messages

```sql
create table public.activities (
  id            uuid primary key default gen_random_uuid(),
  factory_id    uuid references public.factories(id) on delete cascade,
  contact_id    uuid references public.contacts(id) on delete set null,
  type          text not null,               -- note|interview|stage_change|email_sent|reply
  body          text,
  evidence_level int check (evidence_level between 0 and 5),
  taxonomy_tags text[],                       -- PLAN/PRODUCE/MOVE/… + Entity/Event/State/…
  created_at    timestamptz not null default now()
);
create index on public.activities (factory_id, created_at desc);

create table public.messages (
  id            uuid primary key default gen_random_uuid(),
  contact_id    uuid not null references public.contacts(id) on delete cascade,
  sequence_step_id uuid references public.sequence_steps(id),
  channel       text default 'email',
  subject       text,
  body          text,                         -- final AI-written body
  status        text default 'draft',         -- draft|queued|sent|replied|bounced
  scheduled_for date,
  sent_at       timestamptz,
  created_at    timestamptz not null default now()
);
```

### 3.6 Scoring context & notifications

```sql
-- Founder-supplied context that grounds the AI scorer + writer (§4, §7).
create table public.context_docs (
  id          uuid primary key default gen_random_uuid(),
  scope       text not null,        -- 'global' | vertical key
  title       text not null,
  body        text not null,        -- IDP definition, rubric weights, product wedge, VN reference, dos/don'ts
  kind        text default 'scoring', -- scoring | writing | both
  active      boolean default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.notifications (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null,        -- stale_factory | stale_contact | followup_due | sequence_step_due
  factory_id  uuid references public.factories(id) on delete cascade,
  contact_id  uuid references public.contacts(id) on delete cascade,
  title       text not null,
  detail      text,
  due_on      date,
  read_at     timestamptz,
  pushed_at   timestamptz,          -- set once emailed/Discorded so we don't double-push
  created_at  timestamptz not null default now()
);
create index on public.notifications (read_at);
```

RLS: keep the existing single‑user “allow‑all” policies for now (README already warns; add auth before teammates). Add all new tables to the realtime publication so the dashboard updates live, exactly like `leads` today.

### 3.7 Data migration from `leads`

The current `leads` rows are VC/Fund/Investor‑oriented, so most do **not** map to factories. Recommendation: **do not auto‑convert**. Instead:

- Keep `leads` intact (rename to `leads_archive` after cutover).
- Seed `verticals` (5 rows) + one default `sequence` per vertical (empty steps, filled in §8).
- Any lead that is genuinely a factory/operator can be re‑imported through the §7 CSV importer.

---

## 4. AI subsystem (the three jobs)

Reuse `web/lib/openai.ts` (single‑turn fetch client, gpt‑4o‑mini). Three server routes under `web/app/api/`.

### 4.1 Scoring — `POST /api/score-factory`

Input: `{ factoryId }`. Loads the factory + its vertical’s **active `context_docs`** (scope=`global` + scope=vertical) and applies the **exact 100‑pt rubric from PDF 1 §1.3**:

| Dimension | Pts | Question |
|---|---|---|
| IDP / fragmentation fit | 15 | “Same vertical, different floor” incumbents ignore? |
| Pain urgency | 20 | Recent incident, frequency, consequence, forcing event? |
| PRODUCE/MOVE wedge fit | 15 | Direct path to value with today’s product? |
| Access capability | 15 | Sponsor, champion, users, workflow, artifacts? |
| Trial readiness | 15 | Site, timing, IT/privacy path in 3–6 months? |
| Representativeness | 10 | Learning applies to many similar sites? |
| Strategic leverage | 5 | Parent‑network / reference / cluster leverage? |
| Relationship quality | 5 | Follow‑through, openness, reciprocity? |

Output (JSON, `response_format: json_object`, `temperature: 1`):

```json
{
  "score_breakdown": { "idp_fit": 12, "pain_urgency": 16, "wedge_fit": 11, "access": 9,
                        "trial_readiness": 10, "representativeness": 8, "strategic_leverage": 3, "relationship_quality": 4 },
  "score": 73,
  "grade": "B",
  "blocker": "No confirmed frontline access yet",
  "reasoning": "2–3 sentences citing concrete signals",
  "recommendation": "Ladder-appropriate next action (e.g. 'Ask the Ops Director for a 25-min workflow interview')"
}
```

Grade rule (from plan): **A ≥75 & no hard blocker · B 60–74 with a defined blocker · C <60 (insight contact only)**. Enforce in code after parsing (don’t trust the model’s grade blindly). Persist to `factories.score/grade/score_breakdown/ai_reasoning/ai_recommendation/blocker`. Realtime pushes the update — same pattern as today’s `score-lead`.

### 4.2 Recommendation — folded into scoring + a `POST /api/recommend-next`

Given `ladder_level`, `grade`, `evidence_level`, days‑since‑`last_activity_at`, and open blocker, return the **ladder‑appropriate next ask/give** straight from PDF 1 §1.4 (e.g. L1 → “25–30 min workflow interview / give research purpose”). This makes the recommender deterministic + explainable, with the LLM only phrasing it.

### 4.3 Writing assistant — `POST /api/generate-message`

Input: `{ contactId, sequenceStepId }` (or `{ verticalId, stepIndex, contactId }`). Builds the message from the plan’s **6‑part first‑message architecture** and the **Mom‑Test discovery philosophy**, personalised to the contact’s role and the factory’s vertical/tension.

System‑prompt guardrails (non‑negotiable, from PDF 1 §2.5 + PDF 2 honesty guardrail):
- Discovery, not pitching — talk about *their* situation, ask about the last real incident.
- Disclose intent (building a product, may invite to partner); **no “research” bait‑and‑switch**.
- Honest VN‑floor credibility — lead with PRODUCE/MOVE reality, prove by *how we integrate*, not by feature claims; world‑model only as long‑term context.
- Explicit **non‑sales research ask** + **useful give‑back** + **low‑friction next step & clear opt‑out**.
- Max ~4 short sentences/paragraphs; no surveillance framing; human‑in‑the‑loop tone.

Output: `{ subject, body }`, saved to `messages` (status `draft`). `temperature: 1`. The founder edits, then marks sent (logs an `activity` + increments `touch_count` + sets `last_contacted`).

The four/five step templates per vertical (Day 1/4/9/15/21, +D51) live in `sequence_steps`; the writer fills them with `{{first_name}}`, `{{factory}}`, `{{one_tension}}`, `{{give_back}}` etc.

---

## 5. In‑app flows (routes, screens, components)

We reuse the shell + Celesnity theme already built. Rename nav; repurpose the table/drawer/store patterns.

### 5.1 Sidebar / routes (replace current nav)

| Route | Screen | Reuses |
|---|---|---|
| `/` | **Verticals overview** — 5 cards, each with factory counts by grade + ladder funnel | `stat-card`, new `vertical-card` |
| `/factories` | **Factory tracker table** — status table w/ **stage** (New→Closed Won chevrons), score, grade, next action, last‑activity alert dot; filter by vertical/grade/tier/stage; search | `lead-table` → `factory-table`, `toolbar`, `pipeline-chevrons` (stage pipeline), `stage-pill` |
| `/factories/[id]` (drawer) | **Factory detail** — attributes, AI score breakdown (radar/bars), reasoning, recommendation, **contacts tree**, activity timeline, evidence level | `lead-drawer` → `factory-drawer`, `icp-fit` → score bars |
| `/contacts` | **Contacts** — flat table + per‑factory tree view toggle | new `contact-tree`, `lead-table` |
| `/sequences` | **Per‑vertical sequence editor** — 4–5 steps, template body, AI “draft this step”, preview | new `sequence-editor` |
| `/messages` | **Outbox/drafts** — AI‑written messages, copy, mark sent | current `messages/page.tsx` pattern |
| `/alerts` | **Alerts inbox** — stale >7d, follow‑ups due, sequence steps due; mark read | new `alerts` list |
| `/analytics` | **Pipeline analytics** — **stage funnel** (New→Closed Won, per contact & factory), grade mix, per‑vertical, evidence ladder | current `analytics/page.tsx` |
| `/settings` | **Scoring/writing context** — edit `context_docs`; connections; Discord/Resend keys | current `settings/page.tsx` + context editor |

### 5.2 Store

`web/lib/leads-store.tsx` → `factories-store.tsx`: one realtime subscription each for `factories`, `contacts`, `notifications`. Same optimistic‑update + drawer‑state pattern. Contacts are grouped by `factory_id` for the tree.

### 5.3 Contacts tree

Factory node at the root; contacts branch, grouped by `role_level` (High → Mid → Expert). Primary targets (Owner/MD/COO/Ops Dir, Plant Director) highlighted with the cobalt accent. Simple CSS/SVG tree (no heavy lib); expand/collapse per factory.

---

## 6. Notifications & reminders

Two layers: **derive → surface → push**.

### 6.1 Cadence & staleness engine (server, on a schedule)

New route `POST /api/scan-alerts` (protected by `CRON_SECRET`, same guard as `keepalive`), run by **Vercel Cron** (e.g. daily 08:00). It:

1. Finds factories with `last_activity_at < now() - 7 days` → upsert `stale_factory` notification.
2. Finds contacts in an active sequence whose next step’s `day_offset` is due (based on `sequence_step` + `last_contacted`) → `sequence_step_due`.
3. Finds `next_follow_up <= today` (factory or contact) → `followup_due`.
4. De‑dupes against existing unread notifications.

### 6.2 In‑app surfacing

- Sidebar **bell with unread count**; `/alerts` inbox lists them; clicking opens the factory/contact drawer.
- On the factory table, a **red/amber dot** when `last_activity_at` > 7 days (reuse the follow‑up badge tone logic already in `lead-table`).

### 6.3 Push (email + Discord)

After creating notifications, `scan-alerts` sends any with `pushed_at IS NULL`:
- **Email** via **Resend** (already named in PDF 1 tool list) — daily digest to the founder inbox. Env: `RESEND_API_KEY`, `ALERT_EMAIL_TO`.
- **Discord** via **incoming webhook** — one message per digest. Env: `DISCORD_WEBHOOK_URL`.
- Set `pushed_at` so nothing double‑sends.

> Recommendation: start with a **once‑daily digest** (low noise), add real‑time Discord ping only for `A‑grade factory went stale` later.

---

## 7. External (out‑of‑app) flow — crawl / enrich / import

The app does **not** crawl. It **imports** from the founder’s external stack and then enriches/scores. This is the part we’ll finalise together — here’s the recommended default flow and the exact input contracts.

### 7.1 Flow

```
[Sales Nav / Apollo / Clay]  →  build target list (account, site, contact, role, geo, vertical)
        │  export CSV
        ▼
[Tracker importer  /import]  →  map columns → create factories + contacts
        │
        ▼
[AI enrich + score]  →  /api/score-factory runs on each new factory using context_docs
        │
        ▼
[Outreach]  →  AI writes the sequence  →  founder sends 1:1 (inbox) or Smartlead/Resend at scale  →  log touch
```

### 7.2 Import CSV contract (recommended — we can adjust)

One row per **contact**, with the factory columns repeated (importer groups by `factory_name` + `website`):

```
factory_name, website, country, hq_location, vertical_key, geo_tier,
frontline_workers, systems, parent_company, channel,
contact_full_name, contact_role_title, contact_role_level, contact_linkedin, contact_email, contact_phone
```

- `vertical_key` ∈ `{automotive, discrete_mfg, food_bev, textile, logistics}`.
- `systems` = pipe‑separated (`ERP|MES|paper|radio`)
- Importer is idempotent on `website` (factory) + `contact_email`/`contact_linkedin` (contact) to allow re‑imports/enrichment refreshes.

### 7.3 Scoring‑context input (what you’ll paste in `/settings`)

For best AI scoring, provide as `context_docs`:
1. **Global IDP definition** — the necessary/sufficient conditions (PDF 1 §1.2.1) verbatim.
2. **Product wedge** — the PRODUCE/MOVE capabilities (PDF 1 §3.1) so the scorer judges wedge‑fit correctly.
3. **Per‑vertical note** — the “why it fits the wedge” line + the specific operational tension for that vertical.
4. **VN reference / credibility** — the honest positioning (for the writer).
5. **Do/Don’t** — Mom Test, NDA‑first, non‑surveillance (for the writer).

> **To finalise with you:** exact CSV columns your Clay/Apollo export produces, and whether you want enrichment (missing website/size) done (a) in Clay before export, or (b) by an in‑app `/api/enrich-factory` step. Default recommendation: enrich in Clay, score in‑app.

---

## 8. Sequences — per‑vertical 4‑message set

Seed one `sequence` per vertical with steps following the plan’s cadence:

| Step | Day | Intent (PDF 1 §2.5.2 / follow‑up) |
|---|---|---|
| 1 | D1 | Specific relevance + one narrow tension + honest credibility + **non‑sales research ask** + give‑back + low‑friction next step |
| 2 | D4 | One useful observation or diagram (give‑back) |
| 3 | D9 | One question they can answer asynchronously |
| 4 | D15 | Roundtable invitation / insight brief |
| 5 | D21 | Close the loop, request the correct contact, then stop |
| (6) | D51 | Optional re‑touch (1 month after D21) |

The `/sequences` editor lets you write the template once per vertical; the AI writer personalises per contact at send time. Templates store the 6‑part structure as guidance the writer must honour.

---

## 9. Build roadmap (phased, mapped to files)

Each phase is shippable and verifiable in the preview.

**Phase A — Schema & seed** (foundation)
- `supabase/010_design_partner.sql` (tables §3), seed 5 verticals + 5 empty sequences.
- Types in `web/lib/types.ts` (Factory, Contact, Vertical, Sequence, Activity, Message, Notification).

**Phase B — Factory tracker + store** (core)
- `web/lib/factories-store.tsx` (realtime), `factory-table.tsx`, `factory-drawer.tsx`, routes `/`, `/factories`.
- Migrate Celesnity theme components as‑is.

**Phase C — AI scoring + recommendation**
- `/api/score-factory`, `/api/recommend-next`; score bars + breakdown in the drawer; `/settings` context editor + `context_docs`.

**Phase D — Contacts tree**
- `contact-tree.tsx`, `/contacts`, contact CRUD in the factory drawer, role‑level grouping + primary‑target highlight.

**Phase E — Sequences + writing assistant**
- `/sequences` editor, `/api/generate-message`, `/messages` outbox, touch logging.

**Phase F — Alerts & notifications**
- `/api/scan-alerts` + Vercel Cron, `/alerts` inbox, sidebar bell, Resend + Discord push.

**Phase G — External import + analytics**
- `/import` CSV importer, `/analytics` (ladder funnel, grade mix, per‑vertical), archive old `leads`.

---

## 10. Open decisions to finalise with you

1. **CSV columns** — exact export shape from your Clay/Apollo/Sales Nav (I’ll match the importer to it).
2. **Enrichment placement** — enrich in Clay (recommended) vs an in‑app enrich step.
3. **Notification cadence** — daily digest (recommended) vs real‑time pings; which channels first (email, Discord, both).
4. **Sending** — v1 keeps sending manual (copy from outbox → founder inbox). Do you want Smartlead/Resend automated send in v1 or later?
5. **Auth** — still single‑user? (RLS is allow‑all today.) Add before anyone else touches it.
6. **Keep or drop** the old VC/Fund data — archive vs delete.

---

*Grounded in: UK & Europe Design Partner Relationship Plan (WHO/HOW/WHAT/WHEN) and The Five‑Year Grand Strategy (Phase 0, world‑model thesis, closed‑loop, one‑graph principle).*
