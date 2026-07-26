import type { SupabaseClient } from "@supabase/supabase-js";
import { openaiChat } from "@/lib/openai";
import { MINDER_DESCRIPTION } from "@/lib/minder";
import { loadContextText } from "@/lib/context-server";
import type { ContextEntityType } from "@/lib/types";

export const ENTITY_TABLE: Record<ContextEntityType, string> = {
  factory: "factories",
  network: "networks",
  contact: "contacts",
};

// Builds a concise "where we are" recap for one entity, grounded in its notes,
// contacts, activity log and inputted context. Shared by the summarise route
// and the alert scan (so alerts carry the same context). Returns null if OpenAI
// is not configured or the entity is missing.
export async function buildEntitySummary(
  sb: SupabaseClient,
  entityType: ContextEntityType,
  entityId: string,
): Promise<string | null> {
  if (!process.env.OPENAI_API_KEY) return null;

  const { data: entity } = await sb.from(ENTITY_TABLE[entityType]).select("*").eq("id", entityId).single();
  if (!entity) return null;

  let activityText = "";
  let contactsText = "";
  if (entityType === "factory" || entityType === "network") {
    const parentCol = entityType === "factory" ? "factory_id" : "network_id";
    const { data: contactRows } = await sb
      .from("contacts")
      .select("full_name,role_title,stage")
      .eq(parentCol, entityId);
    contactsText = (contactRows ?? [])
      .map((c) => `- ${c.full_name}${c.role_title ? ` (${c.role_title})` : ""} · ${c.stage}`)
      .join("\n");
    if (entityType === "factory") {
      const { data: acts } = await sb
        .from("activities")
        .select("type,body,created_at")
        .eq("factory_id", entityId)
        .order("created_at", { ascending: false })
        .limit(30);
      activityText = (acts ?? [])
        .map((a) => `- [${a.type}] ${a.body ?? ""}`.trim())
        .filter((l) => l.length > 4)
        .join("\n");
    }
  }

  const { text: inputtedContext } = await loadContextText(sb, entityType, entityId);

  const label = entityType === "factory" ? "factory" : entityType === "network" ? "referral network" : "contact";
  const prompt = `${MINDER_DESCRIPTION}

You are keeping a concise working memory for Minder's design-partner development. Summarise where things stand with this ${label} so the founder can pick up instantly and an alert can carry the context.

${label.toUpperCase()}: ${entity.name ?? entity.full_name ?? "unknown"}
Stage: ${entity.stage ?? "unknown"}${entity.grade ? ` · Grade ${entity.grade}` : ""}
Notes: ${entity.notes ?? "none"}
${contactsText ? `\nCONTACTS\n${contactsText}\n` : ""}${activityText ? `\nACTIVITY LOG\n${activityText}\n` : ""}${inputtedContext ? `\nINPUTTED CONTEXT (uploaded files & notes)\n${inputtedContext}\n` : ""}

Write 2-4 short sentences covering: what we know about them, what we've done/learned so far, and the single most useful next step. British spelling, concrete, no filler or preamble. If there is little to go on, say so plainly.`;

  return (await openaiChat(prompt, { temperature: 0.4, maxTokens: 350 })).trim().slice(0, 1200);
}
