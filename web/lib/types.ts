export const STAGES = [
  "New",
  "Researching",
  "Contacted",
  "Replied",
  "Meeting Booked",
  "Demo",
  "Proposal",
  "Closed Won",
  "Closed Lost",
  "Nurture",
] as const;

export type Stage = (typeof STAGES)[number];

// Stages shown in the top chevron flow (happy path).
export const PIPELINE_STAGES: Stage[] = [
  "New",
  "Researching",
  "Contacted",
  "Replied",
  "Meeting Booked",
  "Demo",
  "Proposal",
  "Closed Won",
];

export const TERMINAL_STAGES: Stage[] = ["Closed Won", "Closed Lost", "Nurture"];

export const COMPANY_SIZES = ["1-10", "11-50", "51-200", "201-1k", "1k+"] as const;
export const SENIORITIES = ["C-level", "VP", "Director", "Manager", "IC"] as const;

// Relationship category — why this contact is in the pipeline.
export const CATEGORIES = [
  "ICP",               // buyer-side prospect
  "Advisor",
  "VC",
  "Angel",
  "Accelerator",
  "Design Partner",    // early co-builder / pilot customer
  "Strategic Partner", // long-term distribution / integration partner
  "Press",
  "Gov",
] as const;
export type Category = (typeof CATEGORIES)[number];

export interface Lead {
  id: string;

  // Person
  full_name: string;
  title: string | null;
  seniority: string | null;
  linkedin_url: string | null;
  email: string | null;
  phone: string | null;

  // Company
  company_name: string;
  company_domain: string | null;
  company_size: string | null;
  industry: string | null;
  hq_location: string | null;
  website_url: string | null;

  // Qualification
  category: Category | null;
  icp_fit: number | null;
  priority: number | null;
  archetype: string | null;
  reasoning: string | null;
  pain_signals: string[] | null;

  // Pipeline
  stage: Stage;

  // Touch tracking
  last_contacted: string | null;
  next_follow_up: string | null;
  touch_count: number;

  // Content
  notes: string | null;
  outreach_draft: string | null;
  source: string;

  // Meta
  created_at: string;
  updated_at: string;
}
