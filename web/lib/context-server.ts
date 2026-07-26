import type { SupabaseClient } from "@supabase/supabase-js";
import type { ContextEntityType } from "@/lib/types";

// Loads an entity's per-entity "inputted context" (uploaded-file text + manual
// text cards) into a single prompt block. Used by the scoring / recommendation /
// summary routes so the AI reads exactly the founder's context for THIS entity.
export async function loadContextText(
  sb: SupabaseClient,
  entityType: ContextEntityType,
  entityId: string,
  opts: { maxChars?: number } = {},
): Promise<{ text: string; items: number; latestAt: string | null }> {
  const { data, error } = await sb
    .from("context_items")
    .select("kind,title,body,file_name,updated_at")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Failed to load ${entityType} context: ${error.message}`);

  const rows = (data ?? []) as {
    kind: string;
    title: string | null;
    body: string | null;
    file_name: string | null;
    updated_at: string;
  }[];

  const latestAt = rows.reduce<string | null>(
    (acc, r) => (acc && acc > r.updated_at ? acc : r.updated_at),
    null,
  );

  const withText = rows.filter((r) => (r.body ?? "").trim().length > 0);
  const maxChars = opts.maxChars ?? 24_000;
  let text = "";
  for (const r of withText) {
    const label = r.title || r.file_name || (r.kind === "file" ? "uploaded file" : "note");
    const block = `## ${label}${r.kind === "file" ? " (uploaded file)" : ""}\n${(r.body ?? "").trim()}`;
    if (text.length + block.length > maxChars) {
      text += "\n\n[…additional context truncated]";
      break;
    }
    text += (text ? "\n\n" : "") + block;
  }

  return { text, items: rows.length, latestAt };
}
