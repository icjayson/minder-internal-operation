import manifest from "@/design-system/manifest.json";

import { chatDocs } from "./demos-chat";
import { formDocs } from "./demos-forms";
import { layoutDocs } from "./demos-layout";
import { overlayDocs } from "./demos-overlay";
import { CATEGORIES, type Category, type ComponentDoc } from "./types";

type ManifestComponent = {
  name: string;
  type?: string;
  files: string[];
  dependencies?: string[];
};

export type LibraryEntry = ComponentDoc & {
  files: string[];
  dependencies: string[];
  registryType: string;
};

const manifestComponents = manifest.components as ManifestComponent[];
const docsByName = new Map(
  [...formDocs, ...layoutDocs, ...overlayDocs, ...chatDocs].map((doc) => [doc.name, doc])
);

/** Formats `input-otp` as `Input OTP`-ish for components the demos don't cover yet. */
function titleize(name: string) {
  return name
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

/**
 * The manifest is the source of truth for *what* is vendored; the demo files are
 * the source of truth for *how* each one is shown. A component that lands in the
 * manifest without a demo still gets a page — with its source and dependencies —
 * instead of silently disappearing from the library.
 */
export const libraryEntries: LibraryEntry[] = manifestComponents
  .map((component) => {
    const doc = docsByName.get(component.name);
    return {
      name: component.name,
      title: doc?.title ?? titleize(component.name),
      description: doc?.description ?? "Vendored from the new-york-v4 registry.",
      category: doc?.category ?? ("Layout" as Category),
      usage:
        doc?.usage ??
        `import { ${titleize(component.name).replaceAll(" ", "")} } from "@/design-system/components/${component.name}"`,
      demos: doc?.demos ?? [],
      files: component.files,
      dependencies: component.dependencies ?? [],
      registryType: component.type?.replace("registry:", "") ?? "ui",
    };
  })
  .sort((a, b) => a.title.localeCompare(b.title));

export const libraryByCategory = CATEGORIES.map((category) => ({
  category,
  entries: libraryEntries.filter((entry) => entry.category === category),
})).filter((group) => group.entries.length > 0);

export const librarySource = manifest.source as string;
export const libraryStyle = manifest.style as string;
export const libraryGeneratedAt = manifest.generatedAt as string;
