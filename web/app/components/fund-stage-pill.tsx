"use client";

import type { CompetitionResult, FundraisingStage } from "@/lib/types";

import { TonePill } from "./stage-pill";

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
  return <TonePill tone={TONE[stage]}>{stage}</TonePill>;
}

const RESULT_TONE: Record<CompetitionResult, string> = {
  Win: "green",
  Lose: "rose",
};

export function ResultPill({ result }: { result: CompetitionResult }) {
  return <TonePill tone={RESULT_TONE[result]}>{result}</TonePill>;
}
