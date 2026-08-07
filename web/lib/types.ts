// ── Pipeline stages (primary activity status, per contact + factory) ────────
export const STAGES = [
  "New",
  "Contacted",
  "Replied",
  "Meeting Booked",
  "Demo",
  "Closed Won",
  "Closed Lost",
  "Nurture",
] as const;
export type Stage = (typeof STAGES)[number];

// Happy-path stages shown in the chevron flow.
export const PIPELINE_STAGES: Stage[] = [
  "New",
  "Contacted",
  "Replied",
  "Meeting Booked",
  "Demo",
  "Closed Won",
];
export const TERMINAL_STAGES: Stage[] = ["Closed Lost", "Nurture"];

export const SEQUENCE_STATES = [
  "not_started",
  "active",
  "replied",
  "paused",
  "done",
  "opted_out",
] as const;
export type SequenceState = (typeof SEQUENCE_STATES)[number];

// ── Verticals (5 IDP domains, PDF 1 §1.2) ───────────────────────────────────
export const VERTICALS = [
  { key: "automotive", name: "Automotive parts", short: "Automotive" },
  { key: "discrete_mfg", name: "Light & discrete mfg", short: "Discrete mfg" },
  { key: "food_bev", name: "Food & beverage", short: "Food & bev" },
  { key: "textile", name: "Textile, garment & footwear", short: "Textile" },
  { key: "logistics", name: "Logistics & 3PL", short: "Logistics" },
] as const;
export type VerticalKey = (typeof VERTICALS)[number]["key"];

// ── Geography tiers (PDF 1 §1.1) ────────────────────────────────────────────
export const GEO_TIERS = [
  { key: "beachhead", label: "Beachhead", friction: "Low" },
  { key: "warm_eu", label: "Warm EU", friction: "Low–Med" },
  { key: "warm_intro_eu", label: "Warm-intro EU", friction: "Medium" },
  { key: "last_carefully", label: "Last, carefully", friction: "High" },
] as const;
export type GeoTier = (typeof GEO_TIERS)[number]["key"];

// Simplified geo model (replaces the friction tiers in the UI).
export const GEO_OPTIONS = [
  { key: "UK", label: "UK" },
  { key: "Europe", label: "Europe" },
  { key: "VN", label: "VN" },
] as const;

// Frontline-workforce size bands (selectable in the factory profile).
export const WORKER_BANDS = ["50 - 200", "200 - 500", "500 - 1000"] as const;

// ── Contact role model (PDF 1 §1.2.2) ───────────────────────────────────────
export const ROLE_LEVELS = ["high", "mid", "expert"] as const;
export type RoleLevel = (typeof ROLE_LEVELS)[number];

export const ROLE_CATEGORIES = [
  { key: "owner_md_coo", label: "Owner / MD / COO / Ops Director", level: "high" },
  { key: "plant_director", label: "Plant / Factory Director", level: "high" },
  { key: "ops_manager", label: "Production / Operations Manager", level: "high" },
  { key: "ci_opex", label: "CI / OPEX / Lean Lead", level: "mid" },
  { key: "materials_mgr", label: "Materials / Warehouse / Logistics Manager", level: "mid" },
  { key: "shift_lead", label: "Shift Supervisor / Team Leader", level: "mid" },
  { key: "operator", label: "Operator / Technician", level: "expert" },
  { key: "it_ot", label: "IT / OT & Cybersecurity", level: "mid" },
  { key: "hr_dpo", label: "HR / DPO / Works Council / HSE", level: "mid" },
  { key: "procurement", label: "Procurement / Finance", level: "mid" },
] as const;
export type RoleCategory = (typeof ROLE_CATEGORIES)[number]["key"];

// ── Qualification score rubric (PDF 1 §1.3, 100 pts) ────────────────────────
export const SCORE_DIMENSIONS = [
  { key: "idp_fit", label: "IDP / fragmentation fit", max: 15 },
  { key: "pain_urgency", label: "Pain urgency", max: 20 },
  { key: "wedge_fit", label: "PRODUCE/MOVE wedge fit", max: 15 },
  { key: "access", label: "Access capability", max: 15 },
  { key: "trial_readiness", label: "Trial readiness", max: 15 },
  { key: "representativeness", label: "Representativeness", max: 10 },
  { key: "strategic_leverage", label: "Strategic leverage", max: 5 },
  { key: "relationship_quality", label: "Relationship quality", max: 5 },
] as const;
export type ScoreDimensionKey = (typeof SCORE_DIMENSIONS)[number]["key"];

// ── Network qualification rubric (100 pts) ──────────────────────────────────
export const NETWORK_SCORE_DIMENSIONS = [
  { key: "reach", label: "Member reach & IDP fit", max: 25 },
  { key: "intro_willingness", label: "Intro willingness", max: 20 },
  { key: "credibility", label: "Credibility / trust transfer", max: 15 },
  { key: "alignment", label: "Vertical & geo alignment", max: 15 },
  { key: "activation_cost", label: "Activation cost", max: 10 },
  { key: "leverage", label: "Strategic leverage / exclusivity", max: 10 },
  { key: "relationship", label: "Relationship quality", max: 5 },
] as const;
export type NetworkScoreDimensionKey = (typeof NETWORK_SCORE_DIMENSIONS)[number]["key"];

export type ScoreDimension = { key: string; label: string; max: number };
export type ScoreBreakdown = Partial<Record<string, number>>;

export const CHANNELS = [
  "parent_bridge",
  "accelerator",
  "connector",
  "trade_assoc",
  "trade_show",
  "crawl",
  "manual",
] as const;

// ── Network types (referral sources — associations, accelerators, …) ────────
export const NETWORK_TYPES = [
  { key: "association", label: "Association" },
  { key: "institute", label: "Institute" },
  { key: "accelerator", label: "Accelerator" },
  { key: "cluster", label: "Cluster" },
  { key: "trade_body", label: "Trade body" },
  { key: "connector", label: "Connector / individual" },
  { key: "other", label: "Other" },
] as const;
export type NetworkType = (typeof NETWORK_TYPES)[number]["key"];

// ── Fundraising tracker ─────────────────────────────────────────────────────
// Two isolated tracks, each backed by its own table (public.investors,
// public.competitions). `track` is a client-side discriminator derived from the
// source table — it is NOT a database column.
export const FUNDRAISING_TRACKS = [
  { key: "investor", label: "Investors", table: "investors", noun: "investor" },
  { key: "competition", label: "Competitions & Programmes", table: "competitions", noun: "programme" },
] as const;
export type FundraisingTrack = (typeof FUNDRAISING_TRACKS)[number]["key"];

export const INVESTOR_TYPES = [
  { key: "angel", label: "Angel" },
  { key: "vc", label: "VC" },
  { key: "accelerator", label: "Accelerator" },
  { key: "family_office", label: "Family Office" },
  { key: "other", label: "Other" },
] as const;
export type InvestorType = (typeof INVESTOR_TYPES)[number]["key"];

export const COMPETITION_TYPES = [
  { key: "grant", label: "Grant" },
  { key: "competition", label: "Competition" },
  { key: "award", label: "Award" },
  { key: "credit_programme", label: "Credit Programme" },
  { key: "government_programme", label: "Government Programme" },
  { key: "corporate_programme", label: "Corporate Programme" },
  { key: "accelerator_incubator", label: "Accelerator / Incubator" },
  { key: "ecosystem_network", label: "Ecosystem Network" },
] as const;
export type CompetitionType = (typeof COMPETITION_TYPES)[number]["key"];

// Types available for a given track (used by filters + the create/edit drawers).
export function fundraisingTypes(track: FundraisingTrack): readonly { key: string; label: string }[] {
  return track === "investor" ? INVESTOR_TYPES : COMPETITION_TYPES;
}
export function fundraisingTypeLabel(track: FundraisingTrack, key: string | null): string {
  return fundraisingTypes(track).find((t) => t.key === key)?.label ?? "—";
}

// Fundraising stages differ per track (distinct from the sales Stage union).
// FUNDRAISING_STAGES is the full value set — used only for pill colours.
export const FUNDRAISING_STAGES = [
  "Researching",
  "Contacted",
  "Submitted",
  "Pitched",
  "Diligence",
  "Committed",
  "Closed",
  "Passed",
] as const;
export type FundraisingStage = (typeof FUNDRAISING_STAGES)[number];

// Investors: Researching → … → Closed, with Passed as the off-ramp.
export const INVESTOR_STAGES: FundraisingStage[] = [
  "Researching", "Contacted", "Pitched", "Diligence", "Committed", "Closed", "Passed",
];
export const INVESTOR_PIPELINE_STAGES: FundraisingStage[] = [
  "Researching", "Contacted", "Pitched", "Diligence", "Committed", "Closed",
];
export const INVESTOR_OFF_RAMP: FundraisingStage[] = ["Passed"];

// Competitions & programmes: Researching → Submitted → Pitched → Closed, with a
// Win/Lose result off-ramp (a separate field, not a stage).
export const COMPETITION_STAGES: FundraisingStage[] = [
  "Researching", "Submitted", "Pitched", "Closed",
];
export const COMPETITION_PIPELINE_STAGES: FundraisingStage[] = [
  "Researching", "Submitted", "Pitched", "Closed",
];

export const COMPETITION_RESULTS = ["Win", "Lose"] as const;
export type CompetitionResult = (typeof COMPETITION_RESULTS)[number];

export function fundraisingStages(track: FundraisingTrack): FundraisingStage[] {
  return track === "investor" ? INVESTOR_STAGES : COMPETITION_STAGES;
}
export function fundraisingPipelineStages(track: FundraisingTrack): FundraisingStage[] {
  return track === "investor" ? INVESTOR_PIPELINE_STAGES : COMPETITION_PIPELINE_STAGES;
}

export interface FundraisingLead {
  id: string;
  track: FundraisingTrack; // derived from the source table (not a DB column)

  name: string;
  type: string | null;
  stage: FundraisingStage;
  // Competitions only: Win/Lose off-ramp outcome (undefined on investor rows).
  result: CompetitionResult | null;

  contact_person: string | null;
  amount_target_or_offered: number | null;

  next_touch: string | null;
  last_activity_at: string;

  priority: number | null;
  notes: string | null;
  source: string;

  created_at: string;
  updated_at: string;
}

// ── Relationship ladder (PDF 1 §1.4) — optional strategic depth ─────────────
export const LADDER = [
  "Researched account",
  "Insight contact",
  "Evidence contributor",
  "Insight partner",
  "Co-design candidate",
  "Partner candidate",
  "Waitlisted design partner",
  "Active design partner",
] as const;

// ── Entities ────────────────────────────────────────────────────────────────
export interface Vertical {
  id: string;
  key: string;
  name: string;
  wedge_note: string | null;
  sort: number;
}

export interface Network {
  id: string;

  name: string;
  type: NetworkType | null;
  website_url: string | null;
  country: string | null;
  hq_location: string | null;
  focus_verticals: string[] | null;
  reach_note: string | null;

  score: number | null;
  grade: "A" | "B" | "C" | null;
  score_breakdown: ScoreBreakdown | null;
  ai_reasoning: string | null;
  ai_recommendation: string | null;
  blocker: string | null;
  scored_at: string | null;

  stage: Stage;
  next_action: string | null;
  next_action_due: string | null;
  last_activity_at: string;

  priority: number | null;
  notes: string | null;
  source: string;

  context_summary: string | null;
  context_summary_at: string | null;

  created_at: string;
  updated_at: string;
}

export interface Factory {
  id: string;
  vertical_id: string | null;
  network_id: string | null;

  name: string;
  website_url: string | null;
  company_url: string | null;
  hq_location: string | null;
  country: string | null;
  geo_tier: string | null;
  description: string | null;

  frontline_workers: string | null;
  systems: string[] | null;
  machinery_note: string | null;
  multi_shift: boolean | null;
  channel: string | null;
  parent_company: string | null;

  score: number | null;
  grade: "A" | "B" | "C" | null;
  score_breakdown: ScoreBreakdown | null;
  ai_reasoning: string | null;
  ai_recommendation: string | null;
  blocker: string | null;
  scored_at: string | null;

  stage: Stage;
  stage_locked: boolean;
  ladder_level: number;
  evidence_level: number;

  next_action: string | null;
  next_action_due: string | null;
  last_activity_at: string;

  priority: number | null;
  notes: string | null;
  source: string;
  context_summary: string | null;
  context_summary_at: string | null;

  // Customer tracker: a factory promoted to a customer surfaces in the Customer
  // tracker, and leaves the Partner tracker once its stage reaches Closed Won.
  is_customer: boolean;
  customer_marked_at: string | null;

  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: string;
  factory_id: string | null;
  network_id: string | null;

  full_name: string;
  role_title: string | null;
  role_level: RoleLevel | null;
  role_category: string | null;
  is_primary_target: boolean;

  linkedin_url: string | null;
  email: string | null;
  phone: string | null;

  stage: Stage;
  ladder_level: number;
  sequence_id: string | null;
  sequence_step: number;
  sequence_state: SequenceState;

  last_contacted: string | null;
  next_follow_up: string | null;
  touch_count: number;
  last_activity_at: string;

  notes: string | null;
  context_summary: string | null;
  context_summary_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Sequence {
  id: string;
  vertical_id: string | null;
  name: string;
  channel: string;
}

export interface SequenceStep {
  id: string;
  sequence_id: string;
  step_index: number;
  day_offset: number;
  subject: string | null;
  body: string | null;
  intent: string | null;
}

export interface Activity {
  id: string;
  factory_id: string | null;
  network_id: string | null;
  contact_id: string | null;
  investor_id: string | null;
  competition_id: string | null;
  type: string;
  body: string | null;
  evidence_level: number | null;
  taxonomy_tags: string[] | null;
  created_at: string;
}

export interface FundraisingWorkItem {
  id: string;
  investor_id: string | null;
  competition_id: string | null;
  title: string;
  body: string | null;
  status: WorkStatus;
  trigger_on: string | null;
  created_at: string;
  updated_at: string;
}

export type WorkStatus = "not_started" | "doing" | "done";

export interface FactoryWorkItem {
  id: string;
  factory_id: string;
  pic_contact_id: string | null;
  title: string;
  body: string | null;
  status: WorkStatus;
  trigger_on: string | null;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  contact_id: string;
  sequence_step_id: string | null;
  channel: string;
  subject: string | null;
  body: string | null;
  status: string;
  scheduled_for: string | null;
  sent_at: string | null;
  created_at: string;
}

export interface ContextDoc {
  id: string;
  scope: string;
  title: string;
  body: string;
  kind: "scoring" | "writing" | "both";
  active: boolean;
  created_at: string;
  updated_at: string;
}

export type ContextEntityType = "factory" | "network" | "contact";
export type ExtractionStatus = "none" | "pending" | "done" | "failed" | "unsupported";

export interface ContextItem {
  id: string;
  entity_type: ContextEntityType;
  entity_id: string;
  kind: "file" | "text";
  title: string | null;
  body: string | null;
  storage_path: string | null;
  file_name: string | null;
  mime_type: string | null;
  byte_size: number | null;
  extraction_status: ExtractionStatus;
  created_at: string;
  updated_at: string;
}

export interface SharedContext {
  id: string;
  context_key: import("./shared-context").SharedContextKey;
  category: import("./shared-context").SharedContextCategory;
  title: string;
  body: string;
  active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface SharedContextFile {
  id: string;
  category: import("./shared-context").SharedContextCategory;
  title: string | null;
  body: string | null;
  storage_path: string;
  file_name: string | null;
  mime_type: string | null;
  byte_size: number | null;
  extraction_status: ExtractionStatus;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  kind: string;
  factory_id: string | null;
  contact_id: string | null;
  network_id: string | null;
  investor_id: string | null;
  competition_id: string | null;
  work_item_id: string | null;
  title: string;
  detail: string | null;
  summary: string | null;
  due_on: string | null;
  read_at: string | null;
  pushed_at: string | null;
  created_at: string;
}

export interface ImportJob {
  id: string;
  file_name: string | null;
  status: "running" | "completed" | "completed_with_errors" | "failed";
  total_rows: number;
  factories_created: number;
  factories_updated: number;
  contacts_created: number;
  contacts_updated: number;
  skipped_rows: number;
  errors: { row: number; message: string }[];
  created_at: string;
  completed_at: string | null;
}
