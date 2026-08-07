import assert from "node:assert/strict";
import test from "node:test";
import { buildFdeProgressByFactory } from "../lib/fde-progress.ts";

test("builds progress from the latest deployment for each factory", () => {
  const progress = buildFdeProgressByFactory(
    [
      {
        id: "deployment-old",
        factory_id: "factory-1",
        name: "Old deployment",
        status: "pre",
        started_at: "2026-08-01T00:00:00.000Z",
      },
      {
        id: "deployment-latest",
        factory_id: "factory-1",
        name: "Latest deployment",
        status: "during",
        started_at: "2026-08-08T00:00:00.000Z",
      },
    ],
    [
      { deployment_id: "deployment-old", phase: "pre", status: "done" },
      { deployment_id: "deployment-latest", phase: "pre", status: "done" },
      { deployment_id: "deployment-latest", phase: "during", status: "todo" },
    ],
  );

  assert.deepEqual(progress.get("factory-1"), {
    deploymentId: "deployment-latest",
    deploymentName: "Latest deployment",
    status: "during",
    done: 1,
    total: 2,
    percent: 50,
    phases: [
      { phase: "pre", done: 1, total: 1 },
      { phase: "during", done: 0, total: 1 },
      { phase: "after", done: 0, total: 0 },
    ],
  });
});
