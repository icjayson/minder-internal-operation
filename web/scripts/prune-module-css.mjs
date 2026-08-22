import { readFile, writeFile } from "node:fs/promises";
import postcss from "postcss";

/**
 * Removes rules from a CSS module whose selectors reference only class names
 * the paired component no longer uses. Uses a real parser rather than a regex
 * so nested at-rules survive the sweep intact.
 *
 * Usage: node scripts/prune-module-css.mjs <styles.module.css> <component.tsx>
 */
const [cssPath, tsxPath] = process.argv.slice(2);
if (!cssPath || !tsxPath) {
  console.error("usage: node scripts/prune-module-css.mjs <css> <tsx>");
  process.exit(1);
}

const css = await readFile(cssPath, "utf8");
const tsx = await readFile(tsxPath, "utf8");

const used = new Set([
  ...[...tsx.matchAll(/styles\.([A-Za-z0-9_]+)/g)].map((m) => m[1]),
  ...[...tsx.matchAll(/styles\[`([A-Za-z0-9_]+)/g)].map((m) => m[1]),
]);

const root = postcss.parse(css, { from: cssPath });
let removed = 0;

root.walkRules((rule) => {
  const classes = [...rule.selector.matchAll(/\.([A-Za-z][A-Za-z0-9_]*)/g)].map((m) => m[1]);
  if (classes.length === 0) return;           // element / :global rules stay
  if (classes.some((name) => used.has(name))) return;
  rule.remove();
  removed++;
});

root.walkAtRules((at) => {
  if (at.nodes && at.nodes.length === 0) at.remove();
});

const out = root.toString();
await writeFile(cssPath, out, "utf8");
console.log(`removed ${removed} rules; ${css.length} -> ${out.length} bytes`);
console.log("braces:", (out.match(/{/g) || []).length, (out.match(/}/g) || []).length);
