import assert from "node:assert/strict";
import test from "node:test";
import {
  activityAlertRemainingMs,
  activityDiscordNotification,
  canWithdrawActivity,
  formatActivityAlertCountdown,
} from "../lib/activity-alerts.ts";

const createdAt = "2026-08-01T00:00:00.000Z";

test("factory activity builds a factory-routed Discord notification", () => {
  const result = activityDiscordNotification({
    activity: { id: "a1", factory_id: "f1", network_id: null, contact_id: null, type: "note", body: "Call completed", created_at: createdAt } as never,
    factory: { id: "f1", name: "Factory One", stage: "Replied", network_id: null },
  });
  assert.equal(result?.factory_id, "f1");
  assert.equal(result?.network_id, undefined);
  assert.equal(result?.title, "New factory activity · Note");
  assert.equal(result?.summary, "Call completed");
});

test("factory contact activity retains its contact and factory routing", () => {
  const result = activityDiscordNotification({
    activity: { id: "a2", factory_id: "f1", network_id: null, contact_id: "c1", type: "stage_change", body: "New → Contacted", created_at: createdAt } as never,
    contact: { id: "c1", factory_id: "f1", network_id: null, full_name: "Alex Owner" } as never,
    factory: { id: "f1", name: "Factory One", stage: "Contacted", network_id: null },
  });
  assert.equal(result?.factory_id, "f1");
  assert.equal(result?.contact_id, "c1");
  assert.equal(result?.detail, "Alex Owner · Factory One");
});

test("network and network-contact activities route to the network", () => {
  const network = { id: "n1", name: "Network One" };
  const direct = activityDiscordNotification({
    activity: { id: "a3", factory_id: null, network_id: "n1", contact_id: null, type: "note", body: "New intro", created_at: createdAt } as never,
    network,
  });
  const contact = activityDiscordNotification({
    activity: { id: "a4", factory_id: null, network_id: "n1", contact_id: "c2", type: "reply", body: "Replied", created_at: createdAt } as never,
    contact: { id: "c2", factory_id: null, network_id: "n1", full_name: "Network Contact" } as never,
    network,
  });
  assert.equal(direct?.network_id, "n1");
  assert.equal(direct?.title, "New network activity · Note");
  assert.equal(contact?.network_id, "n1");
  assert.equal(contact?.detail, "Network Contact · Network One");
});

test("activity withdrawal is available only during the two-minute grace period", () => {
  const created = Date.parse(createdAt);
  assert.equal(canWithdrawActivity(createdAt, created + 119_999), true);
  assert.equal(canWithdrawActivity(createdAt, created + 120_000), false);
});

test("activity alert countdown is capped at two minutes and rounds up display seconds", () => {
  const created = Date.parse(createdAt);
  assert.equal(activityAlertRemainingMs(createdAt, created - 5_000), 120_000);
  assert.equal(activityAlertRemainingMs(createdAt, created + 18_250), 101_750);
  assert.equal(formatActivityAlertCountdown(101_750), "1:42");
  assert.equal(formatActivityAlertCountdown(1), "0:01");
  assert.equal(formatActivityAlertCountdown(0), "0:00");
});
