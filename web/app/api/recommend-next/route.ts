import { NextResponse } from "next/server";
import { openaiChat } from "@/lib/openai";
import { recommendNext } from "@/lib/recommendation";
import { MINDER_DESCRIPTION, PRODUCT_DIRECTION, VERTICAL_TENSIONS } from "@/lib/minder";
import { supabase } from "@/lib/supabase";
import { loadContextText } from "@/lib/context-server";

export const runtime = "nodejs";

// POST { factoryId } → hybrid next step:
//   • the deterministic relationship-ladder move is always the base/anchor
//   • once there is enough accumulated context, an AI layer proposes ONE
//     specific workflow/demo (top-down, one core problem) grounded in it.
export async function POST(req: Request) {
  try {
    const { factoryId } = (await req.json()) as { factoryId?: string };
    if (!factoryId)
      return NextResponse.json({ error: "factoryId required" }, { status: 400 });

    const sb = supabase();
    const { data: factory, error } = await sb
      .from("factories")
      .select("id,name,vertical_id,ladder_level,evidence_level,grade,blocker,last_activity_at,stage,notes")
      .eq("id", factoryId)
      .single();
    if (error || !factory)
      return NextResponse.json({ error: error?.message ?? "Factory not found" }, { status: 404 });

    const last = new Date(factory.last_activity_at ?? Date.now()).getTime();
    const daysSinceActivity = Number.isFinite(last)
      ? Math.max(0, Math.floor((Date.now() - last) / 86_400_000))
      : 0;

    // Deterministic base — always computed, always explainable.
    const move = recommendNext({
      ladderLevel: factory.ladder_level ?? 0,
      evidenceLevel: factory.evidence_level ?? 0,
      grade: factory.grade,
      blocker: factory.blocker,
      daysSinceActivity,
      stage: factory.stage,
    });

    // Accumulated context.
    const { data: contactRows } = await sb
      .from("contacts")
      .select("id,full_name,role_title,stage")
      .eq("factory_id", factoryId);
    const nameById = new Map((contactRows ?? []).map((c) => [c.id, c.full_name as string]));
    const { data: acts } = await sb
      .from("activities")
      .select("type,body,contact_id,evidence_level,created_at")
      .eq("factory_id", factoryId)
      .order("created_at", { ascending: false })
      .limit(40);
    const fieldContext = (acts ?? [])
      .map((a) => {
        const who = a.contact_id ? nameById.get(a.contact_id) : null;
        return `- ${who ? `${who}: ` : ""}${a.body ?? ""}`.trim();
      })
      .filter((l) => l.length > 3)
      .join("\n");

    // Per-entity inputted context (uploaded files + text cards).
    const { text: inputtedContext, items: contextItems } = await loadContextText(sb, "factory", factoryId);

    // Enough data to specialise? (context logged OR some evidence captured)
    const enough = (acts ?? []).length >= 1 || contextItems >= 1 || (factory.evidence_level ?? 0) >= 1;

    let recommendation = move.recommendation;
    let workflow: { title: string; detail: string }[] = [];
    let source: "ai" | "deterministic" = "deterministic";

    if (enough && process.env.OPENAI_API_KEY) {
      try {
        const { data: vertical } = await sb.from("verticals").select("key,name").eq("id", factory.vertical_id).maybeSingle();
        const { data: prodDocs } = await sb
          .from("context_docs")
          .select("title,body")
          .eq("active", true)
          .eq("scope", "minder");
        const productText = (prodDocs ?? []).map((d) => `# ${d.title}\n${d.body}`).join("\n\n") || PRODUCT_DIRECTION;
        const vKey = vertical?.key as string | undefined;
        const contactsText = (contactRows ?? [])
          .map((c) => `- ${c.full_name}${c.role_title ? ` (${c.role_title})` : ""}`)
          .join("\n");

        const prompt = `${MINDER_DESCRIPTION}

MINDER PRODUCT & DIRECTION
${productText}

STRATEGIC ANCHOR (relationship-ladder step to honour, do not skip ahead)
Ask: ${move.ask}
Give-back: ${move.giveBack}

FACTORY: ${factory.name}${vertical?.name ? ` · ${vertical.name}` : ""}${vKey && VERTICAL_TENSIONS[vKey] ? ` — ${VERTICAL_TENSIONS[vKey]}` : ""}
Stage: ${factory.stage} · Grade: ${factory.grade ?? "unscored"}${factory.blocker ? ` · Blocker: ${factory.blocker}` : ""}
CONTACTS
${contactsText || "(none yet)"}
ACCUMULATED FIELD CONTEXT (from calls, notes, observed workflow)
${fieldContext || "(sparse)"}
${inputtedContext ? `\nINPUTTED CONTEXT (founder-uploaded files & notes for THIS factory — most authoritative)\n${inputtedContext}\n` : ""}
Task: propose ONE specific, concrete next workflow/demo to run with this factory. Be top-down: pick a SINGLE core problem from their real context and design a quick demo around just that problem (not a broad rollout). Ground it in a concrete pain they actually mentioned; name the specific contact it involves if relevant. Respect the strategic anchor (don't jump the relationship ladder). British spelling, no pitch clichés.
Also break the demo into an ordered, runnable workflow of 3-5 short steps (trigger → capture → check → escalate/approve style), each a concrete action.
Return JSON: { "recommendation": "<2-3 sentences: the specific next workflow/demo>", "rationale": "<one line: which context signal drove it>", "workflow": [ { "title": "<short step name>", "detail": "<one concrete sentence>" } ] }`;

        const out = await openaiChat(prompt, { temperature: 0.5, maxTokens: 800, json: true });
        const json = out.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
        const parsed = JSON.parse(json) as {
          recommendation?: string;
          rationale?: string;
          workflow?: { title?: string; detail?: string }[];
        };
        if (parsed.recommendation?.trim()) {
          recommendation = parsed.recommendation.trim();
          move.rationale = parsed.rationale?.trim() || move.rationale;
          if (Array.isArray(parsed.workflow)) {
            workflow = parsed.workflow
              .filter((s) => s && (s.title || s.detail))
              .slice(0, 6)
              .map((s) => ({ title: (s.title ?? "").slice(0, 80), detail: (s.detail ?? "").slice(0, 240) }));
          }
          source = "ai";
        }
      } catch {
        /* fall back to the deterministic move */
      }
    }

    const { error: updateError } = await sb
      .from("factories")
      .update({ ai_recommendation: recommendation.slice(0, 600), next_action: recommendation.slice(0, 600) })
      .eq("id", factoryId);
    if (updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 });

    return NextResponse.json({ ...move, recommendation, workflow, source, daysSinceActivity });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 },
    );
  }
}
