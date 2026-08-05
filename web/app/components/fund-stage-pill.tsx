"use client";

import type { CompetitionResult, FundraisingStage } from "@/lib/types";

const TONE: Record<FundraisingStage, string> = {
  Researching: "cobalt",
  Contacted: "indigo",
  Submitted: "indigo",
  Pitched: "violet",
  Diligence: "magenta",
  Committed: "teal",
  Closed: "green",
  Passed: "rose",
};

export function FundStagePill({ stage }: { stage: FundraisingStage }) {
  return (
    <span
      data-tone={TONE[stage]}
      className="tone inline-flex items-center h-5 px-2.5 rounded-full mono text-[10px] uppercase tracking-[0.1em] font-medium whitespace-nowrap"
    >
      {stage}
    </span>
  );
}

const RESULT_TONE: Record<CompetitionResult, string> = {
  Win: "green",
  Lose: "rose",
};

export function ResultPill({ result }: { result: CompetitionResult }) {
  return (
    <span
      data-tone={RESULT_TONE[result]}
      className="tone inline-flex items-center h-5 px-2.5 rounded-full mono text-[10px] uppercase tracking-[0.1em] font-medium whitespace-nowrap"
    >
      {result}
    </span>
  );
}
