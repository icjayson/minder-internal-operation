import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { supabase } from "@/lib/supabase";
import {
  MINDER_DESCRIPTION,
  MINDER_DIFFERENTIATORS,
  MINDER_ICP,
} from "@/lib/minder";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { leadId } = (await req.json()) as { leadId?: string };
    if (!leadId) {
      return NextResponse.json({ error: "leadId required" }, { status: 400 });
    }

    const { data: lead, error } = await supabase()
      .from("leads")
      .select("*")
      .eq("id", leadId)
      .single();
    if (error || !lead) {
      return NextResponse.json(
        { error: error?.message ?? "Lead not found" },
        { status: 404 },
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY not configured" },
        { status: 500 },
      );
    }

    const genai = new GoogleGenerativeAI(apiKey);
    const model = genai.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: { temperature: 0.65, maxOutputTokens: 2048 },
    });

    const prompt = buildPrompt(lead);
    const result = await model.generateContent(prompt);
    const outreach = result.response.text().trim();

    await supabase()
      .from("leads")
      .update({ outreach_draft: outreach })
      .eq("id", leadId);

    return NextResponse.json({ outreach });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

function buildPrompt(lead: Record<string, unknown>): string {
  const pains = Array.isArray(lead.pain_signals) ? (lead.pain_signals as string[]) : [];
  const painLine = pains.length
    ? `Detected pain signals: ${pains.join("; ")}.`
    : "No specific pain signals detected — lean on industry-typical pains (onboarding cost, paper SOPs, safety incidents).";

  return `You are writing a LinkedIn outreach message on behalf of Minder AI.

COMPANY CONTEXT
${MINDER_DESCRIPTION}

${MINDER_ICP}

Differentiators you may reference (pick ONE, most relevant):
${MINDER_DIFFERENTIATORS.map((d, i) => `${i + 1}. ${d}`).join("\n")}

PROSPECT
Name: ${lead.full_name}
Title: ${lead.title ?? "unknown"}
Company: ${lead.company_name}
Industry: ${lead.industry ?? "unknown"}
Company size: ${lead.company_size ?? "unknown"}
Location: ${lead.hq_location ?? "unknown"}
${painLine}

HARD RULES
- Under 80 words total.
- Open with the prospect's first name. No "Hope you're well", no "I hope this finds you".
- Reference ONE specific pain point that their role/company would feel.
- Reference ONE Minder differentiator — not a laundry list.
- End with a clear ask: a 15-minute demo.
- NO clichés: no "passionate", "leveraged", "synergies", "reach out", "touch base", "circle back".
- NO emojis, NO hashtags, NO excessive formatting.
- Write like a human. Warm, direct, concrete. No AI-speak.

Return ONLY the message body — no preamble, no sign-off block, no explanation.`;
}
