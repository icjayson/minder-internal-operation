import type { Activity, Contact, Factory, FundraisingLead, Network } from "@/lib/types";

type ActivityWithNetwork = Activity & { network_id: string | null };

export function activityTypeLabel(type: string): string {
  return type.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function activityDiscordNotification({
  activity,
  contact,
  factory,
  network,
  investor,
  competition,
}: {
  activity: ActivityWithNetwork;
  contact?: Contact;
  factory?: Pick<Factory, "id" | "name" | "stage" | "network_id">;
  network?: Pick<Network, "id" | "name">;
  investor?: Pick<FundraisingLead, "id" | "name">;
  competition?: Pick<FundraisingLead, "id" | "name">;
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
      title: `Contact activity · ${label}`,
      detail: `${contact.full_name}${parentName ? ` · ${parentName}` : ""}`,
      summary: body,
      contact_id: contact.id,
      factory_id: factoryId,
      network_id: networkId,
      _picName: contact.full_name,
      _picLinkedInUrl: contact.linkedin_url,
    };
  }

  if (activity.factory_id && factory) {
    return {
      kind: "activity_created",
      title: `Factory activity · ${label}`,
      detail: factory.name,
      summary: body,
      factory_id: activity.factory_id,
    };
  }

  if (activity.network_id && network) {
    return {
      kind: "activity_created",
      title: `Network activity · ${label}`,
      detail: network.name,
      summary: body,
      network_id: activity.network_id,
    };
  }

  if (activity.investor_id && investor) {
    return {
      kind: "activity_created",
      title: `Investor activity · ${label}`,
      detail: investor.name,
      summary: body,
      investor_id: activity.investor_id,
    };
  }

  if (activity.competition_id && competition) {
    return {
      kind: "activity_created",
      title: `Programme activity · ${label}`,
      detail: competition.name,
      summary: body,
      competition_id: activity.competition_id,
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
