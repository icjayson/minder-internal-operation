# Design System Adoption — Implementation Plan (Minder Ops Platform)

> Applies `web/design-system/` (the vendored shadcn `new-york-v4` snapshot, re-tokenised
> to the Minder brand) to the ops platform in `web/app/(app)/` + `web/app/components/`.
>
> **Status — branch `feat/design-system-adoption`. All phases done.** Build, typecheck,
> 55 tests and the retired-token guard pass; every route renders at unchanged geometry
> in both skies. See "Progress" at the bottom for what each commit covers and where the
> work departed from this plan.

## Goal

The ops platform should look and be built like `/design-system/general`: one token layer,
one component library, one type scale. Concretely:

1. **Visual target — full Minder brand.** Warm-paper canvas `#F6F5F4`, brand blue `#0075DE`,
   Roboto, the 4/6/8/12/16/full radius scale. The Celesnity "Cosmos / Daybreak" palette is
   retired, not kept alongside.
2. **Component target.** Bespoke UI (hand-rolled drawers, tables, inputs, sidebar) is replaced
   by `@/design-system/components/*`. Genuinely app-specific patterns (PageHeader,
   PipelineChevrons, PriorityStars, JourneyStepper) stay bespoke but sit on the new tokens.
3. **Rollout.** Token foundation first, then the shared shell, then one route at a time —
   the app builds and renders at every step.

---

## Key facts (current state)

**The design system**

- `web/design-system/` is a frozen snapshot: 61 components + 68 chart blocks, byte-identical
  to `shadcn add`. Imports are `@/design-system/components/<name>` and
  `@/design-system/lib/utils`. Every runtime dep is already in `web/package.json`.
- `recharts` is **pinned to `3.8.0`**. Six chart blocks stop type-checking on 3.10 — do not bump.
- The Minder brand layer is `.shadcn-scope.minder-brand` in
  [globals.css:360](web/app/globals.css#L360) onward. It only re-tokenises `--primary`,
  `--ring`, `--sidebar-primary`, the semantic ramp, the primary/secondary button hover skin,
  and the Sonner colours.

**The ops platform**

- **Zero** files outside `app/design-system/` import from `@/design-system`. The 57 files in
  `app/(app)/` + `app/components/` are bespoke Tailwind on the Celesnity palette.
- Rough usage of the Celesnity utility names across those 57 files:

  | class | uses | | class | uses |
  |---|---|---|---|---|
  | `text-ink` | 328 | | `bg-accent` | 96 |
  | `border-line` | 311 | | `bg-surface-2` | 76 |
  | `bg-surface` | 236 | | `bg-canvas` | 76 |
  | `text-muted` | 226 | | `text-accent` | 73 |
  | `mono` | 201 | | `bg-surface-3` | 65 |
  | `text-ink-soft` | 154 | | `tint-*` | 32 |

  ~1,900 utility usages. Rewriting them by hand is the thing this plan is designed to avoid.
- Six drawers hand-roll `fixed right-0 top-0 bottom-0 … + fixed inset-0 backdrop`
  ([factory-drawer.tsx:283](web/app/components/factory-drawer.tsx#L283)) — no focus trap, no
  scroll lock, no Esc, no aria.
- [sidebar.tsx](web/app/components/sidebar.tsx) is 450 lines of hand-rolled nav.
- [data-table.tsx](web/app/components/data-table.tsx) carries real logic worth keeping
  (tri-state sort, drag-to-resize columns persisted per `storageKey`) wrapped in bespoke markup.
- `npm test` covers `lib/` logic only — **there are no UI tests**. Verification is visual.

**The four token systems that currently coexist**

| # | Where | Owns |
|---|---|---|
| 1 | `@theme` + `[data-theme="light"]` on `:root` | Celesnity Cosmos/Daybreak — `--color-accent`, `--color-muted`, `--color-ink`, `--color-surface`, … |
| 2 | `.shadcn-scope` (+ `.dark`) | shadcn `neutral` base, verbatim |
| 3 | `.shadcn-scope.minder-brand` | a thin patch: primary, ring, semantic ramp, button hover |
| 4 | `general.module.css` `--g-*` and `tokens.ts` | **the actual Minder identity** — warm paper `#F6F5F4`, warm neutrals, Roboto, the type/radius/shadow scales |

System 4 is the problem. `tokens.ts` `buildTokenCss()` emits a stylesheet that is only ever
*displayed and downloaded* — nothing consumes it at runtime. The warm-paper look lives in a
CSS module scoped to the docs page chrome. So `.minder-brand` today still renders on
`--background: oklch(1 0 0)` (pure white) with grey-neutral borders, not the documented
`#F6F5F4` / `#E6E6E6`.

**The two blockers, stated in the source itself**

1. **Name collision.** [globals.css:218](web/app/globals.css#L218) — `--color-accent` and
   `--color-muted` are deliberately absent from the global shadcn `@theme` because the
   Celesnity palette already owns those two names. This is the whole reason the design system
   is scoped instead of global.
2. **Two dark mechanisms.** The app uses `<html data-theme="light|dark">` (pre-paint script,
   `localStorage['minder-theme']`); the design system uses `@custom-variant dark (&:where(.dark, .dark *))`
   toggled on `<body>` by [use-shadcn-scope.ts](web/app/design-system/use-shadcn-scope.ts).

---

## Work items

### Phase 0 — Baseline

Cheap, and the only safety net there is.

1. Branch `feat/design-system-adoption`.
2. `npm run build && npm run typecheck && npm test` — record green.
3. Screenshot all 22 routes at desktop + mobile, both skies, into `web/scripts/baseline/`.
   Use the in-app browser against `next dev`; these are the before-shots every later phase
   is diffed against.

---

### Phase 1 — Token foundation

**This is the highest-leverage phase.** Done right, every one of the ~1,900 utility usages
re-skins to Minder with *zero JSX edits*, and the rest of the plan becomes optional polish
rather than a prerequisite.

#### 1.1 Make `tokens.ts` a real runtime source

`app/design-system/general/tokens.ts` already holds the primary/neutral/semantic ramps, the
type scale, spacing, radii, shadows, and breakpoints. Add
`web/scripts/generate-tokens-css.mjs` (same pattern as the existing
`vendor-shadcn-reference.mjs` / `generate-chart-registry.mjs`) writing
`web/app/tokens.generated.css`, imported at the top of `globals.css`.

Result: a value can no longer be documented as one thing and shipped as another — which is
exactly what happens today.

#### 1.2 Promote the Minder tokens to `:root`

Fill shadcn's contract names with Minder values, globally rather than under `.shadcn-scope`:

```css
:root {
  --background: #F6F5F4;   /* bg-base — the page itself */
  --card: #FFFFFF;
  --popover: #FFFFFF;
  --foreground: #000000;   /* text-primary */
  --muted: #EDEDEC;        /* neutral-100 surface */
  --muted-foreground: #615D59;  /* text-secondary */
  --border: #E6E6E6;
  --input: #E6E6E6;
  --primary: #0075DE;
  --primary-foreground: #FFFFFF;
  --ring: #0075DE;
  --destructive: #D6455F;
  --radius: 12px;          /* cards; sm/md/lg derive to 4/6/8 */
  /* --sidebar-* filled from the same ramp — the DS Sidebar needs them */
}
```

Keep `.shadcn-scope` as a no-op alias so `/design-system` keeps working unchanged.

> **Watch:** `useShadcnScope` removes `shadcn-scope` from `<body>` on unmount. Once tokens
> live on `:root` that cleanup is harmless; if they stayed on the class, navigating out of
> `/design-system` would strip the app's own skin until a reload.

#### 1.3 The compatibility shim — the move that makes this cheap

Rather than rewriting 1,900 class names, redefine the Celesnity `@theme` names to *point at*
Minder tokens. One commit, no JSX churn, every route re-skins at once:

```css
@theme {
  --color-canvas:      var(--background);
  --color-surface:     var(--card);
  --color-surface-2:   #F6F5F4;
  --color-surface-3:   #EDEDEC;
  --color-ink:         var(--foreground);
  --color-ink-soft:    #31302E;   /* neutral-800 */
  --color-muted:       var(--muted-foreground);
  --color-line:        var(--border);
  --color-line-soft:   #EDEDEC;
  --color-line-strong: #C8C6C3;
  --color-accent:      var(--primary);
  --color-accent-dim:  #F0F7FD;   /* primary-50 */
  --color-danger:      var(--color-error);
  --color-warn:        var(--color-warning);
}
```

The shim is **temporary scaffolding**, deleted in Phase 4. It exists so Phases 2–3 can move
component by component instead of all at once.

Known fixups this creates (small, enumerable):

- `bg-muted` — 4 uses. Celesnity `muted` is a *text* colour used as a dot/rail fill; under the
  shim it becomes `#615D59`. Review those 4 sites by hand.
- `.tone` pills (`data-tone="cobalt|violet|magenta|…"`, 10 hues) — rebase the `--h` values on
  the Minder primary ramp + semantic ramp. `magenta` and `cobalt` have no Minder equivalent
  and need a call: map both onto the primary ramp.
- `.tint-warn` / `.tint-danger` → `--color-warning-light` / `--color-error-light`.

#### 1.4 Unify the dark mechanism

Make one variant answer to both, so neither side changes:

```css
@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *, .dark, .dark *));
```

The app keeps `data-theme` + its pre-paint script; `/design-system` keeps its `.dark` body toggle.

#### 1.5 Author the Minder dark ramp — **the one place we design rather than apply**

`tokens.ts` documents a light system only. `.shadcn-scope.minder-brand.dark` covers `--primary`,
`--primary-foreground`, `--ring`, and the two hover skins — nothing else. A full dark ramp
(background, card, border, muted, the semantic pairs) does not exist and has to be authored.

Options, cheapest first:

- **(a)** Ship light-only for now: force `data-theme="light"`, hide the toggle, defer the ramp.
- **(b)** Derive a ramp mechanically from the neutral scale (invert 0↔1000, 50↔900, …) and
  accept it as provisional.
- **(c)** Design it properly as its own piece of work.

Recommend **(b)** — the toggle already exists and users have it; a provisional ramp beats
removing a feature. Flag it in the DS docs as provisional.

#### 1.6 Type and chrome

- Point `--font-sans` at Roboto (`--font-roboto` is already loaded in
  [layout.tsx:14](web/app/layout.tsx#L14)). Inter stays only if something still needs it.
- Emit the 11 type tokens (`display-1` … `eyebrow`) as utilities; retire the global
  `h1,h2,h3,h4 { letter-spacing: -0.02em }` rule, which fights the scale's per-token tracking.
- Retire `.mono` (40 files). It aliases to Inter anyway — it is really "tabular-nums +
  uppercase + tracking". Replace with `tabular-nums` at the numeric sites during Phase 3.
- Drop the app-wide `*:focus-visible { outline: 2px solid }` in favour of the components' own
  rings; move `.shadcn-scope [data-slot]` base rules to global.
- Remove the cosmos gradient wash on `<body>` and retune the scrollbar to warm neutrals.

**Exit criteria:** build green; every route renders in Minder colours and type; the visual
diff against the Phase 0 baseline is a re-skin only — no layout breakage.

---

### Phase 2 — Shared shell and primitives

Eight components; every route inherits the change. Highest visible return per file touched.

| Current | Becomes | Notes |
|---|---|---|
| `data-table.tsx` (192) | `components/table` | **Keep the sort + resize logic** — the DS has no equivalent. Reskin the markup only. All 4 tables inherit. |
| `controls.tsx` (78) | `input` + `input-group`, `native-select` | `input-group` has the leading-icon slot the search box hand-rolls. |
| `stat-card.tsx` (54) | `card` (+ `badge`) | Keep the 2px tone rail — it is an app signature. |
| `stage-pill.tsx`, `fund-stage-pill.tsx` | `badge` | Variants driven by the rebased `.tone` palette. |
| `theme-toggle.tsx` (67) | `button variant=ghost` + `tooltip` | Keep the `data-theme` logic verbatim. |
| `factory-notification-modal.tsx` (143) | `dialog` | |
| ad-hoc toast, [factory-drawer.tsx:422](web/app/components/factory-drawer.tsx#L422) | `sonner` | Already wired to the Minder semantic ramp. |
| `page-header.tsx` (42) | *stays bespoke* | App pattern, not a DS one. Retype on `heading-2` / `eyebrow`. |

**The two large jobs in this phase:**

- **Sidebar** (450 lines → `components/sidebar`). Buys collapse, the mobile sheet, and the
  keyboard shortcut for free. Needs the `--sidebar-*` tokens from Phase 1.2. The nav data
  (three groups: main / partner / fundraising) ports as-is into `SidebarMenu`.
- **Six drawers → `components/sheet`** (Radix Dialog: focus trap, scroll lock, Esc, aria).
  Order: `new-network-drawer` (125) → `new-fundraising-drawer` (122) →
  `new-factory-drawer` (147) → `new-contact-drawer` (186) → `fundraising-drawer` (302) →
  `network-drawer` (466) → `factory-drawer` (976, last). The first one establishes the pattern;
  the rest are mechanical.

---

### Phase 3 — Route by route

22 routes, ordered by ratio of value to risk. Each is its own commit.

**Group A — cheap, high traffic (do first).**
`/` (140), `/analytics` (142), `/messages` (116), `/networks` (114), `/alerts` (114),
`/map` (91), `/settings` (84), and the four detail routes (43–45 each).

`/analytics` also picks up the chart layer: `components/chart` + the vendored blocks, and
`score-bars.tsx` → `progress`. `priority-stars` and `pipeline-chevrons` stay bespoke.

**Group B — table-heavy; most of the work already landed in Phase 2.**
`/factories` (244), `/customers` (229), `/contacts` (207), `/sequences` (157).

**Group C — bespoke, most work (do last).**
`/import` (574 — upload flow → `field` + `progress` + `empty`), `/ai-context` (388),
`/alert-log` (316), and the fundraising cluster
(`fundraising-view`, `-journey`, `-table`, `-work-inventory`, `work-inventory` 507).

---

### Phase 4 — Cleanup and guardrails

1. Delete the Phase 1.3 shim. Grep must return zero for
   `bg-surface|text-ink|border-line|bg-canvas|text-ink-soft|\bmono\b|data-tone`.
2. Delete the remaining Celesnity CSS: cosmos gradient, `.tint-*`, the stage-fill tokens,
   the `[data-theme="light"]` overrides that the Minder ramp replaced.
3. Drop Inter from [layout.tsx](web/app/layout.tsx) if nothing uses it.
4. Add a grep check in CI banning the retired class names, so they cannot creep back.
5. Note in `web/design-system/README.md` that the app now consumes the system directly —
   the README currently describes it as reference-only.

---

## Risks

- **No UI test coverage.** `tests/` is pure `lib/` logic. The Phase 0 screenshot baseline is
  the only regression signal — do not skip it.
- **Minder has no dark system.** Phase 1.5 is design work, not adoption work. It is the single
  place this plan cannot just apply what already exists.
- **`recharts` is pinned at 3.8.0.** Six chart blocks break on 3.10.
- **`factory-drawer.tsx` (976 lines)** is the riskiest single file. It is deliberately last in
  Phase 2 so the Sheet pattern is proven on five smaller drawers first.
- **`.tone` / `mono` are app idioms with no DS equivalent.** Retiring them is a design decision
  (dense monospace-uppercase meta vs. the Minder type scale), not a mechanical swap. Decide the
  replacement once, in Phase 1.6, and apply it consistently in Phase 3.

## Sequencing summary

```
Phase 0  baseline          — small
Phase 1  tokens            — the crux; unblocks everything, re-skins all 22 routes
Phase 2  shell + primitives — 8 components, biggest visible win
Phase 3  22 routes          — A → B → C, one commit each
Phase 4  cleanup            — delete the shim, add the guardrail
```

Phase 1 alone already delivers a Minder-branded ops platform. Phases 2–4 are what make it a
*system* rather than a re-paint.


---

## Progress

### Done

| Commit | Covers |
|---|---|
| `ca6690c` | **Phase 1** — token foundation |
| `8502f9f` | **Phase 2a** — shared primitives |
| `2aeb152` | **Phase 2b** — the four "add a …" panels |
| `d5aba0f` | **Phase 2c** — detail panels, modal, toasts |
| `3a3d245` | **Phase 2d** — sidebar |
| `632e58d` | **Phase 3 + 4** — shim retired, radius on the component set's scale, CI guard |
| `a8c1f55` | **Element audit** — buttons, controls, date picker, cards, empties |
| `252bb6c` | **Element audit** — toggles, chips, the remaining buttons |
| `758759a` | **Element audit** — the last hand-picked colours onto the ramps |
| `4987196` | **/analytics** — onto the vendored chart blocks |
| `4d9591c` | **Type scale** — headings onto `text-heading-2` and friends |

What landed, against what the plan assumed:

- `scripts/generate-tokens-css.mjs` → `app/tokens.generated.css`. Ramps are `--mo-*`
  custom properties rather than Tailwind theme colours, to avoid colliding with
  Tailwind's own `neutral` scale and shadcn's `--color-primary`. Role assignment stays
  hand-written in `globals.css`, since which step is a border is a judgement, not data.
- The `accent` / `muted` collision was resolved by **renaming the 399 call sites** to
  `primary` and `muted-foreground`, not by shimming — shadcn needs those two names for
  its own hover surfaces. The other ~1,500 Celesnity utilities are aliased and re-skin
  without JSX changes, as planned.
- `useShadcnScope` pins `<html>` to `data-theme="light"` while `/design-system` is
  mounted. CSS cannot express "nearest ancestor wins", so without this an app left in
  dark bleeds into a docs page set to light. This was not in the plan.
- Every hand-rolled overlay is gone: no `fixed inset-0` backdrop, no
  `fixed right-0 top-0 bottom-0` panel, no keydown Escape listener anywhere.
- The sidebar's open state moved from `localStorage` to Sidebar's own cookie, read
  server-side in `app/(app)/layout.tsx` so a collapsed sidebar does not flash open.
- `SidebarInset` carries a mobile-only trigger bar: below 768px the sidebar becomes an
  off-canvas sheet and takes its own trigger with it.

### Deviations worth knowing

- **The global `h1–h4` tracking rule stayed.** The plan said retire it; retiring it
  without the per-token utilities in place would have left every heading looser than
  designed. The type scale is emitted as real `text-heading-2`-style utilities, so
  routes can move onto it in Phase 3 and the global rule can go with the shim.
- **`--font-mono` points at Roboto, not a monospace.** The Celesnity palette already
  aliased it to its body font, so the 200-odd `.mono` sites are uppercase tabular meta
  rather than code. Switching them to a real monospace would be a visual change nobody
  asked for; they are retired to `tabular-nums` route by route instead.
- **The Minder dark ramp is provisional**, derived by reading the neutral ramp from the
  other end. It is marked as such in `globals.css`. This is the one place the work
  designs rather than adopts.

### Phases 3 and 4, as built

Scoped to "keep the current layout" on request, so every mapping is value-for-value
and the pass is a rename rather than a restyle. Two plan items were dropped for that
reason and remain open if wanted:

- **Headings onto the type scale.** `text-heading-2` and friends exist, but adopting
  them changes type sizes and therefore layout. The routes keep their explicit sizes.
- **`/analytics` onto the vendored chart blocks.** Recharts would re-lay-out the
  charts. The hand-drawn bars stay.

What did land:

- The shim is gone; call sites use the system's names. `--muted` is retuned to
  neutral-50 so `bg-surface-2 → bg-muted` keeps its colour, which leaves two quiet
  surfaces — `muted` passive, `accent` interactive — a distinction the platform
  already drew.
- `border-strong` and `primary-tint` survive as **genuine extensions**, not shim: the
  documented system has one border weight and the platform has always needed two.
- `.mono` retired to `tabular-nums` at all 201 sites — that is what the class did,
  since it never named a monospace. `--font-mono` therefore goes back to a real
  monospace, which is what the chart tooltips using `font-mono` wanted.
- **Radius now derives the way the component set derives it** (one `--radius` at
  0.625rem, sm/md/lg/xl off it) rather than the second scale this branch had been
  overriding it with. `tokens.ts` is updated to document what ships. This changes
  `rounded-lg` 12→10px and `rounded-xl` 16→14px; it is the one deliberate geometry
  change, made on request so a hand-authored panel and the Card beside it agree.
- `scripts/check-retired-tokens.mjs`, wired into `npm test`, fails on a retired name.
  It has to exist because retired names no longer resolve — a stray `bg-surface`
  renders unstyled rather than erroring, which no build would catch.

Inter stays in the root layout: `/design-system`'s own CSS modules still use it.

### Known, and not ours

`/customers` and a few other routes log two `400`s from Supabase REST. They are
data-layer — `/alert-log` names the missing migrations in its own banner — and predate
this work, which touched no data code.


---

## Element audit

Prompted by a real bug: the platform's buttons carried the design system's
*colour* but none of its *behaviour*. `/factories` had 392 buttons and not one
was the system's `Button`, so the Minder hover skin — keyed off
`[data-slot="button"]` — reached nothing, and the buttons still carried
`hover:bg-[#3a51ff]`, the Celesnity cobalt. On that page it is now 364 of the
system's and 6 raw.

**Converted:** 75 buttons (primary, icon, outline, link, destructive), the
saved-view chips and view switches (→ `Toggle`), 47 inputs / selects /
textareas, 8 date fields (→ Popover + Calendar, the way the general page
composes it), 9 card containers and 2 local `Card` helpers, 10 empty states
(→ `Empty`), and 20 hex literals onto the ramps.

**Deliberately still raw** — these are hit areas, not controls the system has a
variant for. Giving them one would draw a border and a hover fill around
something meant to read as the row it sits in:

| Element | Why |
|---|---|
| Modal backdrop | A full-bleed dismiss target |
| Clickable table / tree row | The row *is* the control |
| Tree twisty, pipeline chevron, stepper node | Custom geometry with no variant |
| Star rating | A rating widget, not a button |
| Stage-pill overlay `<select>` | Transparent, over a pill — a wrapper would draw a border and chevron underneath |
| Hidden file inputs | Never rendered |
| Inline-editable panel titles | Headings that happen to be editable, not fields |

### Two mistakes worth recording

- **The `w-full` fix on `NativeSelect`.** Its wrapper is `w-fit`, so a select
  told to fill its column stops short of the input beside it. The first fix was
  a global `:has(> [data-slot="native-select"].w-full)` rule — wrong, because
  the component's own base classes *always* contain `w-full`, so every select
  went full width and the page toolbars wrapped onto three rows. The fix is a
  Tailwind variant on the wrapping label: the wrapper is the select's parent and
  cannot be reached from the select.

- **Phase 2b's commit message overclaimed.** It said the `bg-[#3a51ff]` hover
  was gone; it was gone from the four drawers only, and 28 more call sites kept
  it for several more commits.

### The guard

`scripts/check-retired-tokens.mjs` now also fails on any `[#rrggbb]` in a class
string and on `#3a51ff` specifically. A hex literal bypasses the token layer
completely — it will not follow a brand change and will not flip with the sky.

### /analytics

Done in `4987196`. The six distributions were hand-drawn divs — a background
track with a percentage-width fill — with no tooltip, no axis and no keyboard
access. They are Recharts bar charts now, composed the way `chart-bar-default`
and `chart-bar-label` compose them, upright rather than horizontal because long
vertical names collide in a category gutter at any width. The drill-down table
moved onto `Table` at the same time.

Colour follows meaning rather than variety: the two funnels take two steps of
one hue (same measure, different entity), grade mix is per-bar semantic (A/B/C
already mean good / needs attention / poor), and verticals use the categorical
ramp.

> **Recharts bars need `isAnimationActive={false}` here.** They computed correct
> geometry but rendered no `<path>`: Recharts grows a bar from zero on mount and
> only paints after the first animation frame lands. Worth knowing before adding
> any more chart blocks.

### The type scale

Done in `4d9591c`. Page titles are `text-heading-2`, panel and drawer titles
`text-heading-3`, the 20px headings `text-title` — each an exact size match to
what it replaced, so the sizes land on the scale without the pages moving.

> **The `h1–h4` element defaults had to move into `@layer base` first.** As
> unlayered CSS they beat every Tailwind utility, so a heading given
> `text-heading-2` still took the blanket `-0.02em` tracking and 700 weight
> instead of the token's. Anything else added to `globals.css` outside a layer
> will do the same thing to the utility that is meant to override it.

Left alone on purpose: the sidebar brand (a 13px wordmark, not a heading), the
10px uppercase card eyebrows (`eyebrow` is 12px at +0.125px tracking — moving
them would grow every card label and tighten it), and the 12.5–15px semibold
section headings (the scale has no 15px-semibold step, and `body-sm` at 400 or
`label` at 500 would change weight to fit a token rather than meaning).

### Still open

Nothing. Every phase and both deferred items are done.
