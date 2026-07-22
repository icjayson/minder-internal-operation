import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { supabase } from "@/lib/supabase";
import {
  MINDER_DESCRIPTION,
  MINDER_ICP,
} from "@/lib/minder";

export const runtime = "nodejs";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

// POST { leadId } → { icp_fit, archetype, reasoning, pain_signals, priority }
// Also persists the result to Supabase.
export async function POST(req: Request) {
  try {
    const { leadId } = (await req.json()) as { leadId?: string };
    if (!leadId) {
      return NextResponse.json(
        { error: "leadId required" },
        { status: 400, headers: CORS_HEADERS },
      );
    }

    const { data: lead, error: loadErr } = await supabase()
      .from("leads")
      .select("*")
      .eq("id", leadId)
      .single();
    if (loadErr || !lead) {
      return NextResponse.json(
        { error: loadErr?.message ?? "Lead not found" },
        { status: 404, headers: CORS_HEADERS },
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY not configured" },
        { status: 500, headers: CORS_HEADERS },
      );
    }

    const genai = new GoogleGenerativeAI(apiKey);
    // flash-lite: classification-quality output at ~50× the free daily quota of flash.
    const model = genai.getGenerativeModel({
      model: "gemini-2.5-flash-lite",
      generationConfig: {
        temperature: 0.35,
        maxOutputTokens: 2048,
        responseMimeType: "application/json",
      },
    });

    const prompt = buildPrompt(lead);
    // Retry 503s a couple of times — Gemini hiccups are common.
    const res = await retryOn503(() => model.generateContent(prompt), 2);
    const raw = res.response.text().trim();
    const json = raw.replace(/^```json\s*/i, "").replace(/```$/, "").trim();

    let parsed: {
      icp_fit?: unknown;
      archetype?: unknown;
      reasoning?: unknown;
      pain_signals?: unknown;
      priority?: unknown;
      should_pursue?: unknown;
    };
    try {
      parsed = JSON.parse(json);
    } catch {
      return NextResponse.json(
        { error: "Gemini returned non-JSON", raw: json.slice(0, 400) },
        { status: 502, headers: CORS_HEADERS },
      );
    }

    const fit = Number(parsed.icp_fit);
    if (!Number.isFinite(fit) || fit < 1 || fit > 5) {
      return NextResponse.json(
        { error: `Invalid icp_fit: ${parsed.icp_fit}` },
        { status: 502, headers: CORS_HEADERS },
      );
    }

    const priorityRaw = Number(parsed.priority);
    const priority =
      Number.isFinite(priorityRaw) && priorityRaw >= 1 && priorityRaw <= 5
        ? Math.round(priorityRaw)
        : inferPriorityFromFit(fit);

    const scored = {
      icp_fit: Math.round(fit * 10) / 10,
      archetype: String(parsed.archetype ?? "Unknown").slice(0, 80),
      reasoning: String(parsed.reasoning ?? ""),
      pain_signals: Array.isArray(parsed.pain_signals)
        ? (parsed.pain_signals as unknown[])
            .slice(0, 6)
            .map((s) => String(s).slice(0, 80))
        : [],
      priority,
    };

    // Persist. Don't clobber priority if the user has already set one manually
    // (unless it's null/0).
    const patch: Record<string, unknown> = {
      icp_fit: scored.icp_fit,
      archetype: scored.archetype,
      reasoning: scored.reasoning,
      pain_signals: scored.pain_signals,
    };
    if (!lead.priority) patch.priority = scored.priority;

    await supabase().from("leads").update(patch).eq("id", leadId);

    return NextResponse.json(scored, { headers: CORS_HEADERS });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json(
      { error: msg },
      { status: 500, headers: CORS_HEADERS },
    );
  }
}

async function retryOn503<T>(fn: () => Promise<T>, retries: number): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      const msg = e instanceof Error ? e.message : String(e);
      if (!/503|429|high demand/i.test(msg)) throw e;
      if (i === retries) break;
      await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
    }
  }
  throw lastErr;
}

function inferPriorityFromFit(fit: number): number {
  if (fit >= 4.5) return 5;
  if (fit >= 4.0) return 4;
  if (fit >= 3.0) return 3;
  if (fit >= 2.0) return 2;
  return 1;
}

function buildPrompt(lead: Record<string, unknown>): string {
  return `${MINDER_DESCRIPTION}

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
Category: ${lead.category ?? "unknown"}

Return JSON with exactly this shape (no markdown):
{
  "icp_fit": <number 1.0-5.0, one decimal>,
  "archetype": "<short role label, e.g. 'Operations lead', 'Factory owner', 'Safety head', 'IT (wrong buyer)', 'Anti-ICP'>",
  "reasoning": "<2-3 sentences, concrete, cite signals>",
  "pain_signals": [<up to 4 short phrases>],
  "priority": <integer 1-5, reflecting how urgently Eric should reach out THIS WEEK>,
  "should_pursue": <boolean>
}

Priority rubric:
- 5: ideal ICP + strong timing signal (just raised / hiring / posted pain). Reach out today.
- 4: ideal ICP, senior buyer. Reach out this week.
- 3: decent fit, not an obvious priority. Reach out when slot frees.
- 2: weak fit, nurture-track only.
- 1: anti-ICP / wrong buyer / too small / too large.

Category affects priority:
- ICP = normal rubric as above
- VC / Angel / Accelerator / Advisor = 4-5 if strong signal, else 3
- Partner / Press = 3 unless obvious fit
- Gov = 3 unless relevant grant / procurement context

Score conservatively. Be specific about signals, not generic.`;
}
