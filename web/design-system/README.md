# Minder Ops Design System Reference

This directory is a frozen, local reference copy of the shadcn/ui **new-york-v4** component source. It is intentionally independent from the shadcn CLI: after this snapshot is generated, application code imports from `@/design-system/components/*` and never needs to run `shadcn add` again.

## Refreshing the snapshot

From `web/`, run:

```bash
node scripts/vendor-shadcn-reference.mjs
```

The script downloads the official registry source for the 61 base components and the 68 chart blocks, rewrites internal imports to this library, and records the source URL, component list, and runtime dependencies in `design-system/manifest.json`. It also writes `design-system/sources.json`, a flat path → contents map the design-system page serves as "view source" without touching the filesystem at runtime.

After re-vendoring, regenerate the gallery's typed index:

```bash
node scripts/generate-chart-registry.mjs
```

## Using it as our own system

```tsx
import { Button } from "@/design-system/components/button"
import { Card, CardContent } from "@/design-system/components/card"

export function Example() {
  return <Card><CardContent><Button>Save changes</Button></CardContent></Card>
}
```

The source is ours to version and customize. Change tokens, variants, accessibility defaults, and visual details directly in `design-system/components`; do not edit `node_modules` and do not depend on a future shadcn install. The snapshot is a starting point, not a runtime package: only install the peer dependencies listed in `manifest.json` once if a component is actually used.

## Browsing it

`/design-system` → **Local component library** is a docs browser for this snapshot, modelled on `ui.shadcn.com/docs/components`: a searchable sidebar (plus a ⌘K palette), live interactive previews of every component, collapsible example code, package-manager install tabs, an "on this page" rail, and the vendored source of the file you are looking at.

The previews render the *real* components, not mock-ups. Three pieces make that work:

- `app/globals.css` imports the official style layer the registry declares — `tw-animate-css` (enter/exit animations) and `shadcn/tailwind.css` (the `data-open` / `data-closed` / `data-checked` / `data-selected` variants plus `scroll-fade-*`, `shimmer`, and the accordion keyframes). Without these the components render but their state styling and animation silently do nothing.
- The colour tokens are the official `neutral` base, verbatim from `https://ui.shadcn.com/r/colors/neutral.json`. shadcn puts them on `:root` with `@theme inline`; here they live on `.shadcn-scope` instead, because `accent` and `muted` already mean something else in the Celesnity palette. The library adds that class to `<body>` while it is mounted, which is also how portalled overlays — dialogs, menus, toasts — inherit the tokens.
- `dark:` is class-driven (`@custom-variant dark`), so the library's light/dark switch is the only thing that turns it on.

## Adding an example

Examples live in `app/design-system/library/demos-*.tsx`, one entry per component:

```tsx
{
  name: "switch",              // must match the manifest name
  title: "Switch",
  description: "A control that toggles between on and off.",
  category: "Forms",
  usage: `import { Switch } from "@/design-system/components/switch"`,
  demos: [{ id: "default", title: "Default", code: "<Switch />", Component: () => <Switch /> }],
}
```

`registry.ts` joins those entries to `manifest.json`. A component that is vendored without an example still gets a page — with its dependencies and source — so nothing silently disappears when the snapshot is refreshed.

## Charts

`design-system/charts` holds the 68 blocks behind `https://ui.shadcn.com/charts` — area, bar, line, pie, radar, radial, and tooltip — in the same selection and order the site lists them. They are browsable at `/design-system` → **Dashboard design system**, with the same category tabs, per-card copy, and view-source panel.

They pin `recharts` to `3.8.0`, the version the registry declares. On 3.10 the `ChartLegend` props and the tooltip `labelFormatter` signature both tightened, and six blocks stop type-checking.

## Fidelity

Every file here is byte-identical to what `shadcn add <name>` writes today — verified both against the registry JSON and against a real run of the `shadcn` CLI (v4.19). `new-york-v4` is the newest style the public registry serves.

The one deliberate edit is in the chart blocks: their SVG `defs` ids are prefixed with the block name (`fillDesktop` → `chart-area-gradient-fillDesktop`). Each block is written to stand alone and several reuse the same ids; upstream gets away with it by rendering every chart in its own iframe, but a gallery in one document would have `url(#fillDesktop)` resolve to whichever chart mounted first, leaving the other with an empty fill. The rewrite is mechanical and keeps each block self-contained when copied out.

Note that `ui.shadcn.com` itself previews an unpublished style: its buttons are `h-8` with a 10px radius and set in Geist, where `new-york-v4` is `h-9`, `rounded-md`, and inherits the host font. The docs pages label those variants "Base UI / React Aria / Radix UI". So the site will look slightly tighter than this library until that style ships — the CLI cannot install it yet.

On colour: the `neutral` base ships a grayscale `--chart-1`…`--chart-5` ramp, but ui.shadcn.com overrides it with Tailwind's blue scale (`--chart-1: var(--color-blue-300)` … `--chart-5: var(--color-blue-800)`), which is what the /charts gallery actually renders. `app/globals.css` applies that same override.
