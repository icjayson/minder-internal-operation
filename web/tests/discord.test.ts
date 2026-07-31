import assert from "node:assert/strict";
import test from "node:test";
import {
  discordEmbedFor,
  discordThreadContentFor,
  discordThreadTitleFor,
  discordWebhookKey,
  enrichDiscordAlert,
  pushDiscordEmbeds,
} from "../lib/discord.ts";
import type { DiscordThreadStore } from "../lib/discord-thread-store.ts";

const factoryId = "factory-1";
const networkId = "network-1";
const networks = new Map([
  [networkId, { id: networkId, name: "Source Network" }],
]);

test("every sourced factory owns its own thread regardless of stage", () => {
  for (const stage of ["New", "Contacted"]) {
    const factories = new Map([
      [factoryId, { id: factoryId, name: "Factory One", stage, network_id: networkId }],
    ]);
    const alert = enrichDiscordAlert(
      { kind: "followup_due", factory_id: factoryId, detail: "Factory One" },
      factories,
      networks,
    );

    assert.equal(alert._ownerType, "factory");
    assert.equal(alert._ownerId, factoryId);
    assert.equal(alert._ownerName, "Factory One");
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
    discordThreadTitleFor("network", "SIHUB Sài Gòn"),
    "Network · SIHUB Sài Gòn",
  );
  assert.equal(
    discordThreadTitleFor("factory", "Đặc Sản Kinh Đô Huế"),
    "Factory · Đặc Sản Kinh Đô Huế",
  );
  assert.equal(discordThreadContentFor("SIHUB Sài Gòn", 2), "SIHUB Sài Gòn — 2 alert(s)");
});

test("webhook identity ignores a rotated token and query parameters", () => {
  assert.equal(
    discordWebhookKey("https://discord.com/api/webhooks/123456/secret-token?wait=true"),
    "webhook:123456",
  );
});

test("forum pushes create once and append later alerts to the stored thread", async () => {
  let storedThreadId: string | null = null;
  const store: DiscordThreadStore = {
    async claim() { return storedThreadId ? { claimed: false, threadId: storedThreadId } : { claimed: true, threadId: null }; },
    async complete(owner) { storedThreadId = owner.threadId; },
    async release() {},
  };
  const calls: { url: string; body: Record<string, unknown> }[] = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const body = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
    calls.push({ url: String(input), body });
    return new Response(JSON.stringify({ channel_id: "thread-123" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  try {
    const alert = { kind: "activity_created", factory_id: factoryId, _ownerType: "factory", _ownerId: factoryId, _ownerName: "Factory One", detail: "Factory One" };
    assert.equal(await pushDiscordEmbeds([alert], { webhookUrl: "https://discord.com/api/webhooks/123/token", forum: true, threadStore: store }), true);
    assert.equal(await pushDiscordEmbeds([alert], { webhookUrl: "https://discord.com/api/webhooks/123/token", forum: true, threadStore: store }), true);
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(calls.length, 2);
  assert.equal(calls[0]?.body.thread_name, "Factory · Factory One");
  assert.equal(calls[1]?.body.thread_name, undefined);
  assert.equal(new URL(calls[1]!.url).searchParams.get("thread_id"), "thread-123");
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
