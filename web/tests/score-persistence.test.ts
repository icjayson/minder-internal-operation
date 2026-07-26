import assert from "node:assert/strict";
import test from "node:test";
import {
  isMissingScoredAtError,
  persistFactoryScore,
} from "../lib/score-persistence.ts";

test("detects the PostgREST missing scored_at schema error", () => {
  assert.equal(
    isMissingScoredAtError({
      code: "PGRST204",
      message: "Could not find the 'scored_at' column of 'factories' in the schema cache",
    }),
    true,
  );
  assert.equal(isMissingScoredAtError({ code: "42501", message: "permission denied" }), false);
});

test("retries score persistence without scored_at for an older database", async () => {
  const calls: Record<string, unknown>[] = [];
  const result = await persistFactoryScore(
    async (patch) => {
      calls.push(patch);
      return calls.length === 1
        ? {
            error: {
              code: "PGRST204",
              message: "Could not find the 'scored_at' column of 'factories' in the schema cache",
            },
          }
        : { error: null };
    },
    { score: 72, grade: "B", scored_at: "2026-07-26T06:00:00.000Z" },
  );

  assert.equal(result.error, null);
  assert.equal(result.persistedScoredAt, false);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].scored_at, "2026-07-26T06:00:00.000Z");
  assert.equal("scored_at" in calls[1], false);
  assert.equal(calls[1].score, 72);
});

test("does not hide unrelated database update errors", async () => {
  const result = await persistFactoryScore(
    async () => ({ error: { code: "42501", message: "permission denied" } }),
    { score: 72, grade: "B", scored_at: "2026-07-26T06:00:00.000Z" },
  );

  assert.equal(result.persistedScoredAt, true);
  assert.equal(result.error?.code, "42501");
});

