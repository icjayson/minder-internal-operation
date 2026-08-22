import { NextResponse } from "next/server";

import manifest from "@/design-system/manifest.json";
import sources from "@/design-system/sources.json";

type ManifestComponent = { name: string; files: string[] };
type ManifestChart = { name: string; file: string };

const sourceMap = sources as Record<string, string>;

/** name → the vendored file paths that make it up. */
const filesByName = new Map<string, string[]>();
for (const component of manifest.components as ManifestComponent[]) {
  filesByName.set(
    component.name,
    component.files.map((file) => `design-system/components/${file.split("/").pop()}`)
  );
}
for (const chart of manifest.charts as ManifestChart[]) {
  filesByName.set(chart.name, [chart.file]);
}

/**
 * Serves the vendored source behind the library's "Source" tab and the chart
 * gallery's "View code".
 *
 * Reads from the generated source map rather than the filesystem: the files are
 * fixed at build time, and a runtime `fs` read would pull the whole project into
 * the deployed function.
 */
export async function GET(request: Request) {
  const name = new URL(request.url).searchParams.get("name") ?? "";
  const paths = filesByName.get(name);
  if (!paths) {
    return NextResponse.json({ error: "Unknown component" }, { status: 404 });
  }

  const files = paths
    .filter((path) => sourceMap[path] !== undefined)
    .map((path) => ({ path, content: sourceMap[path] }));

  if (files.length === 0) {
    return NextResponse.json({ error: "Source unavailable" }, { status: 404 });
  }
  return NextResponse.json({ name, files });
}
