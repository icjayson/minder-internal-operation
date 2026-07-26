import assert from "node:assert/strict";
import test from "node:test";
import {
  parseListContext,
  parseVerticalTensions,
  SHARED_CONTEXT_DEFINITIONS,
} from "../lib/shared-context.ts";

test("defines all eight shared context blocks across both categories", () => {
  assert.equal(SHARED_CONTEXT_DEFINITIONS.length, 8);
  assert.deepEqual(
    new Set(SHARED_CONTEXT_DEFINITIONS.map((definition) => definition.category)),
    new Set(["product", "design_partner"]),
  );
  assert.equal(new Set(SHARED_CONTEXT_DEFINITIONS.map((definition) => definition.key)).size, 8);
});

test("parses editable differentiator lists", () => {
  assert.deepEqual(parseListContext("- Voice first\n2. Human approval\n• No surveillance"), [
    "Voice first",
    "Human approval",
    "No surveillance",
  ]);
});

test("parses vertical tensions and ignores malformed lines", () => {
  assert.deepEqual(
    parseVerticalTensions("automotive: EV pressure\nbad line\n- food_bev: traceability: and handover"),
    {
      automotive: "EV pressure",
      food_bev: "traceability: and handover",
    },
  );
});
