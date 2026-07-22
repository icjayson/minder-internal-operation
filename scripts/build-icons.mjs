#!/usr/bin/env node
// Rasterize extension/icons/icon.svg to PNGs at 16/32/48/128.
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const svgPath = resolve(__dirname, "../extension/icons/icon.svg");
const svg = readFileSync(svgPath, "utf8");

for (const size of [16, 32, 48, 128]) {
  const resvg = new Resvg(svg, { fitTo: { mode: "width", value: size } });
  const png = resvg.render().asPng();
  const out = resolve(__dirname, `../extension/icons/icon-${size}.png`);
  writeFileSync(out, png);
  console.log(`✓ wrote ${out} (${png.length} bytes)`);
}
