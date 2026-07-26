import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { buildEntitySummary, ENTITY_TABLE } from "@/lib/summary-server";
import type { ContextEntityType } from "@/lib/types";

export const runtime = "nodejs";

// POST { entityType, entityId } → an AI "where we are" recap, persisted to
// <entity>.context_summary. Reused by the context panel and the alert system.
export async function POST(req: Request) {
  try {
    const { entityType, entityId } = (await req.json()) as {
      entityType?: ContextEntityType;
      entityId?: string;
    };
    if (!entityType || !entityId || !ENTITY_TABLE[entityType])
      return NextResponse.json({ error: "entityType and entityId required" }, { status: 400 });
    if (!process.env.OPENAI_API_KEY)
      return NextResponse.json({ error: "OPENAI_API_KEY not configured" }, { status: 500 });

    const sb = supabase();
    const summary = await buildEntitySummary(sb, entityType, entityId);
    if (summary === null)
      return NextResponse.json({ error: "Entity not found" }, { status: 404 });

    await sb
      .from(ENTITY_TABLE[entityType])
      .update({ context_summary: summary, context_summary_at: new Date().toISOString() })
      .eq("id", entityId);

    return NextResponse.json({ summary });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}
