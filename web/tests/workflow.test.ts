import assert from "node:assert/strict";
import test from "node:test";
import { addDaysISO, nextFollowUpForStep, stepAfter } from "../lib/cadence.ts";
import {
  contactIdentity,
  detectDelimiter,
  factoryIdentity,
  normalizeUrl,
  normalizeWorkerBand,
  parseDelimited,
  parseStringList,
} from "../lib/import-normalization.ts";
import { recommendNext } from "../lib/recommendation.ts";
import { highestStage } from "../lib/stage.ts";
import { effectiveContactRoleLevel } from "../lib/contact-role.ts";
import { visibleFactoryActivities, withoutBulkStageFanout } from "../lib/activity.ts";

test("cadence advances to the next ordered sequence step", () => {
  const steps = [
    { id: "b", sequence_id: "s", step_index: 2, day_offset: 4, subject: null, body: null, intent: null },
    { id: "a", sequence_id: "s", step_index: 1, day_offset: 1, subject: null, body: null, intent: null },
  ];
  assert.equal(stepAfter(steps, 1)?.id, "b");
  assert.equal(nextFollowUpForStep(steps[1], steps[0], new Date("2026-07-25T10:00:00Z")), "2026-07-28");
  assert.equal(addDaysISO(new Date("2026-07-25T10:00:00Z"), 3), "2026-07-28");
});

test("recommendation is ladder-aware and respects terminal stages", () => {
  const active = recommendNext({
    ladderLevel: 1,
    evidenceLevel: 0,
    grade: "B",
    blocker: "No frontline access",
    daysSinceActivity: 9,
    stage: "Replied",
  });
  assert.match(active.recommendation, /25–30 minute interview/);
  assert.match(active.recommendation, /No frontline access/);
  assert.match(active.recommendation, /quiet for 9 days/);

  const lost = recommendNext({
    ladderLevel: 4,
    evidenceLevel: 3,
    grade: "C",
    blocker: null,
    daysSinceActivity: 1,
    stage: "Closed Lost",
  });
  assert.match(lost.recommendation, /stop active follow-up/);
});

test("factory stage rolls up to the highest contact stage", () => {
  assert.equal(highestStage(["New", "Meeting Booked"]), "Meeting Booked");
  assert.equal(highestStage(["Closed Lost", "Replied", "Nurture"]), "Replied");
  assert.equal(highestStage([]), "New");
});

test("legacy factory-stage fan-out is hidden without hiding a single contact change", () => {
  const base = {
    factory_id: "factory-1",
    network_id: null,
    type: "stage_change",
    body: "New → Contacted",
    evidence_level: null,
    taxonomy_tags: null,
    created_at: "2026-07-31T15:51:44.000Z",
  };
  const activities = [
    { ...base, id: "bulk-1", contact_id: "contact-1" },
    { ...base, id: "bulk-2", contact_id: "contact-2" },
    { ...base, id: "single", contact_id: "contact-3", created_at: "2026-07-31T16:00:00.000Z" },
    { ...base, id: "factory", contact_id: null },
  ];

  assert.deepEqual(
    withoutBulkStageFanout(activities).map((activity) => activity.id),
    ["single", "factory"],
  );
});

test("factory activity keeps forward milestones only up to the current stage", () => {
  const base = {
    factory_id: "factory-1",
    network_id: null,
    contact_id: null,
    type: "stage_change",
    evidence_level: null,
    taxonomy_tags: null,
    created_at: "2026-07-31T16:00:00.000Z",
  };
  const activities = [
    { ...base, id: "forward-1", body: "New → Contacted" },
    { ...base, id: "forward-2", body: "Contacted → Replied" },
    { ...base, id: "backward", body: "Replied → Contacted" },
    { ...base, id: "contact", contact_id: "contact-1", body: "Replied → Contacted" },
  ];

  assert.deepEqual(
    visibleFactoryActivities(activities, "Contacted").map((activity) => activity.id),
    ["forward-1", "contact"],
  );
  assert.deepEqual(
    visibleFactoryActivities(activities, "New").map((activity) => activity.id),
    ["contact"],
  );
});

test("executive owner titles always resolve to the highest contact level", () => {
  assert.equal(effectiveContactRoleLevel("CEO & Co-founder", null), "high");
  assert.equal(effectiveContactRoleLevel("Founder", null), "high");
  assert.equal(effectiveContactRoleLevel("Company Owner", "expert"), "high");
  assert.equal(effectiveContactRoleLevel("Chief Executive Officer", "mid"), "high");
  assert.equal(effectiveContactRoleLevel("Commercial Director", "mid"), "mid");
});

test("messy CSV helpers normalize identities and delimiters", () => {
  const csv = 'Company;Email;Systems\n"ACME Ltd";A@EXAMPLE.COM;"ERP|paper;MES"\n';
  assert.equal(detectDelimiter(csv), ";");
  const rows = parseDelimited(csv);
  assert.deepEqual(rows[0], ["Company", "Email", "Systems"]);
  assert.equal(normalizeUrl("www.example.com/"), "https://www.example.com");
  assert.equal(normalizeWorkerBand("200"), "50 - 200");
  assert.equal(normalizeWorkerBand("200–500 employees"), "200 - 500");
  assert.equal(factoryIdentity("https://www.example.com/about", "ACME", "UK"), "domain:example.com");
  assert.equal(contactIdentity({ email: " A@EXAMPLE.COM " }), "email:a@example.com");
  assert.deepEqual(parseStringList("ERP|paper,MES"), ["ERP", "paper", "MES"]);
});
