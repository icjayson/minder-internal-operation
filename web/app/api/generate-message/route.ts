import { NextResponse } from "next/server";
import { openaiChat } from "@/lib/openai";
import { supabase } from "@/lib/supabase";
import {
  MINDER_DESCRIPTION,
  MINDER_DIFFERENTIATORS,
  VERTICAL_TENSIONS,
  WRITING_GUARDRAILS,
} from "@/lib/minder";

export const runtime = "nodejs";

type StepContext = {
  id: string;
  sequence_id: string;
  day_offset: number;
  intent: string | null;
  subject: string | null;
  body: string | null;
};

// POST { contactId, sequenceStepId? } → { subject, body }; saves a draft message.
export async function POST(req: Request) {
  try {
    const { contactId, sequenceStepId } = (await req.json()) as {
      contactId?: string;
      sequenceStepId?: string;
    };
    if (!contactId)
      return NextResponse.json({ error: "contactId required" }, { status: 400 });
    if (!process.env.OPENAI_API_KEY)
      return NextResponse.json({ error: "OPENAI_API_KEY not configured" }, { status: 500 });

    const sb = supabase();
    const { data: contact, error } = await sb.from("contacts").select("*").eq("id", contactId).single();
    if (error || !contact)
      return NextResponse.json({ error: error?.message ?? "Contact not found" }, { status: 404 });

    const { data: factory } = await sb.from("factories").select("*").eq("id", contact.factory_id).single();
    const { data: vertical } = await sb.from("verticals").select("*").eq("id", factory?.vertical_id).maybeSingle();
    const vKey = vertical?.key as string | undefined;

    let resolvedSequenceStepId = sequenceStepId;
    if (!resolvedSequenceStepId) {
      let sequenceId = contact.sequence_id as string | null;
      if (!sequenceId && factory?.vertical_id) {
        const { data: defaultSequence } = await sb
          .from("sequences")
          .select("id")
          .eq("vertical_id", factory.vertical_id)
          .order("created_at")
          .limit(1)
          .maybeSingle();
        sequenceId = defaultSequence?.id ?? null;
      }
      if (sequenceId) {
        const nextIndex = contact.sequence_state === "active"
          ? (contact.sequence_step ?? 0) + 1
          : 1;
        const { data: nextStep } = await sb
          .from("sequence_steps")
          .select("id")
          .eq("sequence_id", sequenceId)
          .eq("step_index", nextIndex)
          .maybeSingle();
        resolvedSequenceStepId = nextStep?.id;
      }
    }

    let step: StepContext | null = null;
    if (resolvedSequenceStepId) {
      const { data } = await sb.from("sequence_steps").select("*").eq("id", resolvedSequenceStepId).maybeSingle();
      step = data as StepContext | null;
      if (!step)
        return NextResponse.json({ error: "Sequence step not found" }, { status: 404 });
      const { data: sequence } = await sb
        .from("sequences")
        .select("vertical_id")
        .eq("id", step.sequence_id)
        .maybeSingle();
      if (sequence?.vertical_id !== factory?.vertical_id)
        return NextResponse.json({ error: "Sequence step does not match the contact's vertical" }, { status: 409 });
    }

    const { data: docs } = await sb
      .from("context_docs")
      .select("*")
      .eq("active", true)
      .in("scope", ["global", vKey ?? "global"])
      .in("kind", ["writing", "both"]);
    const contextText = (docs ?? []).map((d) => `# ${d.title}\n${d.body}`).join("\n\n");

    const prompt = buildPrompt(contact, factory, vertical?.name ?? "their sector", vKey, step, contextText);
    const out = await openaiChat(prompt, { temperature: 1, maxTokens: 900, json: true });
    const json = out.replace(/^```json\s*/i, "").replace(/```$/, "").trim();

    let parsed: { subject?: string; body?: string };
    try {
      parsed = JSON.parse(json);
    } catch {
      // Fall back to treating the whole output as the body.
      parsed = { subject: "", body: out };
    }
    const subject = String(parsed.subject ?? "").slice(0, 160);
    const body = String(parsed.body ?? "").trim();

    const { data: message, error: insertError } = await sb
      .from("messages")
      .insert({
        contact_id: contactId,
        sequence_step_id: resolvedSequenceStepId ?? null,
        subject,
        body,
        status: "draft",
      })
      .select("id")
      .single();
    if (insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 });

    return NextResponse.json({ subject, body, messageId: message.id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

function buildPrompt(
  c: Record<string, unknown>,
  f: Record<string, unknown> | null,
  verticalName: string,
  vKey: string | undefined,
  step: StepContext | null,
  contextText: string,
): string {
  const tension = (vKey && VERTICAL_TENSIONS[vKey]) || "";
  const stepLine = step
    ? `This is step Day ${step.day_offset} of the sequence. Intent: ${step.intent}. Subject guidance: ${step.subject ?? ""}. Template guidance: ${step.body ?? ""}`
    : "This is the first cold message (Day 1).";

  return `${MINDER_DESCRIPTION}

${WRITING_GUARDRAILS}

Differentiators you may reference (pick at most ONE, most relevant):
${MINDER_DIFFERENTIATORS.map((d, i) => `${i + 1}. ${d}`).join("\n")}

${contextText ? `FOUNDER CONTEXT:\n${contextText}\n` : ""}
RECIPIENT
Name: ${c.full_name}
Role: ${c.role_title ?? "unknown"}
Company: ${f?.name ?? "their company"}
Vertical: ${verticalName}${tension ? ` — ${tension}` : ""}
Location: ${f?.hq_location ?? "unknown"}

${stepLine}

Write to this one person. Follow the 6-part architecture and keep it to ~4 short sentences.
Return JSON: { "subject": "<short subject>", "body": "<message body only, no sign-off block>" }`;
}
