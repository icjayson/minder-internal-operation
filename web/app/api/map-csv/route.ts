import { NextResponse } from "next/server";
import { openaiChat } from "@/lib/openai";
import { VERTICALS, GEO_TIERS, ROLE_CATEGORIES } from "@/lib/types";

export const runtime = "nodejs";

// POST { headers: string[], samples: string[][] }
// → AI maps a messy CSV's columns onto the factory + contact schema, and
//   normalises the observed vertical / geo values to our enum keys.
export async function POST(req: Request) {
  try {
    const { headers, samples } = (await req.json()) as { headers?: string[]; samples?: string[][] };
    if (!headers?.length)
      return NextResponse.json({ error: "headers required" }, { status: 400 });
    if (!process.env.OPENAI_API_KEY)
      return NextResponse.json({ error: "OPENAI_API_KEY not configured" }, { status: 500 });

    const sampleBlock = (samples ?? [])
      .slice(0, 12)
      .map((r, i) => `Row ${i + 1}: ${headers.map((h, j) => `${h}=${r[j] ?? ""}`).join(" | ")}`)
      .join("\n");

    const prompt = `You restructure a messy CSV export (from Clay/Apollo/Sales Navigator/etc.) so it fits our database schema. \
The file is NOT clean — column names are arbitrary and values are inconsistent. Infer the best mapping.

TARGET SCHEMA
Factory fields: name (required), website_url, company_url, hq_location, country, frontline_workers, systems, multi_shift, parent_company, channel, machinery_note
Contact fields: full_name, role_title, email, linkedin_url, phone, role_category, role_level, notes
role_category must be one of: ${ROLE_CATEGORIES.map((r) => r.key).join(", ")}
role_level must be one of: high, mid, expert
Vertical keys: ${VERTICALS.map((v) => `${v.key} (${v.name})`).join("; ")}
Geo tiers: ${GEO_TIERS.map((g) => g.key).join(", ")}

CSV HEADERS: ${headers.join(" | ")}
SAMPLE ROWS:
${sampleBlock}

For each schema field, choose the single CSV header that best supplies it, or null if none fits. \
For the vertical/geo, pick the column that indicates it and map each DISTINCT raw value you see in the samples to the closest key. \
Return JSON exactly:
{
  "factory": { "name": "<header|null>", "website_url": "<header|null>", "company_url": "<header|null>", "hq_location": "<header|null>", "country": "<header|null>", "frontline_workers": "<header|null>", "systems": "<header|null>", "multi_shift": "<header|null>", "parent_company": "<header|null>", "channel": "<header|null>", "machinery_note": "<header|null>" },
  "contact": { "full_name": "<header|null>", "role_title": "<header|null>", "email": "<header|null>", "linkedin_url": "<header|null>", "phone": "<header|null>", "role_category": "<header|null>", "role_level": "<header|null>", "notes": "<header|null>" },
  "vertical_column": "<header|null>",
  "vertical_map": { "<raw>": "<vertical_key>" },
  "geo_column": "<header|null>",
  "geo_map": { "<raw>": "<geo_tier>" },
  "notes": "<one line on anything ambiguous>"
}`;

    const raw = await openaiChat(prompt, { temperature: 1, maxTokens: 1400, json: true });
    const json = raw.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
    const parsed = JSON.parse(json);
    return NextResponse.json(parsed);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
