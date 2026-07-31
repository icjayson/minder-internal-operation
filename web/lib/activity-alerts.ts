import type { Activity, Contact, Factory, Network } from "@/lib/types";

type ActivityWithNetwork = Activity & { network_id: string | null };

export function activityTypeLabel(type: string): string {
  return type.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function activityDiscordNotification({
  activity,
  contact,
  factory,
  network,
}: {
  activity: ActivityWithNetwork;
  contact?: Contact;
  factory?: Pick<Factory, "id" | "name" | "stage" | "network_id">;
  network?: Pick<Network, "id" | "name">;
}): Record<string, unknown> | null {
  const label = activityTypeLabel(activity.type);
  const body = activity.body?.trim() || "Activity recorded.";

  if (contact) {
    const factoryId = activity.factory_id ?? contact.factory_id;
    const networkId = factoryId ? null : activity.network_id ?? contact.network_id;
    const parentName = factory?.name ?? network?.name;
    if (!factoryId && !networkId) return null;
    return {
      kind: "activity_created",
      title: `New contact activity · ${label}`,
      detail: `${contact.full_name}${parentName ? ` · ${parentName}` : ""}`,
      summary: body,
      contact_id: contact.id,
      factory_id: factoryId,
      network_id: networkId,
      _activityCreatedAt: activity.created_at,
    };
  }

  if (activity.factory_id && factory) {
    return {
      kind: "activity_created",
      title: `New factory activity · ${label}`,
      detail: factory.name,
      summary: body,
      factory_id: activity.factory_id,
      _activityCreatedAt: activity.created_at,
    };
  }

  if (activity.network_id && network) {
    return {
      kind: "activity_created",
      title: `New network activity · ${label}`,
      detail: network.name,
      summary: body,
      network_id: activity.network_id,
      _activityCreatedAt: activity.created_at,
    };
  }

  return null;
}

export function canWithdrawActivity(createdAt: string, now = Date.now()): boolean {
  return activityAlertRemainingMs(createdAt, now) > 0;
}

export function activityAlertRemainingMs(createdAt: string, now = Date.now()): number {
  const created = new Date(createdAt).getTime();
  if (!Number.isFinite(created)) return 0;
  return Math.max(0, Math.min(2 * 60_000, created + 2 * 60_000 - now));
}

export function formatActivityAlertCountdown(remainingMs: number): string {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
