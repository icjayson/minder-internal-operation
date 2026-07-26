import { NextResponse } from "next/server";
import { openaiChat } from "@/lib/openai";
import { supabase } from "@/lib/supabase";
import { SCORE_DIMENSIONS } from "@/lib/types";
import { recommendNext } from "@/lib/recommendation";
import { loadContextText } from "@/lib/context-server";
import { persistFactoryScore } from "@/lib/score-persistence";
import { loadSharedAIContext, type SharedAIContext } from "@/lib/shared-context-server";

export const runtime = "nodejs";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};
export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

// POST { factoryId } → scores against the 100-pt rubric, persists, returns it.
export async function POST(req: Request) {
  try {
    const { factoryId } = (await req.json()) as { factoryId?: string };
    if (!factoryId)
      return NextResponse.json({ error: "factoryId required" }, { status: 400, headers: CORS });
    if (!process.env.OPENAI_API_KEY)
      return NextResponse.json({ error: "OPENAI_API_KEY not configured" }, { status: 500, headers: CORS });

    const sb = supabase();
    const { data: factory, error } = await sb.from("factories").select("*").eq("id", factoryId).single();
    if (error || !factory)
      return NextResponse.json({ error: error?.message ?? "Factory not found" }, { status: 404, headers: CORS });

    // Site-wide editable context + optional legacy vertical-specific context.
    const { data: vertical } = await sb.from("verticals").select("*").eq("id", factory.vertical_id).maybeSingle();
    const vKey = vertical?.key as string | undefined;
    const shared = await loadSharedAIContext(sb);
    let contextText = "";
    if (vKey) {
      const { data: docs } = await sb
        .from("context_docs")
        .select("title,body")
        .eq("active", true)
        .eq("scope", vKey)
        .in("kind", ["scoring", "both"]);
      contextText = (docs ?? []).map((d) => `# ${d.title}\n${d.body}`).join("\n\n");
    }

    // Accumulated per-entity context (calls, notes, observed workflow).
    const { data: contactRows } = await sb
      .from("contacts")
      .select("id,full_name,role_title,stage,notes")
      .eq("factory_id", factoryId);
    const contactsText = (contactRows ?? [])
      .map((c) => `- ${c.full_name}${c.role_title ? ` (${c.role_title})` : ""} · stage ${c.stage}${c.notes ? ` · note: ${c.notes}` : ""}`)
      .join("\n");
    const nameById = new Map((contactRows ?? []).map((c) => [c.id, c.full_name as string]));
    const { data: acts } = await sb
      .from("activities")
      .select("type,body,contact_id,evidence_level,created_at")
      .eq("factory_id", factoryId)
      .order("created_at", { ascending: false })
      .limit(60);
    const fieldContext = (acts ?? [])
      .map((a) => {
        const who = a.contact_id ? nameById.get(a.contact_id) : null;
        return `- [${a.type}${a.evidence_level != null ? ` E${a.evidence_level}` : ""}]${who ? ` ${who}:` : ""} ${a.body ?? ""}`.trim();
      })
      .filter((l) => l.length > 4)
      .join("\n");

    // Per-entity "inputted context": uploaded-file text + manual text cards.
    const { text: inputtedContext } = await loadContextText(sb, "factory", factoryId);

    const prompt = buildPrompt(
      factory,
      vertical?.name ?? "unknown",
      vKey,
      shared,
      contextText,
      contactsText,
      fieldContext,
      inputtedContext,
    );
    const raw = await openaiChat(prompt, { temperature: 1, maxTokens: 1600, json: true });
    const json = raw.replace(/^```json\s*/i, "").replace(/```$/, "").trim();

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(json);
    } catch {
      return NextResponse.json({ error: "OpenAI returned non-JSON", raw: json.slice(0, 400) }, { status: 502, headers: CORS });
    }

    // Clamp each dimension to its max and total.
    const rawBreak = (parsed.score_breakdown ?? {}) as Record<string, unknown>;
    const breakdown: Record<string, number> = {};
    let total = 0;
    for (const d of SCORE_DIMENSIONS) {
      const v = Math.max(0, Math.min(d.max, Math.round(Number(rawBreak[d.key]) || 0)));
      breakdown[d.key] = v;
      total += v;
    }
    const blocker = parsed.blocker ? String(parsed.blocker).slice(0, 160) : null;
    const grade = total >= 75 && !blocker ? "A" : total >= 60 ? "B" : "C";
    const lastActivity = new Date(factory.last_activity_at ?? Date.now()).getTime();
    const next = recommendNext({
      ladderLevel: factory.ladder_level ?? 0,
      evidenceLevel: factory.evidence_level ?? 0,
      grade,
      blocker,
      daysSinceActivity: Number.isFinite(lastActivity)
        ? Math.max(0, Math.floor((Date.now() - lastActivity) / 86_400_000))
        : 0,
      stage: factory.stage,
    });

    const patch = {
      score: total,
      grade,
      score_breakdown: breakdown,
      ai_reasoning: String(parsed.reasoning ?? "").slice(0, 800),
      ai_recommendation: next.recommendation.slice(0, 400),
      blocker,
      scored_at: new Date().toISOString(),
    };
    const persisted = await persistFactoryScore(
      (values) => sb.from("factories").update(values).eq("id", factoryId),
      patch,
    );
    if (persisted.error)
      throw new Error(`Failed to save AI score: ${persisted.error.message ?? persisted.error.code ?? "database error"}`);

    return NextResponse.json(
      {
        ...patch,
        persisted_scored_at: persisted.persistedScoredAt,
        ...(!persisted.persistedScoredAt
          ? { schema_warning: "factories.scored_at is missing; run migration 016_factory_score_persistence.sql" }
          : {}),
      },
      { headers: CORS },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500, headers: CORS });
  }
}

function buildPrompt(
  f: Record<string, unknown>,
  verticalName: string,
  vKey: string | undefined,
  shared: SharedAIContext,
  contextText: string,
  contactsText: string,
  fieldContext: string,
  inputtedContext: string,
): string {
  const tension = (vKey && shared.verticalTensions[vKey]) || "";
  return `${shared.value("minder_description")}

${shared.value("idp_profile")}

${shared.value("score_rubric")}

${shared.files.design_partner ? `SHARED DESIGN-PARTNER FILE CONTEXT:\n${shared.files.design_partner}\n` : ""}
${contextText ? `VERTICAL-SPECIFIC CONTEXT (authoritative — weight heavily):\n${contextText}\n` : ""}
FACTORY TO SCORE
Name: ${f.name}
Company URL: ${f.company_url ?? "unknown"}
Vertical: ${verticalName}${tension ? ` (${tension})` : ""}
Country / HQ: ${f.country ?? "unknown"} / ${f.hq_location ?? "unknown"}
Geo tier: ${f.geo_tier ?? "unknown"}
Frontline workers: ${f.frontline_workers ?? "unknown"}
Systems: ${Array.isArray(f.systems) ? (f.systems as string[]).join(", ") : "unknown"}
Machinery: ${f.machinery_note ?? "unknown"}
Multi-shift: ${f.multi_shift ?? "unknown"}
Channel: ${f.channel ?? "unknown"}
Parent company: ${f.parent_company ?? "none"}
Notes: ${f.notes ?? "none"}
${contactsText ? `\nCONTACTS\n${contactsText}\n` : ""}${fieldContext ? `\nACCUMULATED FIELD CONTEXT (calls, notes, observed workflow — weight heavily):\n${fieldContext}\n` : ""}${inputtedContext ? `\nINPUTTED CONTEXT (founder-uploaded files & notes for THIS factory — the most authoritative evidence, weight heaviest):\n${inputtedContext}\n` : ""}
Return JSON exactly like:
{
  "score_breakdown": { ${SCORE_DIMENSIONS.map((d) => `"${d.key}": <0-${d.max}>`).join(", ")} },
  "reasoning": "<2-3 sentences citing concrete signals>",
  "recommendation": "<single most useful next action given the current stage>",
  "blocker": "<hard blocker that would cap the grade, or empty string>"
}
Award points only when a concrete signal supports them. Be conservative.`;
}
