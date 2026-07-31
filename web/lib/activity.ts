import type { Activity, Stage } from "./types";

const ACTIVITY_STAGE_RANK: Record<Stage, number> = {
  New: 0,
  Contacted: 1,
  Replied: 2,
  "Meeting Booked": 3,
  Demo: 4,
  "Closed Won": 5,
  "Closed Lost": 6,
  Nurture: 6,
};

// Migration 018 briefly fanned one factory-stage edit out to every contact.
// Those rows share the exact factory, timestamp and transition. Hide the
// legacy batches client-side as well as deleting them in migration 025, so an
// older database cannot flood the timeline while it waits for that migration.
export function withoutBulkStageFanout(activities: Activity[]): Activity[] {
  const counts = new Map<string, number>();

  const batchKey = (activity: Activity) => [
    activity.factory_id ?? "",
    activity.created_at,
    activity.body ?? "",
  ].join("\u0000");

  for (const activity of activities) {
    if (activity.type !== "stage_change" || !activity.contact_id) continue;
    const key = batchKey(activity);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return activities.filter((activity) => {
    if (activity.type !== "stage_change" || !activity.contact_id) return true;
    return (counts.get(batchKey(activity)) ?? 0) === 1;
  });
}

// Factory pipeline activity is a record of attained progress, not every click.
// Backward transitions are hidden, along with earlier forward milestones that
// sit above the factory's current stage. Migration 026 applies the same rule in
// the database; this keeps older clients/databases visually consistent.
export function visibleFactoryActivities(activities: Activity[], currentStage: Stage): Activity[] {
  const withoutFanout = withoutBulkStageFanout(activities);
  const currentRank = ACTIVITY_STAGE_RANK[currentStage];

  return withoutFanout.filter((activity) => {
    if (activity.type !== "stage_change" || activity.contact_id || !activity.body) return true;
    const [from, to, ...rest] = activity.body.split(" → ");
    if (rest.length > 0 || !(from in ACTIVITY_STAGE_RANK) || !(to in ACTIVITY_STAGE_RANK)) return true;
    const fromRank = ACTIVITY_STAGE_RANK[from as Stage];
    const toRank = ACTIVITY_STAGE_RANK[to as Stage];
    return toRank > fromRank && toRank <= currentRank;
  });
}
