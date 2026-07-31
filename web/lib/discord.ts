// Discord push for alerts.
//   • Text channel  → one message per entity (header + its alert embeds).
//   • Forum channel → one durable THREAD per Factory / Network; every later
//     alert is appended to that entity's existing thread.

import type {
  DiscordThreadOwner,
  DiscordThreadStore,
} from "./discord-thread-store.ts";

type Row = Record<string, unknown>;
type EntityMap = Map<string, Row>;

// Attach transient Discord-only routing metadata. This intentionally does not
// change factory_id/network_id: those fields still identify the alert target and
// therefore keep the deep link pointed at the right drawer.
export function enrichDiscordAlert(
  notification: Row,
  factories: EntityMap,
  networks: EntityMap,
): Row {
  const factoryId = typeof notification.factory_id === "string" ? notification.factory_id : null;
  if (factoryId) {
    const factory = factories.get(factoryId);
    const sourceNetworkId =
      typeof factory?.network_id === "string" ? factory.network_id : null;
    const sourceNetwork = sourceNetworkId ? networks.get(sourceNetworkId) : undefined;
    const sourceNetworkName =
      sourceNetworkId ? String(sourceNetwork?.name ?? sourceNetworkId) : undefined;

    return {
      ...notification,
      _ownerType: "factory",
      _ownerId: factoryId,
      _ownerName: factory?.name ?? notification.detail,
      ...(sourceNetworkName ? { _sourceNetworkName: sourceNetworkName } : {}),
    };
  }

  const networkId = typeof notification.network_id === "string" ? notification.network_id : null;
  if (networkId) {
    const network = networks.get(networkId);
    return {
      ...notification,
      _ownerType: "network",
      _ownerId: networkId,
      _ownerName: network?.name ?? notification.detail,
    };
  }

  return notification;
}

function appUrl(): string {
  return (process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "https://minder-leads.vercel.app").replace(/\/$/, "");
}

export function deepLink(n: Row): string {
  const base = appUrl();
  if (n.network_id) return `${base}/networks?network=${n.network_id}`;
  if (n.factory_id) return `${base}/factories?factory=${n.factory_id}`;
  return base;
}

// Which entity's thread does this alert belong to? Prefer explicit _owner fields
// (set by the scanner so contact alerts inherit the parent's name); else derive.
function ownerOf(n: Row): { key: string; id: string | null; name: string; kind: "factory" | "network" } {
  if (n._ownerType && n._ownerId)
    return { key: `${n._ownerType}:${n._ownerId}`, id: String(n._ownerId), name: String(n._ownerName ?? n.detail ?? "Alerts"), kind: n._ownerType === "network" ? "network" : "factory" };
  if (n.factory_id) return { key: `factory:${n.factory_id}`, id: String(n.factory_id), name: String(n.detail ?? "Factory"), kind: "factory" };
  if (n.network_id) return { key: `network:${n.network_id}`, id: String(n.network_id), name: String(n.detail ?? "Network"), kind: "network" };
  return { key: "misc", id: null, name: String(n.detail ?? "Alerts"), kind: "factory" };
}

export function discordEmbedFor(n: Row) {
  const stale = String(n.kind ?? "").startsWith("stale_");
  const manual = n.kind === "manual_factory";
  const activity = n.kind === "activity_created";
  const urgent = stale || n.kind === "work_trigger_overdue_3d";
  const fields: { name: string; value: string; inline: boolean }[] = [
    { name: activity ? "Activity" : "Alert", value: String(n.title ?? n.kind ?? "Alert"), inline: true },
  ];
  if (n.due_on) fields.push({ name: "Due", value: String(n.due_on), inline: true });
  if (n._activityCreatedAt) fields.push({ name: "Recorded", value: String(n._activityCreatedAt), inline: true });
  if (n._sourceNetworkName)
    fields.push({ name: "Source network", value: String(n._sourceNetworkName), inline: false });
  return {
    title: `${manual ? "📣 " : activity ? "📝 " : urgent ? "⚠️ " : "⏰ "}${String(n.detail ?? "Alert").slice(0, 240)}`,
    description: (n.summary ? String(n.summary) : "").slice(0, 2000),
    url: deepLink(n),
    color: manual ? 0x2d44e0 : activity ? 0x22a98b : urgent ? 0xe0607f : 0xf5b544,
    fields,
  };
}

export function discordThreadTitleFor(
  kind: "factory" | "network",
  name: string,
): string {
  const kindLabel = kind === "network" ? "Network" : "Factory";
  return `${kindLabel} · ${name}`.slice(0, 100);
}

export function discordThreadContentFor(name: string, alertCount: number): string {
  return `${name} — ${alertCount} alert(s)`;
}

// Returns true if any message posted, null if no webhook configured, false on error.
export async function pushDiscordEmbeds(
  notifications: Row[],
  opts: { webhookUrl?: string; forum?: boolean; threadPrefix?: string; threadStore?: DiscordThreadStore | null } = {},
): Promise<boolean | null> {
  const url = opts.webhookUrl ?? process.env.DISCORD_WEBHOOK_URL;
  if (!url) return null;
  if (!notifications.length) return true;

  // DISCORD_THREAD_NAME/threadPrefix remain a legacy forum-mode hint only.
  // Thread titles deliberately start at "Network alert" / "Factory alert".
  const legacyForumHint = (opts.threadPrefix ?? process.env.DISCORD_THREAD_NAME ?? "").trim();
  const forum =
    opts.forum ?? (process.env.DISCORD_FORUM === "true" || legacyForumHint !== "");
  const threadStore = forum
    ? opts.threadStore === undefined
      ? (await import("./discord-thread-store.ts")).supabaseDiscordThreadStore()
      : opts.threadStore
    : null;
  const webhookKey = discordWebhookKey(url);

  // Group alerts by owning entity.
  const groups = new Map<string, { id: string | null; name: string; kind: "factory" | "network"; rows: Row[] }>();
  for (const n of notifications) {
    const o = ownerOf(n);
    const g = groups.get(o.key) ?? { id: o.id, name: o.name, kind: o.kind, rows: [] };
    g.rows.push(n);
    groups.set(o.key, g);
  }

  const post = async (endpoint: string, body: Record<string, unknown>) =>
    fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

  try {
    let ok = false;
    for (const { id, name, kind, rows } of groups.values()) {
      const content = discordThreadContentFor(name, rows.length);
      const embeds = rows.map(discordEmbedFor);

      if (forum) {
        const owner: DiscordThreadOwner | null = id
          ? { ownerType: kind, ownerId: id, webhookKey }
          : null;
        let threadId: string | null = null;
        let claimed = !threadStore || !owner;

        if (threadStore && owner) {
          let claim = await threadStore.claim(owner);
          claimed = claim.claimed;
          threadId = claim.threadId;
          // Another request may currently be creating this entity's thread.
          for (let attempt = 0; !claimed && !threadId && attempt < 12; attempt++) {
            await new Promise((resolve) => setTimeout(resolve, 250));
            claim = await threadStore.claim(owner);
            claimed = claim.claimed;
            threadId = claim.threadId;
          }
        }

        if (threadId) {
          for (let i = 0; i < embeds.length; i++) {
            const r = await post(webhookEndpoint(url, { thread_id: threadId }), {
              content: i === 0 ? content : undefined,
              embeds: [embeds[i]],
            });
            if (!r.ok) return false;
            ok = true;
          }
          continue;
        }

        if (!claimed) return false;

        // First alert creates the canonical thread; every later alert reuses it.
        const title = discordThreadTitleFor(kind, name);
        const res = await post(webhookEndpoint(url, { wait: "true" }), { thread_name: title, content, embeds: [embeds[0]] });
        if (!res.ok) {
          if (threadStore && owner) await threadStore.release(owner);
          return false;
        }
        try {
          const json = (await res.json()) as { channel_id?: string };
          threadId = json.channel_id ?? null;
        } catch { threadId = null; }
        if (!threadId) {
          if (threadStore && owner) await threadStore.release(owner);
          return false;
        }
        if (threadStore && owner) await threadStore.complete({ ...owner, threadId, threadName: title });
        ok = true;
        for (let i = 1; i < embeds.length; i++) {
          const r = await post(webhookEndpoint(url, { thread_id: threadId }), { embeds: [embeds[i]] });
          if (!r.ok) return false;
        }
      } else {
        // Text channel: one message per entity (batch embeds, ≤10 per message).
        for (let i = 0; i < embeds.length; i += 10) {
          const r = await post(url, { content: i === 0 ? content : undefined, embeds: embeds.slice(i, i + 10) });
          ok = ok || r.ok;
        }
      }
    }
    return ok;
  } catch {
    return false;
  }
}

export function discordWebhookKey(webhookUrl: string): string {
  try {
    const parsed = new URL(webhookUrl);
    const parts = parsed.pathname.split("/").filter(Boolean);
    const webhookIndex = parts.lastIndexOf("webhooks");
    const webhookId = webhookIndex >= 0 ? parts[webhookIndex + 1] : null;
    if (webhookId) return `webhook:${webhookId}`;
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return webhookUrl.split("?")[0];
  }
}

function webhookEndpoint(webhookUrl: string, params: Record<string, string>): string {
  const endpoint = new URL(webhookUrl);
  for (const [key, value] of Object.entries(params)) endpoint.searchParams.set(key, value);
  return endpoint.toString();
}
