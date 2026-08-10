import { NextResponse } from "next/server";
import { openaiChat } from "@/lib/openai";
import { GEO_OPTIONS, ROLE_CATEGORIES, VERTICALS, WORKER_BANDS } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

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
Factory fields: name (required), website_url, hq_location, frontline_workers, description, notes
Contact fields: full_name, role_title, email, linkedin_url, phone, role_category, role_level, notes
role_category must be one of: ${ROLE_CATEGORIES.map((r) => r.key).join(", ")}
role_level must be one of: high, mid, low, specialist
Vertical keys: ${VERTICALS.map((v) => `${v.key} (${v.name})`).join("; ")}
Geo choices: ${GEO_OPTIONS.map((g) => g.key).join(", ")}
Frontline worker choices: ${WORKER_BANDS.join(", ")}

CSV HEADERS: ${headers.join(" | ")}
SAMPLE ROWS:
${sampleBlock}

For each schema field, choose the single CSV header that best supplies it, or null if none fits. \
For the vertical/geo, pick the column that indicates it and map each DISTINCT raw value you see in the samples to the closest key. \
Return JSON exactly:
{
  "factory": { "name": "<header|null>", "website_url": "<header|null>", "hq_location": "<header|null>", "frontline_workers": "<header|null>", "description": "<header|null>", "notes": "<header|null>" },
  "contact": { "full_name": "<header|null>", "role_title": "<header|null>", "email": "<header|null>", "linkedin_url": "<header|null>", "phone": "<header|null>", "role_category": "<header|null>", "role_level": "<header|null>", "notes": "<header|null>" },
  "vertical_column": "<header|null>",
  "vertical_map": { "<raw>": "<vertical_key>" },
  "geo_column": "<header|null>",
  "geo_map": { "<raw>": "<UK|Europe|VN>" },
  "notes": "<one line on anything ambiguous>"
}`;

    const raw = await openaiChat(prompt, {
      temperature: 1,
      maxTokens: 1400,
      json: true,
      signal: req.signal,
      timeoutMs: 45_000,
    });
    const json = raw.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
    const parsed = JSON.parse(json);
    return NextResponse.json(parsed);
  } catch (e) {
    if (req.signal.aborted)
      return new Response(null, { status: 499 });
    const msg = e instanceof Error ? e.message : "Unknown error";
    const timedOut = e instanceof Error && e.name === "TimeoutError";
    return NextResponse.json(
      { error: timedOut ? "AI analysis timed out. Please try again." : msg },
      { status: timedOut ? 504 : 500 },
    );
  }
}
