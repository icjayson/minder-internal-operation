/**
 * The Minder general design system's tokens — one source of truth.
 *
 * The swatches on the page and the CSS block at the bottom are both generated
 * from here, so a value can never be documented as one thing and shipped as
 * another. Scales are derived from the palette the page already used: Minder
 * blue #0075DE, its pressed #005BAB, the deep indigo #213183, and the warm
 * paper greys.
 */

export type Swatch = { step: string; value: string; note?: string };

/**
 * Radius is one knob — `--radius` at 0.625rem — with the rest derived from it,
 * because that is how the vendored component set derives it and how its
 * components were drawn. Documenting a second scale beside it is what let the
 * documented radius and the shipped one drift apart before.
 */

export const primary: Swatch[] = [
  { step: "50", value: "#F0F7FD", note: "tint background" },
  { step: "100", value: "#DBECFA" },
  { step: "200", value: "#B8D8F6" },
  { step: "300", value: "#85BDEF" },
  { step: "400", value: "#4299E7" },
  { step: "500", value: "#0075DE", note: "brand · CTA, link" },
  { step: "600", value: "#005BAB", note: "pressed / hover" },
  { step: "700", value: "#114697" },
  { step: "800", value: "#213183", note: "deep indigo" },
  { step: "900", value: "#121B48" },
];

export const neutral: Swatch[] = [
  { step: "0", value: "#FFFFFF", note: "surface" },
  { step: "50", value: "#F6F5F4", note: "warm paper canvas" },
  { step: "100", value: "#EDEDEC" },
  { step: "200", value: "#E6E6E6", note: "hairline" },
  { step: "300", value: "#C8C6C3" },
  { step: "400", value: "#A39E98", note: "ash · disabled text" },
  { step: "500", value: "#7F7A75" },
  { step: "600", value: "#615D59", note: "stone · secondary text" },
  { step: "700", value: "#494744" },
  { step: "800", value: "#31302E", note: "warm charcoal" },
  { step: "900", value: "#161615" },
  { step: "1000", value: "#000000", note: "ink · primary text" },
];

export type SemanticRamp = {
  name: string;
  role: string;
  light: string;
  default: string;
  dark: string;
};

export const semantic: SemanticRamp[] = [
  { name: "success", role: "Completed, verified", light: "#E4F5E7", default: "#1AAE39", dark: "#137D29" },
  { name: "warning", role: "Needs attention", light: "#FBEBE0", default: "#DD5B00", dark: "#9F4200" },
  { name: "error", role: "Failure, destructive", light: "#FAE9EC", default: "#D6455F", dark: "#9A3244" },
  { name: "info", role: "Neutral information", light: "#E0EEFB", default: "#0075DE", dark: "#0054A0" },
];

export const surfaces: Swatch[] = [
  { step: "bg-base", value: "#F6F5F4", note: "the page itself" },
  { step: "bg-subtle", value: "#FFFFFF", note: "cards, fields" },
  { step: "bg-elevated", value: "#FFFFFF", note: "modals, dropdowns — plus shadow" },
  { step: "bg-overlay", value: "rgba(0,0,0,0.24)", note: "scrim behind a modal" },
];

export const textColors: Swatch[] = [
  { step: "text-primary", value: "#000000" },
  { step: "text-secondary", value: "#615D59" },
  { step: "text-disabled", value: "#A39E98" },
  { step: "text-inverse", value: "#FFFFFF" },
  { step: "text-link", value: "#0075DE" },
];

export const borders: Swatch[] = [
  { step: "border-default", value: "#E6E6E6" },
  { step: "border-subtle", value: "#EDEDEC" },
  { step: "border-focus", value: "#0075DE" },
];

export type TypeToken = { token: string; size: number; line: number; weight: number; tracking: string; sample: string };

export const typeScale: TypeToken[] = [
  { token: "display-1", size: 64, line: 64, weight: 700, tracking: "-2.125px", sample: "Meet the night shift" },
  { token: "display-2", size: 54, line: 56, weight: 700, tracking: "-1.875px", sample: "One tool for your whole company" },
  { token: "heading-1", size: 40, line: 44, weight: 700, tracking: "-1px", sample: "Plans and features" },
  { token: "heading-2", size: 26, line: 32, weight: 700, tracking: "-0.625px", sample: "Build perfect workflows" },
  { token: "heading-3", size: 22, line: 28, weight: 700, tracking: "-0.25px", sample: "Your connected workspace" },
  { token: "title", size: 20, line: 28, weight: 600, tracking: "-0.125px", sample: "Write, plan, and organize" },
  { token: "body-md", size: 16, line: 24, weight: 400, tracking: "0", sample: "A calm default for clear, document-like reading." },
  { token: "body-sm", size: 15, line: 20, weight: 400, tracking: "0", sample: "Compact enough for tables and dense content." },
  { token: "label", size: 14, line: 20, weight: 500, tracking: "0", sample: "Workspace name" },
  { token: "caption", size: 14, line: 20, weight: 400, tracking: "0", sample: "Supporting notes and footnotes." },
  { token: "eyebrow", size: 12, line: 16, weight: 600, tracking: "0.125px", sample: "ESSENTIAL FOR STAYING ORGANIZED" },
];

export const spacing = [
  { token: "xxs", value: 4 },
  { token: "xs", value: 8 },
  { token: "sm", value: 12 },
  { token: "md", value: 16 },
  { token: "lg", value: 24 },
  { token: "xl", value: 28 },
  { token: "xxl", value: 32 },
  { token: "3xl", value: 48 },
  { token: "4xl", value: 64 },
];

export const radii = [
  { token: "sm", value: "6px", use: "chips, small controls" },
  { token: "md", value: "8px", use: "buttons, inputs" },
  { token: "lg", value: "10px", use: "cards, menus" },
  { token: "xl", value: "14px", use: "panels, dialogs" },
  { token: "full", value: "9999px", use: "CTAs, badges, avatars" },
];

export const shadows = [
  { token: "none", value: "none", use: "flat card on the warm canvas" },
  {
    token: "soft",
    value:
      "0 .175px 1.041px rgba(0,0,0,.01), 0 .8px 2.925px rgba(0,0,0,.02), 0 2.025px 7.847px rgba(0,0,0,.027), 0 4px 18px rgba(0,0,0,.04)",
    use: "cards, menus",
  },
  {
    token: "elevated",
    value:
      "0 .5px 1px rgba(0,0,0,.012), 0 2px 5px rgba(0,0,0,.02), 0 5px 12px rgba(0,0,0,.028), 0 11px 26px rgba(0,0,0,.038), 0 23px 52px rgba(0,0,0,.05)",
    use: "modals, popovers",
  },
];

export const breakpoints = [
  { name: "Mobile", width: "< 768px", change: "Single column; nav collapses; CTAs stack full-width" },
  { name: "Tablet", width: "768–1023px", change: "Grids collapse toward 2-up; nav condenses" },
  { name: "Laptop", width: "1024–1279px", change: "Tightened gutters; 3-column grids retained" },
  { name: "Desktop", width: "≥ 1280px", change: "Full multi-column grids; centred ~1200px column" },
];

/** Emits the whole system as a plain stylesheet — what the page's code block shows. */
export function buildTokenCss(): string {
  const line = (name: string, value: string) => `  --${name}: ${value};`;
  const block = (title: string, rows: string[]) => `\n  /* ${title} */\n${rows.join("\n")}`;

  return `/* ==========================================================================
   Minder general design system — design tokens
   Generated from app/design-system/general/tokens.ts
   ========================================================================== */

:root {${block(
    "Primary / brand",
    primary.map((s) => line(`color-primary-${s.step}`, s.value))
  )}
${block("Neutral", neutral.map((s) => line(`color-neutral-${s.step}`, s.value)))}
${block(
    "Semantic",
    semantic.flatMap((s) => [
      line(`color-${s.name}-light`, s.light),
      line(`color-${s.name}`, s.default),
      line(`color-${s.name}-dark`, s.dark),
    ])
  )}
${block("Background & surface", surfaces.map((s) => line(s.step, s.value)))}
${block("Text", textColors.map((s) => line(s.step, s.value)))}
${block("Border & divider", borders.map((s) => line(s.step, s.value)))}

  /* Typography — Roboto, one family */
  --font-sans: Roboto, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
${typeScale
    .map(
      (t) =>
        `  --text-${t.token}: ${t.weight} ${t.size}px/${t.line}px var(--font-sans);\n  --tracking-${t.token}: ${t.tracking};`
    )
    .join("\n")}
${block("Spacing — 8px base rhythm", spacing.map((s) => line(`space-${s.token}`, `${s.value}px`)))}
${block("Border radius", radii.map((r) => line(`radius-${r.token}`, r.value)))}
${block("Elevation", shadows.map((s) => line(`shadow-${s.token}`, s.value)))}
${block(
    "Breakpoints",
    breakpoints.map((b) => `  /* ${b.name}: ${b.width} — ${b.change} */`)
  )}
}

/* --------------------------------------------------------------------------
   Base
   -------------------------------------------------------------------------- */

body {
  background: var(--bg-base);
  color: var(--text-primary);
  font: var(--text-body-md);
}

a {
  color: var(--text-link);
  text-decoration: none;
}
a:hover { text-decoration: underline; }

:focus-visible {
  outline: 2px solid var(--border-focus);
  outline-offset: 2px;
}

.card {
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  background: var(--bg-subtle);
  padding: var(--space-lg);
}

.card--elevated { border-color: transparent; box-shadow: var(--shadow-elevated); }
`;
}
