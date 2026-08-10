const DAY_MS = 86_400_000;

export const WORK_TRIGGER_KINDS = {
  dueSoon: "work_trigger_due_soon",
  due: "work_trigger_due",
  overdue3: "work_trigger_overdue_3d",
} as const;

export type WorkTriggerReminder = {
  kind: (typeof WORK_TRIGGER_KINDS)[keyof typeof WORK_TRIGGER_KINDS];
  title: string;
  overdueDays: number;
};

export function isoDateInTimeZone(date: Date, timeZone = "Asia/Ho_Chi_Minh"): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function isoDateMs(value: string): number {
  return Date.parse(`${value}T00:00:00Z`);
}

export function daysPastTrigger(triggerOn: string, today: string): number {
  return Math.floor((isoDateMs(today) - isoDateMs(triggerOn)) / DAY_MS);
}

// Three milestones: a heads-up one day before the trigger date, a nudge on the
// due date itself, then a single overdue nudge once the card is 3+ days past it.
// Done cards never fire. Days 1 and 2 overdue are intentionally silent so
// Discord stays quiet between the due-date nudge and the overdue escalation.
export function workTriggerReminderFor({
  triggerOn,
  today,
  status,
}: {
  triggerOn: string | null;
  today: string;
  status: string;
}): WorkTriggerReminder | null {
  if (status === "done" || !triggerOn) return null;
  const overdueDays = daysPastTrigger(triggerOn, today);
  if (!Number.isFinite(overdueDays)) return null;
  if (overdueDays >= 3) {
    return {
      kind: WORK_TRIGGER_KINDS.overdue3,
      title: "Work item overdue by 3+ days",
      overdueDays,
    };
  }
  if (overdueDays === 0) {
    return {
      kind: WORK_TRIGGER_KINDS.due,
      title: "Work item trigger due today",
      overdueDays,
    };
  }
  if (overdueDays === -1) {
    return {
      kind: WORK_TRIGGER_KINDS.dueSoon,
      title: "Work item due in 1 day",
      overdueDays,
    };
  }
  return null;
}

export function isWorkTriggerNotificationKind(kind: unknown): boolean {
  return typeof kind === "string" && kind.startsWith("work_trigger_");
}
