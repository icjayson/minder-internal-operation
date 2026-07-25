#!/usr/bin/env node
// Scores un-scored leads against Minder's ICP using OpenAI (gpt-4o-mini).
// Gently throttled — 1.2s between requests.
// Usage:
//   node scripts/score-leads.mjs          # score leads with icp_fit IS NULL
//   node scripts/score-leads.mjs --all    # re-score everything
//   node scripts/score-leads.mjs <id>     # score one lead by id
import { openaiChat } from "./_openai.mjs";
import { loadEnv, sb, sleep } from "./_lib.mjs";
import { MINDER_DESCRIPTION, MINDER_ICP } from "./_minder.mjs";

loadEnv();

if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not set");

const supabase = sb();

const args = process.argv.slice(2);
const all = args.includes("--all");
const specificId = args.find((a) => !a.startsWith("-"));

let query = supabase.from("leads").select("*").order("created_at", { ascending: true });
if (specificId) query = query.eq("id", specificId);
else if (!all) query = query.is("icp_fit", null);

const { data: leads, error } = await query;
if (error) throw error;

if (!leads.length) {
  console.log("No leads to score.");
  process.exit(0);
}

console.log(`Scoring ${leads.length} lead${leads.length > 1 ? "s" : ""}…`);

let done = 0;
for (const lead of leads) {
  try {
    const scored = await score(lead);
    const patch = {
      icp_fit: scored.icp_fit,
      archetype: scored.archetype,
      reasoning: scored.reasoning,
      pain_signals: scored.pain_signals,
    };
    // Only overwrite priority if the user hasn't set one manually.
    if (!lead.priority) patch.priority = scored.priority;
    await supabase.from("leads").update(patch).eq("id", lead.id);
    done++;
    console.log(
      `  ✓ ${lead.full_name} @ ${lead.company_name} → fit ${scored.icp_fit} · prio ${scored.priority} (${scored.archetype})`,
    );
  } catch (e) {
    console.warn(`  ✗ ${lead.full_name}: ${e.message}`);
  }
  if (done < leads.length) await sleep(1200); // gentle throttle
}

console.log(`Done. ${done}/${leads.length} scored.`);

// ---
async function score(lead) {
  const prompt = `${MINDER_DESCRIPTION}

${MINDER_ICP}

PROSPECT
Name: ${lead.full_name}
Title: ${lead.title ?? "unknown"}
Seniority: ${lead.seniority ?? "unknown"}
Company: ${lead.company_name}
Industry: ${lead.industry ?? "unknown"}
Size: ${lead.company_size ?? "unknown"}
HQ: ${lead.hq_location ?? "unknown"}
Website: ${lead.website_url ?? "unknown"}

Return JSON with exactly this shape:
{
  "icp_fit": <number 1.0-5.0, one decimal>,
  "archetype": "<short role label, e.g. 'Operations lead', 'Factory owner', 'Safety head', 'IT (wrong buyer)', 'Anti-ICP'>",
  "reasoning": "<2-3 sentences, concrete, cite signals>",
  "pain_signals": [<up to 4 short phrases>],
  "priority": <integer 1-5, how urgently Eric should reach out THIS WEEK>,
  "should_pursue": <boolean>
}

Priority rubric:
- 5: ideal ICP + strong timing signal (just raised / hiring / posted pain)
- 4: ideal ICP, senior buyer
- 3: decent fit, not urgent
- 2: weak fit, nurture-track
- 1: anti-ICP / wrong buyer

Score conservatively. Cite specific signals.`;

  const raw = await openaiChat(prompt, {
    maxTokens: 4096,
    json: true,
  });
  // Strip fencing if any.
  const json = raw.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
  let parsed;
  try {
    parsed = JSON.parse(json);
  } catch (e) {
    console.error("  Raw response:", json.slice(0, 400));
    throw e;
  }
  const fit = Number(parsed.icp_fit);
  if (!Number.isFinite(fit) || fit < 1 || fit > 5)
    throw new Error(`bad icp_fit: ${parsed.icp_fit}`);

  const priorityRaw = Number(parsed.priority);
  const priority =
    Number.isFinite(priorityRaw) && priorityRaw >= 1 && priorityRaw <= 5
      ? Math.round(priorityRaw)
      : fit >= 4.5 ? 5 : fit >= 4 ? 4 : fit >= 3 ? 3 : fit >= 2 ? 2 : 1;

  return {
    icp_fit: Math.round(fit * 10) / 10,
    archetype: String(parsed.archetype ?? "Unknown").slice(0, 80),
    reasoning: String(parsed.reasoning ?? ""),
    pain_signals: Array.isArray(parsed.pain_signals)
      ? parsed.pain_signals.slice(0, 6).map((s) => String(s).slice(0, 80))
      : [],
    priority,
  };
}
