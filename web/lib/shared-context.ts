import {
  IDP_PROFILE,
  MINDER_DESCRIPTION,
  MINDER_DIFFERENTIATORS,
  NETWORK_SCORE_RUBRIC,
  PRODUCT_DIRECTION,
  SCORE_RUBRIC,
  VERTICAL_TENSIONS,
  WRITING_GUARDRAILS,
} from "./minder.ts";

export type SharedContextCategory = "product" | "design_partner";

export type SharedContextKey =
  | "minder_description"
  | "idp_profile"
  | "score_rubric"
  | "network_score_rubric"
  | "writing_guardrails"
  | "vertical_tensions"
  | "product_direction"
  | "minder_differentiators";

export type SharedContextDefinition = {
  key: SharedContextKey;
  category: SharedContextCategory;
  label: string;
  description: string;
  defaultBody: string;
};

export const SHARED_CONTEXT_CATEGORIES: Record<
  SharedContextCategory,
  { label: string; description: string }
> = {
  product: {
    label: "Product",
    description: "Minder's product truth, direction and durable differentiators.",
  },
  design_partner: {
    label: "Design partner",
    description: "Who to pursue, how to score them and how Minder communicates.",
  },
};

export const SHARED_CONTEXT_DEFINITIONS: SharedContextDefinition[] = [
  {
    key: "minder_description",
    category: "product",
    label: "MINDER_DESCRIPTION",
    description: "The canonical description of Minder used to ground AI prompts.",
    defaultBody: MINDER_DESCRIPTION,
  },
  {
    key: "product_direction",
    category: "product",
    label: "PRODUCT_DIRECTION",
    description: "Current product wedge and the direction used by recommendations.",
    defaultBody: PRODUCT_DIRECTION,
  },
  {
    key: "minder_differentiators",
    category: "product",
    label: "MINDER_DIFFERENTIATORS",
    description: "One differentiator per line. Bullets and numbered lists are accepted.",
    defaultBody: MINDER_DIFFERENTIATORS.map((item) => `- ${item}`).join("\n"),
  },
  {
    key: "idp_profile",
    category: "design_partner",
    label: "IDP_PROFILE",
    description: "Necessary, sufficient and anti-profile conditions for a design partner.",
    defaultBody: IDP_PROFILE,
  },
  {
    key: "score_rubric",
    category: "design_partner",
    label: "SCORE_RUBRIC",
    description: "The 100-point factory qualification rubric.",
    defaultBody: SCORE_RUBRIC,
  },
  {
    key: "network_score_rubric",
    category: "design_partner",
    label: "NETWORK_SCORE_RUBRIC",
    description: "The 100-point referral-network qualification rubric.",
    defaultBody: NETWORK_SCORE_RUBRIC,
  },
  {
    key: "writing_guardrails",
    category: "design_partner",
    label: "WRITING_GUARDRAILS",
    description: "Voice, honesty and outreach constraints for generated messages.",
    defaultBody: WRITING_GUARDRAILS,
  },
  {
    key: "vertical_tensions",
    category: "design_partner",
    label: "VERTICAL_TENSIONS",
    description: "One vertical per line in “key: operational tension” format.",
    defaultBody: Object.entries(VERTICAL_TENSIONS)
      .map(([key, value]) => `${key}: ${value}`)
      .join("\n"),
  },
];

export const SHARED_CONTEXT_DEFAULTS = Object.fromEntries(
  SHARED_CONTEXT_DEFINITIONS.map((definition) => [definition.key, definition.defaultBody]),
) as Record<SharedContextKey, string>;

export function parseListContext(body: string): string[] {
  return body
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/^[-*•]\s+/, "").replace(/^\d+[.)]\s+/, ""))
    .filter(Boolean);
}

export function parseVerticalTensions(body: string): Record<string, string> {
  const tensions: Record<string, string> = {};
  for (const rawLine of body.split(/\r?\n/)) {
    const line = rawLine.trim().replace(/^[-*•]\s+/, "");
    const separator = line.indexOf(":");
    if (separator <= 0) continue;
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    if (key && value) tensions[key] = value;
  }
  return tensions;
}
