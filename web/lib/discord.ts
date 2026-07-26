// Discord push for alerts.
//   • Text channel  → one message per entity (header + its alert embeds).
//   • Forum channel → one THREAD per routing owner; each alert of that owner
//     becomes a separate message inside its thread.
// Grouping owner: a network and its New/Contacted sourced factories share the
// network thread. Once a sourced factory reaches Replied, it owns its thread.

type Row = Record<string, unknown>;
type EntityMap = Map<string, Row>;

const NETWORK_OWNED_FACTORY_STAGES = new Set(["New", "Contacted"]);

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

    if (
      sourceNetworkId &&
      sourceNetwork &&
      NETWORK_OWNED_FACTORY_STAGES.has(String(factory?.stage ?? ""))
    ) {
      return {
        ...notification,
        _ownerType: "network",
        _ownerId: sourceNetworkId,
        _ownerName: sourceNetwork.name,
        _sourceNetworkName: sourceNetworkName,
      };
    }

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
function ownerOf(n: Row): { key: string; name: string; kind: "factory" | "network" } {
  if (n._ownerType && n._ownerId)
    return { key: `${n._ownerType}:${n._ownerId}`, name: String(n._ownerName ?? n.detail ?? "Alerts"), kind: n._ownerType === "network" ? "network" : "factory" };
  if (n.network_id) return { key: `network:${n.network_id}`, name: String(n.detail ?? "Network"), kind: "network" };
  if (n.factory_id) return { key: `factory:${n.factory_id}`, name: String(n.detail ?? "Factory"), kind: "factory" };
  return { key: "misc", name: String(n.detail ?? "Alerts"), kind: "factory" };
}

export function discordEmbedFor(n: Row) {
  const stale = String(n.kind ?? "").startsWith("stale_");
  const fields: { name: string; value: string; inline: boolean }[] = [
    { name: "Alert", value: String(n.title ?? n.kind ?? "Alert"), inline: true },
  ];
  if (n.due_on) fields.push({ name: "Due", value: String(n.due_on), inline: true });
  if (n._sourceNetworkName)
    fields.push({ name: "Source network", value: String(n._sourceNetworkName), inline: false });
  return {
    title: `${stale ? "⚠️ " : "⏰ "}${String(n.detail ?? "Alert").slice(0, 240)}`,
    description: (n.summary ? String(n.summary) : "").slice(0, 2000),
    url: deepLink(n),
    color: stale ? 0xe0607f : 0xf5b544,
    fields,
  };
}

function stamp(): string {
  return new Date().toISOString().slice(0, 16).replace("T", " ");
}

export function discordThreadTitleFor(
  kind: "factory" | "network",
  name: string,
  when = stamp(),
): string {
  const kindLabel = kind === "network" ? "Network" : "Factory";
  return `${kindLabel} alert · ${name} · ${when}`.slice(0, 100);
}

export function discordThreadContentFor(name: string, alertCount: number): string {
  return `${name} — ${alertCount} alert(s)`;
}

// Returns true if any message posted, null if no webhook configured, false on error.
export async function pushDiscordEmbeds(
  notifications: Row[],
  opts: { webhookUrl?: string; forum?: boolean; threadPrefix?: string } = {},
): Promise<boolean | null> {
  const url = opts.webhookUrl ?? process.env.DISCORD_WEBHOOK_URL;
  if (!url) return null;
  if (!notifications.length) return true;

  // DISCORD_THREAD_NAME/threadPrefix remain a legacy forum-mode hint only.
  // Thread titles deliberately start at "Network alert" / "Factory alert".
  const legacyForumHint = (opts.threadPrefix ?? process.env.DISCORD_THREAD_NAME ?? "").trim();
  const forum =
    opts.forum ?? (process.env.DISCORD_FORUM === "true" || legacyForumHint !== "");
  const when = stamp();

  // Group alerts by owning entity.
  const groups = new Map<string, { name: string; kind: "factory" | "network"; rows: Row[] }>();
  for (const n of notifications) {
    const o = ownerOf(n);
    const g = groups.get(o.key) ?? { name: o.name, kind: o.kind, rows: [] };
    g.rows.push(n);
    groups.set(o.key, g);
  }

  const post = async (endpoint: string, body: Record<string, unknown>) =>
    fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

  try {
    let ok = false;
    for (const { name, kind, rows } of groups.values()) {
      const content = discordThreadContentFor(name, rows.length);
      const embeds = rows.map(discordEmbedFor);

      if (forum) {
        // Create the entity's thread (header + first alert), then add the rest.
        const title = discordThreadTitleFor(kind, name, when);
        const res = await post(`${url}?wait=true`, { thread_name: title, content, embeds: [embeds[0]] });
        ok = ok || res.ok;
        let threadId: string | null = null;
        if (res.ok) {
          try {
            const j = (await res.json()) as { channel_id?: string; id?: string };
            threadId = j.channel_id ?? j.id ?? null;
          } catch { /* can't thread the rest; they'd start new posts */ }
        }
        for (let i = 1; i < embeds.length && threadId; i++) {
          const r = await post(`${url}?thread_id=${threadId}`, { embeds: [embeds[i]] });
          ok = ok || r.ok;
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
