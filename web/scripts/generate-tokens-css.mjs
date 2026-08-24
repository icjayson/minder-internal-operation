/**
 * Emits app/tokens.generated.css from app/design-system/general/tokens.ts.
 *
 * Until now `buildTokenCss()` produced a stylesheet the design-system page only
 * *displayed and offered as a download* — nothing consumed it, so the documented
 * palette and the rendered one were free to drift, and did: the page chrome was
 * warm paper while the components inside it rendered on shadcn's neutral white.
 * This writes the same data to a file the app actually imports.
 *
 * What lands here is only what tokens.ts *knows* — the ramps, the type scale,
 * the shadows. Which ramp step plays which role (what a card border is, what a
 * disabled label is) is a judgement rather than data, so that mapping stays
 * hand-written and commented in globals.css, expressed in terms of these vars.
 *
 *   node scripts/generate-tokens-css.mjs
 */

import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const tokens = await import(join(here, "../app/design-system/general/tokens.ts"));

const { primary, neutral, semantic, typeScale, shadows } = tokens;

/**
 * The ramps are plain custom properties, deliberately not Tailwind theme
 * colours: `--color-neutral-*` and `--color-primary-*` would collide with
 * Tailwind's own built-in `neutral` scale and with shadcn's `--color-primary`.
 * The `mo-` prefix is the one already in use for `--mo-nav-height`.
 */
const ramps = [
  "  /* Primary / brand — Minder blue */",
  ...primary.map((s) => `  --mo-primary-${s.step}: ${s.value};${s.note ? ` /* ${s.note} */` : ""}`),
  "",
  "  /* Neutral — warm paper greys */",
  ...neutral.map((s) => `  --mo-neutral-${s.step}: ${s.value};${s.note ? ` /* ${s.note} */` : ""}`),
];

/**
 * The semantic ramp keeps its unprefixed names: globals.css already references
 * `var(--color-success-light)` from the Sonner block, and Tailwind has no
 * built-in `success` / `warning` / `error` / `info` to collide with — so these
 * can live in @theme and hand out `bg-success`, `text-error-dark`, and friends.
 */
const semanticTheme = semantic.flatMap((s) => [
  `  --color-${s.name}-light: ${s.light};`,
  `  --color-${s.name}: ${s.default}; /* ${s.role} */`,
  `  --color-${s.name}-dark: ${s.dark};`,
]);

/**
 * Tailwind v4's font-size shape: the bare `--text-*` is the size, and the
 * three `--text-*--…` companions ride along, so `text-heading-2` carries its
 * line-height, weight and tracking rather than needing three more classes.
 */
const typeTheme = typeScale.flatMap((t) => [
  `  --text-${t.token}: ${t.size}px;`,
  `  --text-${t.token}--line-height: ${t.line}px;`,
  `  --text-${t.token}--font-weight: ${t.weight};`,
  `  --text-${t.token}--letter-spacing: ${t.tracking};`,
]);

const shadowTheme = shadows
  .filter((s) => s.value !== "none")
  .map((s) => `  --shadow-mo-${s.token}: ${s.value}; /* ${s.use} */`);

const css = `/* ==========================================================================
   Minder design tokens — GENERATED, do not edit.

   Source:      app/design-system/general/tokens.ts
   Regenerate:  node scripts/generate-tokens-css.mjs

   Role assignment (which step is a border, which is a disabled label) lives in
   app/globals.css and is written in terms of the variables below.
   ========================================================================== */

:root {
${ramps.join("\n")}
}

@theme {
  /* Semantic ramp — status colour, one pairing per state */
${semanticTheme.join("\n")}

  /* Type scale — Roboto, one family */
${typeTheme.join("\n")}

  /* Elevation */
${shadowTheme.join("\n")}
}
`;

const out = join(here, "../app/tokens.generated.css");
await writeFile(out, css, "utf8");
console.log(
  `wrote app/tokens.generated.css — ${primary.length} primary, ${neutral.length} neutral, ` +
    `${semantic.length} semantic, ${typeScale.length} type, ${shadowTheme.length} shadow`
);
