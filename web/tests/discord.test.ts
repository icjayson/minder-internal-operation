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
