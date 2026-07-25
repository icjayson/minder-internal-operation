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

// ── Contact role model (PDF 1 §1.2.2) ───────────────────────────────────────
export const ROLE_LEVELS = ["high", "mid", "expert"] as const;
export type RoleLevel = (typeof ROLE_LEVELS)[number];

export const ROLE_CATEGORIES = [
  { key: "owner_md_coo", label: "Owner / MD / COO / Ops Director", level: "high", primary: true },
  { key: "plant_director", label: "Plant / Factory Director", level: "high", primary: true },
  { key: "ops_manager", label: "Production / Operations Manager", level: "high", primary: false },
  { key: "ci_opex", label: "CI / OPEX / Lean Lead", level: "mid", primary: false },
  { key: "materials_mgr", label: "Materials / Warehouse / Logistics Manager", level: "mid", primary: false },
  { key: "shift_lead", label: "Shift Supervisor / Team Leader", level: "mid", primary: false },
  { key: "operator", label: "Operator / Technician", level: "expert", primary: false },
  { key: "it_ot", label: "IT / OT & Cybersecurity", level: "mid", primary: false },
  { key: "hr_dpo", label: "HR / DPO / Works Council / HSE", level: "mid", primary: false },
  { key: "procurement", label: "Procurement / Finance", level: "mid", primary: false },
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
export type ScoreBreakdown = Partial<Record<ScoreDimensionKey, number>>;

export const CHANNELS = [
  "parent_bridge",
  "accelerator",
  "connector",
  "trade_assoc",
  "trade_show",
  "crawl",
  "manual",
] as const;

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

export interface Factory {
  id: string;
  vertical_id: string | null;

  name: string;
  website_url: string | null;
  company_url: string | null;
  hq_location: string | null;
  country: string | null;
  geo_tier: GeoTier | null;

  frontline_workers: number | null;
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
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: string;
  factory_id: string;

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
  contact_id: string | null;
  type: string;
  body: string | null;
  evidence_level: number | null;
  taxonomy_tags: string[] | null;
  created_at: string;
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

export interface Notification {
  id: string;
  kind: string;
  factory_id: string | null;
  contact_id: string | null;
  title: string;
  detail: string | null;
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
