import type { Stage } from "./types";

export const STAGE_RANK: Record<Stage, number> = {
  "Closed Won": 7,
  Demo: 6,
  "Meeting Booked": 5,
  Replied: 4,
  Contacted: 3,
  New: 2,
  Nurture: 1,
  "Closed Lost": 0,
};

export function highestStage(stages: Stage[]): Stage {
  return stages.reduce<Stage>(
    (best, stage) =>
      STAGE_RANK[stage] > STAGE_RANK[best] ? stage : best,
    "New",
  );
}
