import type { SupabaseClient } from "@supabase/supabase-js";
import {
  parseListContext,
  parseVerticalTensions,
  SHARED_CONTEXT_DEFAULTS,
  type SharedContextCategory,
  type SharedContextKey,
} from "@/lib/shared-context";

type SharedContextRow = {
  context_key: SharedContextKey;
  body: string;
  active: boolean;
};

type SharedContextFileRow = {
  category: SharedContextCategory;
  title: string | null;
  file_name: string | null;
  body: string | null;
};

export type SharedAIContext = {
  values: Record<SharedContextKey, string>;
  files: Record<SharedContextCategory, string>;
  value: (key: SharedContextKey) => string;
  differentiators: string[];
  verticalTensions: Record<string, string>;
};

/**
 * Loads the editable site-wide AI context. If migration 017 has not been
 * applied yet, every caller safely receives the checked-in defaults.
 */
export async function loadSharedAIContext(sb: SupabaseClient): Promise<SharedAIContext> {
  const values = { ...SHARED_CONTEXT_DEFAULTS };
  const files: Record<SharedContextCategory, string> = {
    product: "",
    design_partner: "",
  };

  const [{ data: rows }, { data: fileRows }] = await Promise.all([
    sb.from("shared_contexts").select("context_key,body,active").eq("active", true),
    sb
      .from("shared_context_files")
      .select("category,title,file_name,body")
      .eq("extraction_status", "done")
      .not("body", "is", null)
      .order("created_at"),
  ]);

  for (const row of (rows ?? []) as SharedContextRow[]) {
    if (row.context_key in values && row.body?.trim()) {
      values[row.context_key] = row.body.trim();
    }
  }

  for (const category of ["product", "design_partner"] as const) {
    files[category] = ((fileRows ?? []) as SharedContextFileRow[])
      .filter((row) => row.category === category && row.body?.trim())
      .map((row) => `# ${row.title || row.file_name || "Uploaded context"}\n${row.body!.trim()}`)
      .join("\n\n")
      .slice(0, 60_000);
  }

  return {
    values,
    files,
    value: (key) => values[key],
    differentiators: parseListContext(values.minder_differentiators),
    verticalTensions: parseVerticalTensions(values.vertical_tensions),
  };
}
