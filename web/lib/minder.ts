// Minder AI context — grounds every OpenAI prompt (scoring + writing).

export const MINDER_DESCRIPTION = `Minder AI builds a voice-and-vision operating layer for industrial frontline work. \
Workers talk to it and show it parts/gauges/items; managers get a dashboard and an approval layer. \
Today's wedge is PRODUCE + MOVE: work-order and station execution, item/material/pallet/WIP movement, \
inventory and shortage visibility, line-side replenishment, exceptions and escalation, shift handover, \
and voice+vision capture at the point of work. The human stays in the loop by design.`;

// PDF 1 §1.2.1 — Ideal Design-Partner Profile
export const IDP_PROFILE = `Ideal Design-Partner Profile (IDP).
NECESSARY conditions:
- SME or lower-mid-market industrial operation
- Roughly 50-500 frontline workers per site (heuristic)
- Multi-shift or handoff-heavy work
- Multi-brand machinery and fragmented systems
- A mix of ERP/MES/WMS/CMMS, spreadsheets, paper, radio, chat and tribal knowledge
- No large internal app-building team
SUFFICIENT conditions:
- Repeated pain around production, material flow, inventory, exceptions or handover
- Access to managers, supervisors and frontline users
- A realistic evaluation window within 3-6 months
ANTI-profile: pure office/IT firms, giant enterprises with heavy procurement, no frontline access.`;

// PDF 1 §1.3 — 100-point qualification rubric
export const SCORE_RUBRIC = `Qualification score (100 points total):
- IDP / fragmentation fit (15): "Same vertical, different floor" that incumbents ignore?
- Pain urgency (20): Recent incident, frequency, consequence, forcing event?
- PRODUCE/MOVE wedge fit (15): Direct path to value with today's product?
- Access capability (15): Sponsor, champion, users, workflow, artifacts?
- Trial readiness (15): Site, timing, IT/privacy path in 3-6 months?
- Representativeness (10): Learning applies to many similar sites?
- Strategic leverage (5): Parent-network / reference / cluster leverage?
- Relationship quality (5): Follow-through, openness, reciprocity?
Grades: A = 75+ with no hard blocker; B = 60-74 with a defined blocker; C = below 60 (insight contact only).
Score conservatively; only award points backed by a concrete signal.`;

// PDF 1 §2.1 + §2.5 + PDF 2 honesty guardrail — writing assistant rules
export const WRITING_GUARDRAILS = `You write short, human outreach on behalf of Minder AI to industrial operators.
PHILOSOPHY (The Mom Test): discovery, not pitching. Talk about THEIR current situation, ask about the last real incident. Lead with the problem.
NON-NEGOTIABLE:
- Disclose intent honestly (we are building a product and may invite them to partner once fit is mutual). Never a "research" bait-and-switch.
- Honest credibility from live Vietnamese-floor experience — prove by how we integrate and serve, not by feature claims. World-model / grand vision only as long-term context, never the pitch.
- Non-surveillance: cameras/sensors read items, machines, zones, safety — never individual worker performance.
- Human-in-the-loop tone.
MESSAGE ARCHITECTURE (max ~4 short sentences):
1) Specific relevance
2) One narrow operational tension
3) Honest credibility (brief)
4) Explicit non-sales research ask
5) Useful give-back
6) Low-friction next step + clear opt-out
Style: warm, direct, concrete. No clichés ("passionate", "synergies", "touch base", "circle back"), no emojis, no hashtags. British spelling.`;

// Per-vertical operational tension hints (PDF 1 §1.2).
export const VERTICAL_TENSIONS: Record<string, string> = {
  automotive:
    "tier-2 & service; reshoring + EV/ZEV pressure makes operational improvement urgent; data-rich, premium ACV.",
  discrete_mfg:
    "metal fabrication, machine shops, plastics; dense SME base; bundle-tracking and job-shop handover pain.",
  food_bev:
    "batch, traceability and shift-handover pain; SME-heavy; UK's largest manufacturing sector.",
  textile:
    "hands-busy, bundle-tracking, quality-driven — the proving-ground engine profile.",
  logistics:
    "purest item-flow fit — a yard or warehouse is items moving across stations.",
};

// Fallback product/direction context for the hybrid recommender when no
// scope='minder' context_doc has been added yet.
export const PRODUCT_DIRECTION = `WHAT WE HAVE (wedge — PRODUCE + MOVE): voice + vision at the point of work; work-order/station execution; item/material/pallet/WIP movement; inventory & shortage visibility; line-side replenishment; exceptions & escalation; shift handover. Closed loop: monitor → flag → propose → act on human approval. Non-surveillance.
DIRECTION: define top-down — pick ONE core problem from the factory's real context and design a quick, concrete demo around that single problem (not a broad rollout). Value in 30-60 days without replacing ERP/MES/WMS/CMMS.`;

export const MINDER_DIFFERENTIATORS = [
  "Voice + vision at the point of work — workers never put down their tools",
  "Reads items/machines/zones/safety, never worker performance (non-surveillance)",
  "Closed loop: monitor against target, flag the gap, propose the fix, act only on approval",
  "Learns each floor's real workflow; not a generic chatbot",
  "Value in 30-60 days without replacing existing ERP/MES/WMS/CMMS",
];
