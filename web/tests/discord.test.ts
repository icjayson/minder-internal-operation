import assert from "node:assert/strict";
import test from "node:test";
import {
  discordAlertLogRow,
  discordEmbedFor,
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

test("Discord log snapshots actionable notification fields", () => {
  const row = discordAlertLogRow({
    notification: {
      id: "00000000-0000-4000-8000-000000000001",
      kind: "stale_factory",
      title: "No update in 3+ days",
      detail: "Factory One",
      summary: "AI recap text",
      due_on: "2026-08-09",
      read_at: null,
      factory_id: factoryId,
      _ownerType: "factory",
      _ownerId: factoryId,
      _ownerName: "Factory One",
    },
    messageId: "message-1",
    threadId: "thread-1",
    webhookKey: "webhook:123",
  }, "scan");

  assert.equal(row.notification_id, "00000000-0000-4000-8000-000000000001");
  assert.equal(row.summary, "AI recap text");
  assert.equal(row.due_on, "2026-08-09");
  assert.equal(row.task_done_at, null);
  assert.equal(row.owner_id, factoryId);
});

test("activity deliveries keep their recap but never impersonate a notification", () => {
  const row = discordAlertLogRow({
    notification: {
      id: "00000000-0000-4000-8000-000000000002",
      kind: "activity_created",
      title: "Factory activity · Note",
      detail: "Factory One",
      summary: "Status update body",
      factory_id: factoryId,
    },
    messageId: "message-2",
    threadId: null,
    webhookKey: "webhook:123",
  }, "activity");

  assert.equal(row.notification_id, null);
  assert.equal(row.summary, "Status update body");
});

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

test("factory embed shows its source network as a single description row", () => {
  const embed = discordEmbedFor({
    kind: "stale_factory",
    title: "No update in 3+ days",
    detail: "Factory One",
    _sourceNetworkName: "Source Network",
  });

  assert.match(embed.description, /\*\*Source network:\*\* Source Network/);
  assert.deepEqual(embed.fields, []);
});

test("thread titles start with their entity type without a configured prefix", () => {
  assert.equal(
    discordThreadTitleFor("network", "SIHUB Sài Gòn"),
    "Network · SIHUB Sài Gòn",
  );
  assert.equal(
    discordThreadTitleFor("factory", "Đặc Sản Kinh Đô Huế"),
    "Factory · Đặc Sản Kinh Đô Huế",
  );
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
  assert.equal(calls[0]?.body.content, undefined);
  assert.equal(calls[1]?.body.thread_name, undefined);
  assert.equal(calls[1]?.body.content, undefined);
  assert.equal(new URL(calls[1]!.url).searchParams.get("thread_id"), "thread-123");
});

test("text-channel pushes keep one deletable Discord message per alert", async () => {
  const calls: { url: string; body: Record<string, unknown> }[] = [];
  const delivered: string[] = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const body = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
    calls.push({ url: String(input), body });
    return new Response(JSON.stringify({ id: `message-${calls.length}` }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  try {
    const owner = { _ownerType: "factory", _ownerId: factoryId, _ownerName: "Factory One", factory_id: factoryId };
    const pushed = await pushDiscordEmbeds([
      { ...owner, kind: "followup_due", title: "First alert" },
      { ...owner, kind: "stale_factory", title: "Second alert" },
    ], {
      webhookUrl: "https://discord.com/api/webhooks/123/token",
      forum: false,
      onDelivered: (delivery) => delivered.push(delivery.messageId),
    });
    assert.equal(pushed, true);
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(calls.length, 2);
  assert.deepEqual(delivered, ["message-1", "message-2"]);
  for (const call of calls) {
    assert.equal(new URL(call.url).searchParams.get("wait"), "true");
    assert.equal((call.body.embeds as unknown[]).length, 1);
  }
});

test("Discord pushes retry a rate-limited request", async () => {
  let attempts = 0;
  const delivered: string[] = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    attempts++;
    if (attempts === 1) {
      return new Response(JSON.stringify({ retry_after: 0 }), {
        status: 429,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ id: "message-after-retry" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  try {
    const pushed = await pushDiscordEmbeds([
      { kind: "followup_due", factory_id: factoryId, title: "Retry me" },
    ], {
      webhookUrl: "https://discord.com/api/webhooks/123/token",
      forum: false,
      onDelivered: (delivery) => delivered.push(delivery.messageId),
    });
    assert.equal(pushed, true);
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(attempts, 2);
  assert.deepEqual(delivered, ["message-after-retry"]);
});

test("manual and day-3 reminders use distinct Discord emphasis", () => {
  const manual = discordEmbedFor({ kind: "manual_factory", title: "Decision needed", detail: "Factory One", summary: "Book a call" });
  const overdue = discordEmbedFor({ kind: "work_trigger_overdue_3d", title: "Overdue", detail: "Factory One — Task", _ownerName: "Factory One" });
  assert.equal(manual.title, "Factory One");
  assert.equal(manual.description, "## **Book a call**\n\n**Alert:** Decision needed");
  assert.equal(manual.color, 0x2d44e0);
  assert.equal(overdue.title, "Factory One");
  assert.equal(overdue.description, "## **Task**\n\n**Alert:** Overdue");
  assert.equal(overdue.color, 0xe0607f);
});

test("contact activity metadata uses full-width rows below the large body", () => {
  const embed = discordEmbedFor({
    kind: "activity_created",
    title: "Contact activity · Note",
    detail: "Alex Owner · Factory One",
    _ownerName: "Factory One",
    summary: "Call completed",
    _activityCreatedAt: "2026-08-01T00:00:00.000Z",
    _picName: "Alex Owner",
    _picLinkedInUrl: "https://www.linkedin.com/in/alex-owner",
  });
  assert.equal(embed.title, "Factory One");
  assert.equal(
    embed.description,
    "## **Call completed**\n\n**Status update:** Contact activity · Note\n**PIC:** [Alex Owner](https://www.linkedin.com/in/alex-owner)",
  );
  assert.equal(embed.color, 0x22a98b);
  assert.deepEqual(embed.fields, []);
});

test("factory activity uses one full-width status update row without a PIC", () => {
  const embed = discordEmbedFor({
    kind: "activity_created",
    title: "Factory activity · Stage Change",
    detail: "Factory One",
    summary: "Nurture → Closed Won",
  });
  assert.equal(
    embed.description,
    "## **Nurture → Closed Won**\n\n**Status update:** Factory activity · Stage Change",
  );
  assert.deepEqual(embed.fields, []);
});

test("work inventory alerts use their assigned contact as the linked PIC", () => {
  const contacts = new Map([
    ["contact-1", { id: "contact-1", full_name: "Alex Owner", linkedin_url: "https://www.linkedin.com/in/alex-owner" }],
  ]);
  const workItems = new Map([
    ["work-1", { id: "work-1", pic_contact_id: "contact-1" }],
  ]);
  const alert = enrichDiscordAlert(
    { kind: "work_trigger_due_soon", factory_id: factoryId, work_item_id: "work-1", title: "Work item due in 1 day", detail: "Factory One — Book a call", due_on: "2026-08-03" },
    new Map([[factoryId, { id: factoryId, name: "Factory One" }]]),
    networks,
    contacts,
    workItems,
  );
  const embed = discordEmbedFor(alert);
  assert.equal(embed.title, "Factory One");
  assert.equal(
    embed.description,
    "## **Book a call**\n\n**Alert:** Work item due in 1 day\n**Due:** 2026-08-03\n**PIC:** [Alex Owner](https://www.linkedin.com/in/alex-owner)",
  );
  assert.deepEqual(embed.fields, []);
});
