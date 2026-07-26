# Minder — Phase 1 PRD: Internal Operation Platform for Design-Partner Development

> **Status:** Draft for review · **Author:** generated from a full codebase audit · **Date:** 2026-07-25
>
> **What this is.** A concrete, buildable spec for turning the current *Design-Partner Tracker* into the **Phase-1 internal operation platform** described by the founder: a three-entity relationship tracker (Network → Factory → Contact), a per-entity context/knowledge layer, an AI assistant (scoring + recommendation), and an AI-driven alert system with Discord + in-app notification.
>
> **Design principle (per the brief):** *reuse what already exists; only add what is genuinely missing.* Every feature below is annotated with **♻ Reuse** (what we keep) vs **✚ New** (what we build).

---

## 0. TL;DR — what changes

| Area | Today | Phase 1 target | Net effort |
|---|---|---|---|
| **Entities** | Vertical → Factory → Contact | **+ Network** (association / accelerator / institute) as a first-class, tracked, scored entity above Factory; Contacts can hang off a Factory **or** a Network | Schema + store + 1 page |
| **Per-entity context** | `activities` timeline + `notes` (text only) | **Notion-style context panel** per entity: AI **summary** + list of **artifacts** (uploaded files + manual text cards); scoped strictly to that entity | Storage bucket + `context_items` table + file text-extraction + drawer UI |
| **Trackers** | `/factories`, `/contacts` tables + drawer | **+ `/networks`** table + drawer; same table/drawer pattern | Reuse-heavy |
| **Whiteboard** | `factory-tree.tsx` (collapsible list) | **+ `/map` canvas** (n8n-style) Network → Factory → Contact branching tree | New canvas (React Flow) |
| **AI scoring** | Factory only (100-pt rubric) | **+ Network scoring** (new rubric); factory scoring also reads the new per-entity context; re-score on new context | Reuse route pattern + 1 new route |
| **AI recommendation** | Text next-action (hybrid deterministic + AI) | Grounded in **product context + per-entity context**; **richer output** (text + workflow diagram) | Extend existing route |
| **Alerts** | Stale > **7d**, in-app + daily Discord/email digest | Stale > **3d**, **gated to "Replied"+ stages**, **per-alert AI summary**, per-entity Discord message, in-app center stays "red" until resolved | Extend `scan-alerts` + 1 new AI route |

---

## 1. Current-state audit (what we are building on)

A precise map of the code as it stands, so the plan reuses it rather than reinventing it.

**Stack:** Next.js 16 (App Router) · React 19 · Tailwind v4 (Celesnity theme) · Supabase (Postgres + Realtime; `@supabase/storage-js` is already bundled) · OpenAI `gpt-4o-mini` via a minimal `fetch` client (`web/lib/openai.ts`). Vercel Cron drives `/api/scan-alerts` daily (01:00 UTC). **Single-user, allow-all RLS.**

### 1.1 Data model (implemented)
`verticals · sequences · sequence_steps · factories · contacts · activities · messages · context_docs · notifications · import_jobs` (+ legacy `leads`, unused). All are realtime-enabled and allow-all RLS.

Key facts that shape this PRD:
- **`contacts.factory_id` is `NOT NULL`** and `ON DELETE CASCADE` — contacts today can *only* belong to a factory.
- **`context_docs`** is a flat, **globally/vertically-scoped** text table (`scope` = `global` | a vertical key | `minder`). It has **no `factory_id`/`contact_id`** — so there is **no per-entity context** today.
- **No Supabase Storage bucket, no file/attachment table, no upload path exists anywhere.** File upload is 100% net-new.
- **Triggers** (in `010`/`011_design_partner_hardening.sql`): `set_updated_at`, `touch_contact_stage` (stage change bumps `last_activity_at`), `log_contact_stage_change` (writes a `stage_change` activity), `rollup_factory_stage` (factory stage = furthest-along contact stage unless `stage_locked`), and the `mark_message_sent()` RPC (advances cadence).
- `factories.scored_at` exists → drives the "context changed since last score → re-score" prompt in the drawer.

### 1.2 AI subsystem (implemented) — `web/lib/minder.ts` + 3 routes
The **"workflow + benchmark"** the founder refers to is already codified as authoritative constants in `minder.ts`:
- `MINDER_DESCRIPTION`, `IDP_PROFILE`, `SCORE_RUBRIC` (the 8-dimension / 100-pt benchmark), `VERTICAL_TENSIONS`, `WRITING_GUARDRAILS`, `PRODUCT_DIRECTION`.

Routes:
- **`POST /api/score-factory`** — loads the factory + its vertical's `context_docs` **+ its contacts + its `activities` (last 60)** as "accumulated field context", runs the 100-pt rubric, clamps + re-derives the grade in code, persists `score/grade/score_breakdown/ai_reasoning/ai_recommendation/blocker/scored_at`. **This is exactly the "score from workflow + my inputted context, re-score on update" loop the brief asks for — it just reads `activities` today instead of a formal context panel.**
- **`POST /api/recommend-next`** — hybrid: a **deterministic relationship-ladder move** (`lib/recommendation.ts`) is the anchor; if there is enough context, an AI layer proposes **one top-down "core problem" demo**, grounded in the `minder` product doc + the factory's `activities`. Output is **text only**.
- **`POST /api/generate-message`** — 6-part outreach writer per sequence step.

### 1.3 Alerts (implemented) — `web/app/api/scan-alerts/route.ts`
Daily cron creates in-app `notifications` for: factory stale > 7d (non-terminal), contact stale > 7d (only if `sequence_state='active'`), `followup_due`, `sequence_step_due`. De-dupes vs. unread. Pushes **one combined digest** to Discord (`DISCORD_WEBHOOK_URL`) + Resend email, then stamps `pushed_at`. In-app: `/alerts` inbox lists unread; sidebar bell shows unread count. **No AI summary; notifications only clear on manual "Done"; no stage gating beyond "not terminal".**

### 1.4 UI shell (implemented)
`app-shell.tsx` wraps `FactoriesProvider` (realtime store over `factories/contacts/activities/notifications`; `verticals` loaded once) + a global `FactoryDrawer` + `NewFactoryDrawer` + a `?factory=<id>` deep-link opener. Sidebar nav: Verticals `/` · Factories · Contacts · Import · Sequences · Messages · Analytics · Alerts · Settings. `factory-drawer.tsx` is the detail sidebar (AI assessment · Profile · Pipeline · Contacts tree · Draft · **Activity timeline** · Notes). `factory-tree.tsx` renders a collapsible **Vertical ▸ Factory ▸ Contact** list. Charts are hand-rolled CSS bars (no chart lib). **No diagram/canvas library is installed.**

### 1.5 The gap, precisely
Everything the brief calls "already have" (tracker tables, drawer, factory scoring loop, recommendation loop, Discord push, in-app alerts, a tree) **does exist**. The four things that **do not**: (1) the **Network** entity + network-attached contacts, (2) a **per-entity context/artifact store with file upload**, (3) a **canvas whiteboard**, (4) **network scoring + AI alert-summaries + 3-day/stage-gated/auto-resolving alerts**. This PRD is scoped to close exactly those four gaps.

---

## 2. Target domain model

```
Network  (association | institute | accelerator | cluster | trade body | connector)
  ├── Contact            ← people at the network you work with directly
  └── Factory  (sourced by this network; factory.network_id is optional)
        ├── Contact      ← owner / BOD / director …
        │     └── Message
        └── Activity
Vertical (5 IDP domains)  ← stays a *classification* of Factory (drives tensions + sequences), NOT a node in the tree
ContextItem (file | text card)  ← attached to ANY entity (Network | Factory | Contact); grounds that entity's AI only
Notification (stale ≥3d in Replied+ stage, follow-up due, …)  ← now carries an AI summary
```

**Decision — Network vs Vertical (recommended):** keep both, they are orthogonal.
- **Vertical** = *what industry the factory is* (automotive, food & bev…). Already used to pick scoring tensions and sequences. Unchanged.
- **Network** = *who introduced / could introduce the factory* (a referral relationship you nurture and score). New. Not every factory has a network (crawled factories have `network_id = null`), so the tree/canvas has a **"Direct / unsourced"** root bucket alongside the networks.

**Decision — polymorphic Contact (recommended):** a contact belongs to **exactly one** parent — a Factory **or** a Network — enforced by a DB `CHECK`. This satisfies "a network can also have contacts I reach out to."

---

## 3. Feature 1 — Design-partner tracker (Network / Factory / Contact)

### 3.1 Three trackers, one pattern
| Route | Entity | Reuse |
|---|---|---|
| `/factories` | Factory | ♻ exists as-is |
| `/contacts` | Contact | ♻ exists; extend to show network-attached contacts + a "Parent" column (Factory or Network) |
| `/networks` **(new)** | Network | ✚ new page, **cloned from `/factories`**: same `PageHeader` + `StatCard`s + `SearchInput` + `SelectControl` filters + `DataTable`/table + row-click → drawer |

**Network table columns:** Name · Type · Focus verticals · # Factories sourced · # Contacts · Score/Grade (`ScoreChip`) · Stage (`StagePill`) · Next action · last-activity alert dot. All components (`StatCard`, `StagePill`, `ScoreChip`, `PipelineChevrons`, `DataTable`, `SearchInput`, `SelectControl`) are **reused verbatim**.

### 3.2 The detail sidebar (drawer) — add the "inputted context" panel
**♻ Reuse** `factory-drawer.tsx` as the template. Build a `NetworkDrawer` (lighter: no sequences/messages) and a `ContactDrawer` (or keep contacts inside their parent's drawer as today). Into **all three** drawers, add — **at the bottom, exactly as the brief asks** — a new **Context** section:

```
┌─ Context (Notion-style) ─────────────────────────────┐
│  ✦ Summary                              [Regenerate]  │  ← AI-written "what we know / did so far"
│  <2–5 sentence rolling summary of this entity>        │
│                                                       │
│  ✦ Artifacts                    [+ Text]  [↑ Upload]  │
│  ▸ 📄 factory-audit.pdf        · extracted ✓  · 2d    │  ← uploaded file (any format)
│  ▸ 📝 "Call 12 Jul — line 3 bottleneck…"      · 3d    │  ← manual text card
│  ▸ 🖼 whiteboard-photo.jpg      · vision ✓     · 5d    │
└───────────────────────────────────────────────────────┘
```

- **Artifacts = uploaded files (any format) + manual text cards.** Files go to a private Supabase Storage bucket; a `context_items` row records metadata + **extracted text** (see §6). Text cards are inline-editable (title + body), like a Notion block.
- **Summary** is an AI rollup (§5.3) of all of this entity's context + activities, stored on the entity; a "Regenerate" button refreshes it; it is also what the alert system reuses (§5 / §5.3).
- **Strict scoping:** an entity's `context_items` feed **only that entity's** scoring/recommendation/summary — never the global website context. This is enforced by querying `context_items where entity_type/id = this entity` (see §5.1).

**♻ Reuse note:** the existing **Activity timeline stays** as the event log (auto `stage_change` / `email_sent` entries + quick notes). Artifacts are the *durable knowledge* layer; activities are the *event* layer. Both are fed to the AI, but the Context panel is the founder's primary "inputted context" surface.

### 3.3 The whiteboard / canvas — `/map` **(new)**
An n8n-style canvas showing the **Network → Factory → Contact** branches as a horizontal tree.

- **Roots:** each Network node (+ one "Direct / unsourced" root for `network_id = null` factories).
- **Branches:** Factory nodes under their network; Contact leaves under their factory; network-direct contacts as leaves off the network.
- **Node chrome:** name + `StagePill` + `ScoreChip` + a **red dot** when the entity has an open alert (§5). Click a node → opens the existing global drawer for that entity (reuse `openFactory` / new `openNetwork`).
- **Interactions (MVP):** pan/zoom, expand/collapse a branch, fit-to-view, filter by vertical/grade/alert. **Read-first.** Editing relationships by dragging (re-parent a factory to another network) is a **fast-follow**, not MVP.
- **Layout:** it is a strict tree, so compute node x/y from depth + sibling index (no graph-layout dependency needed).

**Tech decision:** use **React Flow (`@xyflow/react`)** — the closest thing to the n8n feel, handles pan/zoom/edges/custom nodes. It is the **one new UI dependency** this PRD introduces (the repo is deliberately dependency-light; see §7). *Alternative considered:* hand-rolled SVG (no dep, but we'd rebuild pan/zoom/edge routing). Recommendation: React Flow.

**♻ Reuse:** `factory-tree.tsx`'s grouping logic (Vertical/Factory/Contact bucketing, stale-dot, grade chips) is the data model for the canvas; the store already exposes `factories`, `contactsOf`, and (new) `networks`.

---

## 4. Feature 2 — AI assistant

The founder's mental model maps cleanly onto the existing architecture:

> **Input = "workflow + benchmark" (`minder.ts` + `context_docs`) + per-entity inputted context (`context_items` + `activities`) → Output = score / recommendation.**

That loop already exists for factories; Phase 1 (a) adds a **network** version, (b) wires the **per-entity context panel** into the existing prompts, and (c) enriches recommendation output.

### 4.1 AI scoring
**Factory scoring — `POST /api/score-factory` (♻ extend).** Today it already reads `context_docs` + contacts + `activities`. **Change:** also load this factory's `context_items` — the **extracted text of uploaded files + text cards** — and inject them as the top-weighted "FOUNDER CONTEXT / FIELD CONTEXT" block. Everything else (rubric, clamp, grade rule, `scored_at`, realtime refresh) is unchanged. The drawer's **"context changed since last score → re-score"** flag (already implemented via `scored_at`) is extended to also trigger when a `context_item` is added/updated after `scored_at`.

**Network scoring — `POST /api/score-network` (✚ new, cloned from `score-factory`).** Networks need their own benchmark because a referral body is judged differently from a factory. Proposed **100-pt network rubric** (seed as a `context_docs` row `scope='network'`, so the founder can edit it without code):

| Dimension | Pts | Question |
|---|---|---|
| Member reach & IDP fit | 25 | How many *IDP-fit* factories can this network actually put in front of us? |
| Intro willingness | 20 | Will they make warm intros, and how actively? |
| Credibility / trust transfer | 15 | Does their endorsement lower a factory's guard? |
| Vertical & geo alignment | 15 | Do their members sit in our beachhead verticals/regions? |
| Activation cost | 10 | Effort/time/quid-pro-quo to switch them on (lower = better) |
| Strategic leverage / exclusivity | 10 | Cluster/parent leverage, repeatability, competitive moat |
| Relationship quality | 5 | Follow-through, openness, reciprocity |

Output shape mirrors the factory scorer (`score_breakdown / score / grade / blocker / reasoning`), clamped + graded in code (A ≥75 no-blocker · B 60–74 · C <60). It reads the network's own `context_items` + `activities` + its sourced-factory roll-up (how many A/B/C factories it produced) as evidence.

### 4.2 AI recommendation — `POST /api/recommend-next` (♻ extend)
Keep the hybrid design (deterministic ladder anchor + AI "one core problem, top-down demo"). Two changes:
1. **Grounding:** add the entity's `context_items` extracted text to the prompt (today it only reads `activities`). The `minder` product/direction doc is already loaded — the founder edits it in Settings, and can now also **upload product files** as `context_items` on a "Product" pseudo-entity (or keep it in `context_docs`; see Open Decisions).
2. **Richer output (the brief's "output không giới hạn — text, workflow diagram"):** have the model return **both** a short prose next-step **and** a structured `workflow` (ordered steps: trigger → capture → check → escalate → approve). Render the steps natively in the drawer (no dep). Optionally emit **Mermaid** `flowchart` syntax for a visual diagram.
   - *Tech decision:* MVP renders the structured step list natively (zero dep). The Mermaid **diagram render** is an enhancement that needs the `mermaid` package — recommend adding it only if the founder wants the visual (see §7 / Open Decisions). The AI can always emit copy-pasteable Mermaid code with no dependency.

### 4.3 AI summary — `POST /api/summarize-entity` (✚ new, shared service)
A single small route: given `{entityType, entityId}`, it loads the entity + its `context_items` + `activities` + contacts and returns a **2–5 sentence "where we are / what we've done" summary**, persisted to `<entity>.context_summary` (+ `context_summary_at`). Used in **three** places: the Context panel "Summary", the alert payload (§5), and the Discord message. One prompt, three consumers — no duplication.

---

## 5. Feature 3 — AI alert system

### 5.1 Rules (the brief, made precise)
- **Trigger:** an entity (Network | Factory | Contact) whose **stage is "Replied", "Meeting Booked", or "Demo"** *(the active-conversation stages)* has had **no update for ≥ 3 days**. "No update" = `last_activity_at` (already bumped by stage changes, new activities, and — new — new context items). **Skip `New` and `Contacted`** (no reply yet) and all **terminal** stages (`Closed Won/Lost`, `Nurture`). *(Confirmed — §10.1.)*
- **In-app:** the alert shows in the notification center and **stays red until the entity is updated or its stage changes** — i.e. it **auto-resolves**, not only on manual "Done".
- **Every alert carries an AI summary** of what was done with that entity so far (§4.3) — not just "X is stale".
- **Pushed to a Discord channel** — one rich message per alerting entity, with the summary + a deep link back into the app.

### 5.2 Implementation — `web/app/api/scan-alerts/route.ts` (♻ extend)
Concrete changes to the existing daily scan:
1. `const STALE_DAYS = 3;` and an `ALERT_STAGES = new Set(["Replied","Meeting Booked","Demo"])`. Gate every stale check on `ALERT_STAGES.has(entity.stage)`.
2. Extend the scan to also query **`networks`** for the same stale/stage condition (new `stale_network` kind).
3. **Auto-resolve pass (new):** at the top of the scan, load unread notifications and, for each, mark `read_at = now()` when the underlying entity's `last_activity_at > notification.created_at` **or** its stage left `ALERT_STAGES`. This is what makes the in-app red state clear on update/status-change without a manual click. (The `/alerts` page + bell already key off `read_at`, so this "just works".)
4. **AI summary per new alert:** for each new stale alert, call `summarize-entity` and store the result in a new `notifications.summary` column (and use it in the push).
5. **Discord per-entity message (new):** replace the single combined digest with **one embed per alerting entity** to the webhook — title = entity name + stage, description = the AI summary, a field for "days since update", and a link `…/?factory=<id>` (or `?network=<id>`). Keep `pushed_at` so nothing double-sends. (Email digest can stay combined.)

**Discord "how to" (recommended, no bot needed):** create a dedicated **#minder-alerts** channel → *Channel → Integrations → Webhooks → New Webhook* → paste the URL into `DISCORD_WEBHOOK_URL`. We POST Discord **embeds** (`{embeds:[{title, description, fields, url, color}]}`) — red for A-grade-gone-stale, amber otherwise. This is the lightest reliable option; a full Discord **bot** is only warranted later if you want two-way commands (e.g. `/snooze`).

### 5.3 In-app notification center (♻ extend `/alerts`)
Reuse the page. Additions: entity-type icon (network/factory/contact), the **AI summary** inline (expand/collapse), a red left-border while unresolved, and an "Open" button that routes to the right drawer. The sidebar bell count already reflects `!read_at`.

### 5.4 Scheduling note
Vercel Cron already runs `scan-alerts` daily — a 3-day staleness window is satisfied by a daily run. If you want same-day nudges, bump the cron to twice daily; no code change beyond `vercel.json`.

---

## 6. Data model & migrations (net-new)

One new migration, `supabase/013_networks_and_context.sql`, additive and idempotent (matches the repo's migration style). Sketch (not final DDL):

```sql
-- 6.1 Networks — parallels factories (identity + scoring + pipeline + context summary)
create table public.networks (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text check (type in ('association','institute','accelerator','cluster','trade_body','connector','other')),
  website_url text, country text, hq_location text,
  focus_verticals text[],                    -- vertical keys this network serves
  reach_note text,
  score numeric(5,2), grade text check (grade in ('A','B','C')),
  score_breakdown jsonb, ai_reasoning text, ai_recommendation text, blocker text, scored_at timestamptz,
  stage text not null default 'New'
    check (stage in ('New','Contacted','Replied','Meeting Booked','Demo','Closed Won','Closed Lost','Nurture')),
  next_action text, next_action_due date,
  last_activity_at timestamptz default now(),
  priority int check (priority between 1 and 5),
  notes text, source text default 'manual',
  context_summary text, context_summary_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

-- 6.2 Factory ← optional network source; + context summary fields
alter table public.factories add column if not exists network_id uuid references public.networks(id) on delete set null;
alter table public.factories add column if not exists context_summary text;
alter table public.factories add column if not exists context_summary_at timestamptz;

-- 6.3 Contacts become polymorphic (Factory XOR Network); + context summary
alter table public.contacts alter column factory_id drop not null;
alter table public.contacts add column if not exists network_id uuid references public.networks(id) on delete cascade;
alter table public.contacts add column if not exists context_summary text;
alter table public.contacts add column if not exists context_summary_at timestamptz;
alter table public.contacts add constraint contacts_one_parent check (
  (factory_id is not null and network_id is null) or
  (factory_id is null and network_id is not null)
);

-- 6.4 Per-entity context/artifacts (files + text cards) — the "inputted context" store
create table public.context_items (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('factory','network','contact')),
  entity_id uuid not null,
  kind text not null check (kind in ('file','text')),
  title text,
  body text,                          -- text-card content OR extracted text of a file
  storage_path text,                  -- Supabase Storage object key (kind='file')
  file_name text, mime_type text, byte_size int,
  extraction_status text default 'none'
    check (extraction_status in ('none','pending','done','failed','unsupported')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index on public.context_items (entity_type, entity_id, created_at desc);

-- 6.5 Alerts carry an AI summary + support networks
alter table public.notifications add column if not exists network_id uuid references public.networks(id) on delete cascade;
alter table public.notifications add column if not exists summary text;
```

Plus: allow-all RLS + realtime publication for `networks` and `context_items` (same loop pattern as `010`), a `set_updated_at` trigger on both, and a **Supabase Storage bucket `context-files`** (private) with an allow-all policy for now (single-user; tighten with auth before teammates — same caveat as the rest of the app). Optionally a `networks`-aware roll-up is **not** added: a network keeps its **own manual stage** (it is a relationship you manage directly, not a roll-up of factories).

**Referential integrity note:** `context_items` uses a polymorphic (`entity_type`,`entity_id`) pair, so there is no FK cascade. Add a cleanup path (a delete trigger, or delete-in-app when an entity is removed) so orphan context + storage objects don't linger.

---

## 7. New dependencies & technical decisions

The repo intentionally ships with **zero UI/AI dependencies beyond Next/React/Tailwind/Supabase**. This PRD requires deciding on a small, explicit set:

| Need | Recommended | Why / alternative |
|---|---|---|
| **Canvas whiteboard** | `@xyflow/react` (React Flow) | Purpose-built pan/zoom/edges/custom-nodes; n8n-like. *Alt:* hand-rolled SVG (no dep, more work). |
| **PDF → text** (artifacts) | `unpdf` or `pdf-parse` (server) | Needed so uploaded PDFs feed the scorer. Runs in the `nodejs` route runtime already used. |
| **DOCX → text** | `mammoth` (server) | Common research/report format. |
| **Images → text** | **`gpt-4o` vision**, not a local OCR lib | `openai.ts` is text-only + `gpt-4o-mini`; add an image branch that calls `gpt-4o` with the image. *Alt:* store image + require a manual text card (zero dep). |
| **Workflow diagram render** | `mermaid` **(optional)** | Only if you want the visual in-app. MVP renders structured steps natively + emits copyable Mermaid code (no dep). |

**Extraction pipeline:** on file upload → client uploads to `context-files` bucket → `POST /api/context/extract {itemId}` reads the object, extracts text by MIME type, writes `body` + `extraction_status`. `txt/md/csv` = trivial; `pdf/docx` = library; images = vision; unsupported = stored as attachment with `extraction_status='unsupported'` (founder adds a text card describing it). Extracted `body` is what the AI reads — **files never bypass text**, which keeps the existing text-only prompt architecture intact.

---

## 8. API surface

| Route | Status | Purpose |
|---|---|---|
| `POST /api/score-factory` | ♻ extend | also read `context_items` extracted text |
| `POST /api/score-network` | ✚ new | network 100-pt rubric (clone of score-factory) |
| `POST /api/recommend-next` | ♻ extend | read `context_items`; return prose **+ structured workflow (+ optional Mermaid)** |
| `POST /api/summarize-entity` | ✚ new | AI "where we are" summary → `context_summary`; shared by panel + alerts |
| `POST /api/context/extract` | ✚ new | server-side file → text extraction |
| `POST /api/scan-alerts` | ♻ extend | 3-day, stage-gated, networks, auto-resolve, per-alert summary + Discord embeds |
| `POST /api/generate-message` | ♻ unchanged | outreach writer |
| Storage upload | ✚ new | client → `context-files` bucket via `supabase.storage` (already bundled) |

Store (`factories-store.tsx`) gains: a `networks` slice + realtime subscription; a `context_items` slice (or lazy per-drawer fetch); `openNetwork(id)`; `addContextItem`/`updateContextItem`/`deleteContextItem`; polymorphic `contactsOf({factoryId?|networkId?})`.

---

## 9. Build roadmap (phased, each shippable)

**Phase 1 — Networks entity (foundation).** Migration §6.1–6.3 (+ store slice, realtime, RLS). `/networks` page (clone `/factories`). `NetworkDrawer`. Polymorphic contacts in `/contacts`. Sidebar: add **Networks**. → *Verifiable: create a network, source a factory to it, add a network contact.*

**Phase 2 — Per-entity context panel.** Migration §6.4 + `context-files` bucket. Context section in all drawers (summary + artifacts: upload + text cards). `POST /api/context/extract` + extractors. → *Verifiable: upload a PDF to a factory, see extracted text; add a text card.*

**Phase 3 — AI, context-grounded.** Wire `context_items` into `score-factory` + `recommend-next`. `POST /api/summarize-entity` + the panel "Summary" + "Regenerate". `POST /api/score-network` + the network rubric `context_doc`. Recommendation structured-workflow output. → *Verifiable: add context → re-score changes; network gets a grade; recommendation shows a demo workflow.*

**Phase 4 — Alerts v2.** Extend `scan-alerts` (3-day, stage gate, networks, auto-resolve, summary). Discord embeds. `/alerts` shows summaries + entity type. → *Verifiable: a Replied factory idle 3d raises a red alert with a summary in-app + Discord; updating it clears the red.*

**Phase 5 — Whiteboard.** Add React Flow. `/map` canvas: Network → Factory → Contact tree, alert dots, click-to-drawer, filters. Sidebar: add **Map**. → *Verifiable: the graph renders and navigates.*

**Phase 6 (fast-follow) — polish.** Mermaid diagram render; drag-to-reparent on the canvas; per-alert Discord color rules; product-context file uploads.

---

## 10. Decisions

### 10.1 Confirmed (locked 2026-07-25)
1. ✅ **Alert stage gate = `Replied` / `Meeting Booked` / `Demo` only.** Skip `New` **and** `Contacted` (no reply yet) and all terminal stages. → §5.1, §5.2 are authoritative.
2. ✅ **Keep both Network and Vertical.** Vertical = industry classification on a factory (drives scoring tensions + sequences). Network = referral-source relationship entity (tracked, scored, has contacts + context). The tree/canvas roots on Networks + a "Direct / unsourced" bucket. → §2.
3. ✅ **File extraction (MVP) = PDF + DOCX + TXT/MD/CSV natively + images via `gpt-4o` vision.** Adds `unpdf`/`pdf-parse` + `mammoth`, and an image branch that calls `gpt-4o` (text stays `gpt-4o-mini`). → §7.
4. ✅ **Whiteboard = React Flow (`@xyflow/react`).** The one new UI dependency. → §3.3, §7.

### 10.2 Still open (lower-stakes, can decide during build)
5. **Workflow diagram render** — add `mermaid` for an in-app visual, or ship the native structured-step list + copyable Mermaid code (no dep) first? Recommendation: native steps in MVP, `mermaid` as a Phase-6 enhancement.
6. **Product context input** — keep the founder's Minder/Celesnity product context in the existing `context_docs` (`scope='minder'`, editable in Settings, now also file-uploadable), or model a dedicated "Product" entity with its own Context panel? Recommendation: keep `context_docs` + allow file uploads to it.
7. **Auth** — still single-user / allow-all RLS? Files + partner data raise the stakes; recommend adding Supabase Auth before any teammate access (consistent with the README warning).

---

*Grounded in a full read of `web/` (store, drawers, tree, pages, AI routes) and `supabase/` (all migrations), reusing the existing tracker/drawer/scoring/recommendation/alert machinery and adding only the Network entity, the per-entity context/artifact layer, the canvas, and the AI-summary/3-day/stage-gated alert upgrades.*
