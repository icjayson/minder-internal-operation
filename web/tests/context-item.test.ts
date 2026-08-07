import assert from "node:assert/strict";
import test from "node:test";
import {
  contextFileFormat,
  contextFileLabels,
  contextLinkLabels,
  filterAndSortContextItems,
  sortContextItemsLatestFirst,
} from "../lib/context-item.ts";

test("shows a checklist heading and filename for files synced from FDE KIT", () => {
  assert.deepEqual(
    contextFileLabels({
      source: "fde-kit",
      title: "[Run a discovery call] Sovereign_by_Design_Revised.pdf",
      file_name: "Sovereign_by_Design_Revised.pdf",
    }),
    {
      heading: "[Run a discovery call] Uploaded file",
      fileName: "Sovereign_by_Design_Revised.pdf",
    },
  );
});

test("keeps the filename label for regular context uploads", () => {
  assert.deepEqual(
    contextFileLabels({
      source: null,
      title: "Sovereign_by_Design_Revised.pdf",
      file_name: "Sovereign_by_Design_Revised.pdf",
    }),
    {
      heading: null,
      fileName: "Sovereign_by_Design_Revised.pdf",
    },
  );
});

test("shows a checklist heading and clickable label for links synced from FDE KIT", () => {
  assert.deepEqual(
    contextLinkLabels({
      source: "fde-kit",
      title: "[Run a discovery call] Input link",
      body: "Project workspace: https://example.com/project",
      url: "https://example.com/project",
    }),
    {
      heading: "[Run a discovery call] Input link",
      label: "Project workspace",
      href: "https://example.com/project",
    },
  );
});

test("sorts context items by latest update first", () => {
  assert.deepEqual(
    sortContextItemsLatestFirst([
      { id: "older", updated_at: "2026-08-01T00:00:00.000Z" },
      { id: "latest", updated_at: "2026-08-08T00:00:00.000Z" },
      { id: "middle", updated_at: "2026-08-04T00:00:00.000Z" },
    ]).map((item) => item.id),
    ["latest", "middle", "older"],
  );
});

test("shows the uploaded file format instead of its update time", () => {
  assert.equal(
    contextFileFormat({
      file_name: "Sovereign_by_Design_Revised.pdf",
      mime_type: "application/pdf",
    }),
    "PDF",
  );
});

test("filters context items by type", () => {
  assert.deepEqual(
    filterAndSortContextItems(
      [
        { id: "note", kind: "text" as const, updated_at: "2026-08-03T00:00:00.000Z" },
        { id: "file", kind: "file" as const, updated_at: "2026-08-02T00:00:00.000Z" },
        { id: "link", kind: "link" as const, updated_at: "2026-08-01T00:00:00.000Z" },
      ],
      "text",
      "latest",
    ).map((item) => item.id),
    ["note"],
  );
});

test("sorts filtered context items from oldest to latest", () => {
  assert.deepEqual(
    filterAndSortContextItems(
      [
        { id: "latest", kind: "file" as const, updated_at: "2026-08-08T00:00:00.000Z" },
        { id: "oldest", kind: "file" as const, updated_at: "2026-08-01T00:00:00.000Z" },
      ],
      "file",
      "oldest",
    ).map((item) => item.id),
    ["oldest", "latest"],
  );
});
