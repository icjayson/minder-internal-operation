import assert from "node:assert/strict";
import test from "node:test";
import {
  discordEmbedFor,
  discordThreadContentFor,
  discordThreadTitleFor,
  enrichDiscordAlert,
} from "../lib/discord.ts";

const factoryId = "factory-1";
const networkId = "network-1";
const networks = new Map([
  [networkId, { id: networkId, name: "Source Network" }],
]);

test("New and Contacted sourced factories route to the network thread", () => {
  for (const stage of ["New", "Contacted"]) {
    const factories = new Map([
      [factoryId, { id: factoryId, name: "Factory One", stage, network_id: networkId }],
    ]);
    const alert = enrichDiscordAlert(
      { kind: "followup_due", factory_id: factoryId, detail: "Factory One" },
      factories,
      networks,
    );

    assert.equal(alert._ownerType, "network");
    assert.equal(alert._ownerId, networkId);
    assert.equal(alert._ownerName, "Source Network");
    assert.equal(alert._sourceNetworkName, "Source Network");
    assert.equal(alert.factory_id, factoryId);
    assert.equal(alert.network_id, undefined);
  }
});

test("a sourced factory owns its thread from Replied onward", () => {
  const factories = new Map([
    [factoryId, { id: factoryId, name: "Factory One", stage: "Replied", network_id: networkId }],
  ]);
  const alert = enrichDiscordAlert(
    { kind: "stale_factory", factory_id: factoryId, detail: "Factory One" },
    factories,
    networks,
  );

  assert.equal(alert._ownerType, "factory");
  assert.equal(alert._ownerId, factoryId);
  assert.equal(alert._ownerName, "Factory One");
  assert.equal(alert._sourceNetworkName, "Source Network");
});

test("factory embed shows its source network note", () => {
  const embed = discordEmbedFor({
    kind: "stale_factory",
    title: "No update in 3+ days",
    detail: "Factory One",
    _sourceNetworkName: "Source Network",
  });

  assert.deepEqual(
    embed.fields.find((field) => field.name === "Source network"),
    { name: "Source network", value: "Source Network", inline: false },
  );
});

test("thread display text starts at Network/Factory alert without a configured prefix", () => {
  assert.equal(
    discordThreadTitleFor("network", "SIHUB Sài Gòn", "2026-07-26 04:45"),
    "Network alert · SIHUB Sài Gòn · 2026-07-26 04:45",
  );
  assert.equal(
    discordThreadTitleFor("factory", "Đặc Sản Kinh Đô Huế", "2026-07-26 04:45"),
    "Factory alert · Đặc Sản Kinh Đô Huế · 2026-07-26 04:45",
  );
  assert.equal(discordThreadContentFor("SIHUB Sài Gòn", 2), "SIHUB Sài Gòn — 2 alert(s)");
});

test("manual and day-3 reminders use distinct Discord emphasis", () => {
  const manual = discordEmbedFor({ kind: "manual_factory", title: "Decision needed", detail: "Factory One" });
  const overdue = discordEmbedFor({ kind: "work_trigger_overdue_3d", title: "Overdue", detail: "Factory One — Task" });
  assert.equal(manual.title.startsWith("📣 "), true);
  assert.equal(manual.color, 0x2d44e0);
  assert.equal(overdue.title.startsWith("⚠️ "), true);
  assert.equal(overdue.color, 0xe0607f);
});

test("activity alerts use the activity icon, colour and field label", () => {
  const embed = discordEmbedFor({
    kind: "activity_created",
    title: "New contact activity · Note",
    detail: "Alex Owner · Factory One",
    summary: "Call completed",
    _activityCreatedAt: "2026-08-01T00:00:00.000Z",
  });
  assert.equal(embed.title.startsWith("📝 "), true);
  assert.equal(embed.color, 0x22a98b);
  assert.equal(embed.fields[0]?.name, "Activity");
  assert.equal(embed.fields.some((field) => field.name === "Recorded"), true);
});
