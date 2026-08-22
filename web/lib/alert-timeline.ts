import type { Notification } from "./types";

export type AlertLogRecord = {
  id: string;
  notification_id: string | null;
  message_id: string | null;
  thread_id: string | null;
  source: string | null;
  kind: string | null;
  title: string | null;
  detail: string | null;
  summary: string | null;
  due_on: string | null;
  owner_type: string | null;
  owner_id: string | null;
  owner_name: string | null;
  deep_link: string | null;
  task_done_at: string | null;
  created_at: string;
  deleted_at: string | null;
};

export type AlertDeliveryState = "logged" | "pending" | "unlogged";

export type AlertTimelineRow = AlertLogRecord & {
  key: string;
  log_id: string | null;
  delivery_state: AlertDeliveryState;
  factory_id: string | null;
  contact_id: string | null;
  network_id: string | null;
  investor_id: string | null;
  competition_id: string | null;
};

function notificationOwner(notification: Notification): { type: string | null; id: string | null } {
  if (notification.factory_id) return { type: "factory", id: notification.factory_id };
  if (notification.network_id) return { type: "network", id: notification.network_id };
  if (notification.investor_id) return { type: "investor", id: notification.investor_id };
  if (notification.competition_id) return { type: "competition", id: notification.competition_id };
  return { type: null, id: null };
}

function targetIds(notification: Notification | undefined, log: AlertLogRecord) {
  if (notification) {
    return {
      factory_id: notification.factory_id,
      contact_id: notification.contact_id,
      network_id: notification.network_id,
      investor_id: notification.investor_id,
      competition_id: notification.competition_id,
    };
  }

  return {
    factory_id: log.owner_type === "factory" ? log.owner_id : null,
    contact_id: null,
    network_id: log.owner_type === "network" ? log.owner_id : null,
    investor_id: log.owner_type === "investor" ? log.owner_id : null,
    competition_id: log.owner_type === "competition" ? log.owner_id : null,
  };
}

// Merge the persistent Discord delivery history with canonical notifications.
// A notification without a delivery log remains visible, so merging the two
// screens never hides work merely because Discord is unavailable or logging
// failed. Completed rows are deliberately retained.
export function mergeAlertTimeline(
  logs: AlertLogRecord[],
  notifications: Notification[],
): AlertTimelineRow[] {
  const notificationsById = new Map(notifications.map((notification) => [notification.id, notification]));
  const linkedNotificationIds = new Set(
    logs.map((log) => log.notification_id).filter((id): id is string => !!id),
  );

  const delivered = logs.map((log): AlertTimelineRow => {
    const notification = log.notification_id
      ? notificationsById.get(log.notification_id)
      : undefined;
    return {
      ...log,
      ...targetIds(notification, log),
      key: `log:${log.id}`,
      log_id: log.id,
      delivery_state: "logged",
      summary: log.summary ?? notification?.summary ?? null,
      due_on: log.due_on ?? notification?.due_on ?? null,
      task_done_at: log.task_done_at ?? notification?.read_at ?? null,
    };
  });

  const notificationOnly = notifications
    .filter((notification) => !linkedNotificationIds.has(notification.id))
    .map((notification): AlertTimelineRow => {
      const owner = notificationOwner(notification);
      return {
        id: notification.id,
        key: `notification:${notification.id}`,
        log_id: null,
        notification_id: notification.id,
        message_id: null,
        thread_id: null,
        source: notification.kind === "manual_factory" ? "manual" : "scan",
        kind: notification.kind,
        title: notification.title,
        detail: notification.detail,
        summary: notification.summary,
        due_on: notification.due_on,
        owner_type: owner.type,
        owner_id: owner.id,
        owner_name: null,
        deep_link: null,
        task_done_at: notification.read_at,
        created_at: notification.created_at,
        deleted_at: null,
        delivery_state: notification.pushed_at ? "unlogged" : "pending",
        factory_id: notification.factory_id,
        contact_id: notification.contact_id,
        network_id: notification.network_id,
        investor_id: notification.investor_id,
        competition_id: notification.competition_id,
      };
    });

  return [...delivered, ...notificationOnly].sort(
    (a, b) => Date.parse(b.created_at) - Date.parse(a.created_at),
  );
}
