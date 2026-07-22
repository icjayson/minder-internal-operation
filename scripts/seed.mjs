#!/usr/bin/env node
// Seed a few sample leads. Run: node scripts/seed.mjs
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const env = readFileSync(resolve(__dirname, "../.env.local"), "utf8");
for (const line of env.split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2];
}

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

const samples = [
  {
    full_name: "Marta Hruška",
    title: "COO",
    seniority: "C-level",
    linkedin_url: "https://www.linkedin.com/in/marta-hruska-sample/",
    email: "marta@textilia-brno.example",
    company_name: "Textilia Brno",
    company_domain: "textilia-brno.example",
    company_size: "51-200",
    industry: "Textiles",
    hq_location: "Brno, Czechia",
    website_url: "https://textilia-brno.example",
    icp_fit: 4.6,
    priority: 5,
    archetype: "Operations lead",
    reasoning:
      "Textile mill in CEE, 120 staff. Running paper-based SOPs across 3 shifts; high onboarding churn signals workforce pain. COO recently posted about line-supervisor bottlenecks on LinkedIn.",
    pain_signals: ["paper SOPs", "high onboarding churn", "supervisor bottleneck"],
    stage: "Researching",
    next_follow_up: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10),
    touch_count: 0,
    source: "manual",
  },
  {
    full_name: "Arjun Patel",
    title: "VP Operations",
    seniority: "VP",
    linkedin_url: "https://www.linkedin.com/in/arjun-patel-sample/",
    email: "arjun@precision-autoparts.example",
    company_name: "Precision Autoparts Ltd",
    company_domain: "precision-autoparts.example",
    company_size: "201-1k",
    industry: "Automotive parts",
    hq_location: "Birmingham, UK",
    website_url: "https://precision-autoparts.example",
    icp_fit: 4.1,
    priority: 4,
    archetype: "Operations lead",
    reasoning:
      "Tier-2 supplier with 300 staff across 2 plants. Hiring heavily for line leads (3 open roles). Legacy SOPs in binders; safety incidents referenced in last annual report.",
    pain_signals: ["safety incidents", "rapid hiring", "legacy SOP binders"],
    stage: "Contacted",
    last_contacted: new Date(Date.now() - 4 * 86400000).toISOString(),
    next_follow_up: new Date(Date.now() + 1 * 86400000).toISOString().slice(0, 10),
    touch_count: 1,
    source: "linkedin",
  },
  {
    full_name: "Linh Nguyen",
    title: "Founder & CEO",
    seniority: "C-level",
    linkedin_url: "https://www.linkedin.com/in/linh-nguyen-sample/",
    email: null,
    company_name: "Saigon Fresh Foods",
    company_domain: "saigonfresh.example",
    company_size: "51-200",
    industry: "Food processing",
    hq_location: "Ho Chi Minh City, Vietnam",
    website_url: "https://saigonfresh.example",
    icp_fit: 3.8,
    priority: 3,
    archetype: "Founder / CEO",
    reasoning:
      "Mid-size food processor, 80 staff. Multilingual shop floor (Vietnamese + Khmer). Active on LinkedIn discussing HACCP compliance workflows.",
    pain_signals: ["multilingual workforce", "HACCP compliance", "line supervisor ratio"],
    stage: "New",
    touch_count: 0,
    source: "extension",
  },
];

console.log(`Seeding ${samples.length} leads…`);
const { data, error } = await sb.from("leads").insert(samples).select();
if (error) {
  console.error("Seed failed:", error);
  process.exit(1);
}
console.log(`Inserted ${data.length} leads:`);
for (const d of data) console.log(`  · ${d.full_name} @ ${d.company_name}`);
