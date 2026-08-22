// Discord push for alerts.
//   • Text channel  → one message per alert, so every delivery can be logged
//     and deleted independently.
//   • Forum channel → one durable THREAD per Factory / Network; every later
//     alert is appended to that entity's existing thread.

import type {
  DiscordOwnerType,
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
  contacts: EntityMap = new Map(),
  workItems: EntityMap = new Map(),
  investors: EntityMap = new Map(),
  competitions: EntityMap = new Map(),
): Row {
  const contactId =
    typeof notification.contact_id === "string"
      ? notification.contact_id
      : typeof notification.work_item_id === "string"
        ? workItems.get(notification.work_item_id)?.pic_contact_id
        : null;
  const contact = typeof contactId === "string" ? contacts.get(contactId) : undefined;
  const pic = contact
    ? {
        _picName: contact.full_name,
        _picLinkedInUrl: contact.linkedin_url,
      }
    : {};
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
      ...pic,
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
      ...pic,
      _ownerType: "network",
      _ownerId: networkId,
      _ownerName: network?.name ?? notification.detail,
    };
  }

  const investorId = typeof notification.investor_id === "string" ? notification.investor_id : null;
  if (investorId) {
    const investor = investors.get(investorId);
    return {
      ...notification,
      ...pic,
      _ownerType: "investor",
      _ownerId: investorId,
      _ownerName: investor?.name ?? notification.detail,
    };
  }

  const competitionId = typeof notification.competition_id === "string" ? notification.competition_id : null;
  if (competitionId) {
    const competition = competitions.get(competitionId);
    return {
      ...notification,
      ...pic,
      _ownerType: "competition",
      _ownerId: competitionId,
      _ownerName: competition?.name ?? notification.detail,
    };
  }

  return { ...notification, ...pic };
}

function appUrl(): string {
  return (process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "https://minder-leads.vercel.app").replace(/\/$/, "");
}

export function deepLink(n: Row): string {
  const base = appUrl();
  if (n.network_id) return `${base}/networks?network=${n.network_id}`;
  if (n.factory_id) return `${base}/factories?factory=${n.factory_id}`;
  if (n.investor_id) return `${base}/fundraising/investors?investor=${n.investor_id}`;
  if (n.competition_id) return `${base}/fundraising/competitions?competition=${n.competition_id}`;
  return base;
}

const OWNER_TYPES: readonly DiscordOwnerType[] = ["factory", "network", "investor", "competition"];
function toOwnerType(value: unknown): DiscordOwnerType {
  return OWNER_TYPES.includes(value as DiscordOwnerType) ? (value as DiscordOwnerType) : "factory";
}

// Which entity's thread does this alert belong to? Prefer explicit _owner fields
// (set by the scanner so contact alerts inherit the parent's name); else derive.
function ownerOf(n: Row): { key: string; id: string | null; name: string; kind: DiscordOwnerType } {
  if (n._ownerType && n._ownerId)
    return { key: `${n._ownerType}:${n._ownerId}`, id: String(n._ownerId), name: String(n._ownerName ?? n.detail ?? "Alerts"), kind: toOwnerType(n._ownerType) };
  if (n.factory_id) return { key: `factory:${n.factory_id}`, id: String(n.factory_id), name: String(n.detail ?? "Factory"), kind: "factory" };
  if (n.network_id) return { key: `network:${n.network_id}`, id: String(n.network_id), name: String(n.detail ?? "Network"), kind: "network" };
  if (n.investor_id) return { key: `investor:${n.investor_id}`, id: String(n.investor_id), name: String(n.detail ?? "Investor"), kind: "investor" };
  if (n.competition_id) return { key: `competition:${n.competition_id}`, id: String(n.competition_id), name: String(n.detail ?? "Programme"), kind: "competition" };
  return { key: "misc", id: null, name: String(n.detail ?? "Alerts"), kind: "factory" };
}

export function discordEmbedFor(n: Row) {
  const stale = String(n.kind ?? "").startsWith("stale_");
  const manual = n.kind === "manual_factory";
  const activity = n.kind === "activity_created";
  const urgent = stale || n.kind === "work_trigger_overdue_3d";
  // Source network is a single inline row in the description ("Source network:
  // X"), not a standalone embed field (which Discord renders as two lines).
  const sourceNetworkRow = n._sourceNetworkName
    ? [`**Source network:** ${String(n._sourceNetworkName)}`]
    : [];
  const ownerName = String(n._ownerName ?? n.detail ?? "Alert");
  const mainBody = discordMainBody(n, ownerName);
  const metadataRows = activity
    ? [
        `**Status update:** ${String(n.title ?? "Activity")}`,
        ...(n._picName ? [`**PIC:** ${discordPicValue(n)}`] : []),
        ...sourceNetworkRow,
      ].join("\n")
    : [
        `**Alert:** ${String(n.title ?? n.kind ?? "Alert")}`,
        ...(n.due_on ? [`**Due:** ${String(n.due_on)}`] : []),
        ...(n._picName ? [`**PIC:** ${discordPicValue(n)}`] : []),
        ...sourceNetworkRow,
      ].join("\n");
  const descriptionSeparator = mainBody && metadataRows ? "\n\n" : "";
  const mainBodyLimit = 2000 - metadataRows.length - descriptionSeparator.length;
  return {
    title: ownerName.slice(0, 256),
    description: `${formatMainBody(mainBody, mainBodyLimit)}${descriptionSeparator}${metadataRows}`,
    url: deepLink(n),
    color: manual ? 0x2d44e0 : activity ? 0x22a98b : urgent ? 0xe0607f : 0xf5b544,
    fields: [],
  };
}

function discordMainBody(n: Row, ownerName: string): string {
  if (n.summary) return String(n.summary);
  const detail = String(n.detail ?? "");
  const ownerPrefix = `${ownerName} — `;
  return detail.startsWith(ownerPrefix) ? detail.slice(ownerPrefix.length) : "";
}

function formatMainBody(value: string, limit = 2000): string {
  if (!value.trim() || limit <= 0) return "";
  const lines = value.trim().split(/\r?\n/).filter((line) => line.trim());
  const formatted: string[] = [];
  let used = 0;
  for (const line of lines) {
    const separatorLength = formatted.length ? 1 : 0;
    const wrapperLength = "## ****".length;
    const available = limit - used - separatorLength - wrapperLength;
    if (available <= 0) break;
    const next = `## **${line.trim().slice(0, available)}**`;
    formatted.push(next);
    used += separatorLength + next.length;
  }
  return formatted.join("\n");
}

function discordPicValue(n: Row): string {
  const name = String(n._picName);
  const url = typeof n._picLinkedInUrl === "string" ? n._picLinkedInUrl.trim() : "";
  if (!/^https?:\/\//i.test(url)) return name;
  return `[${name.replace(/[\[\]]/g, "")}](${url})`;
}

const OWNER_LABELS: Record<DiscordOwnerType, string> = {
  factory: "Factory",
  network: "Network",
  investor: "Investor",
  competition: "Programme",
};

export function discordThreadTitleFor(
  kind: DiscordOwnerType,
  name: string,
): string {
  return `${OWNER_LABELS[kind] ?? "Factory"} · ${name}`.slice(0, 100);
}

// A message that was successfully posted to Discord. `notification` is the same
// (enriched) row that produced the embed, so callers can log/associate it.
export type DiscordDelivery = {
  notification: Row;
  messageId: string;
  threadId: string | null;
  webhookKey: string;
};

// A flat, insert-ready row for the discord_alert_log table. Kept pure (no DB)
// so lib/discord.ts stays testable; callers do the actual insert.
export function discordAlertLogRow(delivery: DiscordDelivery, source: string): Record<string, unknown> {
  const n = delivery.notification;
  const owner = ownerOf(n);
  // Only scan/manual deliveries originate from public.notifications. Activity
  // and test payloads may gain their own `id` later, but must never be treated
  // as a notifications foreign key.
  const notificationId =
    (source === "scan" || source === "manual") && typeof n.id === "string"
      ? n.id
      : null;
  return {
    notification_id: notificationId,
    message_id: delivery.messageId,
    thread_id: delivery.threadId,
    webhook_key: delivery.webhookKey,
    source,
    kind: typeof n.kind === "string" ? n.kind : null,
    title: typeof n.title === "string" ? n.title : null,
    detail: typeof n.detail === "string" ? n.detail : null,
    summary: typeof n.summary === "string" ? n.summary : null,
    due_on: typeof n.due_on === "string" ? n.due_on : null,
    task_done_at: typeof n.read_at === "string" ? n.read_at : null,
    owner_type: owner.kind,
    owner_id: owner.id,
    owner_name: owner.name,
    deep_link: deepLink(n),
  };
}

// Returns true if any message posted, null if no webhook configured, false on error.
// When opts.onDelivered is set, it is called once per successfully posted message
// with its Discord id (requires ?wait=true, which this adds to each post).
export async function pushDiscordEmbeds(
  notifications: Row[],
  opts: {
    webhookUrl?: string;
    forum?: boolean;
    threadPrefix?: string;
    threadStore?: DiscordThreadStore | null;
    onDelivered?: (delivery: DiscordDelivery) => void;
  } = {},
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
  const groups = new Map<string, { id: string | null; name: string; kind: DiscordOwnerType; rows: Row[] }>();
  for (const n of notifications) {
    const o = ownerOf(n);
    const g = groups.get(o.key) ?? { id: o.id, name: o.name, kind: o.kind, rows: [] };
    g.rows.push(n);
    groups.set(o.key, g);
  }

  const post = async (endpoint: string, body: Record<string, unknown>) => {
    let response: Response | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (response.status !== 429 || attempt === 2) return response;

      let retrySeconds = Number(response.headers.get("retry-after"));
      if (!Number.isFinite(retrySeconds)) {
        try {
          const payload = (await response.clone().json()) as { retry_after?: number };
          retrySeconds = Number(payload.retry_after);
        } catch { retrySeconds = 1; }
      }
      const retryMs = Math.min(5000, Math.max(0, retrySeconds * 1000));
      await new Promise((resolve) => setTimeout(resolve, retryMs));
    }
    return response!;
  };

  // Report a posted message's id to the caller (needs ?wait=true on the post).
  const capture = async (response: Response, notification: Row, tId: string | null): Promise<void> => {
    if (!opts.onDelivered || !response.ok) return;
    try {
      const json = (await response.clone().json()) as { id?: string };
      if (json.id) opts.onDelivered({ notification, messageId: String(json.id), threadId: tId, webhookKey });
    } catch { /* wait not honored / no body — nothing to capture */ }
  };

  try {
    let ok = false;
    for (const { id, name, kind, rows } of groups.values()) {
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
            const r = await post(webhookEndpoint(url, { thread_id: threadId, wait: "true" }), {
              embeds: [embeds[i]],
            });
            if (!r.ok) return false;
            ok = true;
            await capture(r, rows[i], threadId);
          }
          continue;
        }

        if (!claimed) return false;

        // First alert creates the canonical thread; every later alert reuses it.
        const title = discordThreadTitleFor(kind, name);
        const res = await post(webhookEndpoint(url, { wait: "true" }), { thread_name: title, embeds: [embeds[0]] });
        if (!res.ok) {
          if (threadStore && owner) await threadStore.release(owner);
          return false;
        }
        let firstMessageId: string | null = null;
        try {
          const json = (await res.json()) as { channel_id?: string; id?: string };
          threadId = json.channel_id ?? null;
          firstMessageId = json.id ?? null;
        } catch { threadId = null; }
        if (!threadId) {
          if (threadStore && owner) await threadStore.release(owner);
          return false;
        }
        if (threadStore && owner) await threadStore.complete({ ...owner, threadId, threadName: title });
        ok = true;
        if (opts.onDelivered && firstMessageId)
          opts.onDelivered({ notification: rows[0], messageId: firstMessageId, threadId, webhookKey });
        for (let i = 1; i < embeds.length; i++) {
          const r = await post(webhookEndpoint(url, { thread_id: threadId, wait: "true" }), { embeds: [embeds[i]] });
          if (!r.ok) return false;
          await capture(r, rows[i], threadId);
        }
      } else {
        // Keep a 1:1 alert-to-message mapping so Alert Log always receives a
        // Discord message id and can delete one alert without deleting others.
        for (let i = 0; i < embeds.length; i++) {
          const r = await post(webhookEndpoint(url, { wait: "true" }), { embeds: [embeds[i]] });
          if (!r.ok) return false;
          ok = true;
          await capture(r, rows[i], null);
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
