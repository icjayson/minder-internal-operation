import type { ContextItem } from "./types";

type ContextFileLabelItem = Pick<
  ContextItem,
  "source" | "title" | "file_name"
>;

export interface ContextFileLabels {
  heading: string | null;
  fileName: string;
}

export function contextFileLabels(item: ContextFileLabelItem): ContextFileLabels {
  const title = item.title?.trim() ?? "";
  const fileName = item.file_name?.trim() || title || "File";

  if (item.source !== "fde-kit") return { heading: null, fileName };

  const checklistName = title.endsWith(fileName)
    ? title.slice(0, -fileName.length).trim()
    : title;
  const heading = checklistName.endsWith("Uploaded file")
    ? checklistName
    : `${checklistName || "[FDE task]"} Uploaded file`;

  return { heading, fileName };
}

type ContextLinkLabelItem = Pick<
  ContextItem,
  "source" | "title" | "body" | "url"
>;

export interface ContextLinkLabels {
  heading: string | null;
  label: string;
  href: string;
}

export function contextLinkLabels(item: ContextLinkLabelItem): ContextLinkLabels {
  const title = item.title?.trim() ?? "";
  const body = item.body?.trim() ?? "";
  const href = item.url?.trim() || body;

  if (item.source !== "fde-kit") {
    return { heading: null, label: title || href, href };
  }

  const heading = title.endsWith("Input link") ? title : null;
  const urlSuffix = href ? `: ${href}` : "";
  const bodyLabel = urlSuffix && body.endsWith(urlSuffix)
    ? body.slice(0, -urlSuffix.length).trim()
    : body;

  return {
    heading,
    label: bodyLabel || (heading ? "FDE link" : title) || href,
    href,
  };
}

type ContextFileFormatItem = Pick<ContextItem, "file_name" | "mime_type">;

export function contextFileFormat(item: ContextFileFormatItem): string {
  const fileName = item.file_name?.trim() ?? "";
  const extension = fileName.includes(".")
    ? fileName.slice(fileName.lastIndexOf(".") + 1).trim()
    : "";
  if (extension) return extension.toUpperCase();

  const mimeSubtype = item.mime_type?.split("/").at(1)?.split("+").at(0);
  return mimeSubtype?.toUpperCase() || "FILE";
}

export type ContextTypeFilter = "all" | ContextItem["kind"];
export type ContextSortOrder = "latest" | "oldest";

const contextTimestamp = (value: string): number => {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

export function filterAndSortContextItems<
  T extends Pick<ContextItem, "kind" | "updated_at">,
>(
  items: ReadonlyArray<T>,
  typeFilter: ContextTypeFilter,
  sortOrder: ContextSortOrder,
): T[] {
  const filtered = typeFilter === "all"
    ? items
    : items.filter((item) => item.kind === typeFilter);
  const direction = sortOrder === "latest" ? -1 : 1;

  return [...filtered].sort(
    (left, right) => direction * (
      contextTimestamp(left.updated_at) - contextTimestamp(right.updated_at)
    ),
  );
}

export function sortContextItemsLatestFirst<
  T extends Pick<ContextItem, "updated_at">,
>(items: ReadonlyArray<T>): T[] {
  return [...items].sort(
    (left, right) => contextTimestamp(right.updated_at) - contextTimestamp(left.updated_at),
  );
}
