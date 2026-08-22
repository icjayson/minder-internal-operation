import { mkdir, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";

const root = new URL("../design-system/", import.meta.url);
const registryUrl = "https://ui.shadcn.com/r/styles/new-york-v4/registry.json";
const itemUrl = (name) => `https://ui.shadcn.com/r/styles/new-york-v4/${name}.json`;

const baseNames = [
  "accordion", "alert", "alert-dialog", "aspect-ratio", "avatar", "badge", "breadcrumb", "button", "button-group", "calendar", "card", "carousel", "chart", "checkbox", "collapsible", "combobox", "command", "context-menu", "dialog", "drawer", "dropdown-menu", "empty", "field", "form", "hover-card", "input", "input-group", "input-otp", "item", "label", "menubar", "navigation-menu", "pagination", "popover", "progress", "radio-group", "resizable", "scroll-area", "select", "separator", "sheet", "sidebar", "skeleton", "slider", "sonner", "spinner", "switch", "table", "tabs", "textarea", "toggle", "toggle-group", "tooltip", "kbd", "native-select", "direction", "attachment", "bubble", "marker", "message", "message-scroller", "questionnaire",
];

/** The chart blocks, in the order and selection https://ui.shadcn.com/charts shows them. */
const chartNames = {
  area: ["default", "linear", "step", "stacked", "stacked-expand", "legend", "icons", "gradient", "axes", "interactive"],
  bar: ["default", "horizontal", "multiple", "stacked", "label", "label-custom", "mixed", "active", "negative", "interactive"],
  line: ["default", "linear", "step", "multiple", "dots", "dots-custom", "dots-colors", "label", "label-custom", "interactive"],
  pie: ["simple", "separator-none", "label", "label-custom", "label-list", "legend", "donut", "donut-active", "donut-text", "stacked", "interactive"],
  radar: ["default", "dots", "lines-only", "label-custom", "grid-custom", "grid-none", "grid-circle", "grid-circle-no-lines", "grid-circle-fill", "grid-fill", "multiple", "legend"],
  radial: ["simple", "label", "grid", "text", "shape", "stacked"],
  tooltip: ["default", "indicator-line", "indicator-none", "label-none", "label-custom", "label-formatter", "formatter", "icons", "advanced"],
};
const chartItems = Object.entries(chartNames).flatMap(([category, variants]) =>
  variants.map((variant) => ({ category, variant, name: `chart-${category}-${variant}` }))
);

/**
 * Namespaces a chart block's SVG defs.
 *
 * Every block is written to stand alone, so several of them reuse ids like
 * `fillDesktop`. The upstream gallery gets away with it by rendering each chart
 * in its own iframe; ours renders them in one document, where the duplicate ids
 * make `url(#fillDesktop)` resolve to whichever chart mounted first — leaving the
 * other one with an empty fill. Prefixing with the block name keeps every block
 * self-contained and copy-pasteable, and is the only edit made to the source.
 */
function namespaceSvgIds(source, name) {
  const ids = [...source.matchAll(/\bid="([A-Za-z][\w-]*)"/g)].map((match) => match[1]);
  let out = source;
  for (const id of new Set(ids)) {
    out = out.replaceAll(`id="${id}"`, `id="${name}-${id}"`).replaceAll(`url(#${id})`, `url(#${name}-${id})`);
  }
  return out;
}

/** Points registry-internal aliases at this vendored copy. */
function rewriteImports(source) {
  return source
    .replaceAll('"@/registry/new-york-v4/ui/', '"@/design-system/components/')
    .replaceAll("'@/registry/new-york-v4/ui/", "'@/design-system/components/")
    .replaceAll('"@/registry/new-york-v4/lib/utils"', '"@/design-system/lib/utils"')
    .replaceAll("'@/registry/new-york-v4/lib/utils'", "'@/design-system/lib/utils'")
    .replaceAll('"@/registry/new-york-v4/hooks/use-mobile"', '"@/design-system/hooks/use-mobile"')
    .replaceAll("'@/registry/new-york-v4/hooks/use-mobile'", "'@/design-system/hooks/use-mobile'")
    .replaceAll('"@/components/ui/', '"@/design-system/components/')
    .replaceAll("'@/components/ui/", "'@/design-system/components/")
    .replaceAll('"@/lib/utils"', '"@/design-system/lib/utils"')
    .replaceAll("'@/lib/utils'", "'@/design-system/lib/utils'");
}

const registry = await fetch(registryUrl).then((response) => response.json());
const selected = registry.items.filter((item) => baseNames.includes(item.name));
const chartNameSet = new Set(chartItems.map((item) => item.name));
const selectedCharts = registry.items.filter((item) => chartNameSet.has(item.name));
const dependencies = new Set(["class-variance-authority", "lucide-react", "radix-ui", "clsx", "tailwind-merge"]);
const components = [];
const sources = {};

await mkdir(new URL("components/", root), { recursive: true });
await mkdir(new URL("lib/", root), { recursive: true });
await mkdir(new URL("charts/", root), { recursive: true });

for (const entry of selected) {
  const item = await fetch(itemUrl(entry.name)).then((response) => response.json());
  for (const dependency of item.dependencies ?? []) dependencies.add(dependency);
  const files = [];
  for (const file of item.files ?? []) {
    if (!file.content || !/\.(tsx?|css)$/.test(file.path)) continue;
    const isUtil = file.path.endsWith("/utils.ts");
    const destination = isUtil ? new URL("lib/utils.ts", root) : new URL(`components/${file.path.split("/").pop()}`, root);
    const content = rewriteImports(file.content)
      .replaceAll('"@/components/ui/', '"@/design-system/components/')
      .replaceAll("'@/components/ui/", "'@/design-system/components/")
      .replaceAll('"@/registry/new-york-v4/ui/', '"@/design-system/components/')
      .replaceAll("'@/registry/new-york-v4/ui/", "'@/design-system/components/")
      .replaceAll('"@/registry/new-york-v4/lib/utils"', '"@/design-system/lib/utils"')
      .replaceAll("'@/registry/new-york-v4/lib/utils'", "'@/design-system/lib/utils'")
      .replaceAll('"@/registry/new-york-v4/hooks/use-mobile"', '"@/design-system/hooks/use-mobile"')
      .replaceAll("'@/registry/new-york-v4/hooks/use-mobile'", "'@/design-system/hooks/use-mobile'")
      .replaceAll('"@/lib/utils"', '"@/design-system/lib/utils"')
      .replaceAll("'@/lib/utils'", "'@/design-system/lib/utils'");
    await mkdir(dirname(destination.pathname), { recursive: true });
    await writeFile(destination, content, "utf8");
    sources[isUtil ? "design-system/lib/utils.ts" : `design-system/components/${file.path.split("/").pop()}`] = content;
    files.push(destination.pathname.replace(process.cwd(), ""));
  }
  components.push({ name: item.name, type: item.type, files, registryDependencies: item.registryDependencies ?? [], dependencies: item.dependencies ?? [] });
}

const charts = [];
for (const entry of selectedCharts) {
  const item = await fetch(itemUrl(entry.name)).then((response) => response.json());
  for (const dependency of item.dependencies ?? []) dependencies.add(dependency);
  const file = (item.files ?? []).find((candidate) => candidate.content && candidate.path.endsWith(".tsx"));
  if (!file) continue;
  const base = file.path.split("/").pop();
  const chartSource = namespaceSvgIds(rewriteImports(file.content), item.name);
  await writeFile(new URL(`charts/${base}`, root), chartSource, "utf8");
  sources[`design-system/charts/${base}`] = chartSource;
  const meta = chartItems.find((candidate) => candidate.name === item.name);
  charts.push({
    name: item.name,
    category: meta.category,
    variant: meta.variant,
    file: `design-system/charts/${base}`,
    description: /export const description = "([^"]*)"/.exec(file.content)?.[1] ?? "",
    component: /export function ([A-Za-z0-9_]+)\(/.exec(file.content)?.[1] ?? "",
    registryDependencies: item.registryDependencies ?? [],
  });
}

await writeFile(new URL("manifest.json", root), JSON.stringify({ source: registryUrl, style: "new-york-v4", generatedAt: new Date().toISOString(), componentCount: components.length, chartCount: charts.length, dependencies: [...dependencies].sort(), components, charts }, null, 2) + "\n");

/* The design-system page shows each file's source. Emitting it as one JSON map
   keeps the API route free of runtime `fs` reads — which otherwise trace the
   whole project into the serverless bundle — and guarantees the source ships
   with the deployment. */
await writeFile(new URL("sources.json", root), JSON.stringify(sources, null, 0) + "\n");
console.log(`Vendored ${components.length} shadcn/ui components and ${charts.length} chart blocks into web/design-system.`);
