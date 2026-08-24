/**
 * Fails if a retired Celesnity token name reappears in the platform.
 *
 * These names were aliases onto the design system while the platform moved
 * across; the aliases are gone, so a call site using one now resolves to
 * nothing and renders as an unstyled element rather than an obvious error.
 * That is the kind of regression a build does not catch, so this does.
 *
 *   node scripts/check-retired-tokens.mjs
 */

import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, extname, join, relative } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const ROOTS = ["app/components", "app/(app)"];

/** Each entry is [pattern, what to use instead]. */
const RETIRED = [
  [/\bbg-canvas\b/, "bg-background"],
  [/\bbg-surface-2\b/, "bg-muted"],
  [/\bbg-surface-3\b/, "bg-accent"],
  [/\bbg-surface\b/, "bg-card"],
  [/\btext-ink-soft\b/, "text-foreground/80"],
  [/\btext-ink\b/, "text-foreground"],
  [/\bborder-line-strong\b/, "border-border-strong"],
  [/\bborder-line-soft\b/, "border-border/60"],
  [/\bborder-line\b/, "border-border"],
  [/\bbg-line[a-z-]*\b/, "bg-border"],
  [/\brounded-card\b/, "rounded-lg"],
  [/\bshadow-soft\b/, "shadow-mo-soft"],
  [/\bshadow-drawer\b/, "shadow-mo-elevated"],
  // `mono` was a font class that never named a monospace; it is tabular-nums now.
  [/(?<![-\w])mono\b/, "tabular-nums"],
  [/(?<![-\w])tnum\b/, "tabular-nums"],
  // The platform is on the styled Select now; NativeSelect is the unstyled
  // fallback and mixing the two gives one page two dropdown treatments.
  [/\bNativeSelect\b/, "SelectField (app/components/select-field.tsx)"],
  // A hex literal in a class string bypasses the token layer completely: it
  // will not follow a brand change and it will not flip with the sky.
  [/\[#[0-9a-fA-F]{3,8}\]/, "a token — see app/globals.css"],
  // The Celesnity cobalt hover, which outlived the palette it came from.
  [/#3a51ff/i, "the Button component's own hover"],
  // `accent` and `muted` still exist — they are shadcn's, and they mean a
  // surface, not a brand colour and not dim text. So only the Celesnity
  // spellings are banned: the bare `text-muted` that used to be dim text, and
  // `accent-dim`, which is `primary-tint` now.
  [/-accent-dim\b/, "primary-tint"],
  [/\btext-muted\b(?!-foreground)/, "text-muted-foreground"],
];

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else if (extname(entry.name) === ".tsx") out.push(full);
  }
  return out;
}

const files = (await Promise.all(ROOTS.map((r) => walk(join(root, r))))).flat();
const failures = [];

for (const file of files) {
  const lines = (await readFile(file, "utf8")).split("\n");
  lines.forEach((line, i) => {
    for (const [pattern, replacement] of RETIRED) {
      if (pattern.test(line)) {
        failures.push(`${relative(root, file)}:${i + 1}  ${pattern.source} → use ${replacement}`);
      }
    }
  });
}

if (failures.length) {
  console.error(`Retired token names found in ${failures.length} place(s):\n`);
  for (const f of failures) console.error(`  ${f}`);
  console.error("\nThese no longer resolve — see app/globals.css for the current names.");
  process.exit(1);
}

console.log(`check-retired-tokens: clean across ${files.length} files`);
