import { NextResponse } from "next/server";
import { openaiChat } from "@/lib/openai";
import { supabase } from "@/lib/supabase";
import { MINDER_DESCRIPTION, NETWORK_SCORE_RUBRIC } from "@/lib/minder";
import { NETWORK_SCORE_DIMENSIONS } from "@/lib/types";
import { loadContextText } from "@/lib/context-server";

export const runtime = "nodejs";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};
export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

// POST { networkId } → scores a referral network against the 100-pt network
// rubric, grounded in its inputted context + the quality of factories it sourced.
export async function POST(req: Request) {
  try {
    const { networkId } = (await req.json()) as { networkId?: string };
    if (!networkId)
      return NextResponse.json({ error: "networkId required" }, { status: 400, headers: CORS });
    if (!process.env.OPENAI_API_KEY)
      return NextResponse.json({ error: "OPENAI_API_KEY not configured" }, { status: 500, headers: CORS });

    const sb = supabase();
    const { data: network, error } = await sb.from("networks").select("*").eq("id", networkId).single();
    if (error || !network)
      return NextResponse.json({ error: error?.message ?? "Network not found" }, { status: 404, headers: CORS });

    // Founder-supplied network rubric (editable in /settings), fallback to the constant.
    const { data: docs } = await sb
      .from("context_docs")
      .select("title,body")
      .eq("active", true)
      .eq("scope", "network");
    const rubric = (docs ?? []).map((d) => `# ${d.title}\n${d.body}`).join("\n\n") || NETWORK_SCORE_RUBRIC;

    // Evidence: the factories this network actually sourced (reach quality).
    const { data: sourced } = await sb
      .from("factories")
      .select("name,grade,score,stage")
      .eq("network_id", networkId);
    const facs = sourced ?? [];
    const byGrade = { A: 0, B: 0, C: 0, unscored: 0 };
    for (const f of facs) {
      if (f.grade === "A") byGrade.A++;
      else if (f.grade === "B") byGrade.B++;
      else if (f.grade === "C") byGrade.C++;
      else byGrade.unscored++;
    }
    const sourcedText = facs.length
      ? `${facs.length} sourced factories — A:${byGrade.A} B:${byGrade.B} C:${byGrade.C} unscored:${byGrade.unscored}.\n`
        + facs.slice(0, 25).map((f) => `- ${f.name} · ${f.grade ?? "unscored"} · ${f.stage}`).join("\n")
      : "No factories sourced through this network yet.";

    // Direct contacts + per-entity inputted context.
    const { data: contactRows } = await sb
      .from("contacts")
      .select("full_name,role_title,stage")
      .eq("network_id", networkId);
    const contactsText = (contactRows ?? [])
      .map((c) => `- ${c.full_name}${c.role_title ? ` (${c.role_title})` : ""} · ${c.stage}`)
      .join("\n");
    const { text: inputtedContext } = await loadContextText(sb, "network", networkId);

    const prompt = buildPrompt(network, rubric, sourcedText, contactsText, inputtedContext);
    const raw = await openaiChat(prompt, { temperature: 1, maxTokens: 1400, json: true });
    const json = raw.replace(/^```json\s*/i, "").replace(/```$/, "").trim();

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(json);
    } catch {
      return NextResponse.json({ error: "OpenAI returned non-JSON", raw: json.slice(0, 400) }, { status: 502, headers: CORS });
    }

    const rawBreak = (parsed.score_breakdown ?? {}) as Record<string, unknown>;
    const breakdown: Record<string, number> = {};
    let total = 0;
    for (const d of NETWORK_SCORE_DIMENSIONS) {
      const v = Math.max(0, Math.min(d.max, Math.round(Number(rawBreak[d.key]) || 0)));
      breakdown[d.key] = v;
      total += v;
    }
    const blocker = parsed.blocker ? String(parsed.blocker).slice(0, 160) : null;
    const grade = total >= 75 && !blocker ? "A" : total >= 60 ? "B" : "C";

    const patch = {
      score: total,
      grade,
      score_breakdown: breakdown,
      ai_reasoning: String(parsed.reasoning ?? "").slice(0, 800),
      ai_recommendation: String(parsed.recommendation ?? "").slice(0, 400) || null,
      blocker,
      scored_at: new Date().toISOString(),
    };
    await sb.from("networks").update(patch).eq("id", networkId);

    return NextResponse.json(patch, { headers: CORS });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500, headers: CORS });
  }
}

function buildPrompt(
  n: Record<string, unknown>,
  rubric: string,
  sourcedText: string,
  contactsText: string,
  inputtedContext: string,
): string {
  return `${MINDER_DESCRIPTION}

You are qualifying a REFERRAL NETWORK — a body that could introduce Minder to industrial factories (our design partners). Judge it on how much high-quality factory access it unlocks, not on being a factory itself.

${rubric}

NETWORK TO SCORE
Name: ${n.name}
Type: ${n.type ?? "unknown"}
Country / HQ: ${n.country ?? "unknown"} / ${n.hq_location ?? "unknown"}
Focus verticals: ${Array.isArray(n.focus_verticals) ? (n.focus_verticals as string[]).join(", ") : "unknown"}
Reach note: ${n.reach_note ?? "none"}
Notes: ${n.notes ?? "none"}

SOURCED-FACTORY EVIDENCE (actual reach quality so far — weight heavily):
${sourcedText}
${contactsText ? `\nCONTACTS AT THE NETWORK\n${contactsText}\n` : ""}${inputtedContext ? `\nINPUTTED CONTEXT (founder-uploaded files & notes for THIS network — most authoritative, weight heaviest):\n${inputtedContext}\n` : ""}
Return JSON exactly like:
{
  "score_breakdown": { ${NETWORK_SCORE_DIMENSIONS.map((d) => `"${d.key}": <0-${d.max}>`).join(", ")} },
  "reasoning": "<2-3 sentences citing concrete signals>",
  "recommendation": "<single most useful next step to activate this network>",
  "blocker": "<hard blocker that would cap the grade, or empty string>"
}
Award points only when a concrete signal supports them. Be conservative.`;
}
