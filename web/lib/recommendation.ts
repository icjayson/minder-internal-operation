export type RecommendationInput = {
  ladderLevel: number;
  evidenceLevel: number;
  grade: "A" | "B" | "C" | null;
  blocker: string | null;
  daysSinceActivity: number;
  stage: string;
};

export type Recommendation = {
  recommendation: string;
  rationale: string;
  ask: string;
  giveBack: string;
};

const LADDER_MOVES: { ask: string; giveBack: string }[] = [
  {
    ask: "Confirm the right operational owner and one current workflow worth researching.",
    giveBack: "Share a concise, sector-specific problem hypothesis.",
  },
  {
    ask: "Request a 25–30 minute interview about the last real incident in that workflow.",
    giveBack: "Explain the research purpose and return an anonymised pattern summary.",
  },
  {
    ask: "Ask for one concrete artifact: a handover sheet, exception log, workflow sketch or redacted screenshot.",
    giveBack: "Return a cleaned workflow map with observed friction points.",
  },
  {
    ask: "Validate the workflow map with a manager and one frontline user.",
    giveBack: "Share a short opportunity brief with assumptions clearly marked.",
  },
  {
    ask: "Co-design a narrow trial hypothesis, success metric and human approval boundary.",
    giveBack: "Provide a no-surveillance trial sketch and implementation constraints.",
  },
  {
    ask: "Confirm sponsor, champion, user access, site timing and the IT/privacy path.",
    giveBack: "Provide a scoped trial plan with responsibilities, risks and exit criteria.",
  },
  {
    ask: "Agree the trial slot, baseline capture and decision date.",
    giveBack: "Reserve onboarding capacity and share the measurement checklist.",
  },
  {
    ask: "Run the next evidence review and agree the following approved workflow expansion.",
    giveBack: "Return measured results, open risks and the next-step recommendation.",
  },
];

const TERMINAL = new Set(["Closed Won", "Closed Lost"]);

export function recommendNext(input: RecommendationInput): Recommendation {
  const ladder = Math.max(0, Math.min(7, Math.round(input.ladderLevel || 0)));
  const move = LADDER_MOVES[ladder];

  if (TERMINAL.has(input.stage)) {
    return {
      recommendation: input.stage === "Closed Won"
        ? "Schedule the next evidence review and document the expansion decision."
        : "Record the loss reason, preserve useful evidence and stop active follow-up.",
      rationale: `The factory is already in the terminal “${input.stage}” stage.`,
      ask: input.stage === "Closed Won" ? move.ask : "No further ask unless the account is reopened.",
      giveBack: input.stage === "Closed Won" ? move.giveBack : "Close the loop respectfully.",
    };
  }

  const stalePrefix = input.daysSinceActivity > 7
    ? `The account has been quiet for ${input.daysSinceActivity} days. Re-open with a useful give-back, then `
    : "";
  const blockerClause = input.blocker
    ? ` Resolve the current blocker first: ${input.blocker}.`
    : "";
  const evidenceClause = input.evidenceLevel < Math.min(5, ladder)
    ? " Do not advance the relationship ladder until another concrete artifact or observed incident is captured."
    : "";
  const gradeClause = input.grade === "C"
    ? " Treat this as an insight relationship only; do not propose a trial yet."
    : input.grade === "B"
      ? " Keep the ask narrow and use it to remove the qualification blocker."
      : "";

  return {
    recommendation: `${stalePrefix}${move.ask}${blockerClause}${evidenceClause}${gradeClause}`.trim(),
    rationale: `Ladder L${ladder}, evidence E${input.evidenceLevel}, grade ${input.grade ?? "unscored"}, ${input.daysSinceActivity} day(s) since activity.`,
    ask: move.ask,
    giveBack: move.giveBack,
  };
}
